"""
EcoWatch India - 5G Environmental Sensor & Network Simulator
Simulates IoT devices sending readings through 5G URLLC gateways to edge computing & backend.
Measures data transmission latency, delivery rate, and alert response time.
"""
import time
import random
import requests
import json
from datetime import datetime

API_URL = "http://localhost:5050/api/sensor-data"

CITIES = [
    {"location_id": 1, "city_name": "Bengaluru", "base_temp": 24.0, "base_pm25": 42.0, "base_co2": 510.0},
    {"location_id": 2, "city_name": "Mysuru", "base_temp": 25.5, "base_pm25": 28.0, "base_co2": 430.0},
    {"location_id": 3, "city_name": "Delhi", "base_temp": 32.0, "base_pm25": 165.0, "base_co2": 1100.0},
    {"location_id": 4, "city_name": "Mumbai", "base_temp": 30.5, "base_pm25": 58.0, "base_co2": 670.0},
    {"location_id": 5, "city_name": "Chennai", "base_temp": 32.5, "base_pm25": 46.0, "base_co2": 580.0},
    {"location_id": 6, "city_name": "Hyderabad", "base_temp": 29.0, "base_pm25": 64.0, "base_co2": 710.0},
    {"location_id": 7, "city_name": "Pune", "base_temp": 26.5, "base_pm25": 50.0, "base_co2": 600.0},
    {"location_id": 8, "city_name": "Kolkata", "base_temp": 30.0, "base_pm25": 86.0, "base_co2": 840.0}
]

def simulate_5g_packet(city: dict, network_slice: str = "URLLC"):
    """Simulates 5G radio transmission characteristics and edge filtering."""
    # 5G Network Latency Simulation (URLLC: 8-14ms, eMBB: 20-30ms, mMTC: 40-55ms)
    slice_latency_params = {
        "URLLC": (8.5, 14.2),
        "eMBB": (20.0, 32.0),
        "mMTC": (38.0, 52.0)
    }
    low, high = slice_latency_params.get(network_slice, (9.0, 14.0))
    latency_ms = round(random.uniform(low, high), 2)
    
    # 5G Packet Delivery Rate (URLLC 99.999% SLA)
    delivery_rate = round(random.uniform(99.980, 99.999), 3)

    # Edge Computing Noise Filtration & Synthetic Sensor Readout
    temp_variation = random.uniform(-1.2, 1.2)
    pm25_variation = random.uniform(-4.0, 6.0)
    
    pm25 = max(5.0, round(city["base_pm25"] + pm25_variation, 1))
    pm10 = round(pm25 * random.uniform(1.6, 2.1), 1)
    temp = round(city["base_temp"] + temp_variation, 1)
    humidity = round(random.uniform(45.0, 85.0), 1)
    co2 = max(350.0, round(city["base_co2"] + random.uniform(-25.0, 45.0), 1))

    # Edge validation
    edge_validated = (-10 <= temp <= 60) and (0 <= humidity <= 100) and (pm25 >= 0)

    payload = {
        "location_id": city["location_id"],
        "temperature": temp,
        "humidity": humidity,
        "aqi": 0,  # Computed at backend using CPCB NAQI formula
        "pm25": pm25,
        "pm10": pm10,
        "co2": co2,
        "latency": latency_ms,
        "delivery_rate": delivery_rate,
        "edge_validated": edge_validated
    }

    return payload

def run_simulation_cycle(endpoint: str = API_URL):
    print(f"\n📡 [5G IoT Simulator] Transmitting packets to {endpoint}...")
    success_count = 0
    total_latency = 0.0

    for city in CITIES:
        payload = simulate_5g_packet(city, network_slice="URLLC")
        t_start = time.time()
        try:
            resp = requests.post(endpoint, json=payload, timeout=2.0)
            elapsed_ms = round((time.time() - t_start) * 1000, 1)
            if resp.status_code == 200:
                data = resp.json()
                success_count += 1
                total_latency += payload["latency"]
                print(f"  ✓ [{city['city_name']}] 5G Latency: {payload['latency']}ms | AQI: {data.get('computed_aqi')} | Alerts: {data.get('alerts_triggered')}")
            else:
                print(f"  ⚠ [{city['city_name']}] Server error: {resp.status_code}")
        except Exception as e:
            print(f"  ✕ [{city['city_name']}] Connection refused or timeout (Backend offline?)")

    if success_count > 0:
        avg_lat = round(total_latency / success_count, 2)
        print(f"🎯 Cycle Complete: {success_count}/{len(CITIES)} packets delivered | Mean 5G Latency: {avg_lat} ms\n")

if __name__ == "__main__":
    print("==================================================")
    print("🌱 EcoWatch India - 5G Environmental Simulator")
    print("Sub-6GHz URLLC / eMBB / mMTC Ingestion Pipeline")
    print("==================================================")
    try:
        while True:
            run_simulation_cycle()
            time.sleep(4)
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")
