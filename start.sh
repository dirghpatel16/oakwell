#!/bin/bash
# Start FastAPI in the background
uvicorn main:app --host 0.0.0.0 --port 8000 &
# Start Streamlit on the port Google Cloud expects (8080)
streamlit run app.py --server.port 8080 --server.address 0.0.0.0