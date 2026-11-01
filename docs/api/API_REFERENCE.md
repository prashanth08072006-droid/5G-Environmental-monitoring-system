# EcoSense 5G — Complete API Reference & Schema Documentation

The EcoSense 5G backend provides both RESTful HTTP endpoints and an event-driven Server-Sent Events (SSE) telemetry pipeline.

Base URL: `http://localhost:5050`

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates a municipal officer, administrator, or researcher.
- **Request Body:**
```json
{
  "email": "admin@ecosense.io",
  "password": "EcoSense@2026"
}
```
- **Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_admin",
    "name": "Dr. Aarav Sharma",
    "email": "admin@ecosense.io",
    "role": "ADMIN",
    "department": "Central Environmental Board"
  }
}
```

---

## 2. IoT Devices & Fleet Endpoints

### `GET /api/devices`
Returns all registered 5G sensor nodes enriched with recent measurements and cellular health.
- **Response (200 OK):**
```json
[
  {
    "id": "dev_1",
    "deviceId": "ECO-BLR-01",
    "name": "Station Peenya-Alpha",
    "locationId": "loc_1",
    "status": "ONLINE",
    "firmwareVersion": "v2.4.1-5G",
    "networkType": "5G SA (URLLC)",
    "latencyMs": 11,
    "throughputDown": 142.5,
    "throughputUp": 44.2,
    "packetLoss": 0.12,
    "signalRsrp": -71,
    "battery": 98,
    "cpuUsage": 22,
    "memoryUsage": 38,
    "edgeBufferCount": 0,
    "location": {
      "name": "Peenya Industrial Area",
      "city": "Bengaluru",
      "latitude": 13.0285,
      "longitude": 77.5197
    },
    "latestMeasurement": {
      "pm25": 88.4,
      "pm10": 152.0,
      "aqi": 194,
      "aqiCategory": "Moderate"
    }
  }
]
```

### `POST /api/devices`
Registers a newly deployed 5G sensor station.
- **Request Body:**
```json
{
  "deviceId": "ECO-BLR-05",
  "name": "Station Whitefield-Tech",
  "locationName": "Whitefield Export Zone",
  "city": "Bengaluru",
  "latitude": 12.9698,
  "longitude": 77.7500,
  "networkType": "5G SA (URLLC)"
}
```

---

## 3. Measurements & Telemetry Ingestion

### `GET /api/measurements`
Queries historical time-series environmental records.
- **Query Parameters:**
  - `deviceId` (optional): Filter by device hardware identifier (e.g. `ECO-BLR-01`)
  - `hours` (optional): Filter to records within past $N$ hours
  - `limit` (default: 100): Maximum records returned

### `POST /api/measurements` (or `/api/mqtt/simulate`)
Ingests raw sensor readings from edge gateways or MQTT bridges.
- **Request Body:**
```json
{
  "deviceId": "ECO-BLR-01",
  "timestamp": "2026-11-01T11:30:00Z",
  "pm25": 42.7,
  "pm10": 76.2,
  "co": 0.8,
  "no2": 24.3,
  "so2": 8.4,
  "o3": 32.7,
  "voc": 0.31,
  "temperature": 28.4,
  "humidity": 64.2,
  "pressure": 1008.4,
  "windSpeed": 4.8,
  "windDirection": 190
}
```

---

## 4. Air Quality Index (AQI) Calculation

### `GET /api/aqi/current`
Returns fleet-wide average AQI, health advisory, prominent pollutant, and highest/cleanest station rankings according to Indian CPCB standards.

---

## 5. Machine Learning & Predictive Analytics

### `GET /api/predictions?deviceId=ECO-BLR-01`
Returns Holt-Winters + diurnal forecast predictions for horizons of +1h, +6h, and +24h with confidence intervals.

### `POST /api/assistant/ask`
Submits a natural-language query to the EcoSense AI Assistant.
- **Request Body:** `{"question": "Which station recorded the highest PM2.5?"}`
- **Response:** Grounded natural-language briefing referencing real database values.

---

## 6. Real-Time Streaming (SSE)

### `GET /api/stream`
Establishes an HTTP/2 or HTTP/1.1 persistent Server-Sent Events stream. Broadcasts `TELEMETRY_PACKET`, `NEW_ALERT`, `DEVICE_REGISTERED`, and `FAILOVER_RECOVERED` events in real time.
