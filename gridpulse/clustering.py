import h3
import numpy as np
import datetime
from sklearn.cluster import DBSCAN
from gridpulse.database import get_db_connection, save_hotspots, get_events_with_recommendations

def perform_dbscan_clustering(events_list, eps_km=0.5, min_samples=2):
    """
    Performs DBSCAN clustering on coordinates of events.
    Adds a 'cluster_id' field to each event dict.
    """
    if len(events_list) == 0:
        return []
    
    # Extract coordinates
    coords = []
    for e in events_list:
        coords.append([float(e['latitude']), float(e['longitude'])])
        
    coords = np.array(coords)
    
    # Convert eps from km to radians for Haversine distance
    # Earth's radius is ~6371 km
    kms_per_radian = 6371.0088
    epsilon = eps_km / kms_per_radian
    
    # Run DBSCAN
    db = DBSCAN(eps=epsilon, min_samples=min_samples, metric='haversine')
    # Haversine expects coords in radians: [lat_rad, lon_rad]
    coords_rad = np.radians(coords)
    db.fit(coords_rad)
    
    labels = db.labels_
    
    for i, e in enumerate(events_list):
        e['cluster_id'] = int(labels[i])
        
    return events_list

def update_spatial_hotspots(resolution=8):
    """
    Aggregates active/all events into H3 hexagonal bins.
    Computes count and average severity score per hex cell.
    Saves results to the hotspots table.
    """
    # Fetch all events with recommendations
    events = get_events_with_recommendations()
    
    if not events:
        print("No events to cluster for hotspots.")
        return
    
    hex_buckets = {}
    
    for e in events:
        try:
            lat = float(e['latitude'])
            lon = float(e['longitude'])
            
            # Map coordinates to H3 hex cell
            h3_cell = h3.latlng_to_cell(lat, lon, resolution)
            
            # Get severity score
            sev = e.get('severity_score')
            if sev is None or str(sev) == 'None':
                sev = 40.0 # Default fallback
            else:
                sev = float(sev)
                
            if h3_cell not in hex_buckets:
                hex_buckets[h3_cell] = {
                    'count': 0,
                    'severity_sum': 0.0
                }
                
            hex_buckets[h3_cell]['count'] += 1
            hex_buckets[h3_cell]['severity_sum'] += sev
        except Exception as ex:
            print(f"Error mapping event {e.get('id')} to H3: {ex}")
            continue
            
    hotspots_to_save = []
    for h3_index, data in hex_buckets.items():
        try:
            # Filter out low-density outlier cells to keep the map visualization clean and premium
            if data['count'] >= 8:
                # Get cell centroid coordinate
                lat, lon = h3.cell_to_latlng(h3_index)
                avg_sev = round(data['severity_sum'] / data['count'], 1)
                
                hotspots_to_save.append({
                    'h3_index': h3_index,
                    'latitude': lat,
                    'longitude': lon,
                    'event_count': data['count'],
                    'avg_severity': avg_sev
                })
        except Exception as ex:
            print(f"Error computing cell coordinates for {h3_index}: {ex}")
            
    save_hotspots(hotspots_to_save)
    print(f"Updated {len(hotspots_to_save)} spatial hotspots.")
