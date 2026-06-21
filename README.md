# GridPulse — Astram Predictive Congestion Mitigator

**GridPulse** is a high-performance, real-time congestion forecasting and resource optimization dashboard designed for urban traffic command centers, with a specific focus on Bengaluru. It serves as both a predictive simulation console and a live telemetry monitor, empowering traffic operators to mitigate congestion, allocate resources dynamically, and make data-driven decisions during unplanned and planned traffic events.

---

## 🌟 Key Features

1. **Live Real-Time Telemetry Monitor**: A background thread simulates a live event stream of traffic incidents across Bengaluru, which are ingested, displayed, and processed in real-time.
2. **Predictive ML Simulation Wizard**: A multi-modal Machine Learning ensemble (CatBoost, LightGBM, XGBoost) predicts the **Severity Score** and **Clearance Duration** of incidents.
3. **Dynamic Resource Optimization**: Heuristic-based logic calculates the exact number of police officers, barricades, and generates dynamic traffic diversion signs required based on the ML-predicted severity.
4. **Geospatial Intelligence**: Utilizes **H3 Hexagonal Aggregation** for spatial density mapping and **DBSCAN** for real-time spatial hotspot clustering.
5. **AI-Powered Command Assistant (RAG)**: An integrated RAG Engine powered by Google Gemini (with an offline TF-IDF fallback) answers operator queries based on traffic SOPs and system architecture, available in English, Hindi, and Kannada.
6. **Post-Event Learning & Analytics**: Tracks the accuracy of predictions against actual event outcomes to provide a continuous learning loop and performance metrics.

---

## 🏗️ Deep System Architecture

GridPulse is built on a decoupled, microservices-ready architecture:

### 1. Frontend (React + Vite)
- Built with **React 18** and **Vite**.
- Uses **Leaflet Maps** for rendering hexagonal grids, active incident markers, and clustered hotspots.
- Features multi-language translation dictionaries (`translations.js`) for localization (e.g., Kannada, Hindi).

### 2. Backend API Layer (FastAPI)
- **FastAPI** serves as the core backend, providing RESTful endpoints.
- **`run_server.py`**: The main bootloader script that initializes the database, ensures model weights are present, ingests historical data if needed, spawns a background mock data generator thread, and boots the Uvicorn server.
- **Authentication**: JWT-based session management using SHA-256 hashed passwords and salted tokens.

### 3. Database Layer (SQLite -> PostgreSQL ready)
Uses a local `gridpulse.db` SQLite database with the following core tables:
- `events`: Stores real-time and historical traffic incidents (cause, coordinates, priority, status).
- `hotspots`: Stores H3 index aggregated severity and event counts.
- `recommendations`: Stores ML-predicted severity, duration, manpower, and barricade needs per event.
- `planned_events` & `event_outcomes`: Tracks future planned events and the historical accuracy of the ML predictions.
- `users`: Manages operator credentials and roles.

### 4. Machine Learning & Forecasting Engine (`gridpulse/models/`)
A leak-free, Tri-Model Ensemble Engine is used for inference:
- **Models**: Combines **CatBoost**, **LightGBM**, and **XGBoost** regressors (for duration) and classifiers (for road closure / severity probability).
- **Custom Loss**: Employs a robust focal loss objective function for handling imbalanced classification.
- **NLP Integration**: Uses `sentence-transformers` (`all-MiniLM-L6-v2`) to encode incident descriptions. A trained PCA transformer and CatBoost MultiClass proxy convert these embeddings into dense spatial features.
- **Spatio-Temporal Features**: Uses sine/cosine temporal waves and H3 historical spatial lookups.

### 5. Geospatial Clustering (`gridpulse/clustering.py`)
- **H3**: Uses Uber's H3 hierarchical spatial indexing (Resolution 8) to bin events and calculate average regional severity.
- **DBSCAN**: Uses Haversine metric clustering to group geographically close active incidents dynamically.

### 6. RAG AI Assistant (`gridpulse/rag.py`)
- Chunks markdown documentation (`architecture_system_design.md` and `traffic_sop.md`).
- **Offline Mode**: Uses Scikit-Learn's `TfidfVectorizer` to match queries against the knowledge base.
- **Online Mode**: Integrates with `google-generativeai` (Gemini 3.1 Flash Lite) to generate conversational responses injected with live database context and retrieved SOP chunks.

---

## 📂 Complete Project Structure

