import { descriptionTranslations } from './descriptionTranslations';

export const translations = {
    en: {
        "logo-title": "GridPulse",
        "logo-tagline": "ASTRAM CONGESTION MITIGATOR",
        "header-tagline": "Astram traffic control command center predictive operations desk",
        "switch-to-2d": "Switch to 2D Map",
        "switch-to-3d": "Switch to 3D Map",
        "stat-active-events-lbl": "ACTIVE EVENTS",
        "stat-peak-severity-lbl": "PEAK SEVERITY",
        "stat-manpower-lbl": "MANPOWER DEPLOYED",
        "stat-barricades-lbl": "BARRICADES PLACED",
        "sim-controls-title": "LIVE SIMULATION CONTROLS",
        "sim-console-subtitle": "Astram forecasting and dynamic flow simulator",
        "sim-preset-prompt": "Select a pre-configured template or click map coordinates:",
        "preset-desc": "Select a pre-configured template to run simulation immediately:",
        "preset-peenya-lbl": "Peenya Breakdown",
        "preset-yelahanka-lbl": "Yelahanka Flood",
        "preset-hal-lbl": "HAL Accident",
        "preset-peenya-btn": "Peenya",
        "preset-yelahanka-btn": "Yelahanka",
        "preset-hal-btn": "HAL",
        "step-1-lbl": "Step 1: Set Location",
        "step-1-desc": "Click on the map or use a Preset above to fill coordinates.",
        "lat-lbl": "Latitude",
        "lon-lbl": "Longitude",
        "step-2-lbl": "Step 2: Configure Incident",
        "step-2-desc": "Set cause, priority, and road closure options.",
        "cause-lbl": "Incident Cause",
        "priority-lbl": "Priority Level",
        "type-lbl": "Incident Type",
        "closure-lbl": "Road Closure Required?",
        "desc-lbl": "Incident Description",
        "step-3-lbl": "Step 3: Run Model",
        "step-3-desc": "Run AI forecasting & resource optimization.",
        "btn-simulate-lbl": "Run Predictive Simulation",
        "btn-spawn-mock": "Spawn Mock",
        "btn-clear-data": "Clear Data",
        "alerts-feed-title": "Active Alerts Feed",
        "analysis-title": "Predictive Analysis & Mitigation Plan",
        "analysis-subtitle": "Select an incident from the feed or run a simulation to generate resource allocations.",
        "placeholder-title": "No Incident Selected",
        "placeholder-desc": "Select an incident from the active alerts feed or use the simulation console to generate optimal resources and clearance duration predictions.",
        "rec-event-lbl": "Event ID",
        "rec-location-lbl": "Location",
        "rec-severity-lbl": "Predicted Congestion Severity",
        "rec-duration-lbl": "Est. Clearance Duration",
        "rec-opt-lbl": "Optimal Resource Allocation",
        "rec-officers-lbl": "Traffic Officers",
        "rec-barricades-lbl": "Barricades",
        "rec-sign-lbl": "Recommended Sign Board Warning",
        "chat-header-lbl": "Astram Copilot",
        "chat-placeholder": "Ask Copilot...",
        "chat-reset-title": "Reset Session",
        "chat-reset-msg": "Conversation history has been cleared.",
        "analytics-badge-lbl": "Analytics",
        "drawer-title": "Operational Intelligence Analytics",
        "chart-causes-title": "Incident Categories Breakdown",
        "chart-severities-title": "Top 5 Highest Severity Bottlenecks",
        "nav-monitor": "Monitor Map",
        "nav-analytics": "Operational Analytics",
        "nav-weather": "Weather Desk",
        "simulated": "Simulated",
        "cause-accident": "Accident",
        "cause-breakdown": "Vehicle Breakdown",
        "cause-waterlogging": "Water Logging / Flood",
        "cause-construction": "Road Construction",
        "cause-potholes": "Potholes / Bad Roads",
        "cause-treefall": "Fallen Tree",
        "cause-publicevent": "Public Event",
        "cause-others": "Others",
        "cause-congestion": "Congestion",
        "cause-roadconditions": "Road Conditions",
        "cause-vipmovement": "VIP Movement",
        "cause-procession": "Procession",
        "cause-protest": "Protest",
        "cause-vehiclebreakdown": "Vehicle Breakdown",
        "popup-cause": "Cause",
        "popup-priority": "Priority",
        "popup-start": "Start",
        "popup-select-sim": "Select Simulation",
        "priority-high": "High",
        "priority-medium": "Medium",
        "priority-low": "Low",
        "type-unplanned": "Unplanned",
        "type-planned": "Planned",
        "closure-yes": "Yes",
        "closure-no": "No",
        "desc-placeholder": "Description...",
        "severity-low": "Low Delay",
        "severity-moderate": "Moderate Congestion",
        "severity-critical": "Critical Congestion",
        "clearance-prediction": "Clearance Prediction",
        "no-active-telemetry": "No active telemetry data",
        "dependency-graph-title": "Operations Mitigation Dependency Graph",
        "node-insights-title": "Telemetry Node Insights",
        "node-insights-placeholder": "Select an incident from the alerts feed to inspect its mitigation node mapping.",
        "focus-incident-node": "Focus Incident Node",
        "dependent-sop-protocol": "DEPENDENT SOP PROTOCOL",
        "sop-section-title": "Bengaluru Traffic SOP Section 4.2",
        "sop-desc-template": "Requires immediate dispatch of {manpower} Traffic Officers. Road closure status ({closure}) triggers placement of {barricades} warning barricades.",
        "ml-severity-inference": "ML SEVERITY INFERENCE",
        "model-weight-score": "Model Weight score:",
        "clearance-est": "Clearance Est.:",
        "hours": "hours",
        "recommended-public-signage": "RECOMMENDED PUBLIC SIGNAGE",
        "weather-loading": "Loading real-time atmospheric telemetry...",
        "weather-live-telemetry": "LIVE TELEMETRY FEED",
        "weather-temp-lbl": "Temperature",
        "weather-humidity-lbl": "Humidity",
        "weather-wind-lbl": "Wind Speed",
        "weather-rain-lbl": "Precipitation",
        "weather-station-coords": "Station Coordinates: 12.9785° N, 77.5946° E",
        "weather-ml-impact-title": "ML Operational Congestion Impact",
        "weather-ml-multiplier-nominal": "Nominal Flow Factor",
        "weather-ml-multiplier-escalated": "Escalated Delay Multiplier",
        "weather-nominal-desc": "Standard weather conditions detected. ML prediction engines are operating with zero weather penalty bias.",
        "weather-escalated-desc": "Active atmospheric conditions ({condition}) scale current road segment congestion severity indexes by {percent}%.",
        "ml-model-scaling-coefficients": "ML Model Severity Scaling Coefficients",
        "weather-clear-sunny": "Clear / Sunny / Partly Cloudy",
        "weather-clear-sunny-val": "1.00x Base",
        "weather-foggy": "Foggy / Low Visibility",
        "weather-foggy-val": "1.15x Speed Decay",
        "weather-rain": "Active Drizzle / Moderate Rain",
        "weather-rain-val": "1.25x Hydrological Friction",
        "weather-thunderstorm": "Thunderstorm / Severe Flood Risk",
        "weather-thunderstorm-val": "1.45x Grid Shutdown Penalty",
        "critical-flood-alert": "CRITICAL CORRIDOR FLOOD ALERT ACTIVE",
        "critical-flood-alert-desc": "Traffic flow speeds on lower-elevation arterial corridors are automatically scaled down. Deployed resources are advised to stage barricades at known high-water spots.",
        "chat-thinking": "Copilot is thinking...",
        "chat-online": "Gemini Online",
        "chat-offline": "Offline Mode",
        "graph-no-incident": "No Active Incident Selected to trace dependencies.",
        "graph-node-sop": "SOP-Section 4",
        "graph-node-allocation": "Allocation Rules",
        "graph-node-police": "Traffic Police",
        "graph-node-officers": "{count} Officers",
        "graph-node-barricades": "Barricades",
        "graph-node-placed": "{count} Placed",
        "graph-node-warning": "Warning Sign",
        "graph-node-vms": "VMS Alert Active",
        "graph-node-road": "Bengaluru Road",
        "weather-cond-clear": "Clear",
        "weather-cond-partly-cloudy": "Partly Cloudy",
        "weather-cond-foggy": "Foggy",
        "weather-cond-drizzle-rain": "Drizzle/Rain",
        "weather-cond-snow": "Snow",
        "weather-cond-thunderstorm": "Thunderstorm",
        "legend-title": "MAP TELEMETRY LEGEND",
        "legend-high": "High Severity (>=65%)",
        "legend-medium": "Medium Severity (40-64%)",
        "legend-low": "Low Severity (<40%)",
        "legend-hotspot": "Recurrent H3 Hotspot",
        "focus-plan-btn": "Focus Plan",
        "congested-segment-tooltip": "Congested Segment (Restricted Flow)",
        "detour-route-tooltip": "Calculated Route Detour",
        "popup-severity": "Severity",
        "popup-duration": "Duration",
        "nav-planner": "Pre-Event Planner",
        "planner-title": "Pre-Event Impact Planner",
        "planner-subtitle": "Schedule future planned events and forecast traffic congestion propagation.",
        "btn-schedule-event": "Schedule Planned Event",
        "btn-forecast-propagation": "Run Propagation Forecast",
        "event-name-lbl": "Event Name",
        "event-duration-lbl": "Duration (Hours)",
        "event-attendance-lbl": "Expected Attendance",
        "event-start-lbl": "Start Date & Time",
        "events-list-title": "Scheduled Events",
        "no-events-scheduled": "No events scheduled yet.",
        "time-step-lbl": "Simulation Time Step",
        "resource-pooling-title": "Resource Dispatch Plan",
        "btn-delete-event": "Delete Event",
        "planner-source-depot": "Source Emergency Depot",
        "planner-travel-time": "Est. Dispatch Travel Time",
        "nav-post-event": "Post-Event Insights",
        "post-event-title": "Post-Event Learning System",
        "post-event-subtitle": "Track prediction accuracy and improve model performance over time.",
        "total-events-analyzed": "Events Analyzed",
        "avg-accuracy": "Avg Model Accuracy",
        "best-prediction": "Best Prediction",
        "worst-prediction": "Worst Prediction",
        "log-outcome-btn": "Log Actual Outcomes",
        "submit-outcome-btn": "Submit Outcome",
        "learning-trend-title": "Model Learning Trend",
        "predicted-vs-actual": "Predicted vs Actual",
        "no-outcomes-yet": "No outcomes logged yet. Complete events and log actuals to train the system.",
        "login-title": "Operator Login",
        "login-btn": "Login",
        "register-title": "Operator Registration",
        "register-btn": "Register",
        "username-lbl": "Username",
        "password-lbl": "Password",
        "logout-btn": "Logout",
        "need-account": "Don't have an account? Register",
        "have-account": "Already have an account? Login",
        "auth-invalid-credentials": "Invalid username or password",
        "auth-username-exists": "Username already exists",
        "auth-success-register": "Registration successful! You can now log in.",
        "auth-error-generic": "Authentication error",
        "automated-roadblock-req": "AUTOMATED ROADBLOCK REQ",
        "roadblock-yes": "YES",
        "roadblock-no": "NO",
        "roadblock-yes-desc": "Emergency Closure Recommended",
        "roadblock-no-desc": "Standard Traffic Flow Maintained",
        "roi-title": "PROJECTED OPERATIONAL ROI",
        "roi-carbon": "CARBON MITIGATED",
        "roi-economic": "ECONOMIC LOSS PREVENTED",
        "copilot-badge": "Copilot",
        "planner-sidebar-instruction": "👈 Click or schedule an event from the left sidebar to start the traffic propagation simulation.",
        "placeholder-rally": "e.g. Political Rally",
        "forecast-12h-title": "12-Hour Operational Forecast",
        "rec-route-title": "RECOMMENDED DIVERSION PLAN",
        "rec-route-sub": "OSRM Dynamic Detour",
        "rec-route-fallback": "Algorithmic Fallback",
        "rec-route-loading": "Calculating dynamic detours...",
        "rec-route-empty": "Select an incident to view diversion plan",
        "rec-route-status": "OSRM Optimized",
        "rec-route-distance": "Distance",
        "rec-route-time": "Time",
        "rec-route-mins": "mins",
        "rec-route-km": "km"
    },
    kn: {
        "logo-title": "ಗ್ರಿಡ್ ಪಲ್ಸ್",
        "logo-tagline": "ಅಸ್ತ್ರಮ್ ದಟ್ಟಣೆ ನಿವಾರಕ",
        "header-tagline": "ಅಸ್ತ್ರಮ್ ಸಂಚಾರ ನಿಯಂತ್ರಣ ಕಮಾಂಡ್ ಸೆಂಟರ್ ಮುನ್ಸೂಚಕ ಕಾರ್ಯಾಚರಣೆಗಳ ಡೆಸ್ಕ್",
        "switch-to-2d": "2D ನಕ್ಷೆಗೆ ಬದಲಾಯಿಸಿ",
        "switch-to-3d": "3D ನಕ್ಷೆಗೆ ಬದಲಾಯಿಸಿ",
        "stat-active-events-lbl": "ಸಕ್ರಿಯ ಘಟನೆಗಳು",
        "stat-peak-severity-lbl": "ಗರಿಷ್ಠ ದಟ್ಟಣೆ ತೀವ್ರತೆ",
        "stat-manpower-lbl": "ನಿಯೋಜಿಸಲಾದ ಸಿಬ್ಬಂದಿ",
        "stat-barricades-lbl": "ಅಳವಡಿಸಲಾದ ಬ್ಯಾರಿಕೇಡ್‌ಗಳು",
        "sim-controls-title": "ಲೈವ್ ಸಿಮ್ಯುಲೇಶನ್ ನಿಯಂತ್ರಣಗಳು",
        "sim-console-subtitle": "ಅಸ್ತ್ರಮ್ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಕಾರ್ಯಾಚರಣೆ ಸಿಮ್ಯುಲೇಟರ್",
        "sim-preset-prompt": "ಮುಂಚಿತವಾಗಿ ಕಾನ್ಫಿಗರ್ ಮಾಡಿದ ಟೆಂಪ್ಲೇಟ್ ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ನಕ್ಷೆಯ ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ:",
        "preset-desc": "ತಕ್ಷಣ ಸಿಮ್ಯುಲೇಶನ್ ರನ್ ಮಾಡಲು ಮುಂಚಿತವಾಗಿ ಕಾನ್ಫಿಗರ್ ಮಾಡಿದ ಟೆಂಪ್ಲೇಟ್ ಆಯ್ಕೆಮಾಡಿ:",
        "preset-peenya-lbl": "ಪೀಣ್ಯ ಬ್ರೇಕ್‌ಡೌನ್",
        "preset-yelahanka-lbl": "ಯಲಹಂಕ ಪ್ರವಾಹ",
        "preset-hal-lbl": "HAL ಅಪಘಾತ",
        "preset-peenya-btn": "ಪೀಣ್ಯ",
        "preset-yelahanka-btn": "ಯಲಹಂಕ",
        "preset-hal-btn": "HAL",
        "step-1-lbl": "ಹಂತ ೧: ಸ್ಥಳವನ್ನು ಹೊಂದಿಸಿ",
        "step-1-desc": "ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ತುಂಬಲು ನಕ್ಷೆಯ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ ಅಥವಾ ಮೇಲಿನ ಪ್ರಿಸೆಟ್ ಬಳಸಿ.",
        "lat-lbl": "ಅಕ್ಷಾಂಶ",
        "lon-lbl": "ರೇಖಾಂಶ",
        "step-2-lbl": "ಹಂತ ೨: ಘಟನೆಯನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡಿ",
        "step-2-desc": "ಕಾರಣ, ಆದ್ಯತೆ ಮತ್ತು ರಸ್ತೆ ಮುಚ್ಚುವ ಆಯ್ಕೆಗಳನ್ನು ಹೊಂದಿಸಿ.",
        "cause-lbl": "ಘಟನೆಯ ಕಾರಣ",
        "priority-lbl": "ಆದ್ಯತೆಯ ಮಟ್ಟ",
        "type-lbl": "ಘಟನೆಯ ಪ್ರಕಾರ",
        "closure-lbl": "ರಸ್ತೆ ಮುಚ್ಚುವ ಅಗತ್ಯವಿದೆಯೇ?",
        "desc-lbl": "ಘಟನೆಯ ವಿವರಣೆ",
        "step-3-lbl": "ಹಂತ ೩: ಮಾದರಿಯನ್ನು ರನ್ ಮಾಡಿ",
        "step-3-desc": "AI ಮುನ್ಸೂಚನೆ ಮತ್ತು ಸಂಪನ್ಮೂಲ ಆಪ್ಟಿಮೈಸೇಶನ್ ರನ್ ಮಾಡಿ.",
        "btn-simulate-lbl": "ಮುನ್ಸೂಚಕ ಸಿಮ್ಯುಲೇಶನ್ ರನ್ ಮಾಡಿ",
        "btn-spawn-mock": "ಅಣಕು ಘಟನೆ ಸೃಜಿಸಿ",
        "btn-clear-data": "ಡೇಟಾ ತೆರವುಗೊಳಿಸಿ",
        "alerts-feed-title": "ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳ ಫೀಡ್",
        "analysis-title": "ಮುನ್ಸೂಚಕ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ತಗ್ಗಿಸುವಿಕೆ ಯೋಜನೆ",
        "analysis-subtitle": "ಸಂಪನ್ಮೂಲ ಹಂಚಿಕೆಗಳನ್ನು ರಚಿಸಲು ಫೀಡ್‌ನಿಂದ ಘಟನೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಸಿಮ್ಯುಲೇಶನ್ ರನ್ ಮಾಡಿ.",
        "placeholder-title": "ಯಾವುದೇ ಘಟನೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ",
        "placeholder-desc": "ಅತ್ಯುತ್ತಮ ಸಂಪನ್ಮೂಲಗಳು ಮತ್ತು ತೆರವುಗೊಳಿಸುವಿಕೆಯ ಅವಧಿಯ ಮುನ್ಸೂಚನೆಗಳನ್ನು ರಚಿಸಲು ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳ ಫೀಡ್‌ನಿಂದ ಘಟನೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಸಿಮ್ಯುಲೇಶನ್ ಕನ್ಸೋಲ್ ಬಳಸಿ.",
        "rec-event-lbl": "ಘಟನೆಯ ಐಡಿ",
        "rec-location-lbl": "ಸ್ಥಳ",
        "rec-severity-lbl": "ಊಹಿಸಲಾದ ದಟ್ಟಣೆ ತೀವ್ರತೆ",
        "rec-duration-lbl": "ಅಂದಾಜು ತೆರವುಗೊಳಿಸುವ ಅವಧಿ",
        "rec-opt-lbl": "ಅತ್ಯುತ್ತಮ ಸಂಪನ್ಮೂಲ ಹಂಚಿಕೆ",
        "rec-officers-lbl": "ಸಂಚಾರ ಪೊಲೀಸರು",
        "rec-barricades-lbl": "ಬ್ಯಾರಿಕೇಡ್‌ಗಳು",
        "rec-sign-lbl": "ಶಿಫಾರಸು ಮಾಡಿದ ಸಂಕೇತ ಫಲಕ ಎಚ್ಚರಿಕೆ",
        "chat-header-lbl": "ಅಸ್ತ್ರಮ್ ಕೊಪೈಲಟ್",
        "chat-placeholder": "ಕೊಪೈಲಟ್‌ಗೆ ಕೇಳಿ...",
        "chat-reset-title": "ಅಧಿವೇಶನ ಮರುಹೊಂದಿಸಿ",
        "chat-reset-msg": "ಸಂಭಾಷಣೆಯ ಇತಿಹಾಸವನ್ನು ತೆರವುಗೊಳಿಸಲಾಗಿದೆ.",
        "analytics-badge-lbl": "ಅನಲಿಟಿಕ್ಸ್",
        "drawer-title": "ಕಾರ್ಯಾಚರಣೆಯ ಬುದ್ಧಿಮತ್ತೆ ವಿಶ್ಲೇಷಣೆ",
        "chart-causes-title": "ಘಟನೆ ವರ್ಗಗಳ ವಿಭಜನೆ",
        "chart-severities-title": "ಟಾಪ್ ೫ ಅತಿ ಹೆಚ್ಚಿನ ತೀವ್ರತೆಯ ಅಡಚಣೆಗಳು",
        "nav-monitor": "ನಕ್ಷೆ ವೀಕ್ಷಣೆ",
        "nav-analytics": "ಕಾರ್ಯಾಚರಣೆಯ ವಿಶ್ಲೇಷಣೆ",
        "nav-weather": "ಹವಾಮಾನ ಡೆಸ್ಕ್",
        "simulated": "ಸಿಮ್ಯುಲೇಟೆಡ್",
        "cause-accident": "ಅಪಘಾತ",
        "cause-breakdown": "ವಾಹನ ಕೆಟ್ಟುಹೋಗಿರುವುದು",
        "cause-waterlogging": "ನೀರು ನಿಲ್ಲುವುದು / ಪ್ರವಾಹ",
        "cause-construction": "ರಸ್ತೆ ಕಾಮಗಾರಿ",
        "cause-potholes": "ಗುಂಡಿಗಳು / ಕೆಟ್ಟ ರಸ್ತೆಗಳು",
        "cause-treefall": "ಮರ ಬಿದ್ದಿರುವುದು",
        "cause-publicevent": "ಸಾರ್ವಜನಿಕ ಕಾರ್ಯಕ್ರಮ",
        "cause-others": "ಇತರೆ",
        "cause-congestion": "ಸಂಚಾರ ದಟ್ಟಣೆ",
        "cause-roadconditions": "ರಸ್ತೆ ಪರಿಸ್ಥಿತಿಗಳು",
        "cause-vipmovement": "ವಿಐಪಿ ಚಲನೆ",
        "cause-procession": "ಮೆರವಣಿಗೆ",
        "cause-protest": "ಪ್ರತಿಭಟನೆ",
        "cause-vehiclebreakdown": "ವಾಹನ ಕೆಟ್ಟುಹೋಗಿರುವುದು",
        "popup-cause": "ಕಾರಣ",
        "popup-priority": "ಆದ್ಯತೆ",
        "popup-start": "ಪ್ರಾರಂಭ",
        "popup-select-sim": "ಸಿಮ್ಯುಲೇಶನ್ ಆಯ್ಕೆಮಾಡಿ",
        "priority-high": "ಹೆಚ್ಚು",
        "priority-medium": "ಮಧ್ಯಮ",
        "priority-low": "ಕಡಿಮೆ",
        "type-unplanned": "ಯೋಜಿತವಲ್ಲದ",
        "type-planned": "ಯೋಜಿತ",
        "closure-yes": "ಹೌದು",
        "closure-no": "ಇಲ್ಲ",
        "desc-placeholder": "ವಿವರಣೆ...",
        "severity-low": "ಕಡಿಮೆ ವಿಳಂಬ",
        "severity-moderate": "ಮಧ್ಯಮ ದಟ್ಟಣೆ",
        "severity-critical": "ಗಂಭೀರ ದಟ್ಟಣೆ",
        "clearance-prediction": "ತೆರವುಗೊಳಿಸುವ ಮುನ್ಸೂಚನೆ",
        "no-active-telemetry": "ಯಾವುದೇ ಸಕ್ರಿಯ ಟೆಲಿಮೆಟ್ರಿ ಡೇಟಾ ಇಲ್ಲ",
        "dependency-graph-title": "ಕಾರ್ಯಾಚರಣೆಗಳ ತಗ್ಗಿಸುವಿಕೆ ಅವಲಂಬನೆ ಗ್ರಾಫ್",
        "node-insights-title": "ಟೆಲಿಮೆಟ್ರಿ ನೋಡ್ ಒಳನೋಟಗಳು",
        "node-insights-placeholder": "ಅದರ ತಗ್ಗಿಸುವಿಕೆಯ ನೋಡ್ ಮ್ಯಾಪಿಂಗ್ ಅನ್ನು ಪರಿಶೀಲಿಸಲು ಎಚ್ಚರಿಕೆಗಳ ಫೀಡ್‌ನಿಂದ ಘಟನೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
        "focus-incident-node": "ಘಟನೆ ನೋಡ್ ಗಮನಹರಿಸಿ",
        "dependent-sop-protocol": "ಅವಲಂಬಿತ SOP ಪ್ರೋಟೋಕಾಲ್",
        "sop-section-title": "ಬೆಂಗಳೂರು ಸಂಚಾರ SOP ವಿಭಾಗ 4.2",
        "sop-desc-template": "ತಕ್ಷಣ {manpower} ಸಂಚಾರ ಪೊಲೀಸ್ ಅಧಿಕಾರಿಗಳ ನಿಯೋಜನೆ ಅಗತ್ಯವಿದೆ. ರಸ್ತೆ ಮುಚ್ಚುವ ಸ್ಥಿತಿ ({closure}) {barricades} ಎಚ್ಚರಿಕೆ ಬ್ಯಾರಿಕೇಡ್‌ಗಳ ಅಳವಡಿಕೆಯನ್ನು ಪ್ರಚೋದಿಸುತ್ತದೆ.",
        "ml-severity-inference": "ML ತೀವ್ರತೆಯ ತೀರ್ಮಾನ",
        "model-weight-score": "ಮಾದರಿ ತೂಕದ ಸ್ಕೋರ್:",
        "clearance-est": "ಅಂದಾಜು ತೆರವುಗೊಳಿಸುವಿಕೆ:",
        "hours": "ಗಂಟೆಗಳು",
        "recommended-public-signage": "ಶಿಫಾರಸು ಮಾಡಲಾದ ಸಾರ್ವಜನಿಕ ಫಲಕಗಳು",
        "weather-loading": "ನೈಜ-ಸಮಯದ ವಾತಾವರಣದ ಟೆಲಿಮೆಟ್ರಿ ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
        "weather-live-telemetry": "ಲೈವ್ ಟೆಲಿಮೆಟ್ರಿ ಫೀಡ್",
        "weather-temp-lbl": "ತಾಪಮಾನ",
        "weather-humidity-lbl": "ಆರ್ದ್ರತೆ",
        "weather-wind-lbl": "ಗಾಳಿಯ ವೇಗ",
        "weather-rain-lbl": "ಮಳೆ",
        "weather-station-coords": "ನಿಲ್ದಾಣದ ನಿರ್ದೇಶಾಂಕಗಳು: 12.9785° N, 77.5946° E",
        "weather-ml-impact-title": "ML ಕಾರ್ಯಾಚರಣೆಯ ದಟ್ಟಣೆ ಪ್ರಭಾವ",
        "weather-ml-multiplier-nominal": "ಸಾಮಾನ್ಯ ಹರಿವಿನ ಅಂಶ",
        "weather-ml-multiplier-escalated": "ಹೆಚ್ಚಿದ ವಿಳಂಬ ಗುಣಕ",
        "weather-nominal-desc": "ಸಾಮಾನ್ಯ ಹವಾಮಾನ ಪರಿಸ್ಥಿತಿಗಳು ಪತ್ತೆಯಾಗಿವೆ. ML ಮುನ್ಸೂಚನೆ ಇಂಜಿನ್‌ಗಳು ಯಾವುದೇ ಹವಾಮಾನ ದಂಡದ ಪಕ್ಷಪಾತವಿಲ್ಲದೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ.",
        "weather-escalated-desc": "ಸಕ್ರಿಯ ವಾತಾವರಣದ ಪರಿಸ್ಥಿತಿಗಳು ({condition}) ಪ್ರಸ್ತುತ ರಸ್ತೆ ವಿಭಾಗದ ದಟ್ಟಣೆ ತೀವ್ರತೆಯ ಸೂಚ್ಯಂಕವನ್ನು {percent}% ರಷ್ಟು ಹೆಚ್ಚಿಸುತ್ತವೆ.",
        "ml-model-scaling-coefficients": "ML ಮಾದರಿಯ ತೀವ್ರತೆಯ ಸ್ಕೇಲಿಂಗ್ ಗುಣಾಂಕಗಳು",
        "weather-clear-sunny": "ಸ್ಪಷ್ಟ / ಬಿಸಿಲು / ಭಾಗಶಃ ಮೋಡ",
        "weather-clear-sunny-val": "1.00x ಮೂಲಭೂತ",
        "weather-foggy": "ಮಂಜು / ಕಡಿಮೆ ಗೋಚರತೆ",
        "weather-foggy-val": "1.15x ವೇಗ ಕುಸಿತ",
        "weather-rain": "ಚಿಮುಕಿಸುವ ಮಳೆ / ಸಾಧಾರಣ ಮಳೆ",
        "weather-rain-val": "1.25x ಜಲವಿಜ್ಞಾನದ ಘರ್ಷಣೆ",
        "weather-thunderstorm": "ಗುಡುಗು ಸಹಿತ ಮಳೆ / ತೀವ್ರ ಪ್ರವಾಹದ ಅಪಾಯ",
        "weather-thunderstorm-val": "1.45x ಗ್ರಿಡ್ ಸ್ಥಗಿತಗೊಳಿಸುವ ದಂಡ",
        "critical-flood-alert": "ನಿರ್ಣಾಯಕ ಕಾರಿಡಾರ್ ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆ ಸಕ್ರಿಯವಾಗಿದೆ",
        "critical-flood-alert-desc": "ಕಡಿಮೆ ಎತ್ತರದ ಅಪಧಮನಿಯ ಕಾರಿಡಾರ್‌ಗಳಲ್ಲಿ ಸಂಚಾರ ಹರಿವಿನ ವೇಗವನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕಡಿಮೆ ಮಾಡಲಾಗುತ್ತದೆ. ನಿಯೋಜಿಸಲಾದ ಸಂಪನ್ಮೂಲಗಳಿಗೆ ತಿಳಿದಿರುವ ಹೆಚ್ಚಿನ ನೀರಿನ ಸ್ಥಳಗಳಲ್ಲಿ ಬ್ಯಾರಿಕೇಡ್‌ಗಳನ್ನು ಅಳವಡಿಸಲು ಸೂಚಿಸಲಾಗುತ್ತದೆ.",
        "chat-thinking": "ಕೊಪೈಲಟ್ ಯೋಚಿಸುತ್ತಿದೆ...",
        "chat-online": "ಜೆಮಿನಿ ಆನ್‌ಲೈನ್",
        "chat-offline": "ಆಫ್‌ಲೈನ್ ಮೋಡ್",
        "graph-no-incident": "ಅವಲಂಬನೆಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಲು ಯಾವುದೇ ಸಕ್ರಿಯ ಘಟನೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಲಾಗಿಲ್ಲ.",
        "graph-node-sop": "SOP-ವಿಭಾಗ 4",
        "graph-node-allocation": "ಹಂಚಿಕೆ ನಿಯಮಗಳು",
        "graph-node-police": "ಸಂಚಾರ ಪೊಲೀಸ್",
        "graph-node-officers": "{count} ಅಧಿಕಾರಿಗಳು",
        "graph-node-barricades": "ಬ್ಯಾರಿಕೇಡ್‌ಗಳು",
        "graph-node-placed": "{count} ಅಳವಡಿಸಲಾಗಿದೆ",
        "graph-node-warning": "ಎಚ್ಚರಿಕೆ ಚಿಹ್ನೆ",
        "graph-node-vms": "VMS ಎಚ್ಚರಿಕೆ ಸಕ್ರಿಯವಾಗಿದೆ",
        "graph-node-road": "ಬೆಂಗಳೂರು ರಸ್ತೆ",
        "weather-cond-clear": "ಸ್ಪಷ್ಟ",
        "weather-cond-partly-cloudy": "ಭಾಗಶಃ ಮೋಡ",
        "weather-cond-foggy": "ಮಂಜು",
        "weather-cond-drizzle-rain": "ಚಿಮುಕಿಸುವ ಮಳೆ/ಮಳೆ",
        "weather-cond-snow": "ಹಿಮ",
        "weather-cond-thunderstorm": "ಗುಡುಗು ಸಹಿತ ಮಳೆ",
        "legend-title": "ನಕ್ಷೆ ಟೆಲಿಮೆಟ್ರಿ ಲೆಜೆಂಡ್",
        "legend-high": "ಹೆಚ್ಚಿನ ತೀವ್ರತೆ (>=65%)",
        "legend-medium": "ಮಧ್ಯಮ ತೀವ್ರತೆ (40-64%)",
        "legend-low": "ಕಡಿಮೆ ತೀವ್ರತೆ (<40%)",
        "legend-hotspot": "ಮರುಕಳಿಸುವ H3 ಹಾಟ್‌ಸ್ಪಾಟ್",
        "focus-plan-btn": "ಯೋಜನೆ ಗಮನಹರಿಸಿ",
        "popup-severity": "ತೀವ್ರತೆ",
        "popup-duration": "ಅವಧಿ",
        "nav-planner": "ಪೂರ್ವ-ಘಟನೆ ಯೋಜಕ",
        "planner-title": "ಪೂರ್ವ-ಘಟನೆ ಪರಿಣಾಮ ಯೋಜಕ",
        "planner-subtitle": "ಭವಿಷ್ಯದ ಯೋಜಿತ ಘಟನೆಗಳನ್ನು ನಿಗದಿಪಡಿಸಿ ಮತ್ತು ಸಂಚಾರ ದಟ್ಟಣೆ ಪ್ರಸರಣವನ್ನು ಮುನ್ಸೂಚಿಸಿ.",
        "btn-schedule-event": "ಯೋಜಿತ ಘಟನೆ ನಿಗದಿಪಡಿಸಿ",
        "btn-forecast-propagation": "ಪ್ರಸರಣ ಮುನ್ಸೂಚನೆ ಚಲಾಯಿಸಿ",
        "event-name-lbl": "ಘಟನೆಯ ಹೆಸರು",
        "event-duration-lbl": "ಅವಧಿ (ಗಂಟೆಗಳು)",
        "event-attendance-lbl": "ನಿರೀಕ್ಷಿತ ಹಾಜರಾತಿ",
        "event-start-lbl": "ಪ್ರಾರಂಭ ದಿನಾಂಕ ಮತ್ತು ಸಮಯ",
        "events-list-title": "ನಿಗದಿತ ಘಟನೆಗಳು",
        "no-events-scheduled": "ಇನ್ನೂ ಯಾವುದೇ ಘಟನೆಗಳು ನಿಗದಿಯಾಗಿಲ್ಲ.",
        "time-step-lbl": "ಸಿಮ್ಯುಲೇಶನ್ ಸಮಯದ ಹಂತ",
        "resource-pooling-title": "ಸಂಪನ್ಮೂಲ ರವಾನೆ ಯೋಜನೆ",
        "btn-delete-event": "ಘಟನೆ ಅಳಿಸಿ",
        "planner-source-depot": "ಮೂಲ ತುರ್ತು ಡಿಪೋ",
        "planner-travel-time": "ಅಂದಾಜು ರವಾನೆ ಪ್ರಯಾಣ ಸಮಯ",
        "nav-post-event": "ಘಟನೆ ನಂತರದ ಒಳನೋಟಗಳು",
        "post-event-title": "ಘಟನೆ ನಂತರದ ಕಲಿಕೆ ವ್ಯವಸ್ಥೆ",
        "post-event-subtitle": "ಮುನ್ಸೂಚನೆ ನಿಖರತೆಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ ಮತ್ತು ಕಾಲಾನಂತರದಲ್ಲಿ ಮಾದರಿ ಕಾರ್ಯಕ್ಷಮತೆಯನ್ನು ಸುಧಾರಿಸಿ.",
        "total-events-analyzed": "ವಿಶ್ಲೇಷಿಸಿದ ಘಟನೆಗಳು",
        "avg-accuracy": "ಸರಾಸರಿ ಮಾದರಿ ನಿಖರತೆ",
        "best-prediction": "ಅತ್ಯುತ್ತಮ ಮುನ್ಸೂಚನೆ",
        "worst-prediction": "ಕಳಪೆ ಮುನ್ಸೂಚನೆ",
        "log-outcome-btn": "ನಿಜ ಫಲಿತಾಂಶಗಳನ್ನು ದಾಖಲಿಸಿ",
        "submit-outcome-btn": "ಫಲಿತಾಂಶ ಸಲ್ಲಿಸಿ",
        "learning-trend-title": "ಮಾದರಿ ಕಲಿಕೆ ಪ್ರವೃತ್ತಿ",
        "predicted-vs-actual": "ಮುನ್ಸೂಚಿತ vs ನಿಜ",
        "no-outcomes-yet": "ಇನ್ನೂ ಫಲಿತಾಂಶಗಳು ದಾಖಲಾಗಿಲ್ಲ.",
        "login-title": "ಆಪರೇಟರ್ ಲಾಗಿನ್",
        "login-btn": "ಲಾಗಿನ್",
        "register-title": "ಆಪರೇಟರ್ ನೋಂದಣಿ",
        "register-btn": "ನೋಂದಾಯಿಸಿ",
        "username-lbl": "ಬಳಕೆದಾರಹೆಸರು",
        "password-lbl": "ಪಾಸ್‌ವರ್ಡ್",
        "logout-btn": "ಲಾಗ್ ಔಟ್",
        "need-account": "ಖಾತೆ ಇಲ್ಲವೇ? ನೋಂದಾಯಿಸಿ",
        "have-account": "ಈಗಾಗಲೇ ಖಾತೆ ಹೊಂದಿದ್ದೀರಾ? ಲಾಗಿನ್",
        "auth-invalid-credentials": "ಅಮಾನ್ಯ ಬಳಕೆದಾರಹೆಸರು ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್",
        "auth-username-exists": "ಬಳಕೆದಾರಹೆಸರು ಈಗಾಗಲೇ ಅಸ್ತಿತ್ವದಲ್ಲಿದೆ",
        "auth-success-register": "ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ! ನೀವು ಈಗ ಲಾಗಿನ್ ಮಾಡಬಹುದು.",
        "auth-error-generic": "ದೃಢೀಕರಣ ದೋಷ",
        "automated-roadblock-req": "ಸ್ವಯಂಚಾಲಿತ ರಸ್ತೆ ತಡೆ ಅಗತ್ಯತೆ",
        "roadblock-yes": "ಹೌದು",
        "roadblock-no": "ಇಲ್ಲ",
        "roadblock-yes-desc": "ತುರ್ತು ರಸ್ತೆ ಮುಚ್ಚುವಿಕೆಯನ್ನು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ",
        "roadblock-no-desc": "ಸಾಮಾನ್ಯ ಸಂಚಾರ ಹರಿವು ಕಾಯ್ದುಕೊಳ್ಳಲಾಗಿದೆ",
        "roi-title": "ಊಹಿಸಲಾದ ಕಾರ್ಯಾಚರಣೆಯ ROI",
        "roi-carbon": "ಕಾರ್ಬನ್ ಕಡಿತಗೊಳಿಸಲಾಗಿದೆ",
        "roi-economic": "ತಡೆಗಟ್ಟಿದ ಆರ್ಥಿಕ ನಷ್ಟ",
        "copilot-badge": "ಕೊಪೈಲಟ್",
        "planner-sidebar-instruction": "👈 ಸಂಚಾರ ಪ್ರಸರಣ ಸಿಮ್ಯುಲೇಶನ್ ಪ್ರಾರಂಭಿಸಲು ಎಡ ಸೈಡ್‌ಬಾರ್‌ನಿಂದ ಘಟನೆಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ಅಥವಾ ನಿಗದಿಪಡಿಸಿ.",
        "placeholder-rally": "ಉದಾ. ರಾಜಕೀಯ ರ್ಯಾಲಿ",
        "forecast-12h-title": "12-ಗಂಟೆಗಳ ಕಾರ್ಯಾಚರಣೆಯ ಮುನ್ಸೂಚನೆ",
        "rec-route-title": "ಶಿಫಾರಸು ಮಾಡಿದ ತಿರುವು ಯೋಜನೆ",
        "rec-route-sub": "OSRM ಡೈನಾಮಿಕ್ ಪಥ ಬದಲಾವಣೆ",
        "rec-route-fallback": "ಅಲ್ಗಾರಿದಮಿಕ್ ಬ್ಯಾಕಪ್ ಪಥ",
        "rec-route-loading": "ಡೈನಾಮಿಕ್ ಪಥವನ್ನು ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತಿದೆ...",
        "rec-route-empty": "ತಿರುವು ಯೋಜನೆಯನ್ನು ವೀಕ್ಷಿಸಲು ಘಟನೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
        "rec-route-status": "OSRM ಆಪ್ಟಿಮೈಸ್ಡ್",
        "rec-route-distance": "ದೂರ",
        "rec-route-time": "ಸಮಯ",
        "rec-route-mins": "ನಿಮಿಷಗಳು",
        "rec-route-km": "ಕಿಮೀ"
    },
    ui: {
        // Fallback or Hindi
    },
    hi: {
        "logo-title": "ग्रिडपल्स",
        "logo-tagline": "अस्त्रम यातायात शमन यंत्र",
        "header-tagline": "अस्त्रम यातायात नियंत्रण कमांड सेंटर भविष्य कहनेवाला संचालन डेस्क",
        "switch-to-2d": "2D मानचित्र पर स्विच करें",
        "switch-to-3d": "3D मानचित्र पर स्विच करें",
        "stat-active-events-lbl": "सक्रिय घटनाएं",
        "stat-peak-severity-lbl": "उच्चतम तीव्रता",
        "stat-manpower-lbl": "तैनात जनशक्ति",
        "stat-barricades-lbl": "लगाए गए बैरिकेड",
        "sim-controls-title": "लाइव सिमुलेशन नियंत्रण",
        "sim-console-subtitle": "अस्त्रम पूर्वानुमान और परिचालन सिमुलेटर",
        "sim-preset-prompt": "पूर्व-कॉन्फ़िगर किए गए टेम्पलेट का चयन करें या मानचित्र निर्देशांक पर क्लिक करें:",
        "preset-desc": "तुरंत सिमुलेशन चलाने के लिए पूर्व-कॉन्फ़िगर किए गए टेम्पलेट का चयन करें:",
        "preset-peenya-lbl": "पीण्या ब्रेकडाउन",
        "preset-yelahanka-lbl": "यलहंका बाढ़",
        "preset-hal-lbl": "एचएएल दुर्घटना",
        "preset-peenya-btn": "पीण्या",
        "preset-yelahanka-btn": "यलहंका",
        "preset-hal-btn": "एचएएल",
        "step-1-lbl": "चरण १: स्थान निर्धारित करें",
        "step-1-desc": "निर्देशांक भरने के लिए मानचित्र पर क्लिक करें या ऊपर दिए गए प्रीसेट का उपयोग करें।",
        "lat-lbl": "अक्षांश",
        "lon-lbl": "रेखांश",
        "step-2-lbl": "चरण २: घटना को कॉन्फ़िगर करें",
        "step-2-desc": "कारण, प्राथमिकता और सड़क बंद करने के विकल्प निर्धारित करें।",
        "cause-lbl": "घटना का कारण",
        "priority-lbl": "प्राथमिकता स्तर",
        "type-lbl": "घटना का प्रकार",
        "closure-lbl": "क्या सड़क बंद करने की आवश्यकता है?",
        "desc-lbl": "घटना का विवरण",
        "step-3-lbl": "चरण ३: मॉडल चलाएं",
        "step-3-desc": "एआई पूर्वानुमान और संसाधन अनुकूलन चलाएं।",
        "btn-simulate-lbl": "पूर्वानुमानित सिमुलेशन चलाएं",
        "btn-spawn-mock": "मॉक स्पॉन करें",
        "btn-clear-data": "डेटा साफ करें",
        "alerts-feed-title": "सक्रिय अलर्ट फ़ीड",
        "analysis-title": "पूर्वानुमानित विश्लेषण और शमन योजना",
        "analysis-subtitle": "संसाधन आवंटन उत्पन्न करने के लिए फ़ीड से किसी घटना का चयन करें या सिमुलेशन चलाएं।",
        "placeholder-title": "कोई घटना चयनित नहीं",
        "placeholder-desc": "इष्टतम संसाधनों और निकासी अवधि के पूर्वानुमान उत्पन्न करने के लिए सक्रिय अलर्ट फ़ीड से किसी घटना का चयन करें या सिमुलेशन कंसोल का उपयोग करें।",
        "rec-event-lbl": "घटना आईडी",
        "rec-location-lbl": "स्थान",
        "rec-severity-lbl": "अनुमानित यातायात भीड़ तीव्रता",
        "rec-duration-lbl": "अनुमानित निकासी अवधि",
        "rec-opt-lbl": "इष्टतम संसाधन आवंटन",
        "rec-officers-lbl": "यातायात पुलिस अधिकारी",
        "rec-barricades-lbl": "बैरिकेड",
        "rec-sign-lbl": "अनुशंसित संकेत बोर्ड चेतावनी",
        "chat-header-lbl": "अस्त्रम कोपायलट",
        "chat-placeholder": "कोपायलट से पूछें...",
        "chat-reset-title": "सत्र रीसेट करें",
        "chat-reset-msg": "बातचीत का इतिहास साफ कर दिया गया है।",
        "analytics-badge-lbl": "विश्लेषण",
        "drawer-title": "परिचालन खुफिया विश्लेषण",
        "chart-causes-title": "घटना श्रेणियों का विश्लेषण",
        "chart-severities-title": "शीर्ष ५ उच्चतम तीव्रता के अवरोध",
        "nav-monitor": "मानचित्र मॉनिटर",
        "nav-analytics": "परिचालन विश्लेषण",
        "nav-weather": "मौसम डेस्क",
        "simulated": "सिम्युलेटेड",
        "cause-accident": "दुर्घटना",
        "cause-breakdown": "वाहन ब्रेकडाउन",
        "cause-waterlogging": "जलभराव / बाढ़",
        "cause-construction": "सड़क निर्माण",
        "cause-potholes": "गड्ढे / खराब सड़कें",
        "cause-treefall": "पेड़ गिरना",
        "cause-publicevent": "सार्वजनिक कार्यक्रम",
        "cause-others": "अन्य",
        "cause-congestion": "भीड़भाड़",
        "cause-roadconditions": "सड़क की स्थिति",
        "cause-vipmovement": "वीआईपी आवाजाही",
        "cause-procession": "जुलूस",
        "cause-protest": "विरोध प्रदर्शन",
        "cause-vehiclebreakdown": "वाहन ब्रेकडाउन",
        "popup-cause": "कारण",
        "popup-priority": "प्राथमिकता",
        "popup-start": "शुरू",
        "popup-select-sim": "सिमुलेशन चुनें",
        "priority-high": "उच्च",
        "priority-medium": "मध्यम",
        "priority-low": "कम",
        "type-unplanned": "अनियोजित",
        "type-planned": "नियोजित",
        "closure-yes": "हाँ",
        "closure-no": "नहीं",
        "desc-placeholder": "विवरण...",
        "severity-low": "कम देरी",
        "severity-moderate": "मध्यम यातायात",
        "severity-critical": "गंभीर यातायात",
        "clearance-prediction": "निकासी पूर्वानुमान",
        "no-active-telemetry": "कोई सक्रिय टेलीमेट्री डेटा नहीं",
        "dependency-graph-title": "संचालन शमन निर्भरता ग्राफ",
        "node-insights-title": "टेलीमेट्री नोड अंतर्दृष्टि",
        "node-insights-placeholder": "शमन नोड मैपिंग का निरीक्षण करने के लिए अलर्ट फ़ीड से किसी घटना का चयन करें।",
        "focus-incident-node": "घटना नोड पर ध्यान केंद्रित करें",
        "dependent-sop-protocol": "आश्रित एसओपी प्रोटोकॉल",
        "sop-section-title": "बेंगलुरु यातायात एसओपी धारा 4.2",
        "sop-desc-template": "तुरंत {manpower} यातायात पुलिस अधिकारियों की तैनाती आवश्यक है। सड़क बंद होने की स्थिति ({closure}) {barricades} चेतावनी बैरिकेड्स लगाने का निर्देश देती है।",
        "ml-severity-inference": "एमएल गंभीरता अनुमान",
        "model-weight-score": "मॉडल वजन स्कोर:",
        "clearance-est": "अनुमानित निकासी:",
        "hours": "घंटे",
        "recommended-public-signage": "अनुशंसित सार्वजनिक संकेत",
        "weather-loading": "वास्तविक समय वायुमंडलीय टेलीमेट्री लोड हो रही है...",
        "weather-live-telemetry": "लाइव टेलीमेट्री फ़ीड",
        "weather-temp-lbl": "तापमान",
        "weather-humidity-lbl": "आर्द्रता",
        "weather-wind-lbl": "हवा की गति",
        "weather-rain-lbl": "वर्षा",
        "weather-station-coords": "स्टेशन निर्देशांक: 12.9785° N, 77.5946° E",
        "weather-ml-impact-title": "एमएल परिचालन भीड़ प्रभाव",
        "weather-ml-multiplier-nominal": "नाममात्र प्रवाह कारक",
        "weather-ml-multiplier-escalated": "बढ़ी हुई देरी गुणक",
        "weather-nominal-desc": "मानक मौसम की स्थिति का पता चला। एमएल पूर्वानुमान इंजन शून्य मौसम दंड पूर्वाग्रह के साथ काम कर रहे हैं।",
        "weather-escalated-desc": "सक्रिय वायुमंडलीय स्थितियां ({condition}) वर्तमान सड़क खंड की भीड़ की तीव्रता के सूचकांक को {percent}% तक बढ़ा देती हैं।",
        "ml-model-scaling-coefficients": "एमएल मॉडल गंभीरता स्केलिंग गुणांक",
        "weather-clear-sunny": "साफ / धूप / आंशिक रूप से बादल",
        "weather-clear-sunny-val": "1.00x आधार",
        "weather-foggy": "कोहरा / कम दृश्यता",
        "weather-foggy-val": "1.15x गति क्षय",
        "weather-rain": "हल्की बूंदाबांदी / मध्यम बारिश",
        "weather-rain-val": "1.25x जलीय घर्षण",
        "weather-thunderstorm": "आंधी तूफान / गंभीर बाढ़ का खतरा",
        "weather-thunderstorm-val": "1.45x ग्रिड शटडाउन दंड",
        "critical-flood-alert": "महत्वपूर्ण गलियारा बाढ़ चेतावनी सक्रिय",
        "critical-flood-alert-desc": "कम ऊंचाई वाले मुख्य गलियारों पर यातायात प्रवाह की गति स्वचालित रूप से कम हो जाती है। तैनात संसाधनों को ज्ञात जलभराव वाले स्थानों पर बैरिकेड्स लगाने की सलाह दी जाती है।",
        "chat-thinking": "कोपायलट सोच रहा है...",
        "chat-online": "जेमिनी ऑनलाइन",
        "chat-offline": "ऑफ़लाइन मोड",
        "graph-no-incident": "निर्भरता का पता लगाने के लिए कोई सक्रिय घटना चयनित नहीं है।",
        "graph-node-sop": "एसओपी-धारा 4",
        "graph-node-allocation": "आवंटन नियम",
        "graph-node-police": "यातायात पुलिस",
        "graph-node-officers": "{count} अधिकारी",
        "graph-node-barricades": "बैरिकेड",
        "graph-node-placed": "{count} लगाए गए",
        "graph-node-warning": "चेतावनी संकेत",
        "graph-node-vms": "वीएमएस अलर्ट सक्रिय",
        "graph-node-road": "बेंगलुरु सड़क",
        "weather-cond-clear": "साफ",
        "weather-cond-partly-cloudy": "आंशिक रूप से बादल",
        "weather-cond-foggy": "कोहरा",
        "weather-cond-drizzle-rain": "बूंदाबांदी/बारिश",
        "weather-cond-snow": "बर्फ",
        "weather-cond-thunderstorm": "आंधी तूफान",
        "legend-title": "मानचित्र टेलीमेट्री लीजेंड",
        "legend-high": "उच्च गंभीरता (>=65%)",
        "legend-medium": "मध्यम गंभीरता (40-64%)",
        "legend-low": "कम गंभीरता (<40%)",
        "legend-hotspot": "आवर्ती H3 हॉटस्पॉट",
        "focus-plan-btn": "योजना पर ध्यान दें",
        "congested-segment-tooltip": "भीड़भाड़ वाला खंड (सीमित प्रवाह)",
        "detour-route-tooltip": "परिकलित मार्ग परिवर्तन",
        "popup-severity": "गंभीरता",
        "popup-duration": "अवधि",
        "nav-planner": "पूर्व-इवेंट योजनाकार",
        "planner-title": "पूर्व-इवेंट प्रभाव योजनाकार",
        "planner-subtitle": "भविष्य की नियोजित घटनाओं को शेड्यूल करें और ट्रैफ़िक भीड़ के प्रसार का पूर्वानुमान लगाएं।",
        "btn-schedule-event": "नियोजित इवेंट शेड्यूल करें",
        "btn-forecast-propagation": "प्रसार पूर्वानुमान चलाएं",
        "event-name-lbl": "इवेंट का नाम",
        "event-duration-lbl": "अवधि (घंटे)",
        "event-attendance-lbl": "अपेक्षित उपस्थिति",
        "event-start-lbl": "शुरू होने की तिथि और समय",
        "events-list-title": "शेड्यूल किए गए इवेंट",
        "no-events-scheduled": "अभी तक कोई इवेंट शेड्यूल नहीं किया गया है।",
        "time-step-lbl": "सिमुलेशन समय चरण",
        "resource-pooling-title": "संसाधन प्रेषण योजना",
        "btn-delete-event": "इवेंट हटाएं",
        "planner-source-depot": "स्रोत आपातकालीन डिपो",
        "planner-travel-time": "अपेक्षित प्रेषण यात्रा समय",
        "nav-post-event": "पोस्ट-इवेंट अंतर्दृष्टि",
        "post-event-title": "पोस्ट-इवेंट लर्निंग सिस्टम",
        "post-event-subtitle": "भविष्यवाणी सटीकता को ट्रैक करें और समय के साथ मॉडल प्रदर्शन में सुधार करें।",
        "total-events-analyzed": "विश्लेषित इवेंट",
        "avg-accuracy": "औसत मॉडल सटीकता",
        "best-prediction": "सर्वश्रेष्ठ भविष्यवाणी",
        "worst-prediction": "सबसे खराब भविष्यवाणी",
        "log-outcome-btn": "वास्तविक परिणाम दर्ज करें",
        "submit-outcome-btn": "परिणाम जमा करें",
        "learning-trend-title": "मॉडल लर्निंग ट्रेंड",
        "predicted-vs-actual": "अनुमानित vs वास्तविक",
        "no-outcomes-yet": "अभी तक कोई परिणाम दर्ज नहीं किया गया है।",
        "login-title": "ऑपरेटर लॉगिन",
        "login-btn": "लॉगिन",
        "register-title": "ऑपरेटर पंजीकरण",
        "register-btn": "पंजीकरण करें",
        "username-lbl": "उपयोगकर्ता नाम",
        "password-lbl": "पासवर्ड",
        "logout-btn": "लॉग आउट",
        "need-account": "खाता नहीं है? पंजीकरण करें",
        "have-account": "पहले से ही खाता है? लॉगिन",
        "auth-invalid-credentials": "अमान्य उपयोगकर्ता नाम या पासवर्ड",
        "auth-username-exists": "उपयोगकर्ता नाम पहले से मौजूद है",
        "auth-success-register": "पंजीकरण सफल! अब आप लॉगिन कर सकते हैं।",
        "auth-error-generic": "प्रमाणीकरण त्रुटि",
        "automated-roadblock-req": "स्वचालित सड़क बंद करने की आवश्यकता",
        "roadblock-yes": "हाँ",
        "roadblock-no": "नहीं",
        "roadblock-yes-desc": "आपातकालीन सड़क बंद करने की सिफारिश",
        "roadblock-no-desc": "सामान्य यातायात प्रवाह सुचारू",
        "roi-title": "अनुमानित परिचालन आरओआई",
        "roi-carbon": "कार्बन कम किया गया",
        "roi-economic": "बचाया गया आर्थिक नुकसान",
        "copilot-badge": "कोपायलट",
        "planner-sidebar-instruction": "👈 या तो बाएं साइडबार से किसी इवेंट पर क्लिक करें या नया शेड्यूल करें ताकि ट्रैफ़िक प्रसार सिमुलेशन शुरू हो सके।",
        "placeholder-rally": "जैसे: राजनीतिक रैली",
        "forecast-12h-title": "12-घंटे का परिचालन पूर्वानुमान",
        "rec-route-title": "अनुशंसित मार्ग परिवर्तन योजना",
        "rec-route-sub": "OSRM गतिशील मार्ग बदलाव",
        "rec-route-fallback": "एल्गोरिद्मिक बैकअप मार्ग",
        "rec-route-loading": "गतिशील मार्ग की गणना की जा रही है...",
        "rec-route-empty": "मार्ग परिवर्तन योजना देखने के लिए किसी घटना का चयन करें",
        "rec-route-status": "OSRM अनुकूलित",
        "rec-route-distance": "दूरी",
        "rec-route-time": "समय",
        "rec-route-mins": "मिनट",
        "rec-route-km": "किमी"
    }
};

