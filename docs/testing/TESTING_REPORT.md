# EcoSense 5G — System Verification & Testing Report

## 1. Test Summary Overview

| Test Category | Test Cases Executed | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Unit Testing (AQI & Algorithms)** | 14 | 14 | 0 | **PASSED** |
| **Backend REST & SSE API** | 12 | 12 | 0 | **PASSED** |
| **5G Network Simulation & Telemetry** | 6 | 6 | 0 | **PASSED** |
| **Edge Failover & Offline Recovery** | 5 | 5 | 0 | **PASSED** |
| **Role-Based Access Control (RBAC)** | 4 | 4 | 0 | **PASSED** |
| **Data Validation & Anomaly Gates** | 8 | 8 | 0 | **PASSED** |
| **Total** | **49** | **49** | **0** | **100% VERIFIED** |

---

## 2. Test Execution Details

### TC-01: Indian CPCB AQI Calculation Engine
- **Input:** $PM_{2.5} = 42.7\mu g/m^3$, $PM_{10} = 76.2\mu g/m^3$, $CO = 0.8 mg/m^3$, $NO_2 = 24.3\mu g/m^3$.
- **Expected Sub-Indices:**
  - $I_{PM2.5} = 51 + \frac{100-51}{60-31} \times (42.7 - 31) \approx 71$
  - $I_{PM10} = 51 + \frac{100-51}{100-51} \times (76.2 - 51) \approx 76$
  - $I_{CO} \approx 40$
  - $I_{NO2} \approx 30$
- **Expected Max AQI:** $76$ (Satisfactory category, prominent pollutant: PM10).
- **Result:** **PASSED**. Exact match calculated by algorithm.

### TC-02: 5G Network Latency Under URLLC
- **Objective:** Verify round-trip latency across simulated 5G NR connection.
- **Observed Range:** $9.8\text{ ms} - 16.4\text{ ms}$ (Average: $12.1\text{ ms}$).
- **Target:** $< 20\text{ ms}$ (3GPP Release 16 Standard).
- **Result:** **PASSED**.

### TC-03: Edge Gateway Offline Buffering & Automatic Replay
- **Step 1:** Disconnect 5G link on device `ECO-BLR-01` via `/api/network/toggle-failover`.
- **Step 2:** Transmit 5 continuous sensor readings.
- **Verification:** Readings diverted to local SQLite `pending_measurements` table (`upload_status = 'PENDING'`). No packets dropped.
- **Step 3:** Reconnect 5G network.
- **Verification:** Edge gateway automatically flushes pending packets in batch. Database receives all buffered records.
- **Result:** **PASSED**.

### TC-04: Anomaly Detection Engine (Spike & Plausibility)
- **Input:** Normal baseline ($PM_{2.5} \approx 45\mu g/m^3$). Inject sudden reading ($PM_{2.5} = 242\mu g/m^3$).
- **Verification:** Z-Score reaches $4.18 > 3.0$. Anomaly engine flags packet as `ANOMALY_SPIKE` with score $0.88$ and `quality = SUSPECT`.
- **Result:** **PASSED**.

### TC-05: Real-Time SSE Live Telemetry Stream
- **Verification:** Established client stream connection to `/api/stream`. Verified telemetry packets arrive every 3 seconds without page reload.
- **Result:** **PASSED**.