```text
GridPulse/
│
├── .venv/                     # Python virtual environment
├── notebooks/                 # Jupyter notebooks for initial EDA (Exploratory Data Analysis)
├── gridpulse/                 # Core Python Backend Package
│   ├── api/
│   │   └── main.py            # FastAPI endpoints, Authentication, and Route handlers
│   ├── models/
│   │   ├── train.py           # ML training pipeline (Ensemble setup, feature engineering)
│   │   ├── forecasting.py     # Inference engine loading models & performing predictions
│   │   ├── optimization.py    # Rule-based logic for manpower and barricade allocation
│   │   └── weights/           # Serialized .joblib model binaries (CatBoost, LGBM, XGBoost)
│   ├── database.py            # SQLite schema initialization and DB CRUD operations
│   ├── ingestion.py           # Historical CSV loader & real-time mock event generator
│   ├── clustering.py          # Spatial DBSCAN clustering and H3 hex grid aggregator
│   └── rag.py                 # RAG Engine (TF-IDF offline + Google Gemini online)
│
├── frontend/                  # React Front-End
│   ├── src/                   # React components, App.jsx, index.css, translations.js
│   ├── package.json           # Node.js dependencies
│   └── vite.config.js         # Vite bundler configuration
│
├── web/                       # Compiled Static Client Build (served by FastAPI)
├── architecture_system_design.md # Production-scale system design architecture (Kafka/Flink)
├── DEPLOYMENT.md              # Cloud deployment strategies
├── run_server.py              # Main application bootloader and background thread manager
├── requirements.txt           # Python dependency package list
└── README.md                  # Master project guide (You are here)
```

---

## 🔌 Core API Endpoint Reference

- **Auth**:
  - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Events & Telemetry**:
  - `GET /api/events`: Fetch all incidents (filters for active/mock).
  - `GET /api/hotspots`: Fetch H3 aggregated spatial density.
  - `GET /api/cluster`: Fetch DBSCAN clustered incident groups.
- **Simulation**:
  - `POST /api/simulate`: Run the ML pipeline on a custom operator-defined incident.
  - `POST /api/spawn_mock`: Force generate a random mock incident in Bengaluru.
  - `POST /api/clear_mock`: Delete all mock events from the DB.
- **Planned Events & Analytics**:
  - `GET /api/planned-events`, `POST /api/planned-events`, `DELETE /api/planned-events/{id}`
  - `POST /api/event-outcomes`, `GET /api/event-outcomes`
  - `GET /api/forecast-propagation`: Simulates spatio-temporal congestion spread for planned events.
  - `GET /api/learning-analytics`: Fetches ML accuracy metrics against real outcomes.
- **RAG Chat**:
  - `POST /api/chat`: Send a message to the AI copilot.
  - `POST /api/chat/reset`: Clear conversation history.

---

## 🚀 Setup & Installation

### 1. Prerequisites
- **Python 3.8+** (recommended: 3.10 or 3.11)
- **Node.js** (v18+ recommended)

### 2. Environment Setup
Clone the repository and initialize a virtual environment:

**Windows (PowerShell)**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux/macOS**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Build the Frontend React Application
Navigate to the `frontend/` directory, install packages, and compile the client bundle. The backend is configured to statically serve the `web/` folder.
```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. Configure API Keys (`.env`)
Create a `.env` file in the root directory:
```text
# Required for 3D Map Rendering
VITE_MAPTILER_KEY=your_maptiler_api_key_here

# Required for full RAG AI Copilot capabilities (otherwise runs offline TF-IDF)
GEMINI_API_KEY=your_gemini_api_key_here

# Custom CSV Data Path for historical ingestion (Optional)
GRIDPULSE_DATA_PATH="path/to/Astram_event_data.csv"

# Server Port (Optional)
PORT=8000
```

---

## ⚙️ Execution Guide

### 1. Start the Command Center
From the root directory, run:
```bash
python run_server.py
```
**Boot Sequence:**
1. Initializes `gridpulse.db` SQLite database schemas.
2. Validates ML weights existence in `gridpulse/models/weights/`.
3. Auto-ingests up to 1,000 historical records if the database is empty.
4. Calculates initial DBSCAN clusters and H3 hotspots.
5. Spawns a daemon thread `run_mock_stream` to push a new traffic event every 40 seconds.
6. Boots FastAPI + Uvicorn to serve the API and the React dashboard at `http://localhost:8000/`.

### 2. Model Retraining (Optional)
To retrain the ML severity and duration forecasting ensemble from scratch (requires `sentence-transformers`):
```bash
python gridpulse/models/train.py
```
This extracts NLP embeddings, builds PCA multi-class proxy representations, trains CatBoost/LGBM/XGBoost models, and saves the binaries to the `weights/` folder.

---

## 🛡️ Production & Scaling
While GridPulse runs locally via SQLite and background threads for prototyping, its design is ready for enterprise scale. In a production environment:
- **Ingestion**: Apache Kafka replaces the background thread for massive event throughput.
- **Stream Processing**: Apache Flink handles stateful sliding windows for DBSCAN and H3 aggregation.
- **Inference**: Triton Inference Server serves the `.joblib` models alongside Redis caching.
- **Storage**: PostgreSQL with PostGIS replaces SQLite.
*(For deep architectural flow, see `architecture_system_design.md`)*.
