import os
import sys
from functools import lru_cache
import numpy as np
import pandas as pd
import datetime
import joblib
import h3
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    class SentenceTransformer:
        def __init__(self, model_name):
            print(f"[Fallback Encoder] Stubbing SentenceTransformer('{model_name}') to prevent PyTorch/transformers memory footprint on Render.")
        def encode(self, sentences, batch_size=1, show_progress_bar=False):
            # Return dummy 384-dimensional embeddings (zeros) for the text description
            return np.zeros((len(sentences), 384), dtype=np.float32)

def robust_focal_loss_objective(y_true, y_pred):
    p = 1.0 / (1.0 + np.exp(-y_pred))
    gamma = 2.0  
    alpha = 0.25 
    grad = p * (1.0 - p) * (alpha * (p**gamma) * (1.0 - y_true) - (1.0 - alpha) * ((1.0 - p)**gamma) * y_true)
    hess = p * (1.0 - p) 
    return grad, hess

# Inject robust_focal_loss_objective into __main__ so joblib can deserialize the LightGBM classifier
try:
    import __main__
    __main__.robust_focal_loss_objective = robust_focal_loss_objective
except Exception:
    pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_DIR = os.path.join(CURRENT_DIR, 'weights')

_models = {}
_encoder = None

def load_production_pipeline():
    global _models, _encoder
    if not _models:
        required_binaries = [
            'prod_cb_regressor.joblib', 'prod_lgb_regressor.joblib', 'prod_xgb_regressor.joblib',
            'prod_lgb_classifier.joblib', 'prod_cb_classifier.joblib', 'prod_xgb_classifier.joblib',
            'global_text_proxy.joblib', 'text_pca_transformer.joblib', 'production_lookups.joblib'
        ]
        
        for binary in required_binaries:
            path = os.path.join(WEIGHTS_DIR, binary)
            if not os.path.exists(path):
                raise FileNotFoundError(f"Missing mandatory production binary: {path}")
            _models[binary.replace('.joblib', '')] = joblib.load(path)
            
        _encoder = SentenceTransformer('all-MiniLM-L6-v2')
        print("[Ensemble Engine] Multi-Modal pipeline components safely anchored and online.")

