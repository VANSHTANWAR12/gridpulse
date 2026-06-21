import os
import sys
import threading
import time
import uvicorn

from gridpulse.database import init_db, get_all_events
from gridpulse.ingestion import ingest_historical_data, generate_mock_event
from gridpulse.clustering import update_spatial_hotspots

SEVERITY_MODEL_PATH = 'gridpulse/models/weights/prod_cb_regressor.joblib'
DURATION_MODEL_PATH = 'gridpulse/models/weights/prod_cb_classifier.joblib'

def run_mock_stream(stop_event):
    """
    Background thread to simulate real-time traffic events in Bengaluru.
    Spawns a new incident every 40 seconds.
    """
    print("Background Mock Event Stream started.")
    # Wait 20 seconds before starting first mock event to let server boot
    time.sleep(20)
    
    while not stop_event.is_set():
        try:
            print("Real-Time Simulation: Generating new active event...")
            event = generate_mock_event()
            print(f"Generated Event: {event['id']} | Cause: {event['event_cause']} | Severity: {event['severity_score']}")
        except Exception as e:
            print(f"Error generating mock stream event: {e}")
            
        # Sleep for 40 seconds
        for _ in range(40):
            if stop_event.is_set():
                break
            time.sleep(1)
            
    print("Background Mock Event Stream stopped.")

def main():
    print("=== GRIDPULSE: ASTRAM PREDICTIVE CONGESTION MITIGATOR ===")
    
    # 1. Initialize DB
    init_db()
    
    # 2. Verify ML Models exist
    if not os.path.exists(SEVERITY_MODEL_PATH) or not os.path.exists(DURATION_MODEL_PATH):
        print("CRITICAL: Pre-trained models not found in weights folder. Automatic retraining is disabled.")
        sys.exit(1)
            
    # 3. Ingest Historical Data if DB is empty
    events = get_all_events(include_mock=False)
    if len(events) == 0:
        print("Database events table is empty. Running historical ingestion...")
        ingest_historical_data(limit=1000)
    else:
        print(f"Database contains {len(events)} historical events. Skipping ingestion.")
        
    # 4. Generate Initial Hotspots
    print("Recalculating spatial hotspots...")
    update_spatial_hotspots()
    
    # 5. Start Real-time Mock stream thread
    stop_event = threading.Event()
    mock_thread = threading.Thread(target=run_mock_stream, args=(stop_event,), daemon=True)
    mock_thread.start()
    
    # 6. Run FastAPI Server
    try:
        host = os.environ.get("HOST", "127.0.0.1")
        port = int(os.environ.get("PORT", 8000))
        print(f"Starting FastAPI web server on http://{host}:{port}")
        uvicorn.run("gridpulse.api.main:app", host=host, port=port, reload=False)
    except KeyboardInterrupt:
        print("Shutting down server...")
    finally:
        stop_event.set()
        mock_thread.join(timeout=2)
        print("Shutdown complete.")

if __name__ == '__main__':
    main()
