# EcoSense 5G — System User Manual & Operational Guide

## 1. Getting Started

### Accessing the Web Dashboard
Open your web browser and navigate to:
```
http://localhost:5050
```

### Pre-configured Demo Accounts
The system features instant one-click demo role switching at the bottom of the navigation sidebar, or you can log in with:

| Role | Email | Password | Intended Workflow |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ecosense.io` | `EcoSense@2026` | Node provisioning, threshold management, OTA commands, system health |
| **Environmental Officer** | `officer@ecosense.io` | `EcoSense@2026` | Pollution trend analysis, compliance reports, incident investigation |
| **Researcher** | `researcher@ecosense.io` | `EcoSense@2026` | Time-series downloads, CSV data export, AI model evaluation |
| **Public Citizen** | `viewer@ecosense.io` | `EcoSense@2026` | Read-only live map, current AQI advisory, neighborhood health tips |

---

## 2. Navigating the Platform

### 1. Dashboard (◉)
- **Overall AQI Banner:** Displays metro-wide average AQI calculated via Indian CPCB standard.
- **Meteorology & 5G KPI Cards:** Live PM2.5, Temperature, Relative Humidity, Pressure, Wind, and 5G fleet latency.
- **Geospatial Mini-Map:** Visualizes active station pins with color-coded AQI badges.
- **Real-Time Telemetry Feed:** Updates every 3 seconds without refreshing the browser!

### 2. Live Map (🗺)
- Interactive OpenStreetMap showing the geographical distribution of all deployed nodes.
- Click any station pin to reveal current pollutant concentrations, weather parameters, and 5G connection health.

### 3. Sensors & Fleet (📡)
- Complete directory of all IoT monitoring nodes.
- Displays hardware status (`ONLINE`, `WARNING`, `OFFLINE`), cellular signal strength (RSRP in dBm), battery percentage, and CPU load.
- Click **"Deep Dive →"** to inspect 24-hour historical telemetry logs.
- Administrators can click **"Deploy Node"** to register a new station.

### 4. Analytics & Trends (📊)
- Multi-pollutant time-series diurnal progression curves.
- Environmental correlation matrix exploring relationships between ambient temperature, humidity, wind velocity, and pollutant dispersion.

### 5. Station Compare (⚖)
- Select any two stations (e.g. Peenya Industrial vs Cubbon Park Green Zone) to view parameter differences, delta indicators, and environmental exposure metrics.

### 6. 5G Performance (📶)
- Dedicated 5G network intelligence dashboard.
- Displays URLLC latency (ms), downlink/uplink throughput (Mbps), and packet loss rate.
- **Failover Simulation:** Click **"Drop 5G"** to test edge offline queuing; click **"Reconnect"** to watch the edge gateway automatically flush buffered measurements!

### 7. Pollution Alerts (⚠)
- Real-time notification log of environmental threshold violations.
- Acknowledge or Resolve active incidents with 1 click.
- Create automated threshold rules (e.g., alert when PM2.5 > 90 µg/m³).

### 8. Reports & CSV Export (📈)
- Generate official compliance reports formatted to CPCB guidelines.
- Click **"Generate Compliance Report"** to preview a printable audit summary.
- Click **"Download CSV"** to export raw time-series data for external spreadsheet analysis.

### 9. Predictions & AI Assistant (🤖)
- Machine-learning horizons predicting AQI for +1 Hour, +6 Hours, and +24 Hours.
- **"Ask EcoSense AI":** Natural-language conversational interface grounded in real database measurements. Ask questions like:
  - *"Which station recorded the highest PM2.5?"*
  - *"What is the 5G latency across our sensor fleet?"*
  - *"Are there any active pollution hotspots?"*
