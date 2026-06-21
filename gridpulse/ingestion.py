import pandas as pd
import numpy as np
import datetime
import random
import uuid
import os
from gridpulse.database import get_db_connection, insert_event, save_recommendation
from gridpulse.models.forecasting import predict_congestion
from gridpulse.models.optimization import calculate_optimal_resources

DATA_PATH = os.environ.get(
    "GRIDPULSE_DATA_PATH",
    "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv" if os.path.exists("Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv") else
    r"c:\Users\Ayush Gupta\Downloads\Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"
)

# Bounding box for Bengaluru (based on Yelahanka, Peenya, Mysore road, HAL)
BENGALURU_LAT_MIN = 12.85
BENGALURU_LAT_MAX = 13.12
BENGALURU_LON_MIN = 77.45
BENGALURU_LON_MAX = 77.72

POLICE_STATIONS = [
    'Yelahanka', 'HAL Old Airport', 'Sadashivanagar', 'Byatarayanapura', 'Halasuru Gate',
    'Yeshwanthpura', 'Hennuru', 'Kodigehalli', 'Banaswadi', 'K.R. Pura', 'Peenya', 'Mysore Road'
]

CORRIDORS = [
    'Non-corridor', 'Mysore Road', 'Bellary Road 1', 'Tumkur Road', 
    'Bellary Road 2', 'Hosur Road', 'ORR North 1', 'Old Madras Road', 'Magadi Road'
]

CAUSES = [
    'vehicle_breakdown', 'pot_holes', 'construction', 'water_logging', 
    'accident', 'tree_fall', 'road_conditions', 'congestion', 'public_event'
]

VEHICLE_TYPES = ['lcv', 'hcv', 'car', 'two_wheeler', 'bus', 'auto']

