# ASTRAM Traffic Control - Standard Operating Procedures (SOP)

This document contains standard operational guidelines and resource allocation procedures for the Bengaluru Traffic Command Center (GridPulse).

---

## 1. Incident Severity Classification & SLA

Incidents are classified into three priority tiers with specific clearance service-level agreements (SLAs):

* **High Priority (SLA: < 2.5 Hours)**:
  * Major multi-vehicle accidents.
  * Water logging/flooding blocking more than one lane.
  * Active tree falls or structural road collapse.
* **Medium Priority (SLA: < 4 Hours)**:
  * Heavy vehicle breakdowns (HCV/Bus) on arterial roads.
  * Pothole clusters causing severe speed degradation.
  * Planned construction zones (unless full closures are authorized).
* **Low Priority (SLA: < 12 Hours)**:
  * Light vehicle breakdowns (two-wheelers, autos, cars on shoulders).
  * Minor road surface debris.
  * Controlled public events/parades.

---

## 2. Guidelines by Incident Cause

### A. Road Accident (`accident`)
* **Immediate Response**: First responder dispatch within 10 minutes.
* **Resource Deployments**:
  * Minimum of 4 traffic officers to guide flows.
  * Place 8 to 12 barricades in a taper configuration to block the crash lane and create a buffer zone.
* **Diversions**: Program LED diversion signs at least 500 meters upstream: *"ACCIDENT AHEAD. LANES BLOCKED. CHOOSE DETOUR."*
* **Triage**: Coordinate with emergency healthcare services and tow crane contractors.

### B. Water Logging / Flooding (`water_logging`)
* **Immediate Response**: Dispatch suction pumps and notify BBMP (Bruhat Bengaluru Mahanagara Palike) storm-water drain engineers.
* **Resource Deployments**:
  * Minimum of 6 traffic officers to manage high-congestion redirection.
  * Place 15 to 25 barricades around flooded zones to prevent vehicles from stalling in deep water.
* **Diversions**: Redirect all low-ground vehicles to elevated corridors or parallel ring roads. Update signage: *"FLOODING AHEAD. EXPECT DELAYS. CHOOSE ALTERNATE ROUTE."*

### C. Vehicle Breakdown (`vehicle_breakdown`)
* **Immediate Response**: Dispatch towing service based on vehicle weight class:
  * LCV (Light Commercial Vehicle) / Car: 3.5-Ton tow truck.
  * HCV (Heavy Commercial Vehicle) / Bus: 15-Ton underlift heavy wrecker.
* **Resource Deployments**:
  * Minimum of 2 traffic officers.
  * Place 2 to 4 barricades behind the vehicle as a warning signal.
* **Signage**: *"HAZARD: BREAKDOWN AHEAD. SLOW DOWN."*

### D. Road Construction (`construction`)
* **Immediate Response**: Verify construction permit and check boundary configurations.
* **Resource Deployments**:
  * Minimum of 3 traffic officers during peak transit hours.
  * Place reflective cones and at least 10 barricades to isolate the construction buffer zone.
* **Safety Rules**: Ensure high-visibility warning lights are operational during night shifts. Signage: *"CONSTRUCTION WORK: EXPECT DELAYS. SPEED LIMIT 20 KM/H."*

### E. Potholes & Road Conditions (`pot_holes`, `road_conditions`)
* **Immediate Response**: Notify the BBMP road repair wing.
* **Resource Deployments**:
  * Deploy barricades to isolate deep potholes and prevent axle damage.
  * Target cold-mix asphalt patch within 24 hours of report.

---

## 3. Resource Allocation Rules

The mathematical heuristic utilized by the Command Center to recommend field assets is defined as follows:

* **Manpower (Officers)**:
  * **Base Count**: Determined by dividing predicted Severity Score by 15.
  * **Additions**:
    * Add `+3` officers if a road closure is active.
    * Add `+2` officers if the cause is a severe road accident.
  * **Clamping**: A minimum of `1` officer and a maximum cap of `12` officers.

* **Barricades (Pieces)**:
  * **Road Closures**: If a road closure is active, place `Severity Score / 5` barricades (minimum of 4, maximum of 25).
  * **Construction Work**: Place `Severity Score / 8` barricades (minimum of 2, maximum of 15).
  * **Vehicle Breakdown**: Set `2` warning barricades directly upstream.
  * **General Congestion**: Place `Severity Score / 12` barricades (maximum of 10).
