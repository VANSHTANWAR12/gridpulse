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
