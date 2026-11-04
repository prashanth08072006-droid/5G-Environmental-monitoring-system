from typing import List, Dict, Any
from datetime import datetime, timezone

# Thresholds as specified in Section 5 of EcoWatch India Implementation Plan
ALERT_THRESHOLDS = {
    "aqi": {"threshold": 200, "severity": "HIGH", "type": "High Pollution", "template": "AQI reached {val} (Threshold > 200) - Unhealthy air quality detected."},
    "pm25": {"threshold": 60.0, "severity": "HIGH", "type": "Particulate Pollution", "template": "PM2.5 concentration is {val} µg/m³ (Threshold > 60 µg/m³) - Fine particulate hazard."},
    "temperature": {"threshold": 40.0, "severity": "CRITICAL", "type": "High Temperature", "template": "Ambient temperature spiked to {val}°C (Threshold > 40°C) - Heatwave conditions."},
    "co2": {"threshold": 1000.0, "severity": "MODERATE", "type": "Elevated CO2", "template": "CO2 levels recorded at {val} ppm (Threshold > 1000 ppm) - Elevated carbon build-up."}
}

def evaluate_reading_alerts(location_id: int, reading: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Evaluates a reading against environmental thresholds and generates alert payloads.
    """
    triggered_alerts = []
    now = datetime.now(timezone.utc)

    # 1. AQI Alert
    aqi_val = reading.get("aqi", 0)
    if aqi_val > ALERT_THRESHOLDS["aqi"]["threshold"]:
        triggered_alerts.append({
            "location_id": location_id,
            "alert_type": ALERT_THRESHOLDS["aqi"]["type"],
            "severity": "CRITICAL" if aqi_val > 300 else "HIGH",
            "message": ALERT_THRESHOLDS["aqi"]["template"].format(val=aqi_val),
            "timestamp": now
        })

    # 2. PM2.5 Alert
    pm25_val = reading.get("pm25", 0.0)
    if pm25_val > ALERT_THRESHOLDS["pm25"]["threshold"]:
        triggered_alerts.append({
            "location_id": location_id,
            "alert_type": ALERT_THRESHOLDS["pm25"]["type"],
            "severity": "CRITICAL" if pm25_val > 120 else "HIGH",
            "message": ALERT_THRESHOLDS["pm25"]["template"].format(val=round(pm25_val, 1)),
            "timestamp": now
        })

    # 3. Temperature Alert
    temp_val = reading.get("temperature", 0.0)
    if temp_val > ALERT_THRESHOLDS["temperature"]["threshold"]:
        triggered_alerts.append({
            "location_id": location_id,
            "alert_type": ALERT_THRESHOLDS["temperature"]["type"],
            "severity": ALERT_THRESHOLDS["temperature"]["severity"],
            "message": ALERT_THRESHOLDS["temperature"]["template"].format(val=round(temp_val, 1)),
            "timestamp": now
        })

    # 4. CO2 Alert
    co2_val = reading.get("co2", 0.0)
    if co2_val > ALERT_THRESHOLDS["co2"]["threshold"]:
        triggered_alerts.append({
            "location_id": location_id,
            "alert_type": ALERT_THRESHOLDS["co2"]["type"],
            "severity": "HIGH" if co2_val > 1500 else "MODERATE",
            "message": ALERT_THRESHOLDS["co2"]["template"].format(val=round(co2_val, 0)),
            "timestamp": now
        })

    return triggered_alerts
