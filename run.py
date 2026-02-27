#!/usr/bin/env python3
"""VidaControl - Sistema Integral de Control de Vida

Start the application:
    python run.py

Then open http://localhost:8000 in your browser.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
