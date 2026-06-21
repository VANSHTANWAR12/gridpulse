import os
import numpy as np
import pandas as pd
import datetime
import joblib
import h3
from sklearn.decomposition import PCA
import lightgbm as lgb
from catboost import CatBoostRegressor, CatBoostClassifier
from xgboost import XGBRegressor, XGBClassifier
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    class SentenceTransformer:
        def __init__(self, model_name):
            raise ImportError(
                "sentence-transformers is not installed. To train new models, "
                "please install it first: pip install sentence-transformers"
            )
import warnings
warnings.filterwarnings('ignore')

DATA_PATH = os.environ.get(
    "GRIDPULSE_DATA_PATH",
    "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv" if os.path.exists("Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv") else
    r"c:\Users\Ayush Gupta\Downloads\Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"
)
MODEL_DIR = 'gridpulse/models/weights'

def robust_focal_loss_objective(y_true, y_pred):
    p = 1.0 / (1.0 + np.exp(-y_pred))
    gamma = 2.0  
    alpha = 0.25 
    grad = p * (1.0 - p) * (alpha * (p**gamma) * (1.0 - y_true) - (1.0 - alpha) * ((1.0 - p)**gamma) * y_true)
    hess = p * (1.0 - p) 
    return grad, hess

def train_models():
    print("=== Launching Leak-Free Tri-Model Ensemble Training Pipeline ===")
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Source CSV data not found at {DATA_PATH}")
        
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {df.shape[0]} historical rows.")
    
    # Downsample if dataset is too large to run efficiently on CPU
    if df.shape[0] > 15000:
        print(f"Dataset is large ({df.shape[0]} rows). Downsampling to 15000 rows for local training efficiency.")
        df = df.sample(n=15000, random_state=42).copy()
    
    # Map column names if using the new police violations dataset
    column_mapping = {
        'created_datetime': 'start_datetime',
        'closed_datetime': 'end_datetime',
        'violation_type': 'event_cause',
        'vehicle_type': 'veh_type',
        'location': 'address'
    }
    for old_col, new_col in column_mapping.items():
        if old_col in df.columns and new_col not in df.columns:
            df[new_col] = df[old_col]
            
    # Clean violation_type (which is event_cause)
    if 'event_cause' in df.columns:
        def clean_cause(val):
            if pd.isnull(val): return 'others'
            val = str(val).strip()
            if val.startswith('[') and val.endswith(']'):
                try:
                    import json
                    parsed = json.loads(val)
                    if parsed: return parsed[0]
                except:
                    pass
            return val
        df['event_cause'] = df['event_cause'].apply(clean_cause)

    if 'priority' not in df.columns:
        df['priority'] = 'Medium'
        
    if 'event_type' not in df.columns:
        df['event_type'] = 'unplanned'
        
    if 'requires_road_closure' not in df.columns:
        df['requires_road_closure'] = 'FALSE'
        
    # Construct description if missing/empty
    if 'description' not in df.columns or df['description'].isnull().all():
        print("Description column is completely null or missing. Synthesizing description from event_cause and address...")
        df['description'] = df.apply(
            lambda r: f"Traffic infraction: {r.get('event_cause', 'others')} observed at {r.get('address', 'Bengaluru')}.",
            axis=1
        )
        
    # 1. Base Datetime Cleaning & Filtering
    df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce')
    df['end_datetime'] = pd.to_datetime(df['end_datetime'], errors='coerce')
    df = df.dropna(subset=['start_datetime', 'latitude', 'longitude'])
    
    df['hour'] = df['start_datetime'].dt.hour
    df['day_of_week'] = df['start_datetime'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # 2. Harmonize Categoricals
    df['event_cause'] = df['event_cause'].fillna('others').astype(str).str.lower()
    df['veh_type'] = df['veh_type'].fillna('others').astype(str).str.lower()
    df['priority'] = df['priority'].fillna('Medium').astype(str).str.capitalize()
    df['police_station'] = df['police_station'].fillna('Yelahanka').astype(str).str.capitalize()
    
    # Extract out our target closure mask from the raw dataset, but DO NOT include it as an input feature
    df['requires_road_closure'] = df['requires_road_closure'].fillna('FALSE').astype(str).str.upper()
    df['target_requires_closure'] = df['requires_road_closure'].apply(lambda x: 1 if x in ['TRUE', 'YES', '1'] else 0)
    
    # 3. Handle Ground-Truth Operational Target Durations
    durations = []
    for idx, row in df.iterrows():
        duration_hours = np.nan
        if pd.notnull(row['end_datetime']) and pd.notnull(row['start_datetime']):
            diff = (row['end_datetime'] - row['start_datetime']).total_seconds() / 3600.0
            if 0.1 <= diff <= 168.0:
                duration_hours = diff
        if pd.isnull(duration_hours):
            cause = row['event_cause']
            base_dur = 1.2 if 'breakdown' in cause else 2.5 if 'accident' in cause else 4.0 if 'water' in cause else 2.0
            duration_hours = max(0.2, base_dur + np.random.normal(0, base_dur * 0.2))
        durations.append(duration_hours)
    df['target_duration'] = durations

    # 4. Compute Spatial Spatial Metrics (H3 Cells)
    df['h3_res7'] = df.apply(lambda r: h3.latlng_to_cell(r['latitude'], r['longitude'], 7), axis=1)
    df['h3_res8'] = df.apply(lambda r: h3.latlng_to_cell(r['latitude'], r['longitude'], 8), axis=1)
    
    res8_mean_dur_dict = df.groupby('h3_res8')['target_duration'].mean().to_dict()
    df['spatial_historical_duration_fine'] = df['h3_res8'].map(res8_mean_dur_dict)
    
    def calc_neighbors(cell):
        try:
            nb = h3.grid_disk(cell, 1)
            durs = [res8_mean_dur_dict[n] for n in nb if n in res8_mean_dur_dict]
            return np.mean(durs) if durs else res8_mean_dur_dict.get(cell, 2.0)
        except: return 2.0
    df['spatial_adjacency_smoothed_duration'] = df['h3_res8'].apply(calc_neighbors)

    # 5. Extract NLP Embeddings & Multi-Class Jurisdiction Proxies
    print("-> Computing Text Embeddings via SentenceTransformer...")
    encoder = SentenceTransformer('all-MiniLM-L6-v2')
    descriptions = df['description'].fillna('no description available').astype(str).tolist()
    text_embeddings = encoder.encode(descriptions, batch_size=64, show_progress_bar=False)
    
    df['police_station_encoded'] = df['police_station'].astype('category').cat.codes
    y_proxy_multi = df['police_station_encoded'].values
    num_unique_stations = df['police_station_encoded'].nunique()
    
    global_proxy = CatBoostClassifier(iterations=400, learning_rate=0.05, depth=5, loss_function='MultiClass', verbose=0, random_seed=42)
    global_proxy.fit(text_embeddings, y_proxy_multi)
    proxy_probs = global_proxy.predict_proba(text_embeddings)
    
    pca_proxy = PCA(n_components=3, random_state=42)
    compressed_proxy = pca_proxy.fit_transform(proxy_probs)
    for i in range(3):
        df[f'proxy_jurisdiction_pc_{i}'] = compressed_proxy[:, i]

    # 6. Apply Truncation Window to Training Data (<= 12 Hours)
    train_pool_df = df[df['target_duration'] <= 12.0].copy()
    print(f"Operational footprint: {train_pool_df.shape[0]} rows")
    
    # 7. Final Feature Composition (Completely free of 'requires_road_closure')
    train_pool_df['hour_sin'] = np.sin(2 * np.pi * train_pool_df['hour'] / 24.0)
    train_pool_df['hour_cos'] = np.cos(2 * np.pi * train_pool_df['hour'] / 24.0)
    train_pool_df['day_sin'] = np.sin(2 * np.pi * train_pool_df['day_of_week'] / 7.0)
    train_pool_df['day_cos'] = np.cos(2 * np.pi * train_pool_df['day_of_week'] / 7.0)
    
    priority_weights = {'High': 3.0, 'Medium': 2.0, 'Low': 1.0}
    train_pool_df['priority_weight'] = train_pool_df['priority'].map(priority_weights).fillna(2.0)
    train_pool_df['spatial_priority_interaction'] = train_pool_df['spatial_historical_duration_fine'] * train_pool_df['priority_weight']
    train_pool_df['spatial_time_wave_interaction'] = train_pool_df['spatial_historical_duration_fine'] * train_pool_df['hour_sin']

    numerical_features = [
        'is_weekend', 'spatial_historical_duration_fine', 'spatial_adjacency_smoothed_duration',
        'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'spatial_priority_interaction', 'spatial_time_wave_interaction',
        'proxy_jurisdiction_pc_0', 'proxy_jurisdiction_pc_1', 'proxy_jurisdiction_pc_2'
    ]
    # 'requires_road_closure' has been permanently removed here
    categorical_features = ['event_cause', 'veh_type', 'priority', 'police_station']
    
    X_train = pd.concat([train_pool_df[numerical_features], train_pool_df[categorical_features].astype('category')], axis=1)
    y_train_reg = np.log1p(train_pool_df['target_duration'].values)
    y_train_cls = train_pool_df['target_requires_closure'].values
    cat_idx = [X_train.columns.get_loc(c) for c in categorical_features]

    # 8. Train the SOTA Blended Ensemble
    print("-> Training production Tri-Model Regression Engine...")
    cb_reg = CatBoostRegressor(iterations=2500, learning_rate=0.015, depth=7, loss_function='MAE', verbose=0, random_seed=42)
    cb_reg.fit(X_train, y_train_reg, cat_features=cat_idx)
    
    lgb_reg = lgb.LGBMRegressor(n_estimators=2000, learning_rate=0.012, max_depth=7, num_leaves=63, objective='mae', random_state=42, verbose=-1)
    lgb_reg.fit(X_train, y_train_reg)
    
    xgb_reg = XGBRegressor(n_estimators=2000, learning_rate=0.012, max_depth=6, objective='reg:absoluteerror', tree_method='hist', enable_categorical=True, random_state=42)
    xgb_reg.fit(X_train, y_train_reg)

    print("-> Training Production Classification Engine...")
    lgb_cls = lgb.LGBMClassifier(
        n_estimators=1600, learning_rate=0.0131, max_depth=5, num_leaves=116,
        feature_fraction=0.689, bagging_fraction=0.876, reg_alpha=3.278, reg_lambda=1.271,
        objective=robust_focal_loss_objective, random_state=42, verbose=-1
    )
    lgb_cls.fit(X_train, y_train_cls)

    cb_cls = CatBoostClassifier(iterations=1600, learning_rate=0.015, depth=6, scale_pos_weight=13.5, loss_function='Logloss', verbose=0, random_seed=42)
    cb_cls.fit(X_train, y_train_cls, cat_features=cat_idx)

    xgb_cls = XGBClassifier(
        n_estimators=1400, learning_rate=0.0153, max_depth=6, scale_pos_weight=10.52,
        subsample=0.871, colsample_bytree=0.631, alpha=0.02, reg_lambda=1.555,
        objective='binary:logistic', tree_method='hist', enable_categorical=True, random_state=42
    )
    xgb_cls.fit(X_train, y_train_cls)

    # 9. Save Production Lookup Parameters and Model Files
    os.makedirs(MODEL_DIR, exist_ok=True)
    lookups = {
        'res8_mean_dur_dict': res8_mean_dur_dict,
        'global_mean_dur': y_train_reg.mean(),
        'global_mean_cls': y_train_cls.mean(),
        'categorical_columns': categorical_features,
        'numerical_columns': numerical_features
    }
    
    joblib.dump(cb_reg, os.path.join(MODEL_DIR, 'prod_cb_regressor.joblib'))
    joblib.dump(lgb_reg, os.path.join(MODEL_DIR, 'prod_lgb_regressor.joblib'))
    joblib.dump(xgb_reg, os.path.join(MODEL_DIR, 'prod_xgb_regressor.joblib'))
    joblib.dump(lgb_cls, os.path.join(MODEL_DIR, 'prod_lgb_classifier.joblib'))
    joblib.dump(cb_cls, os.path.join(MODEL_DIR, 'prod_cb_classifier.joblib'))
    joblib.dump(xgb_cls, os.path.join(MODEL_DIR, 'prod_xgb_classifier.joblib'))
    joblib.dump(lookups, os.path.join(MODEL_DIR, 'production_lookups.joblib'))
    joblib.dump(global_proxy, os.path.join(MODEL_DIR, 'global_text_proxy.joblib'))
    joblib.dump(pca_proxy, os.path.join(MODEL_DIR, 'text_pca_transformer.joblib'))
    
    print("🎉 New leak-free production assets successfully trained and exported!")

if __name__ == '__main__':
    train_models()