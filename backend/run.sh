#!/bin/bash
source venv/bin/activate
cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
