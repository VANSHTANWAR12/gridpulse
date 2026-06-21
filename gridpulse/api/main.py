import os
import datetime
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

from gridpulse.database import (
    get_all_events, get_hotspots, get_events_with_recommendations,
    clear_mock_events, insert_event, save_recommendation,
    get_planned_events, insert_planned_event, delete_planned_event,
    update_planned_event_status, insert_event_outcome, get_event_outcomes, get_outcome_by_event_id,
    create_user, get_user, delete_event_outcome
)
from gridpulse.clustering import perform_dbscan_clustering, update_spatial_hotspots
from gridpulse.ingestion import generate_mock_event
from gridpulse.models.forecasting import predict_congestion
from gridpulse.models.optimization import calculate_optimal_resources
from gridpulse.rag import RAGEngine

rag_engine = None

@asynccontextmanager
async def lifespan(app):
    global rag_engine
    rag_engine = RAGEngine()
    yield

app = FastAPI(title="GridPulse - Astram Predictive Congestion Mitigator", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://gridpulse-taupe.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import hashlib
import secrets
from fastapi import Header

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}:{pwd_hash}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, pwd_hash = stored_hash.split(':')
        verify_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return secrets.compare_digest(verify_hash, pwd_hash)
    except Exception:
        return False

# In-memory sessions store mapping session_token -> {"username": username, "role": role}
active_sessions = {}

class AuthPayload(BaseModel):
    username: str
    password: str

