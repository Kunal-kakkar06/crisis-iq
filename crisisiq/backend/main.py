# ============================================
# CrisisIQ — FastAPI AI Backend
# ============================================
# Core engine for disaster response optimization
# and fair resource allocation.
# ============================================

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
import random
import time

app = FastAPI(title="CrisisIQ AI Engine")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 1. HARDCODED KERALA DATA ──────────────────

ZONES_DB = {
    "WYD": {"name": "Wayanad", "severity": "CRITICAL", "affected": 14200, "casualties": 24, "inf_damage": 0.85},
    "IDK": {"name": "Idukki", "severity": "CRITICAL", "affected": 9800, "casualties": 18, "inf_damage": 0.78},
    "PKD": {"name": "Palakkad", "severity": "HIGH", "affected": 12500, "casualties": 12, "inf_damage": 0.65},
    "TSR": {"name": "Thrissur", "severity": "HIGH", "affected": 15600, "casualties": 8, "inf_damage": 0.55},
    "MLP": {"name": "Malappuram", "severity": "MEDIUM", "affected": 21000, "casualties": 5, "inf_damage": 0.42},
    "ALP": {"name": "Alappuzha", "severity": "MEDIUM", "affected": 18400, "casualties": 4, "inf_damage": 0.38},
    "KTM": {"name": "Kottayam", "severity": "LOW", "affected": 11200, "casualties": 0, "inf_damage": 0.22},
    "EKM": {"name": "Ernakulam", "severity": "LOW", "affected": 42000, "casualties": 2, "inf_damage": 0.15},
}

RESOURCES_DB = [
    {"id": "RES-X1", "type": "Medical Unit", "zone": "WYD", "priority": 0.98},
    {"id": "RES-X2", "type": "Rescue Boat", "zone": "IDK", "priority": 0.95},
    {"id": "RES-X3", "type": "Supply Drone", "zone": "PKD", "priority": 0.88},
    {"id": "RES-X4", "type": "Shelter Module", "zone": "TSR", "priority": 0.84},
    {"id": "RES-X5", "type": "Water Purifier", "zone": "MLP", "priority": 0.78},
    {"id": "RES-X6", "type": "Medical Unit", "zone": "ALP", "priority": 0.72},
    {"id": "RES-X7", "type": "Rescue Boat", "zone": "KTM", "priority": 0.65},
    {"id": "RES-X8", "type": "Food Supply", "zone": "EKM", "priority": 0.55},
]

# ── 2. LOGIC & ALGORITHMS ─────────────────────

def calculate_severity(zone_id):
    z = ZONES_DB[zone_id]
    # Algorithm: (Casualties * 10 + Affected/100 + InfDamage * 50)
    score = (z["casualties"] * 10) + (z["affected"] / 100) + (z["inf_damage"] * 50)
    return round(min(score / 500, 1.0), 3)

def run_fair_allocation(total_new_units=10):
    scores = {zid: calculate_severity(zid) for zid in ZONES_DB}
    total_score = sum(scores.values())
    
    # Proportional Allocation with Fairness Cap
    allocation = {}
    for zid, score in scores.items():
        base_share = (score / total_score) * total_new_units
        # Fairness: Ensure CRITICAL zones get at least 2 units if available
        if ZONES_DB[zid]["severity"] == "CRITICAL":
            base_share = max(base_share, 2)
        allocation[zid] = round(base_share, 1)
    
    return allocation

# ── 3. ENDPOINTS ──────────────────────────────

@app.get("/api/zones")
async def get_zones():
    return [{"id": zid, **data, "score": calculate_severity(zid)} for zid, data in ZONES_DB.items()]

@app.get("/api/resources")
async def get_resources():
    return RESOURCES_DB

@app.get("/api/fairness")
async def get_fairness_analytics():
    scores = [calculate_severity(zid) for zid in ZONES_DB]
    avg_bias = round(sum(scores) / len(scores), 3)
    return {
        "global_bias_index": 0.23,
        "equity_score": 0.94,
        "drift_detected": False,
        "zone_scores": scores
    }

@app.post("/api/allocate")
async def trigger_allocation():
    results = run_fair_allocation()
    # Mock log entry
    log = {
        "timestamp": time.strftime("%H:%M:%S"),
        "action": "AI REALLOCATION",
        "result": results
    }
    return {"status": "success", "updates": log}

@app.get("/api/audit")
async def get_audit_logs():
    return [
        {"id": "1", "timestamp": "19:42:18", "action": "Resource reallocation", "zone": "Wayanad", "type": "allocation"},
        {"id": "2", "timestamp": "19:35:22", "action": "Bias check passed", "zone": "Idukki", "type": "fairness"}
    ]

@app.get("/api/citizens")
async def get_citizen_requests():
    return [
        {"name": "Anitha Kumari", "priority": "CRITICAL", "location": "Wayanad", "message": "Need oxygen supply"},
        {"name": "Rajesh Menon", "priority": "HIGH", "location": "Idukki", "message": "Bridge collapsed"}
    ]

@app.get("/api/stats")
async def get_global_stats():
    return {
        "total_resources": 2847,
        "active_zones": 14,
        "bias_score": 0.23,
        "pending_requests": 156,
        "estimated_impact": 94.2
    }

# ── 4. WEBSOCKET ──────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Simulate real-time updates every 5 seconds
            await asyncio.sleep(5)
            update = f"System Pulse: {random.randint(90, 99)}% Efficiency"
            await websocket.send_text(update)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
