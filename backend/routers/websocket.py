"""
backend/routers/websocket.py

Single WebSocket endpoint /ws that broadcasts satellite and aircraft positions
to all connected clients on a 1.5-second server-side tick.

Weather data is NOT sent here — it's fetched via REST on click.
"""

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.ingestion.satellites import propagate_all
from backend.ingestion.flights import get_cached_aircraft

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

BROADCAST_INTERVAL = 1.5  # seconds


class ConnectionManager:
    """Thread-safe set of active WebSocket connections."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.add(ws)
        logger.info("WS client connected. Total: %d", len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard(ws)
        logger.info("WS client disconnected. Total: %d", len(self._connections))

    async def broadcast(self, payload: Any) -> None:
        """Broadcast JSON payload to all connected clients, removing dead ones."""
        dead: list[WebSocket] = []
        raw = json.dumps(payload)
        for ws in list(self._connections):
            try:
                await ws.send_text(raw)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.discard(ws)


manager = ConnectionManager()


async def _broadcast_loop() -> None:
    """Background task: compute & broadcast positions every BROADCAST_INTERVAL seconds."""
    logger.info("WebSocket broadcast loop started.")
    while True:
        try:
            satellites = await asyncio.to_thread(propagate_all)
            aircraft = await asyncio.to_thread(get_cached_aircraft)

            await manager.broadcast({"universe": "satellite", "data": satellites})
            await asyncio.sleep(0.1)  # small gap between the two messages
            await manager.broadcast({"universe": "aircraft", "data": aircraft})
        except Exception as exc:
            logger.error("Broadcast loop error: %s", exc)
        await asyncio.sleep(BROADCAST_INTERVAL)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        # Keep the connection alive; the broadcast loop pushes data independently
        while True:
            # We still receive (and ignore) any incoming messages so the
            # connection isn't treated as idle/dead by the client
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                pass  # Heartbeat — no message received, that's fine
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        logger.warning("WebSocket error: %s", exc)
        manager.disconnect(websocket)
