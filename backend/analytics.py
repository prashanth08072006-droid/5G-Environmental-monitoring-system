from typing import List, Dict, Any
import numpy as np

def calculate_pollution_risk(aqi: int, pm25: float, co2: float) -> str:
    """
    Computes qualitative risk score based on multi-pollutant exposure matrix.
    """
    if aqi > 300 or pm25 > 120 or co2 > 2000:
        return "Severe"
    elif aqi > 200 or pm25 > 60 or co2 > 1000:
        return "High"
    elif aqi > 100 or pm25 > 35 or co2 > 700:
        return "Moderate"
    else:
        return "Low"

def compute_cpcb_aqi(pm25: float, pm10: float) -> int:
    """
    Calculates composite NAQI according to Central Pollution Control Board breakpoints.
    """
    # PM2.5 sub-index breakpoints
    pm25_bp = [
        (0, 30, 0, 50),
        (30.1, 60, 51, 100),
        (60.1, 90, 101, 200),
        (90.1, 120, 201, 300),
        (120.1, 250, 301, 400),
        (250.1, 500, 401, 500)
    ]
    sub_pm25 = 0
    for clow, chigh, ilow, ihigh in pm25_bp:
        if clow <= pm25 <= chigh:
            sub_pm25 = ((ihigh - ilow) / (chigh - clow)) * (pm25 - clow) + ilow
            break
    if pm25 > 500:
        sub_pm25 = 500

    # PM10 sub-index breakpoints
    pm10_bp = [
        (0, 50, 0, 50),
        (50.1, 100, 51, 100),
        (100.1, 250, 101, 200),
        (250.1, 350, 201, 300),
        (350.1, 430, 301, 400),
        (430.1, 600, 401, 500)
    ]
    sub_pm10 = 0
    for clow, chigh, ilow, ihigh in pm10_bp:
        if clow <= pm10 <= chigh:
            sub_pm10 = ((ihigh - ilow) / (chigh - clow)) * (pm10 - clow) + ilow
            break
    if pm10 > 600:
        sub_pm10 = 500

    return int(max(sub_pm25, sub_pm10))

def aggregate_city_analytics(readings: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not readings:
        return {}

    aqis = [r["aqi"] for r in readings]
    pm25s = [r["pm25"] for r in readings]
    pm10s = [r["pm10"] for r in readings]
    co2s = [r["co2"] for r in readings]
    temps = [r["temperature"] for r in readings]
    humids = [r["humidity"] for r in readings]

    return {
        "avg_aqi": round(float(np.mean(aqis)), 1),
        "max_aqi": int(np.max(aqis)),
        "min_aqi": int(np.min(aqis)),
        "avg_pm25": round(float(np.mean(pm25s)), 1),
        "avg_pm10": round(float(np.mean(pm10s)), 1),
        "avg_co2": round(float(np.mean(co2s)), 1),
        "avg_temperature": round(float(np.mean(temps)), 1),
        "avg_humidity": round(float(np.mean(humids)), 1),
        "readings_count": len(readings)
    }
