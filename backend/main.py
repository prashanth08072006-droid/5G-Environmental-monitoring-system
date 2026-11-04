import os
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from backend.database import engine, Base, get_db
from backend.models import Location, SensorReading, Alert, CommunicationMetric
from backend.schemas import (
    LocationResponse, SensorReadingCreate, SensorReadingResponse,
    AlertResponse, CommunicationMetricResponse, FiveGSimulationRequest
)
from backend.analytics import calculate_pollution_risk, compute_cpcb_aqi, aggregate_city_analytics
from backend.alerts import evaluate_reading_alerts

# Initialize Database Schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EcoWatch India - 5G Environmental Monitoring System",
    description="5G IoT Environmental Intelligence Platform with Edge Computing & Real-Time Analytics",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 8 Official Indian Cities specified in EcoWatch India PRD
INITIAL_LOCATIONS = [
    {"city_name": "Bengaluru", "latitude": 12.9716, "longitude": 77.5946},
    {"city_name": "Mysuru", "latitude": 12.2958, "longitude": 76.6394},
    {"city_name": "Delhi", "latitude": 28.6139, "longitude": 77.2090},
    {"city_name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777},
    {"city_name": "Chennai", "latitude": 13.0827, "longitude": 80.2707},
    {"city_name": "Hyderabad", "latitude": 17.3850, "longitude": 78.4867},
    {"city_name": "Pune", "latitude": 18.5204, "longitude": 73.8567},
    {"city_name": "Kolkata", "latitude": 22.5726, "longitude": 88.3639}
]

# 5G Network Simulation State
network_sim_state = {
    "current_slice": "URLLC",
    "base_latency_ms": 11.4,
    "delivery_rate_pct": 99.998,
    "packet_bursts_processed": 1420,
    "edge_processing_time_ms": 2.4,
    "cloud_processing_time_ms": 28.6,
    "simulated_packet_loss": 0.0,
    "active_5g_slices": {
        "URLLC": {"latency_ms": 10.2, "reliability_pct": 99.999, "throughput_mbps": 120, "description": "Ultra-Reliable Low-Latency (Environmental Emergency Slicing)"},
        "eMBB": {"latency_ms": 24.5, "reliability_pct": 99.200, "throughput_mbps": 850, "description": "Enhanced Mobile Broadband (High-Bandwidth Multi-Spectral Imagery)"},
        "mMTC": {"latency_ms": 46.8, "reliability_pct": 98.700, "throughput_mbps": 25, "description": "Massive Machine-Type (Dense Ambient IoT Fleet Sensor Grid)"}
    }
}

@app.on_event("startup")
def seed_initial_locations():
    db = next(get_db())
    try:
        existing_count = db.query(Location).count()
        if existing_count == 0:
            print("🌱 Seeding 8 standard EcoWatch India locations...")
            for loc_data in INITIAL_LOCATIONS:
                loc = Location(**loc_data)
                db.add(loc)
            db.commit()

            # Seed initial telemetry for each city
            now = datetime.now(timezone.utc)
            base_readings = {
                "Bengaluru": {"temp": 24.5, "humidity": 62.0, "pm25": 42.0, "pm10": 78.0, "co2": 520.0, "aqi": 88},
                "Mysuru": {"temp": 26.0, "humidity": 58.0, "pm25": 28.0, "pm10": 45.0, "co2": 440.0, "aqi": 48},
                "Delhi": {"temp": 32.5, "humidity": 45.0, "pm25": 168.0, "pm10": 280.0, "co2": 1120.0, "aqi": 315},
                "Mumbai": {"temp": 31.0, "humidity": 78.0, "pm25": 58.0, "pm10": 110.0, "co2": 680.0, "aqi": 115},
                "Chennai": {"temp": 33.0, "humidity": 82.0, "pm25": 48.0, "pm10": 85.0, "co2": 590.0, "aqi": 95},
                "Hyderabad": {"temp": 29.5, "humidity": 54.0, "pm25": 65.0, "pm10": 125.0, "co2": 720.0, "aqi": 128},
                "Pune": {"temp": 27.0, "humidity": 59.0, "pm25": 52.0, "pm10": 92.0, "co2": 610.0, "aqi": 105},
                "Kolkata": {"temp": 30.5, "humidity": 74.0, "pm25": 88.0, "pm10": 160.0, "co2": 850.0, "aqi": 165}
            }

            for loc in db.query(Location).all():
                city = loc.city_name
                prof = base_readings.get(city, {"temp": 28.0, "humidity": 60.0, "pm25": 50.0, "pm10": 90.0, "co2": 600.0, "aqi": 100})
                
                # Add 12 hourly historical points per city
                for h in range(12, 0, -1):
                    ts = now - timedelta(hours=h)
                    # Diurnal fluctuations
                    h_temp = prof["temp"] + (h % 3 - 1) * 1.5
                    h_pm25 = max(10.0, prof["pm25"] + (h % 4 - 2) * 5.0)
                    h_pm10 = h_pm25 * 1.8
                    h_co2 = max(350.0, prof["co2"] + (h % 3 - 1) * 40.0)
                    h_aqi = compute_cpcb_aqi(h_pm25, h_pm10)

                    reading = SensorReading(
                        location_id=loc.location_id,
                        temperature=round(h_temp, 1),
                        humidity=round(prof["humidity"] + (h % 3) * 2.0, 1),
                        aqi=h_aqi,
                        pm25=round(h_pm25, 1),
                        pm10=round(h_pm10, 1),
                        co2=round(h_co2, 1),
                        timestamp=ts
                    )
                    db.add(reading)

                    metric = CommunicationMetric(
                        location_id=loc.location_id,
                        latency=round(10.5 + (h % 5) * 0.8, 1),
                        delivery_rate=round(99.98 - (h % 3) * 0.02, 3),
                        timestamp=ts
                    )
                    db.add(metric)

                # Check alerts for latest reading
                alerts = evaluate_reading_alerts(loc.location_id, prof)
                for alt in alerts:
                    db.add(Alert(**alt))

            db.commit()
            print("✅ EcoWatch India database seeded successfully.")
    finally:
        db.close()

# ----------------------------------------------------
# 1. GET /api/locations
# ----------------------------------------------------
@app.get("/api/locations", response_model=List[LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    """Retrieve all monitored Indian locations with latest metrics and risk level."""
    locations = db.query(Location).all()
    results = []
    for loc in locations:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.location_id == loc.location_id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        latest_metric = (
            db.query(CommunicationMetric)
            .filter(CommunicationMetric.location_id == loc.location_id)
            .order_by(CommunicationMetric.timestamp.desc())
            .first()
        )
        risk = "Moderate"
        if latest:
            risk = calculate_pollution_risk(latest.aqi, latest.pm25, latest.co2)

        results.append({
            "location_id": loc.location_id,
            "city_name": loc.city_name,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "latest_reading": latest,
            "pollution_risk": risk,
            "latest_latency": latest_metric.latency if latest_metric else 12.0
        })
    return results

# ----------------------------------------------------
# 2. GET /api/environment/current
# ----------------------------------------------------
@app.get("/api/environment/current")
def get_current_environment(location_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Retrieve the most recent environmental readings across all cities or for a specific location."""
    query = db.query(Location)
    if location_id:
        query = query.filter(Location.location_id == location_id)

    locations = query.all()
    readings = []
    for loc in locations:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.location_id == loc.location_id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        if latest:
            readings.append({
                "location_id": loc.location_id,
                "city_name": loc.city_name,
                "temperature": latest.temperature,
                "humidity": latest.humidity,
                "aqi": latest.aqi,
                "pm25": latest.pm25,
                "pm10": latest.pm10,
                "co2": latest.co2,
                "risk_score": calculate_pollution_risk(latest.aqi, latest.pm25, latest.co2),
                "timestamp": latest.timestamp.isoformat()
            })
    return readings

# ----------------------------------------------------
# 3. GET /api/environment/history
# ----------------------------------------------------
@app.get("/api/environment/history")
def get_environment_history(
    location_id: Optional[int] = Query(None),
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db)
):
    """Retrieve historical time-series sensor readings for charting."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    query = db.query(SensorReading).filter(SensorReading.timestamp >= since)
    if location_id:
        query = query.filter(SensorReading.location_id == location_id)

    readings = query.order_by(SensorReading.timestamp.asc()).all()
    return [
        {
            "reading_id": r.reading_id,
            "location_id": r.location_id,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "aqi": r.aqi,
            "pm25": r.pm25,
            "pm10": r.pm10,
            "co2": r.co2,
            "timestamp": r.timestamp.isoformat()
        }
        for r in readings
    ]

# ----------------------------------------------------
# 4. GET /api/analytics
# ----------------------------------------------------
@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """Comprehensive analytical metrics, risk distribution, and 5G network telemetry."""
    locations = db.query(Location).all()
    latest_readings = []
    high_risk_cities = []

    for loc in locations:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.location_id == loc.location_id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        if latest:
            latest_readings.append({
                "city": loc.city_name,
                "aqi": latest.aqi,
                "pm25": latest.pm25,
                "pm10": latest.pm10,
                "co2": latest.co2,
                "temperature": latest.temperature,
                "humidity": latest.humidity
            })
            risk = calculate_pollution_risk(latest.aqi, latest.pm25, latest.co2)
            if risk in ["High", "Severe"]:
                high_risk_cities.append(loc.city_name)

    stats = aggregate_city_analytics(latest_readings)
    recent_metrics = db.query(CommunicationMetric).order_by(CommunicationMetric.timestamp.desc()).limit(50).all()
    avg_latency = float(sum(m.latency for m in recent_metrics) / len(recent_metrics)) if recent_metrics else 11.8
    avg_delivery = float(sum(m.delivery_rate for m in recent_metrics) / len(recent_metrics)) if recent_metrics else 99.98

    active_alerts = db.query(Alert).count()

    return {
        "summary": {
            "total_locations": len(locations),
            "overall_avg_aqi": stats.get("avg_aqi", 0),
            "dominant_pollutant": "PM2.5 (Combustion / Vehicular)",
            "high_risk_cities": high_risk_cities,
            "active_alerts_count": active_alerts
        },
        "averages": stats,
        "communication_5g": {
            "slice": network_sim_state["current_slice"],
            "average_latency_ms": round(avg_latency, 2),
            "p99_latency_ms": round(avg_latency * 1.25, 2),
            "data_delivery_rate_pct": round(avg_delivery, 3),
            "edge_processing_latency_ms": network_sim_state["edge_processing_time_ms"],
            "cloud_processing_latency_ms": network_sim_state["cloud_processing_time_ms"]
        },
        "city_comparison": latest_readings
    }

# ----------------------------------------------------
# 5. GET /api/alerts
# ----------------------------------------------------
@app.get("/api/alerts")
def get_alerts(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    """Retrieve active and recent environmental alerts."""
    alerts = (
        db.query(Alert, Location.city_name)
        .join(Location, Alert.location_id == Location.location_id)
        .order_by(Alert.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "alert_id": a.Alert.alert_id,
            "location_id": a.Alert.location_id,
            "city_name": a.city_name,
            "alert_type": a.Alert.alert_type,
            "severity": a.Alert.severity,
            "message": a.Alert.message,
            "timestamp": a.Alert.timestamp.isoformat()
        }
        for a in alerts
    ]

# ----------------------------------------------------
# 6. POST /api/sensor-data (IoT Ingest & Edge Verification)
# ----------------------------------------------------
@app.post("/api/sensor-data")
def ingest_sensor_data(data: SensorReadingCreate, db: Session = Depends(get_db)):
    """Receive and validate sensor data from 5G IoT Gateway/Edge device."""
    loc = db.query(Location).filter(Location.location_id == data.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    # Step 5 Edge Computing Validation: noise and range filters
    if not (-10 <= data.temperature <= 60 and 0 <= data.humidity <= 100):
        raise HTTPException(status_code=422, detail="Edge check failed: Physical bounds violated")

    computed_aqi = compute_cpcb_aqi(data.pm25, data.pm10)
    now = datetime.now(timezone.utc)

    reading = SensorReading(
        location_id=data.location_id,
        temperature=data.temperature,
        humidity=data.humidity,
        aqi=computed_aqi,
        pm25=data.pm25,
        pm10=data.pm10,
        co2=data.co2,
        timestamp=now
    )
    db.add(reading)

    # Log 5G communication metric
    metric = CommunicationMetric(
        location_id=data.location_id,
        latency=data.latency or network_sim_state["base_latency_ms"],
        delivery_rate=data.delivery_rate or network_sim_state["delivery_rate_pct"],
        timestamp=now
    )
    db.add(metric)

    # Step 5 Edge Alert Generation
    new_alerts = evaluate_reading_alerts(data.location_id, {
        "aqi": computed_aqi,
        "pm25": data.pm25,
        "temperature": data.temperature,
        "co2": data.co2
    })
    created_alerts = []
    for alt in new_alerts:
        alert_obj = Alert(**alt)
        db.add(alert_obj)
        created_alerts.append(alt)

    db.commit()
    db.refresh(reading)

    return {
        "status": "INGESTED",
        "reading_id": reading.reading_id,
        "computed_aqi": computed_aqi,
        "pollution_risk": calculate_pollution_risk(computed_aqi, data.pm25, data.co2),
        "alerts_triggered": len(created_alerts),
        "5g_transmission_latency_ms": metric.latency
    }

# ----------------------------------------------------
# 7. 5G NETWORKING SIMULATION ENDPOINTS
# ----------------------------------------------------
@app.get("/api/5g/metrics")
def get_5g_network_metrics(db: Session = Depends(get_db)):
    """Returns 5G URLLC performance metrics, slice telemetry, and recent latency points for charts."""
    recent_metrics = db.query(CommunicationMetric).order_by(CommunicationMetric.timestamp.desc()).limit(30).all()
    timeline = [
        {
            "timestamp": m.timestamp.strftime("%H:%M:%S"),
            "latency_ms": m.latency,
            "delivery_rate": m.delivery_rate,
            "edge_latency": round(m.latency * 0.22, 1),
            "cloud_latency": round(m.latency * 2.4, 1)
        }
        for m in reversed(recent_metrics)
    ]

    current_slice_data = network_sim_state["active_5g_slices"].get(network_sim_state["current_slice"])

    return {
        "active_slice": network_sim_state["current_slice"],
        "slice_details": current_slice_data,
        "available_slices": network_sim_state["active_5g_slices"],
        "telemetry_stream": timeline,
        "latency_stats": {
            "p50_ms": 10.4,
            "p95_ms": 13.8,
            "p99_ms": 14.9,
            "target_sla_ms": 15.0
        },
        "packets_processed": network_sim_state["packet_bursts_processed"]
    }

@app.post("/api/5g/simulate")
def trigger_5g_simulation(req: FiveGSimulationRequest):
    """Dynamically simulate 5G Network slicing, jitter induction, and stress bursts."""
    if req.network_slice in network_sim_state["active_5g_slices"]:
        network_sim_state["current_slice"] = req.network_slice

    slice_data = network_sim_state["active_5g_slices"][network_sim_state["current_slice"]]
    new_latency = slice_data["latency_ms"] + req.induced_jitter_ms
    new_delivery = max(80.0, slice_data["reliability_pct"] - req.simulated_packet_loss_pct)

    network_sim_state["base_latency_ms"] = round(new_latency, 2)
    network_sim_state["delivery_rate_pct"] = round(new_delivery, 3)
    network_sim_state["packet_bursts_processed"] += req.packet_burst_count

    return {
        "message": f"5G Network configured to slice '{network_sim_state['current_slice']}'",
        "current_slice": network_sim_state["current_slice"],
        "effective_latency_ms": network_sim_state["base_latency_ms"],
        "effective_delivery_rate_pct": network_sim_state["delivery_rate_pct"],
        "packet_bursts_processed": network_sim_state["packet_bursts_processed"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