@app.post("/api/auth/register")
def api_register(payload: AuthPayload):
    username = payload.username.strip()
    password = payload.password
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
        
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long")
        
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
    # Check if user already exists
    existing = get_user(username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
        
    # Hash password and create user
    hashed = hash_password(password)
    success = create_user(username, hashed)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to register user")
        
    return {"message": "User registered successfully"}

@app.post("/api/auth/login")
def api_login(payload: AuthPayload):
    username = payload.username.strip()
    password = payload.password
    
    user = get_user(username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    if not verify_password(password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    # Generate session token
    session_token = secrets.token_hex(32)
    active_sessions[session_token] = {
        "username": user["username"],
        "role": user.get("role", "operator")
    }
    
    return {
        "token": session_token,
        "username": user["username"],
        "role": user.get("role", "operator")
    }

@app.post("/api/auth/logout")
def api_logout(x_session_token: Optional[str] = Header(None, alias="X-Session-Token")):
    if x_session_token and x_session_token in active_sessions:
        del active_sessions[x_session_token]
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
def api_get_me(x_session_token: Optional[str] = Header(None, alias="X-Session-Token")):
    if not x_session_token or x_session_token not in active_sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return active_sessions[x_session_token]

class EventSimulationPayload(BaseModel):
    event_type: str
    latitude: float
    longitude: float
    event_cause: str
    priority: str
    address: Optional[str] = ""
    police_station: Optional[str] = "Yelahanka"
    corridor: Optional[str] = "Non-corridor"
    description: Optional[str] = ""
    # requires_road_closure has been removed from inputs because we predict it now!

@app.get("/api/events")
def get_events(status: Optional[str] = None, include_mock: bool = True):
    events = get_events_with_recommendations()
    
    # Filter by mock status
    if not include_mock:
        events = [e for e in events if e.get('is_mock') == 0]
        
    # Filter by status (active / closed / resolved)
    if status:
        events = [e for e in events if e.get('status', '').lower() == status.lower()]
        
    return events

import h3
import math

@app.get("/api/hotspots")
def get_hotspots_endpoint():
    # Update hotspots dynamically to reflect any new events
    update_spatial_hotspots()
    db_hotspots = get_hotspots()
    
    result = []
    for h in db_hotspots:
        h_dict = dict(h)
        try:
            boundary = h3.cell_to_boundary(h_dict['h3_index'])
            h_dict['boundary'] = [[lat, lon] for lat, lon in boundary]
        except Exception:
            h_dict['boundary'] = []
        result.append(h_dict)
    return result

@app.get("/api/cluster")
def get_clusters_endpoint(eps_km: float = 0.5, min_samples: int = 2):
    # Retrieve all active events
    events = get_events_with_recommendations()
    active_events = [e for e in events if e.get('status', '').lower() == 'active']
    
    clustered_events = perform_dbscan_clustering(active_events, eps_km=eps_km, min_samples=min_samples)
    return clustered_events
@app.post("/api/simulate")
def post_simulate_event(payload: EventSimulationPayload):
    event_id = f"SIM_{str(uuid.uuid4().hex[:6]).upper()}"
    start_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    event_description = payload.description.strip() if payload.description else f"Operator simulated {payload.event_cause.replace('_', ' ')} incident."
    
    # Initialize baseline structure dictionary
    event_dict = {
        'id': event_id,
        'event_type': payload.event_type,
        'latitude': payload.latitude,
        'longitude': payload.longitude,
        'address': payload.address or f"{payload.corridor}, near {payload.police_station}, Bengaluru",
        'event_cause': payload.event_cause,
        'start_datetime': start_time,
        'end_datetime': None,
        'status': 'active',
        'police_station': payload.police_station or 'Yelahanka',
        'corridor': payload.corridor or 'Non-corridor',
        'priority': payload.priority,
        'description': event_description,
        'veh_type': 'others',
        'created_date': start_time,
        'is_mock': 1,
        'requires_road_closure': 'FALSE'  # Set default safe fallback string
    }
    
    # 🚀 Run our leak-free, multi-modal Tri-Model Ensemble Engine
    try:
        forecasts = predict_congestion(
            lat=payload.latitude,
            lon=payload.longitude,
            event_type=payload.event_type,
            event_cause=payload.event_cause,
            priority=payload.priority,
            police_station=payload.police_station or "Yelahanka",
            description=event_description,
            start_time_str=start_time,
            veh_type="others"
        )
        severity_score = forecasts['severity_score']
        estimated_duration = forecasts['estimated_duration']
        road_block_recommendation = forecasts['road_closure_predicted']  # Catching "YES" or "NO"
        
        # Sync the structural string back for secondary downstream functions
        event_dict['requires_road_closure'] = "TRUE" if road_block_recommendation == "YES" else "FALSE"
            
    except Exception as e:
        print(f"Production Inference Engine Exception: {e}. Running backup fallback routines...")
        priority_val = {'High': 35, 'Medium': 15, 'Low': 5}.get(payload.priority, 15)
        severity_score = min(100.0, float(20 + priority_val))
        estimated_duration = 2.5
        road_block_recommendation = "NO"
        
    # Calculate recommended physical resources based on the model predictions
    resources = calculate_optimal_resources(
        severity_score, payload.event_cause, event_dict['requires_road_closure'], payload.corridor, event_dict['address']
    )
    
    rec_dict = {
        'event_id': event_id,
        'severity_score': severity_score,
        'estimated_duration': estimated_duration,
        'road_closure_predicted': road_block_recommendation,  # Explicitly mapping new prediction column string
        'manpower_needed': resources['manpower_needed'],
        'barricades_needed': resources['barricades_needed'],
        'diversion_sign': resources['diversion_sign']
    }
    
    # Commit metrics into local database records
    insert_event(event_dict)
    save_recommendation(rec_dict)
    update_spatial_hotspots()
    
    return {**event_dict, **rec_dict}
@app.post("/api/spawn_mock")
def spawn_mock_endpoint():
    event = generate_mock_event()
    update_spatial_hotspots()
    return event

@app.post("/api/clear_mock")
def clear_mock_endpoint():
    clear_mock_events()
    update_spatial_hotspots()
    return {"message": "All mock and simulated events cleared."}

class ChatPayload(BaseModel):
    message: str
    lang: Optional[str] = "en"

@app.post("/api/chat")
def post_chat_message(payload: ChatPayload):
    global rag_engine
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG Engine is initializing or failed to start.")
    try:
        response = rag_engine.query(payload.message, lang=payload.lang)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/reset")
def post_chat_reset():
    global rag_engine
    if rag_engine:
        rag_engine.reset_chat()
    return {"message": "Chat session reset successfully."}

class PlannedEventPayload(BaseModel):
    name: str
    event_cause: str
    latitude: float
    longitude: float
    start_datetime: str
    duration_hours: int
    attendance: int
    priority: str

@app.get("/api/planned-events")
def api_get_planned_events():
    return get_planned_events()

@app.post("/api/planned-events")
def api_create_planned_event(payload: PlannedEventPayload):
    event_id = f"PLN_{str(uuid.uuid4().hex[:6]).upper()}"
    event_dict = {
        'id': event_id,
        'name': payload.name,
        'event_cause': payload.event_cause,
        'latitude': payload.latitude,
        'longitude': payload.longitude,
        'start_datetime': payload.start_datetime,
        'duration_hours': payload.duration_hours,
        'attendance': payload.attendance,
        'priority': payload.priority,
        'status': 'scheduled'
    }
    insert_planned_event(event_dict)
    return event_dict

@app.delete("/api/planned-events/{event_id}")
def api_delete_planned_event(event_id: str):
    delete_planned_event(event_id)
    return {"message": f"Planned event {event_id} deleted successfully."}

@app.get("/api/forecast-propagation")
def api_forecast_propagation(
    latitude: float,
    longitude: float,
    event_cause: str,
    priority: str,
    time_step_hours: float,
    duration_hours: float,
    attendance: Optional[int] = 1000
):
    start_time = datetime.datetime.now().strftime("%Y-%m-%d %H:00:00")
    try:
        forecasts = predict_congestion(
            lat=latitude,
            lon=longitude,
            event_type="planned",
            event_cause=event_cause,
            priority=priority,
            police_station="Yelahanka",
            description=f"Planned {event_cause} event.",
            start_time_str=start_time,
            veh_type="others"
        )
        base_severity = forecasts['severity_score']
    except Exception:
        # Fallback heuristic
        priority_val = {'High': 35, 'Medium': 15, 'Low': 5}.get(priority, 15)
        cause_val = {
            'accident': 30, 'water_logging': 25, 'pot_holes': 12, 'construction': 20,
            'tree_fall': 15, 'congestion': 20, 'public_event': 20, 'vehicle_breakdown': 10, 'others': 5
        }.get(event_cause, 10)
        base_severity = min(100.0, float(15 + priority_val + cause_val))

    # Calculate optimal resources for this severity
    resources = calculate_optimal_resources(
        base_severity, event_cause, "TRUE" if priority.lower() == 'high' else "FALSE", "Non-corridor", "", attendance=attendance
    )

    # Spatial H3 grid mapping
    h3_res = 8
    try:
        center_h3 = h3.latlng_to_cell(latitude, longitude, h3_res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid coordinates: {e}")

    # Simulate propagation over time_step_hours relative to duration_hours
    if duration_hours <= 0:
        duration_hours = 1.0
        
    fraction = time_step_hours / duration_hours
    if fraction > 1.0:
        fraction = 1.0
        
    # Temporal severity modifier: starts at 0.5, peaks at 1.0 at midpoint, decays to 0.2 at end
    if fraction <= 0.5:
        time_modifier = 0.5 + fraction
    else:
        time_modifier = max(0.2, 1.0 - 1.6 * (fraction - 0.5))

    current_base_severity = base_severity * time_modifier

    # Spatial dispersion (Rings)
    hexagons = []

    # Center cell (k = 0)
    center_boundary = h3.cell_to_boundary(center_h3)
    hexagons.append({
        'h3_index': center_h3,
        'latitude': latitude,
        'longitude': longitude,
        'severity': round(current_base_severity, 1),
        'boundary': [[lat, lon] for lat, lon in center_boundary],
        'ring': 0
    })

    # Ring 1 (k = 1)
    if time_step_hours >= 1.0:
        try:
            disk_1 = h3.grid_disk(center_h3, 1)
            for h in disk_1:
                if h != center_h3:
                    lat, lon = h3.cell_to_latlng(h)
                    boundary = h3.cell_to_boundary(h)
                    ring_1_severity = current_base_severity * 0.6
                    hexagons.append({
                        'h3_index': h,
                        'latitude': lat,
                        'longitude': lon,
                        'severity': round(ring_1_severity, 1),
                        'boundary': [[lt, ln] for lt, ln in boundary],
                        'ring': 1
                    })
        except Exception:
            pass

    # Ring 2 (k = 2)
    if time_step_hours >= 2.0:
        try:
            disk_2 = h3.grid_disk(center_h3, 2)
            disk_1 = h3.grid_disk(center_h3, 1)
            for h in disk_2:
                if h not in disk_1:
                    lat, lon = h3.cell_to_latlng(h)
                    boundary = h3.cell_to_boundary(h)
                    ring_2_severity = current_base_severity * 0.3
                    hexagons.append({
                        'h3_index': h,
                        'latitude': lat,
                        'longitude': lon,
                        'severity': round(ring_2_severity, 1),
                        'boundary': [[lt, ln] for lt, ln in boundary],
                        'ring': 2
                    })
        except Exception:
            pass

    current_manpower = max(1, math.ceil(resources['manpower_needed'] * time_modifier))
    current_barricades = max(2, math.ceil(resources['barricades_needed'] * time_modifier))

    return {
        'base_severity': round(base_severity, 1),
        'current_base_severity': round(current_base_severity, 1),
        'duration_hours': duration_hours,
        'time_step_hours': time_step_hours,
        'time_modifier': time_modifier,
        'hexagons': hexagons,
        'manpower_needed': current_manpower,
        'barricades_needed': current_barricades,
        'diversion_sign': resources['diversion_sign']
    }
class EventOutcomePayload(BaseModel):
    event_id: str
    event_name: str
    event_cause: str
    predicted_severity: float
    predicted_manpower: int
    predicted_barricades: int
    predicted_duration: Optional[float] = 0.0
    actual_attendance: int
    actual_duration_hours: float
    actual_peak_severity: float
    actual_manpower_deployed: int
    actual_barricades_used: int
    outcome_notes: Optional[str] = ""

@app.post("/api/event-outcomes")
def api_create_event_outcome(payload: EventOutcomePayload):
    # Calculate accuracy scores
    def calc_accuracy(predicted, actual):
        if predicted == 0 and actual == 0:
            return 100.0
        if predicted == 0:
            return 0.0
        error = abs(predicted - actual) / max(predicted, actual) * 100
        return round(max(0.0, 100.0 - error), 1)
    
    severity_acc = calc_accuracy(payload.predicted_severity, payload.actual_peak_severity)
    manpower_acc = calc_accuracy(float(payload.predicted_manpower), float(payload.actual_manpower_deployed))
    barricade_acc = calc_accuracy(float(payload.predicted_barricades), float(payload.actual_barricades_used))
    overall_acc = round((severity_acc + manpower_acc + barricade_acc) / 3.0, 1)
    
    completed_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    outcome_dict = {
        'event_id': payload.event_id,
        'event_name': payload.event_name,
        'event_cause': payload.event_cause,
        'predicted_severity': payload.predicted_severity,
        'predicted_manpower': payload.predicted_manpower,
        'predicted_barricades': payload.predicted_barricades,
        'predicted_duration': payload.predicted_duration,
        'actual_attendance': payload.actual_attendance,
        'actual_duration_hours': payload.actual_duration_hours,
        'actual_peak_severity': payload.actual_peak_severity,
        'actual_manpower_deployed': payload.actual_manpower_deployed,
        'actual_barricades_used': payload.actual_barricades_used,
        'severity_accuracy': severity_acc,
        'manpower_accuracy': manpower_acc,
        'barricade_accuracy': barricade_acc,
        'overall_accuracy': overall_acc,
        'outcome_notes': payload.outcome_notes,
        'completed_at': completed_at
    }
    
    insert_event_outcome(outcome_dict)
    # Mark planned event as completed
    update_planned_event_status(payload.event_id, 'completed')
    
    return outcome_dict

@app.get("/api/event-outcomes")
def api_get_event_outcomes():
    return get_event_outcomes()

@app.delete("/api/event-outcomes/{outcome_id}")
def api_delete_event_outcome(outcome_id: int):
    delete_event_outcome(outcome_id)
    return {"message": f"Outcome {outcome_id} deleted successfully."}


@app.get("/api/learning-analytics")
def api_get_learning_analytics():
    outcomes = get_event_outcomes()
    if not outcomes:
        return {
            'total_events_analyzed': 0,
            'avg_severity_accuracy': 0,
            'avg_manpower_accuracy': 0,
            'avg_barricade_accuracy': 0,
            'avg_overall_accuracy': 0,
            'best_prediction_accuracy': 0,
            'worst_prediction_accuracy': 0,
            'trend_data': []
        }
    
    total = len(outcomes)
    avg_sev = round(sum(o.get('severity_accuracy', 0) or 0 for o in outcomes) / total, 1)
    avg_man = round(sum(o.get('manpower_accuracy', 0) or 0 for o in outcomes) / total, 1)
    avg_bar = round(sum(o.get('barricade_accuracy', 0) or 0 for o in outcomes) / total, 1)
    avg_overall = round(sum(o.get('overall_accuracy', 0) or 0 for o in outcomes) / total, 1)
    best = max(o.get('overall_accuracy', 0) or 0 for o in outcomes)
    worst = min(o.get('overall_accuracy', 0) or 0 for o in outcomes)
    
    # Build trend data (chronological order)
    trend_data = []
    for o in reversed(outcomes):
        trend_data.append({
            'event_name': o.get('event_name', 'Unknown'),
            'completed_at': o.get('completed_at', ''),
            'start_datetime': o.get('start_datetime', ''),
            'overall_accuracy': o.get('overall_accuracy', 0),
            'severity_accuracy': o.get('severity_accuracy', 0),
            'manpower_accuracy': o.get('manpower_accuracy', 0)
        })
    
    return {
        'total_events_analyzed': total,
        'avg_severity_accuracy': avg_sev,
        'avg_manpower_accuracy': avg_man,
        'avg_barricade_accuracy': avg_bar,
        'avg_overall_accuracy': avg_overall,
        'best_prediction_accuracy': best,
        'worst_prediction_accuracy': worst,
        'trend_data': trend_data
    }

# Mount frontend web dashboard static files
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="web")
elif os.path.exists("web"):
    app.mount("/", StaticFiles(directory="web", html=True), name="web")
else:
    print("Warning: Static dashboard directories ('frontend/dist' or 'web') not found. Static dashboard won't be served directly.")