def ingest_historical_data(limit=1000):
    """
    Ingests historical data from the CSV file.
    Runs forecasting and optimization in batch to initialize the database quickly.
    Limits to the first `limit` rows to avoid excessive database size during testing,
    but defaults to 1000.
    """
    if not os.path.exists(DATA_PATH):
        print(f"Error: Historical CSV not found at {DATA_PATH}")
        return
        
    print(f"Ingesting historical data from {DATA_PATH} (limit: {limit})...")
    
    df = pd.read_csv(DATA_PATH)
    
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

    # Filter out missing lat/lon
    df = df.dropna(subset=['latitude', 'longitude'])
    
    # Take up to limit
    df_sample = df.head(limit).copy()
    
    # Ensure database connection
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("Running forecasting and optimization for historical records in batch...")
    
    events_inserted = 0
    
    # Ingest in transaction block
    try:
        for _, row in df_sample.iterrows():
            event_id = str(row['id'])
            event_type = str(row.get('event_type', 'unplanned')).lower()
            lat = float(row['latitude'])
            lon = float(row['longitude'])
            address = str(row.get('address', ''))
            event_cause = str(row.get('event_cause', 'others')).lower()
            requires_road_closure = str(row.get('requires_road_closure', 'FALSE')).upper()
            start_time = str(row.get('start_datetime', ''))
            end_time = str(row.get('end_datetime', ''))
            if 'status' in row and pd.notnull(row['status']):
                status = str(row['status']).lower()
            elif 'validation_status' in row and pd.notnull(row['validation_status']):
                status = 'active' if str(row['validation_status']).lower() == 'approved' else 'closed'
            else:
                status = 'closed'
            police_station = str(row.get('police_station', ''))
            corridor = str(row.get('corridor', 'Non-corridor'))
            priority = str(row.get('priority', 'Medium')).capitalize()
            description = str(row.get('description', ''))
            veh_type = str(row.get('veh_type', ''))
            created_date = str(row.get('created_date', ''))
            
            # Check for coordinates validity
            if pd.isnull(lat) or pd.isnull(lon):
                continue
                
            # Insert event
            cursor.execute('''
                INSERT OR REPLACE INTO events (
                    id, event_type, latitude, longitude, address, event_cause, 
                    requires_road_closure, start_datetime, end_datetime, status, 
                    police_station, corridor, priority, description, veh_type, created_date, is_mock
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ''', (
                event_id, event_type, lat, lon, address, event_cause,
                requires_road_closure, start_time, end_time, status,
                police_station, corridor, priority, description, veh_type, created_date
            ))
            
            # Calculate mock recommendations if models fail, otherwise run forecasts
            try:
                # We do inline heuristic for historical data to make it extremely fast during initialization
                # if models are not loaded yet
                # Map priority
                priority_val = {'High': 35, 'Medium': 15, 'Low': 5}.get(priority, 15)
                rc_val = 40 if requires_road_closure in ['TRUE', 'YES', '1'] else 0
                cause_val = {
                    'accident': 30, 'water_logging': 25, 'pot_holes': 12, 'construction': 20,
                    'tree_fall': 15, 'congestion': 20, 'public_event': 20, 'vehicle_breakdown': 10, 'others': 5
                }.get(event_cause, 10)
                
                severity = min(100.0, float(15 + priority_val + rc_val + cause_val))
                duration = 1.5
                if 'breakdown' in event_cause:
                    duration = 1.2
                elif 'accident' in event_cause:
                    duration = 2.5
                elif 'water' in event_cause:
                    duration = 4.0
                elif 'construction' in event_cause:
                    duration = 48.0
                
                # Heuristic optimization
                manpower = math_ceil_manpower(severity, requires_road_closure, event_cause)
                barricades = math_ceil_barricades(severity, requires_road_closure, event_cause)
                
                loc_name = corridor if corridor and corridor != 'Non-corridor' else address
                if ',' in loc_name:
                    loc_name = loc_name.split(',')[0].strip()
                loc_str = f" at {loc_name}" if loc_name else " ahead"
                
                if 'breakdown' in event_cause:
                    sign = f"HAZARD: Breakdown{loc_str}. Slow down."
                elif 'accident' in event_cause:
                    sign = f"ACCIDENT{loc_str}. Lanes blocked. Detour."
                else:
                    sign = f"TRAFFIC ALERT{loc_str}. Expect delays."
                    
            except Exception:
                severity = 45.0
                duration = 2.0
                manpower = 2
                barricades = 4
                sign = "TRAFFIC ALERT: Expect delays ahead."
                
            cursor.execute('''
                INSERT OR REPLACE INTO recommendations (
                    event_id, severity_score, estimated_duration, manpower_needed, barricades_needed, diversion_sign
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (event_id, severity, duration, manpower, barricades, sign))
            
            events_inserted += 1
            
        conn.commit()
        print(f"Successfully ingested {events_inserted} historical events and recommendations.")
    except Exception as e:
        conn.rollback()
        print(f"Error during bulk historical data ingestion: {e}")
    finally:
        conn.close()

def math_ceil_manpower(severity, requires_road_closure, cause):
    base = severity / 15.0
    extra = 0
    if requires_road_closure in ['TRUE', 'YES', '1']:
        extra += 3
    if 'accident' in cause:
        extra += 2
    return max(1, min(int(base + extra + 0.99), 12))

def math_ceil_barricades(severity, requires_road_closure, cause):
    if requires_road_closure in ['TRUE', 'YES', '1']:
        return max(4, min(int(severity / 5.0 + 0.99), 25))
    if 'construction' in cause:
        return max(2, min(int(severity / 8.0 + 0.99), 15))
    if 'breakdown' in cause:
        return 2
    return max(0, min(int(severity / 12.0 + 0.99), 10))

def generate_mock_event():
    """
    Generates a realistic active traffic event in Bengaluru.
    Predicts details using the trained machine learning model and computes optimized resources.
    Saves and returns the event.
    """
    event_id = f"MOCK_{str(uuid.uuid4().hex[:6]).upper()}"
    event_type = random.choice(['unplanned', 'unplanned', 'unplanned', 'planned'])
    
    # Coordinates inside Bengaluru bounding box
    lat = round(random.uniform(BENGALURU_LAT_MIN, BENGALURU_LAT_MAX), 6)
    lon = round(random.uniform(BENGALURU_LON_MIN, BENGALURU_LON_MAX), 6)
    
    police_station = random.choice(POLICE_STATIONS)
    corridor = random.choice(CORRIDORS)
    event_cause = random.choice(CAUSES)
    
    # Priority defaults
    if event_cause in ['accident', 'water_logging']:
        priority = 'High'
        requires_road_closure = random.choice(['TRUE', 'FALSE'])
    elif event_cause == 'construction':
        priority = 'Medium'
        requires_road_closure = 'TRUE'
    else:
        priority = random.choice(['Medium', 'Low'])
        requires_road_closure = 'FALSE'
        
    start_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status = 'active'
    
    description = f"Simulated {event_cause.replace('_', ' ')} incident near {police_station} zone."
    veh_type = random.choice(VEHICLE_TYPES) if event_cause == 'vehicle_breakdown' else ''
    address = f"{corridor}, near {police_station} Police Station, Bengaluru, Karnataka"
    
    event_dict = {
        'id': event_id,
        'event_type': event_type,
        'latitude': lat,
        'longitude': lon,
        'address': address,
        'event_cause': event_cause,
        'requires_road_closure': requires_road_closure,
        'start_datetime': start_time,
        'end_datetime': None,
        'status': status,
        'police_station': police_station,
        'corridor': corridor,
        'priority': priority,
        'description': description,
        'veh_type': veh_type,
        'created_date': start_time,
        'is_mock': 1
    }
    
    # Insert event
    insert_event(event_dict)
    
    try:
        forecasts = predict_congestion(
            lat=lat,
            lon=lon,
            event_type=event_type,
            event_cause=event_cause,
            priority=priority,
            police_station=police_station,
            description=description,
            start_time_str=start_time,
            veh_type=veh_type
        )
        severity_score = forecasts['severity_score']
        estimated_duration = forecasts['estimated_duration']
    except Exception as e:
        # Fallback to heuristic
        print(f"ML Prediction failed, using heuristic fallback: {e}")
        priority_val = {'High': 35, 'Medium': 15, 'Low': 5}.get(priority, 15)
        rc_val = 40 if requires_road_closure == 'TRUE' else 0
        cause_val = {
            'accident': 30, 'water_logging': 25, 'pot_holes': 12, 'construction': 20,
            'tree_fall': 15, 'congestion': 20, 'public_event': 20, 'vehicle_breakdown': 10, 'others': 5
        }.get(event_cause, 10)
        severity_score = min(100.0, float(15 + priority_val + rc_val + cause_val))
        estimated_duration = 2.0
        
    resources = calculate_optimal_resources(
        severity_score, event_cause, requires_road_closure, corridor, address
    )
    
    rec_dict = {
        'event_id': event_id,
        'severity_score': severity_score,
        'estimated_duration': estimated_duration,
        'manpower_needed': resources['manpower_needed'],
        'barricades_needed': resources['barricades_needed'],
        'diversion_sign': resources['diversion_sign']
    }
    
    save_recommendation(rec_dict)
    
    # Combine and return
    full_event = {**event_dict, **rec_dict}
    return full_event