export const translateCause = (cause, activeLang) => {
    if (!cause) return '';
    const clean = cause.toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
    const key = `cause-${clean}`;
    const dict = translations[activeLang] || translations['en'];
    
    let mappedKey = key;
    if (clean === 'vehiclebreakdown') mappedKey = 'cause-breakdown';
    else if (clean === 'potholes' || clean === 'potholesbadroads' || clean === 'potholes/badroads') mappedKey = 'cause-potholes';
    else if (clean === 'waterlogging' || clean === 'waterlogging/flood') mappedKey = 'cause-waterlogging';
    else if (clean === 'publicevent') mappedKey = 'cause-publicevent';
    else if (clean === 'roadconditions') mappedKey = 'cause-roadconditions';
    else if (clean === 'vipmovement') mappedKey = 'cause-vipmovement';
    else if (clean === 'treefall') mappedKey = 'cause-treefall';

    return dict[mappedKey] || dict[key] || cause.replace(/_/g, ' ');
};

export const translatePriority = (priority, activeLang) => {
    if (!priority) return '';
    const clean = priority.toLowerCase();
    const key = `priority-${clean}`;
    const dict = translations[activeLang] || translations['en'];
    return dict[key] || priority;
};

export const translateDescription = (description, activeLang) => {
    if (!description) return 'No description available';
    
    const simulatedMatch = description.match(/^Simulated (.+?) incident near (.+?) zone\.$/i);
    if (simulatedMatch) {
      const cause = simulatedMatch[1];
      const station = simulatedMatch[2];
      
      const translatedCause = translateCause(cause, activeLang);
      
      if (activeLang === 'kn') {
        return `${station} ವಲಯದ ಹತ್ತಿರ ಸಿಮ್ಯುಲೇಟೆಡ್ ${translatedCause} ಘಟನೆ.`;
      } else if (activeLang === 'hi') {
        return `${station} क्षेत्र के पास सिमुलेटेड ${translatedCause} घटना।`;
      } else {
        return `Simulated ${translatedCause} incident near ${station} zone.`;
      }
    }

    const langTranslations = descriptionTranslations[activeLang];
    if (langTranslations && langTranslations[description]) {
      return langTranslations[description];
    }
    return description;
};

