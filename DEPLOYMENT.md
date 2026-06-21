# GridPulse — Deployment Guide (Vercel + Render)

This guide provides step-by-step instructions for deploying GridPulse to production. The system is split into two parts:
1. **Frontend**: A React application built with Vite, deployed to **Vercel**.
2. **Backend**: A FastAPI (Python) server handling ML inference and spatial telemetry, deployed to **Render**.

---

## 🛠️ Architecture & Routing

To avoid **CORS (Cross-Origin Resource Sharing)** issues and browser cookie blocks, we proxy API requests:
* The React app uses relative endpoints (e.g., `/api/events`).
* A `vercel.json` file inside `frontend/` acts as a reverse proxy, forwarding all `/api/*` requests directly to the Render backend URL.
* This means the browser makes same-origin requests, resulting in a secure, zero-CORS configuration out of the box.

---

## 🚀 Step 1: Deploy Backend on Render

Render will host the FastAPI server, SQLite database, and train model weights.

1. **Sign Up / Log In**: Go to [Render](https://render.com/) and log in.
2. **Create Web Service**: Click **New +** and select **Web Service**.
3. **Connect Repository**: Connect your GitHub repository containing the GridPulse code.
4. **Configure Settings**:
   * **Name**: `gridpulse-backend` (or your preferred name)
   * **Region**: Select a region close to your target users (e.g., Singapore or US East)
   * **Branch**: `main`
   * **Runtime**: `Python`
   * **Build Command**: 
     ```bash
     pip install -r requirements.txt
     ```
   * **Start Command**: 
     ```bash
     python run_server.py
     ```
5. **Configure Environment Variables**:
   Click **Advanced** -> **Add Environment Variable** and add the following keys:
   
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `HOST` | `0.0.0.0` | Binds the Uvicorn web server to all network interfaces |
   | `GEMINI_API_KEY` | `your_gemini_api_key_here` | Required for the Copilot RAG chatbot to function |
   | `PYTHON_VERSION` | `3.10.12` | (Optional) Explicitly pin Python version on Render |

6. **Deploy**: Click **Create Web Service**. Wait for the build and deployment logs to complete. Once deployed, note down your Render Web Service URL (e.g., `https://gridpulse-backend.onrender.com`).

---

## 🚀 Step 2: Configure Vercel Proxy

Before deploying the frontend, update Vercel's proxy settings to point to your new Render backend:

1. Open [frontend/vercel.json](file:///c:/Users/hardi/OneDrive/Desktop/github/GridPulse/frontend/vercel.json) in your code editor.
2. Replace the placeholder destination URL with your **actual Render Web Service URL**:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://your-render-backend-url.onrender.com/api/:path*"
       }
     ]
   }
   ```
3. Save the file and push the changes to GitHub.

---

## 🚀 Step 3: Deploy Frontend on Vercel

1. **Sign Up / Log In**: Go to [Vercel](https://vercel.com/) and log in.
2. **Create Project**: Click **Add New** -> **Project**.
3. **Import Git Repository**: Connect Vercel to your GitHub account and import the GridPulse repository.
4. **Configure Build Settings**:
   * **Framework Preset**: `Vite` (Vercel will auto-detect this)
   * **Root Directory**: Click *Edit* and select **`frontend`** (this is critical since the React app resides in this sub-folder)
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. **Configure Environment Variables**:
   Under **Environment Variables**, add:
   
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_MAPTILER_KEY` | `your_maptiler_api_key_here` | MapTiler API Key for fetching satellite map tiles |

6. **Deploy**: Click **Deploy**. Vercel will build the React application and deploy it globally.

---

## 🔍 Verification & Troubleshooting

1. **Verification**: Open your Vercel deployment URL in a browser. The dashboard should load, fetch the map tiles, and request the incident feed from the Render backend.
2. **Mock Stream**: Upon starting, the Render backend automatically populates the SQLite database with 1,000 historical records from the CSV file and starts generating mock telemetry alerts in the background every 40 seconds.
3. **Logs**:
   * If the feed fails to load, check the Vercel browser console (`F12` -> Console) for `/api/events` request failures.
   * Check Render web logs to make sure Python packages installed correctly and Uvicorn is successfully listening on `0.0.0.0`.
