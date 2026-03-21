#!/bin/bash
# Start Streamlit on an internal port (not exposed to GCP)
streamlit run app.py --server.port 8501 --server.address 0.0.0.0 &
# Start FastAPI on the port Google Cloud expects (8080) — primary API
uvicorn main:app --host 0.0.0.0 --port 8080