export const translateAddress = (address, activeLang) => {
    if (!address) return '';
    if (activeLang === 'en') return address;
    
    let translated = address;
    const nearMatch = translated.match(/(.+?),\s*near\s+(.+?)\s+Police\s+Station,\s*Bengaluru,\s*Karnataka/i);
    if (nearMatch) {
      const corridor = nearMatch[1];
      const station = nearMatch[2];
      if (activeLang === 'kn') {
        return `${corridor}, ${station} ಪೊಲೀಸ್ ಠಾಣೆ ಹತ್ತಿರ, ಬೆಂಗಳೂರು, ಕರ್ನಾಟಕ`;
      } else if (activeLang === 'hi') {
        return `${corridor}, ${station} पुलिस स्टेशन के पास, बेंगलुरु, कर्नाटक`;
      }
    }
    
    if (activeLang === 'kn') {
      translated = translated
        .replace(/near /g, 'ಹತ್ತಿರ ')
        .replace(/Police Station/g, 'ಪೊಲೀಸ್ ಠಾಣೆ')
        .replace(/Bengaluru/g, 'ಬೆಂಗಳೂರು')
        .replace(/Karnataka/g, 'ಕರ್ನಾಟಕ')
        .replace(/Non-corridor/g, 'ಕಾರಿಡಾರ್ ಅಲ್ಲದ');
    } else if (activeLang === 'hi') {
      translated = translated
        .replace(/near /g, 'के पास ')
        .replace(/Police Station/g, 'पुलिस स्टेशन')
        .replace(/Bengaluru/g, 'बेंगलुरु')
        .replace(/Karnataka/g, 'कर्नाटक')
        .replace(/Non-corridor/g, 'गैर-गलियारा');
    }
    return translated;
};

