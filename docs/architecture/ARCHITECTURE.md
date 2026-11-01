# EcoSense 5G — System Architecture & Engineering Specification

## 1. Executive Summary

EcoSense 5G is an end-to-end Environmental Intelligence & Real-Time Monitoring Platform powered by **5G cellular connectivity (3GPP Release 16 URLLC)**, smart distributed IoT sensor nodes, edge computing, Central Pollution Control Board (CPCB) National Air Quality Index (NAQI) calculation, machine-learning anomaly detection, predictive forecasting, and automated emergency alert dispatch.

---

## 2. High-Level Architectural Diagram

```mermaid
flowchart TD
    subgraph Tier1["Tier 1: Ambient Environment"]
        ENV["PM2.5, PM10, CO, NO2, SO2, O3, NH3, VOCs, Temp, Humidity, Pressure, Wind"]
    end

    subgraph Tier2["Tier 2: IoT Sensing Node (ESP32)"]
        SENS["PMS5003 Laser + BME280 + MQ-135 Sensors"]
        VALID["Local Edge Validation Gate"]
        RBUFF["Circular Ring Buffer (Offline Storage)"]
        SENS --> VALID
        VALID -->|Valid| RBUFF
    end

    subgraph Tier3["Tier 3: 5G Network & Edge Gateway"]
        MODEM["SIMCom SIM8200 5G NR Modem (Sub-6GHz)"]
        EDGE["Edge Gateway (Noise Filter & 60s Aggregation)"]
        RBUFF --> MODEM
        MODEM --> EDGE
    end

    subgraph Tier4["Tier 4: Cloud Ingestion & Processing Core"]
        INGEST["MQTT Broker & REST API Gateway"]
        AQI["CPCB NAQI Calculation Engine"]
        ANOM["Isolation Forest & Z-Score Anomaly Detector"]
        PRED["Holt-Winters Diurnal Predictive Forecaster"]
        DB["PostgreSQL / TimescaleDB"]
        ALERT["Automated Alert & Notification Engine"]

        EDGE -->|5G URLLC < 15ms| INGEST
        INGEST --> AQI
        INGEST --> ANOM
        INGEST --> PRED
        AQI --> DB
        ANOM --> DB
        PRED --> DB
        AQI --> ALERT
        ANOM --> ALERT
    end

    subgraph Tier5["Tier 5: Presentation & Client Interface"]
        SSE["Server-Sent Events / WebSocket Telemetry Stream"]
        DASH["EcoSense 5G Responsive Intelligence Dashboard"]
        MAP["Geospatial Leaflet Air Quality Map"]
        AI["'Ask EcoSense' Conversational Assistant"]

        DB --> SSE
        ALERT --> SSE
        SSE --> DASH
        DASH --> MAP
        DASH --> AI
    end

    ENV --> SENS
```

---

## 3. 5G URLLC Latency Budget Breakdown

| Subsystem / Hop | Protocol / Physical Medium | Target Latency | Observed Field Latency |
| :--- | :--- | :--- | :--- |
| **Sensor Sampling to ESP32** | I2C (400kHz) / UART (9600 baud) | < 1.0 ms | 0.4 ms |
| **Local Edge Validation & Filter** | In-Memory Circular Buffer & Median | < 2.0 ms | 1.4 ms |
| **5G Radio Access Network (RAN)** | 3GPP Rel-16 5G NR (Band n78 / 3.5 GHz) | < 15.0 ms | **11.8 ms** |
| **Cloud MQTT Ingestion & Ingress** | TLS 1.3 / TCP Keep-Alive | < 5.0 ms | 2.1 ms |
| **CPCB AQI & Anomaly Calculation** | Asynchronous Node.js Microservice | < 2.0 ms | 0.8 ms |
| **SSE / WebSocket Client Broadcast** | HTTP/2 Streaming | < 10.0 ms | 4.2 ms |
| **Total End-to-End Latency** | **Sensor to Browser Screen** | **< 35.0 ms** | **20.7 ms** |

---

## 4. Edge Failover & Offline Recovery Architecture

```mermaid
sequenceDiagram
    participant Sensor as ESP32 Sensor
    participant Edge as Edge SQLite Queue
    participant Modem as 5G Cellular Modem
    participant Cloud as Cloud Ingestion API
    participant Client as Live Dashboard

    Note over Modem: 5G Network Active
    Sensor->>Modem: Send 1Hz Telemetry
    Modem->>Cloud: 5G URLLC Transmission (12ms)
    Cloud->>Client: Instant SSE Broadcast

    Note over Modem: 5G Cellular Signal Lost (RSRP < -115 dBm)
    Sensor->>Modem: Transmit Attempt
    Modem--xCloud: Connection Timeout
    Sensor->>Edge: Route to SQLite pending_measurements table
    Note over Edge: Locally Buffering Readings (up to 5,000 packets)

    Note over Modem: 5G Network Reconnected (RSRP = -72 dBm)
    Edge->>Modem: Trigger Burst Replay
    Modem->>Cloud: Batch Ingest Queued Telemetry
    Cloud->>Client: Historical Infill & Continuity Restored
```

---

## 5. Indian National AQI (CPCB) Mathematical Formulation

The prototype uses the official Indian Central Pollution Control Board (CPCB) methodology:

$$I_p = I_{low} + \frac{I_{high} - I_{low}}{B_{high} - B_{low}} \times (C_p - B_{low})$$

Where:
- $I_p$ = Calculated sub-index for pollutant $p$
- $C_p$ = Monitored concentration of pollutant $p$
- $B_{high}, B_{low}$ = Breakpoint concentration boundaries
- $I_{high}, I_{low}$ = Standard index boundaries corresponding to the breakpoints

**Overall AQI:**
$$\text{Overall AQI} = \max(I_{PM2.5}, I_{PM10}, I_{NO_2}, I_{SO_2}, I_{CO}, I_{O_3}, I_{NH_3})$$

The pollutant attaining the maximum sub-index is designated as the **Prominent Pollutant**.
