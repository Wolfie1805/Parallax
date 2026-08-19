"""
api/index.py

Vercel Python Serverless Function adapter.
Vercel looks for a callable `app` or WSGI/ASGI handler in this file.

This imports the FastAPI `app` from backend/main.py so that all routes
(/api/*, /health, /ws) are handled by the existing FastAPI application.

Important: Vercel functions run in /var/task. We add the repo root to
sys.path so the `backend.*` package imports resolve correctly.
"""

import sys
import os
from pathlib import Path

# Add repo root to sys.path so `backend.*` package imports work
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Import the FastAPI app — Vercel will use it as the ASGI handler
from backend.main import app  # noqa: E402, F401 — re-exported as the handler