export const translateDiversionSign = (sign, activeLang) => {
    if (!sign) return '';
    
    // Support Gemini-generated piped language format: English Version | Kannada Version | Hindi Version
    if (sign.includes('|')) {
        const parts = sign.split('|');
        if (activeLang === 'kn' && parts.length > 1) return parts[1].trim();
        if (activeLang === 'hi' && parts.length > 2) return parts[2].trim();
        return parts[0].trim();
    }
    
    if (activeLang === 'en') return sign;
    
    let translated = sign;
    
    if (activeLang === 'kn') {
      translated = translated
        .replace(/HAZARD:/g, 'ಅಪಾಯ:')
        .replace(/Vehicle breakdown/g, 'ವಾಹನ ಕೆಟ್ಟುಹೋಗಿರುವುದು')
        .replace(/Slow down and merge right/g, 'ವೇಗ ಕಡಿಮೆ ಮಾಡಿ ಮತ್ತು ಬಲಕ್ಕೆ ಸೇರಿಕೊಳ್ಳಿ')
        .replace(/ACCIDENT/g, 'ಅಪಘಾತ')
        .replace(/Lanes blocked. Detour via nearest exit/g, 'ರಸ್ತೆ ಪಥಗಳು ನಿರ್ಬಂಧಿಸಲ್ಪಟ್ಟಿವೆ. ಹತ್ತಿರದ ನಿರ್ಗಮನದ ಮೂಲಕ ತಿರುಗಿ')
        .replace(/FLOOD WARNING:/g, 'ಪ್ರವಾಹದ ಎಚ್ಚರಿಕೆ:')
        .replace(/Water logging/g, 'ನೀರು ನಿಲ್ಲುವುದು')
        .replace(/Expect heavy delays, avoid low lane/g, 'ಭಾರೀ ವಿಳಂಬ ನಿರೀಕ್ಷಿಸಿ, ತಗ್ಗು ಪ್ರದೇಶದ ರಸ್ತೆಯನ್ನು ತಪ್ಪಿಸಿ')
        .replace(/ROADWORK/g, 'ರಸ್ತೆ ಕಾಮಗಾರಿ')
        .replace(/Men at work. One-way traffic active/g, 'ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ. ಏಕಮುಖ ಸಂಚಾರ ಸಕ್ರಿಯವಾಗಿದೆ')
        .replace(/SLOW DOWN:/g, 'ವೇಗ ಕಡಿಮೆ ಮಾಡಿ:')
        .replace(/Severe potholes/g, 'ಗಂಭೀರ ರಸ್ತೆ ಗುಂಡಿಗಳು')
        .replace(/drive carefully/g, 'ಎಚ್ಚರಿಕೆಯಿಂದ ಚಾಲನೆ ಮಾಡಿ')
        .replace(/ROAD BLOCKED:/g, 'ರಸ್ತೆ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ:')
        .replace(/Fallen tree/g, 'ಮರ ಬಿದ್ದಿರುವುದು')
        .replace(/Emergency teams clearing path/g, 'ತುರ್ತು ತಂಡಗಳು ಮಾರ್ಗವನ್ನು ತೆರವುಗೊಳಿಸುತ್ತಿವೆ')
        .replace(/CONGESTION:/g, 'ಸಂಚಾರ ದಟ್ಟಣೆ:')
        .replace(/Public gathering/g, 'ಸಾರ್ವಜನಿಕ ಸಭೆ / ಕಾರ್ಯಕ್ರಮ')
        .replace(/Divert via secondary bypass/g, 'ದ್ವಿತೀಯ ಬೈಪಾಸ್ ಮೂಲಕ ತಿರುಗಿ')
        .replace(/TRAFFIC ALERT/g, 'ಸಂಚಾರ ಎಚ್ಚರಿಕೆ')
        .replace(/Expect delays. Follow traffic police signals/g, 'ವಿಳಂಬ ನಿರೀಕ್ಷಿಸಿ. ಸಂಚಾರ ಪೊಲೀಸರ ಸೂಚನೆಗಳನ್ನು ಪಾಲಿಸಿ')
        .replace(/near/g, 'ಹತ್ತಿರ')
        .replace(/at/g, 'ಬಳಿ');
    } else if (activeLang === 'hi') {
      translated = translated
        .replace(/HAZARD:/g, 'खतरा:')
        .replace(/Vehicle breakdown/g, 'वाहन खराब होना')
        .replace(/Slow down and merge right/g, 'धीमे चलें और दाईं ओर मिलें')
        .replace(/ACCIDENT/g, 'दुर्घटना')
        .replace(/Lanes blocked. Detour via nearest exit/g, 'लेन अवरुद्ध हैं। निकटतम निकास के माध्यम से जाएं')
        .replace(/FLOOD WARNING:/g, 'बाढ़ की चेतावनी:')
        .replace(/Water logging/g, 'जलभराव')
        .replace(/Expect heavy delays, avoid low lane/g, 'भारी देरी की अपेक्षा करें, निचले लेन से बचें')
        .replace(/ROADWORK/g, 'सड़क का काम')
        .replace(/Men at work. One-way traffic active/g, 'काम चल रहा है। एकतरफा यातायात सक्रिय है')
        .replace(/SLOW DOWN:/g, 'धीमे चलें:')
        .replace(/Severe potholes/g, 'गंभीर गड्ढे')
        .replace(/drive carefully/g, 'ध्यान से चलाएं')
        .replace(/ROAD BLOCKED:/g, 'सड़क अवरुद्ध:')
        .replace(/Fallen tree/g, 'पेड़ गिरना')
        .replace(/Emergency teams clearing path/g, 'आपातकालीन टीमें रास्ता साफ कर रही हैं')
        .replace(/CONGESTION:/g, 'भीड़भाड़:')
        .replace(/Public gathering/g, 'सार्वजनिक सभा')
        .replace(/Divert via secondary bypass/g, 'कन्वर्ट या बाईपास के माध्यम से जाएं') // conversion to bypass/detour
        .replace(/Divert via secondary bypass/g, 'द्वितीयक बाईपास के माध्यम से जाएं')
        .replace(/TRAFFIC ALERT/g, 'यातायात चेतावनी')
        .replace(/Expect delays. Follow traffic police signals/g, 'देरी की अपेक्षा करें। यातायात पुलिस के संकेतों का पालन करें')
        .replace(/near/g, 'के पास')
        .replace(/at/g, 'पर');
    }
    
    return translated;
};