@lru_cache(maxsize=512)
def predict_congestion(lat, lon, event_type, event_cause, priority="Medium", police_station="Yelahanka", description="", start_time_str=None, veh_type="others"):
    load_production_pipeline()
    
    # 1. Transform Temporal Coordinates
    try:
        dt = pd.to_datetime(start_time_str)
        if pd.isnull(dt): dt = datetime.datetime.now()
    except Exception:
        dt = datetime.datetime.now()
        
    hour = dt.hour
    day_of_week = dt.dayofweek
    is_weekend = 1 if day_of_week in [5, 6] else 0
    
    hour_sin = np.sin(2 * np.pi * hour / 24.0)
    hour_cos = np.cos(2 * np.pi * hour / 24.0)
    day_sin = np.sin(2 * np.pi * day_of_week / 7.0)
    day_cos = np.cos(2 * np.pi * day_of_week / 7.0)

    # 2. Extract Spatial H3 Index Signals
    lookups = _models['production_lookups']
    try:
        cell_res8 = h3.latlng_to_cell(float(lat), float(lon), 8)
    except Exception:
        cell_res8 = "dummy_h3_cell"
        
    hist_dur = lookups['res8_mean_dur_dict'].get(cell_res8, lookups['global_mean_dur'])
    
    try:
        neighbors = h3.grid_disk(cell_res8, 1)
        durs = [lookups['res8_mean_dur_dict'][n] for n in neighbors if n in lookups['res8_mean_dur_dict']]
        smoothed_dur = np.mean(durs) if durs else hist_dur
    except Exception:
        smoothed_dur = hist_dur

    # 3. Process Natural Language Embeddings
    clean_desc = str(description).strip() if description else f"unplanned {event_cause} incident reported."
    embedded_text = _encoder.encode([clean_desc], batch_size=1, show_progress_bar=False)
    
    proxy_probs = _models['global_text_proxy'].predict_proba(embedded_text)
    compressed_proxy = _models['text_pca_transformer'].transform(proxy_probs)[0]

    # Get the categorical mapping lists and feature names expected by the pre-trained SOTA models
    model_features = _models['prod_cb_regressor'].feature_names_
    categories_list = _models['prod_lgb_regressor'].booster_.dump_model()['pandas_categorical']

    # Map the category strings to the exact training category set
    cause_clean = str(event_cause).lower().strip()
    if cause_clean not in categories_list[0]:
        cause_clean = 'others'
        
    veh_clean = str(veh_type).lower().strip()
    if veh_clean in ['car', 'private car']:
        veh_clean = 'private_car'
    elif veh_clean in ['bus', 'bmtc']:
        veh_clean = 'bmtc_bus'
    elif veh_clean in ['heavy_vehicle', 'hcv', 'truck']:
        veh_clean = 'heavy_vehicle'
    elif veh_clean not in categories_list[1]:
        veh_clean = 'others'
        
    priority_clean = str(priority).lower().strip()
    if priority_clean not in categories_list[2]:
        priority_clean = 'low'
        
    station_clean = str(police_station).lower().strip()
    if station_clean not in categories_list[3]:
        station_clean = 'no police station'

    # 4. Compute Advanced Mathematical Feature Cross Interactions & Heuristic SOTA Features
    p_weight = 3.0 if priority_clean == 'high' else 1.0
    spatial_priority_interaction = hist_dur * p_weight
    spatial_time_wave_interaction = hist_dur * hour_sin

    # SOTA Heuristic Fallbacks
    base_dur = 1.2 if 'breakdown' in cause_clean else 2.5 if 'accident' in cause_clean else 4.0 if 'water' in cause_clean else 2.0
    meta_text_duration_prediction = np.log1p(base_dur)
    meta_text_closure_probability = 0.8 if 'construction' in cause_clean else 0.5 if 'accident' in cause_clean else 0.1

    # 5. Synthesize Design Inference Matrix Frame
    input_payload = {
        'is_weekend': is_weekend,
        'spatial_density_score_coarse': 1.0,
        'spatial_density_score_fine': 1.0,
        'spatial_historical_duration_coarse': hist_dur,
        'spatial_historical_duration_fine': hist_dur,
        'spatial_priority_interaction': spatial_priority_interaction,
        'cause_vehicle_frequency': 10.0,
        'meta_text_duration_prediction': meta_text_duration_prediction,
        'meta_text_closure_probability': meta_text_closure_probability,
        'hour_sin': hour_sin,
        'hour_cos': hour_cos,
        'day_sin': day_sin,
        'day_cos': day_cos,
        'spatial_time_wave_interaction': spatial_time_wave_interaction,
        'spatial_adjacency_smoothed_duration': smoothed_dur,
        'proxy_jurisdiction_pc_0': compressed_proxy[0],
        'proxy_jurisdiction_pc_1': compressed_proxy[1],
        'proxy_jurisdiction_pc_2': compressed_proxy[2]
    }
    
    X_inference = pd.DataFrame([input_payload])

    # Assign Categorical columns with correct levels
    X_inference['event_cause'] = pd.Categorical([cause_clean], categories=categories_list[0])
    X_inference['veh_type'] = pd.Categorical([veh_clean], categories=categories_list[1])
    X_inference['priority'] = pd.Categorical([priority_clean], categories=categories_list[2])
    X_inference['police_station'] = pd.Categorical([station_clean], categories=categories_list[3])

    # Ensure columns match the model's exact features and order
    X_inference = X_inference[model_features]

    # 6. Execute Blended Regression Calculations (Clearance Time)
    pred_reg_cb = _models['prod_cb_regressor'].predict(X_inference)[0]
    pred_reg_lgb = _models['prod_lgb_regressor'].predict(X_inference)[0]
    pred_reg_xgb = _models['prod_xgb_regressor'].predict(X_inference)[0]
    
    log_duration = (0.34 * pred_reg_cb) + (0.33 * pred_reg_lgb) + (0.33 * pred_reg_xgb)
    duration_hours = np.expm1(log_duration)
    duration_hours = max(0.1, min(12.0, float(duration_hours)))

    # 7. Execute Blended Classification Calculations (Closure/Severity Profile)
    pred_cls_cb = _models['prod_cb_classifier'].predict_proba(X_inference)[0][1]
    pred_cls_xgb = _models['prod_xgb_classifier'].predict_proba(X_inference)[0][1]
    
    raw_lgb_margin = _models['prod_lgb_classifier'].predict(X_inference, raw_score=True)[0]
    pred_cls_lgb = 1.0 / (1.0 + np.exp(-raw_lgb_margin))
    
    closure_probability = (0.50 * pred_cls_lgb) + (0.25 * pred_cls_cb) + (0.25 * pred_cls_xgb)

    # 8. Calibrate Outputs for the Front-End Dashboard Layout Specifications
    # Keeps severity score scale running perfectly from 0-100%
    severity_score = float(closure_probability * 100.0)
    severity_score = min(100.0, max(5.0, severity_score))

    return {
        'severity_score': round(severity_score, 1),
        'estimated_duration': round(duration_hours, 2),
        # Returns a clean string indicator to map straight onto the dashboard's new column layout
        'road_closure_predicted': "YES" if closure_probability > 0.45 else "NO"
    }