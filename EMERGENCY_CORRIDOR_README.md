# Emergency Vehicle Green Corridor AI

## Overview
This feature adds a new "Emergency AI" module to GridPulse that simulates predictive green corridors for emergency vehicles. It demonstrates GridPulse's capability to detect incidents, dynamically calculate the fastest route from the nearest emergency source to a destination, bypass congestion, and orchestrate traffic signals to clear the path.

### Key Capabilities:
- **Comprehensive Infrastructure Dataset:** Loads ~195 actual/mocked Bengaluru emergency facilities (Hospitals, Trauma Centers, Fire Stations, Police Stations) via `public/data/emergency_nodes.json`.
- **Dynamic Nearest-Neighbor Routing:** Upon clicking an incident location, the system automatically finds the nearest appropriate source (e.g., nearest fire station for a fire truck) and destination (e.g., nearest trauma center for an ambulance).
- **7-Step Simulation:** Visually guides users through:
  1. Incident Detection
  2. Congestion Scanning (Buffer Zone)
  3. Route Optimization
  4. Signal Preemption
  5. Green Corridor Activation
  6. Vehicle Progress
  7. ETA Improvement Analysis
- **Smart Metrics:** Projects realistic time saved, congestion bypassed, and estimated fuel reduction.

## How to Test

1. **Launch the Application**
   - Start the frontend server (`npm run dev`)
   - Ensure you are logged into GridPulse.

2. **Access the Feature**
   - Click the new **"Emergency AI"** tab (with the alert triangle icon) in the top navigation bar.

3. **Explore Emergency Infrastructure**
   - In the top-left corner of the map, you will see the **Emergency Infrastructure** panel.
   - Toggle Hospitals, Fire Stations, and Police Stations to see the nodes populate across Bengaluru.

4. **Run a Simulation**
   - In the control panel on the right, select a **Vehicle Type** (e.g., Ambulance).
   - Set the priority level.
   - **Click anywhere on the map** to mark an incident location.
   - Watch the control panel update automatically: it will set the `Origin` to the nearest appropriate facility, and `Destination` to the nearest destination.
   - Click **Activate Green Corridor**.

5. **Observe the Visualization**
   - A congestion zone will appear.
   - A route will be drawn linking the Source -> Incident -> Destination.
   - The map bounds will auto-focus on the new route.
   - An animated vehicle icon will traverse the route.
   - The **Smart Metrics** will update showing the ETA dropping by up to 55%.
   - The **AI Decision Insights** panel will slide in at the bottom.

## Architecture

- `EmergencyCorridorCenter.jsx` - Main feature container, state machine, and map logic.
- `EmergencyInfrastructureLayer.jsx` - Renders toggleable infrastructure markers from the JSON dataset.
- `geoUtils.js` - Contains Haversine distance calculations and nearest-neighbor logic.
- `emergency_nodes.json` - Custom generated dataset mapping Bengaluru zones to facilities.

This feature is purely additive and does not alter any existing APIs, authentication, or historical features of GridPulse.
