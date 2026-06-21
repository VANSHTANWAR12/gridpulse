import sqlite3
import os

DB_PATH = 'gridpulse.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create events table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            event_type TEXT,
            latitude REAL,
            longitude REAL,
            address TEXT,
            event_cause TEXT,
            requires_road_closure TEXT,
            start_datetime TEXT,
            end_datetime TEXT,
            status TEXT,
            police_station TEXT,
            corridor TEXT,
            priority TEXT,
            description TEXT,
            veh_type TEXT,
            created_date TEXT,
            is_mock INTEGER DEFAULT 0
        )
    ''')
    
    # Create hotspots table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hotspots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            h3_index TEXT UNIQUE,
            latitude REAL,
            longitude REAL,
            event_count INTEGER,
            avg_severity REAL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''''')
    
    # Create recommendations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations (
            event_id TEXT PRIMARY KEY,
            severity_score REAL,
            estimated_duration REAL,
            manpower_needed INTEGER,
            barricades_needed INTEGER,
            diversion_sign TEXT,
            FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
        )
    ''')
    
    # Create planned_events table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS planned_events (
            id TEXT PRIMARY KEY,
            name TEXT,
            event_cause TEXT,
            latitude REAL,
            longitude REAL,
            start_datetime TEXT,
            duration_hours INTEGER,
            attendance INTEGER,
            priority TEXT,
            status TEXT DEFAULT 'scheduled'
        )
    ''')
    
    # Create event_outcomes table for post-event learning
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS event_outcomes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL,
            event_name TEXT,
            event_cause TEXT,
            predicted_severity REAL,
            predicted_manpower INTEGER,
            predicted_barricades INTEGER,
            predicted_duration REAL,
            actual_attendance INTEGER,
            actual_duration_hours REAL,
            actual_peak_severity REAL,
            actual_manpower_deployed INTEGER,
            actual_barricades_used INTEGER,
            severity_accuracy REAL,
            manpower_accuracy REAL,
            barricade_accuracy REAL,
            overall_accuracy REAL,
            outcome_notes TEXT,
            completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES planned_events (id)
        )
    ''')
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'operator',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("SQLite Database initialized at", DB_PATH)

def clear_mock_events():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE is_mock = 1")
    conn.commit()
    conn.close()

def insert_event(event_dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO events (
            id, event_type, latitude, longitude, address, event_cause, 
            requires_road_closure, start_datetime, end_datetime, status, 
            police_station, corridor, priority, description, veh_type, created_date, is_mock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        event_dict.get('id'),
        event_dict.get('event_type'),
        event_dict.get('latitude'),
        event_dict.get('longitude'),
        event_dict.get('address'),
        event_dict.get('event_cause'),
        event_dict.get('requires_road_closure'),
        event_dict.get('start_datetime'),
        event_dict.get('end_datetime'),
        event_dict.get('status'),
        event_dict.get('police_station'),
        event_dict.get('corridor'),
        event_dict.get('priority'),
        event_dict.get('description'),
        event_dict.get('veh_type'),
        event_dict.get('created_date'),
        event_dict.get('is_mock', 0)
    ))
    conn.commit()
    conn.close()

def get_all_events(include_mock=True, active_only=False):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM events"
    params = []
    
    conditions = []
    if not include_mock:
        conditions.append("is_mock = 0")
    if active_only:
        conditions.append("status IN ('active', 'open')")
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY start_datetime DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_event_by_id(event_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def save_hotspots(hotspot_list):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Clear existing hotspots first
    cursor.execute("DELETE FROM hotspots")
    for h in hotspot_list:
        cursor.execute('''
            INSERT OR REPLACE INTO hotspots (h3_index, latitude, longitude, event_count, avg_severity)
            VALUES (?, ?, ?, ?, ?)
        ''', (h['h3_index'], h['latitude'], h['longitude'], h['event_count'], h['avg_severity']))
    conn.commit()
    conn.close()

def get_hotspots():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hotspots ORDER BY event_count DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def save_recommendation(rec_dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO recommendations (
            event_id, severity_score, estimated_duration, manpower_needed, barricades_needed, diversion_sign
        ) VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        rec_dict['event_id'],
        rec_dict['severity_score'],
        rec_dict['estimated_duration'],
        rec_dict['manpower_needed'],
        rec_dict['barricades_needed'],
        rec_dict['diversion_sign']
    ))
    conn.commit()
    conn.close()

def get_recommendation_by_event(event_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM recommendations WHERE event_id = ?", (event_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_events_with_recommendations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT e.*, r.severity_score, r.estimated_duration, r.manpower_needed, r.barricades_needed, r.diversion_sign
        FROM events e
        LEFT JOIN recommendations r ON e.id = r.event_id
        ORDER BY e.start_datetime DESC
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_planned_events():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM planned_events ORDER BY start_datetime ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def insert_planned_event(event_dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO planned_events (
            id, name, event_cause, latitude, longitude, start_datetime, duration_hours, attendance, priority, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        event_dict.get('id'),
        event_dict.get('name'),
        event_dict.get('event_cause'),
        event_dict.get('latitude'),
        event_dict.get('longitude'),
        event_dict.get('start_datetime'),
        event_dict.get('duration_hours'),
        event_dict.get('attendance'),
        event_dict.get('priority'),
        event_dict.get('status', 'scheduled')
    ))
    conn.commit()
    conn.close()

def delete_planned_event(event_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = OFF")
    cursor.execute("DELETE FROM planned_events WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()

def update_planned_event_status(event_id, status):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE planned_events SET status = ? WHERE id = ?", (status, event_id))
    conn.commit()
    conn.close()

def insert_event_outcome(outcome_dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO event_outcomes (
            event_id, event_name, event_cause, predicted_severity, predicted_manpower, predicted_barricades, predicted_duration,
            actual_attendance, actual_duration_hours, actual_peak_severity,
            actual_manpower_deployed, actual_barricades_used,
            severity_accuracy, manpower_accuracy, barricade_accuracy, overall_accuracy,
            outcome_notes, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        outcome_dict.get('event_id'),
        outcome_dict.get('event_name'),
        outcome_dict.get('event_cause'),
        outcome_dict.get('predicted_severity'),
        outcome_dict.get('predicted_manpower'),
        outcome_dict.get('predicted_barricades'),
        outcome_dict.get('predicted_duration'),
        outcome_dict.get('actual_attendance'),
        outcome_dict.get('actual_duration_hours'),
        outcome_dict.get('actual_peak_severity'),
        outcome_dict.get('actual_manpower_deployed'),
        outcome_dict.get('actual_barricades_used'),
        outcome_dict.get('severity_accuracy'),
        outcome_dict.get('manpower_accuracy'),
        outcome_dict.get('barricade_accuracy'),
        outcome_dict.get('overall_accuracy'),
        outcome_dict.get('outcome_notes', ''),
        outcome_dict.get('completed_at')
    ))
    conn.commit()
    conn.close()

def get_event_outcomes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT o.*, p.start_datetime 
        FROM event_outcomes o
        LEFT JOIN planned_events p ON o.event_id = p.id
        ORDER BY o.completed_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_outcome_by_event_id(event_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM event_outcomes WHERE event_id = ?", (event_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_user(username, password_hash, role='operator'):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (username, password_hash, role)
            VALUES (?, ?, ?)
        ''', (username, password_hash, role))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    finally:
        conn.close()
    return success

def get_user(username):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_event_outcome(outcome_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM event_outcomes WHERE id = ?", (outcome_id,))
    conn.commit()
    conn.close()
