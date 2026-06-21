EDA Notebook for Astram event data

Files:
- notebooks/eda_astram.ipynb : Jupyter notebook with exploratory analysis and maps
- notebooks/requirements.txt : Python dependencies

Quick start (Windows):
1. Create and activate a venv:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Open the notebook:

```powershell
jupyter lab notebooks/eda_astram.ipynb
```

Notes:
- Replace the CSV path in the notebook with the local file path: c:\Users\Ayush Gupta\Downloads\Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv.
- The notebook generates summary statistics, missingness, time-series plots, and a Folium map of events.
