import math
import os

def load_env_if_needed():
    if not os.environ.get("GEMINI_API_KEY") and os.path.exists(".env"):
        try:
            with open(".env", "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip().strip('"').strip("'")
        except Exception:
            pass

def generate_gemini_diversion_sign(cause, location, severity, road_closure):
    load_env_if_needed()
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        # Use gemini-1.5-flash for fast text generation
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""Generate a short, concise, and professional traffic sign board warning message (maximum 80 characters per language, uppercase preferred) for a variable message sign (VMS) board on Bengaluru roads.
Incident Details:
- Cause: {cause}
- Location: {location}
- Severity: {severity}%
- Road Closure Required: {road_closure}

You MUST generate the warning in three languages: English, Kannada, and Hindi.
Return the translations separated by a pipe character '|' in the following format:
English Version | Kannada Version | Hindi Version

Guidelines:
1. Make it very concise, professional, and punchy (e.g. "ACCIDENT AHEAD: DETOUR VIA EXIT 4 | ಮುಂದೆ ಅಪಘಾತ: ಬದಲಿ ಮಾರ್ಗ ಬಳಸಿ | आगे दुर्घटना: वैकल्पिक मार्ग का उपयोग करें").
2. Only output the exact piped format string. Do not include quotes, explanations, markdown, or headers.
"""
        response = model.generate_content(prompt)
        text = response.text.strip().replace('"', '').replace("'", "")
        if text and '|' in text and len(text) < 300:
            return text
    except Exception as e:
        print(f"Gemini diversion sign generation failed: {e}")
    return None

def calculate_optimal_resources(severity_score, event_cause, requires_road_closure, corridor, address, attendance=None):
    # Standardize inputs
    cause = str(event_cause).lower()
    road_closure = str(requires_road_closure).upper() in ['TRUE', 'YES', '1']
    corridor_name = str(corridor) if corridor and str(corridor).lower() != 'nan' else ''
    address_name = str(address) if address and str(address).lower() != 'nan' else ''
    
    # Determine priority-based base values (aligning with frontend logic)
    if severity_score >= 65:
        base_manpower = 12
        base_barricades = 18
    elif severity_score >= 40:
        base_manpower = 8
        base_barricades = 12
    else:
        base_manpower = 4
        base_barricades = 6
        
    # 1. Recommend Manpower (Number of officers)
    extra_manpower = 0
    if road_closure:
        extra_manpower += 3
    if 'accident' in cause:
        extra_manpower += 2
    elif 'logging' in cause or 'flood' in cause:
        extra_manpower += 1
        
    # Scale based on attendance/population
    if attendance and attendance > 1000:
        extra_manpower += math.floor((attendance - 1000) / 2000.0)
        
    manpower = math.ceil(base_manpower + extra_manpower)
    
    # Scale clamping limits for large events
    max_limit = 12
    if attendance and attendance > 1000:
        max_limit = max(12, min(50, math.ceil(attendance / 1000.0 * 1.5)))
        
    manpower = max(1, min(manpower, max_limit))
    
    # 2. Recommend Barricades
    if road_closure:
        barricades = math.ceil(severity_score / 5.0)
        barricades = max(base_barricades, min(barricades, 25))
    else:
        if 'construction' in cause or 'pot_hole' in cause:
            barricades = math.ceil(severity_score / 8.0)
            barricades = max(base_barricades, min(barricades, 15))
        elif 'breakdown' in cause:
            barricades = 2
        else:
            barricades = base_barricades
            
    # Scale barricades by attendance
    if attendance and attendance > 1000:
        barricades += math.floor((attendance - 1000) / 1500.0)
        max_barricades_limit = max(25 if road_closure else 10, min(80, math.ceil(attendance / 400.0)))
        barricades = min(barricades, max_barricades_limit)
            
    # 3. Formulate Diversion / Traffic Sign Warning message
    location = corridor_name if corridor_name and corridor_name != 'Non-corridor' else address_name
    # Clean location text to keep it short
    if ',' in location:
        location = location.split(',')[0].strip()
    
    location_str = f" at {location}" if location else " ahead"
    
    # Try generating dynamic warning in English, Kannada, and Hindi using Gemini
    gemini_sign = generate_gemini_diversion_sign(cause, location, severity_score, road_closure)
    if gemini_sign:
        diversion_sign = gemini_sign
    else:
        # Static Fallback Warning
        if 'breakdown' in cause:
            diversion_sign = f"HAZARD: Vehicle breakdown{location_str}. Slow down and merge right."
        elif 'accident' in cause:
            diversion_sign = f"ACCIDENT{location_str}: Lanes blocked. Detour via nearest exit."
        elif 'water' in cause or 'logging' in cause:
            diversion_sign = f"FLOOD WARNING: Water logging{location_str}. Expect heavy delays, avoid low lane."
        elif 'construction' in cause:
            diversion_sign = f"ROADWORK{location_str}: Men at work. One-way traffic active."
        elif 'pot' in cause:
            diversion_sign = f"SLOW DOWN: Severe potholes{location_str}. drive carefully."
        elif 'tree' in cause:
            diversion_sign = f"ROAD BLOCKED: Fallen tree{location_str}. Emergency teams clearing path."
        elif 'public' in cause:
            diversion_sign = f"CONGESTION: Public gathering{location_str}. Divert via secondary bypass."
        else:
            diversion_sign = f"TRAFFIC ALERT{location_str}: Expect delays. Follow traffic police signals."
        
    return {
        'manpower_needed': manpower,
        'barricades_needed': barricades,
        'diversion_sign': diversion_sign
    }


def calculate_wardrop_equilibrium(event_id, severity_score, attendance, distance_a, duration_a, distance_b, duration_b, alpha=0.15, beta=4):
    """
    Rapid 3-iteration optimization loop to equalize travel times (t_a ≈ t_b) on alternate detour routes.
    Uses the Wardrop User Equilibrium Principle via BPR (Bureau of Public Roads) Link Delay Functions:
        t_a(v_a) = t0_a * (1 + alpha * (v_a / C_a) ^ beta)
    """
    # 1. Estimate total traffic volume to redirect based on severity and attendance
    severity_val = float(severity_score)
    attendance_val = int(attendance) if attendance else 0
    
    # Base redirected traffic volume: severity_score maps to 200 - 2000 vehicles/hour
    base_volume = (severity_val / 100.0) * 1500.0 + 300.0
    
    # Scale volume by attendance factor (simulating spectator traffic)
    if attendance_val > 0:
        base_volume += min(2000.0, attendance_val * 0.15)
        
    total_volume = max(200.0, min(4000.0, base_volume))
    
    # 2. Determine design capacities dynamically based on event_id hash for stable variety
    import hashlib
    h = int(hashlib.md5(str(event_id).encode('utf-8')).hexdigest(), 16)
    
    # Capacity range: 1000 - 1800 for Corridor Alpha (A), 800 - 1400 for Corridor Beta (B)
    capacity_a = float(1000 + (h % 5) * 200) # e.g. 1000, 1200, 1400, 1600, 1800
    capacity_b = float(800 + ((h // 5) % 4) * 200) # e.g. 800, 1000, 1200, 1400
    
    # 3. Free-flow travel times (t0) in minutes
    t0_a = float(duration_a) / 60.0 # seconds to minutes
    t0_b = float(duration_b) / 60.0 # seconds to minutes
    
    if t0_a <= 0:
        t0_a = 1.0
    if t0_b <= 0:
        t0_b = 1.0
    
    # Rapid 3-iteration optimization loop (Bisection) to equalize t_a and t_b
    low = 0.0
    high = total_volume
    v_a = (low + high) / 2.0
    
    for iteration in range(3):
        v_b = total_volume - v_a
        
        # BPR Link Delay travel time (minutes)
        t_a = t0_a * (1.0 + alpha * ((v_a / capacity_a) ** beta))
        t_b = t0_b * (1.0 + alpha * ((v_b / capacity_b) ** beta))
        
        if t_a > t_b:
            # Route A is slower: shift volume from A to B (decrease v_a)
            high = v_a
        else:
            # Route B is slower: shift volume from B to A (increase v_a)
            low = v_a
        v_a = (low + high) / 2.0
        
    v_b = total_volume - v_a
    t_a = t0_a * (1.0 + alpha * ((v_a / capacity_a) ** beta))
    t_b = t0_b * (1.0 + alpha * ((v_b / capacity_b) ** beta))
    
    # Calculate final percentage splits
    split_a = int(round((v_a / total_volume) * 100))
    # Keep total split strictly equal to 100
    split_b = 100 - split_a
    
    return {
        'total_volume': round(total_volume, 1),
        'capacity_a': capacity_a,
        'capacity_b': capacity_b,
        'v_a': round(v_a, 1),
        'v_b': round(v_b, 1),
        't0_a': round(t0_a, 2),
        't0_b': round(t0_b, 2),
        't_a': round(t_a, 2),
        't_b': round(t_b, 2),
        'split_a': split_a,
        'split_b': split_b,
        'iterations': 3
    }

