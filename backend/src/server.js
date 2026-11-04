const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Optional SQLite connection via native node:sqlite (Node 22+)
let sqliteDb = null;
try {
  const { DatabaseSync } = require('node:sqlite');
  const dbDir = path.join(__dirname, '..', '..', 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'ecowatch.db');
  sqliteDb = new DatabaseSync(dbPath);
  console.log('✅ Connected to SQLite database at:', dbPath);
} catch (err) {
  console.warn('⚠️ Native node:sqlite not available, running with high-performance in-memory persistence:', err.message);
}

const PORT = process.env.PORT || 5050;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// ========================================================
// 1. CPCB National AQI Breakpoints & Calculation
// ========================================================
const AQI_BREAKPOINTS = {
  pm25: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 }
  ],
  pm10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 }
  ]
};

function calculateSubIndex(pollutant, value) {
  if (value === undefined || value === null || isNaN(value)) return null;
  const bpList = AQI_BREAKPOINTS[pollutant];
  if (!bpList) return null;

  for (const bp of bpList) {
    if (value >= bp.cLow && value <= bp.cHigh) {
      const sub = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (value - bp.cLow) + bp.iLow;
      return Math.round(sub);
    }
  }
  const lastBp = bpList[bpList.length - 1];
  if (value > lastBp.cHigh) return 500;
  return 0;
}

function getAQICategory(aqi) {
  if (aqi <= 50) return { category: 'Good', color: '#10B981', bg: 'bg-emerald-500/10 text-emerald-700', healthMsg: 'Minimal health impact; clean and pristine air quality.' };
  if (aqi <= 100) return { category: 'Satisfactory', color: '#34D399', bg: 'bg-green-500/10 text-green-700', healthMsg: 'Minor breathing discomfort to sensitive people.' };
  if (aqi <= 200) return { category: 'Moderate', color: '#F59E0B', bg: 'bg-amber-500/10 text-amber-700', healthMsg: 'Breathing discomfort to people with asthma and heart conditions.' };
  if (aqi <= 300) return { category: 'Poor', color: '#F97316', bg: 'bg-orange-500/10 text-orange-700', healthMsg: 'Breathing discomfort to most people on prolonged exposure.' };
  if (aqi <= 400) return { category: 'Very Poor', color: '#EF4444', bg: 'bg-red-500/10 text-red-700', healthMsg: 'Respiratory illness on prolonged exposure; health alert.' };
  return { category: 'Severe', color: '#991B1B', bg: 'bg-rose-900/20 text-rose-800', healthMsg: 'Affects healthy people and severely impacts individuals with existing diseases.' };
}

function calculatePollutionRisk(aqi, pm25, temp, co2) {
  const normAqi = Math.min(1.0, (aqi || 50) / 500);
  const normPm25 = Math.min(1.0, (pm25 || 30) / 250);
  const normTemp = Math.min(1.0, Math.max(0, ((temp || 25) - 15) / 35));
  const normCo2 = Math.min(1.0, Math.max(0, ((co2 || 400) - 350) / 1650));

  const score = Math.round((normAqi * 0.40 + normPm25 * 0.30 + normTemp * 0.15 + normCo2 * 0.15) * 100);
  let level = 'Low';
  let color = '#10B981';

  if (score >= 75) {
    level = 'Critical';
    color = '#EF4444';
  } else if (score >= 50) {
    level = 'High';
    color = '#F97316';
  } else if (score >= 25) {
    level = 'Moderate';
    color = '#F59E0B';
  }

  return { score, level, color };
}

// ========================================================
// 2. Initialize 8 Indian Cities as per EcoWatch India PRD
// ========================================================
const LOCATIONS = [
  { location_id: 1, city_name: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, station_name: 'Peenya & Electronic City 5G Node', base_temp: 24.5, base_hum: 62.0, base_aqi: 88, base_pm25: 42.0, base_pm10: 78.0, base_co2: 520.0 },
  { location_id: 2, city_name: 'Mysuru', state: 'Karnataka', latitude: 12.2958, longitude: 76.6394, station_name: 'Chamundi Green & Hebbal 5G Node', base_temp: 26.0, base_hum: 58.0, base_aqi: 48, base_pm25: 28.0, base_pm10: 45.0, base_co2: 440.0 },
  { location_id: 3, city_name: 'Delhi', state: 'Delhi NCT', latitude: 28.6139, longitude: 77.2090, station_name: 'Anand Vihar & Lodhi 5G Node', base_temp: 32.5, base_hum: 45.0, base_aqi: 315, base_pm25: 168.0, base_pm10: 280.0, base_co2: 1120.0 },
  { location_id: 4, city_name: 'Mumbai', state: 'Maharashtra', latitude: 19.0760, longitude: 72.8777, station_name: 'BKC Coastal & Chembur 5G Node', base_temp: 31.0, base_hum: 78.0, base_aqi: 115, base_pm25: 58.0, base_pm10: 110.0, base_co2: 680.0 },
  { location_id: 5, city_name: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, station_name: 'Guindy Industrial & Marina 5G Node', base_temp: 33.0, base_hum: 82.0, base_aqi: 95, base_pm25: 48.0, base_pm10: 85.0, base_co2: 590.0 },
  { location_id: 6, city_name: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867, station_name: 'HITEC Cyber Towers 5G Node', base_temp: 29.5, base_hum: 54.0, base_aqi: 128, base_pm25: 65.0, base_pm10: 125.0, base_co2: 720.0 },
  { location_id: 7, city_name: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, station_name: 'Hinjawadi IT Corridor 5G Node', base_temp: 27.0, base_hum: 59.0, base_aqi: 105, base_pm25: 52.0, base_pm10: 92.0, base_co2: 610.0 },
  { location_id: 8, city_name: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639, station_name: 'Victoria Memorial 5G Node', base_temp: 30.5, base_hum: 74.0, base_aqi: 165, base_pm25: 88.0, base_pm10: 160.0, base_co2: 850.0 }
];

// Initialize SQLite tables if using SQLite
if (sqliteDb) {
  try {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS locations (
        location_id INTEGER PRIMARY KEY AUTOINCREMENT,
        city_name TEXT UNIQUE NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sensor_readings (
        reading_id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        temperature REAL NOT NULL,
        humidity REAL NOT NULL,
        aqi INTEGER NOT NULL,
        pm25 REAL NOT NULL,
        pm10 REAL NOT NULL,
        co2 REAL NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (location_id) REFERENCES locations(location_id)
      );
      CREATE TABLE IF NOT EXISTS alerts (
        alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (location_id) REFERENCES locations(location_id)
      );
      CREATE TABLE IF NOT EXISTS communication_metrics (
        metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        latency REAL NOT NULL,
        delivery_rate REAL NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (location_id) REFERENCES locations(location_id)
      );
    `);

    const insLoc = sqliteDb.prepare('INSERT OR IGNORE INTO locations (location_id, city_name, latitude, longitude) VALUES (?, ?, ?, ?)');
    for (const l of LOCATIONS) {
      insLoc.run(l.location_id, l.city_name, l.latitude, l.longitude);
    }
  } catch (err) {
    console.error('Error during SQLite table setup:', err);
  }
}

// In-Memory Data Store (Synchronized with SQLite)
const memoryStore = {
  locations: LOCATIONS,
  readings: [],
  alerts: [],
  metrics: [],
  networkSim: {
    activeSlice: 'URLLC', // URLLC, eMBB, mMTC
    baseLatency: 11.2,
    jitter: 1.1,
    deliveryRate: 99.98,
    edgeProcessingMs: 3.4,
    cloudRoundtripMs: 84.5,
    packetBurstHistory: []
  }
};

// Generate 24-hour historical baseline for each of the 8 cities
const now = new Date();
for (let h = 24; h >= 0; h--) {
  const ts = new Date(now.getTime() - h * 3600 * 1000).toISOString();
  LOCATIONS.forEach(loc => {
    const variance = (Math.sin(h * 0.4) * 0.12) + ((Math.random() - 0.5) * 0.08);
    const temp = Number((loc.base_temp + (variance * 5)).toFixed(1));
    const hum = Math.max(20, Math.min(99, Number((loc.base_hum + (variance * 8)).toFixed(1))));
    const pm25 = Math.max(10, Number((loc.base_pm25 * (1 + variance)).toFixed(1)));
    const pm10 = Math.max(20, Number((loc.base_pm10 * (1 + variance)).toFixed(1)));
    const co2 = Math.max(380, Number((loc.base_co2 * (1 + variance * 0.5)).toFixed(0)));
    const calculatedAqi = Math.max(15, Math.round(loc.base_aqi * (1 + variance)));
    const latency = Number((10.5 + Math.random() * 3.5).toFixed(1));
    const delivery = Number((99.95 + Math.random() * 0.04).toFixed(3));

    const reading = {
      reading_id: memoryStore.readings.length + 1,
      location_id: loc.location_id,
      city_name: loc.city_name,
      temperature: temp,
      humidity: hum,
      aqi: calculatedAqi,
      pm25: pm25,
      pm10: pm10,
      co2: co2,
      timestamp: ts
    };
    memoryStore.readings.push(reading);

    const metric = {
      metric_id: memoryStore.metrics.length + 1,
      location_id: loc.location_id,
      latency: latency,
      delivery_rate: delivery,
      timestamp: ts
    };
    memoryStore.metrics.push(metric);

    // Initial alert generation for threshold breaches
    if (calculatedAqi > 200) {
      memoryStore.alerts.push({
        alert_id: memoryStore.alerts.length + 1,
        location_id: loc.location_id,
        city_name: loc.city_name,
        alert_type: 'Severe AQI Breach',
        severity: calculatedAqi > 300 ? 'CRITICAL' : 'HIGH',
        message: `AQI reached ${calculatedAqi} (> 200 threshold) in ${loc.city_name}. Health Advisory Active.`,
        timestamp: ts,
        status: 'ACTIVE'
      });
    }
    if (pm25 > 60) {
      memoryStore.alerts.push({
        alert_id: memoryStore.alerts.length + 1,
        location_id: loc.location_id,
        city_name: loc.city_name,
        alert_type: 'PM2.5 Standard Breach',
        severity: 'HIGH',
        message: `PM2.5 recorded at ${pm25} µg/m³ (> 60 µg/m³ threshold) in ${loc.city_name}.`,
        timestamp: ts,
        status: 'ACTIVE'
      });
    }
    if (temp > 40) {
      memoryStore.alerts.push({
        alert_id: memoryStore.alerts.length + 1,
        location_id: loc.location_id,
        city_name: loc.city_name,
        alert_type: 'Heatwave Warning',
        severity: 'CRITICAL',
        message: `Extreme temperature recorded at ${temp}°C (> 40°C threshold) in ${loc.city_name}.`,
        timestamp: ts,
        status: 'ACTIVE'
      });
    }
    if (co2 > 1000) {
      memoryStore.alerts.push({
        alert_id: memoryStore.alerts.length + 1,
        location_id: loc.location_id,
        city_name: loc.city_name,
        alert_type: 'CO2 Air Stagnation',
        severity: 'MEDIUM',
        message: `Elevated carbon dioxide levels at ${co2} ppm (> 1000 ppm threshold) in ${loc.city_name}.`,
        timestamp: ts,
        status: 'ACTIVE'
      });
    }
  });
}

// Keep only the most recent alerts
memoryStore.alerts = memoryStore.alerts.slice(-25);

// ========================================================
// 3. Automated Alert Evaluation Engine
// ========================================================
function evaluateAlerts(location, reading) {
  const newAlerts = [];
  const ts = reading.timestamp || new Date().toISOString();

  // Threshold 1: AQI > 200
  if (reading.aqi > 200) {
    newAlerts.push({
      location_id: location.location_id,
      city_name: location.city_name,
      alert_type: 'Severe AQI Breach',
      severity: reading.aqi > 300 ? 'CRITICAL' : 'HIGH',
      message: `AQI exceeded hazardous threshold: ${reading.aqi} in ${location.city_name}.`,
      timestamp: ts,
      status: 'ACTIVE'
    });
  }

  // Threshold 2: PM2.5 > 60 µg/m³ (CPCB 24-hr standard)
  if (reading.pm25 > 60) {
    newAlerts.push({
      location_id: location.location_id,
      city_name: location.city_name,
      alert_type: 'PM2.5 Standard Breach',
      severity: 'HIGH',
      message: `PM2.5 concentration is ${reading.pm25} µg/m³ (CPCB standard breach > 60 µg/m³) in ${location.city_name}.`,
      timestamp: ts,
      status: 'ACTIVE'
    });
  }

  // Threshold 3: Temperature > 40°C
  if (reading.temperature > 40) {
    newAlerts.push({
      location_id: location.location_id,
      city_name: location.city_name,
      alert_type: 'Heatwave Warning',
      severity: 'CRITICAL',
      message: `Extreme heat condition: Temperature reached ${reading.temperature}°C in ${location.city_name}.`,
      timestamp: ts,
      status: 'ACTIVE'
    });
  }

  // Threshold 4: CO2 > 1000 ppm
  if (reading.co2 > 1000) {
    newAlerts.push({
      location_id: location.location_id,
      city_name: location.city_name,
      alert_type: 'CO2 Air Stagnation',
      severity: 'MEDIUM',
      message: `Carbon Dioxide elevated to ${reading.co2} ppm (> 1000 ppm threshold) in ${location.city_name}.`,
      timestamp: ts,
      status: 'ACTIVE'
    });
  }

  for (const alt of newAlerts) {
    alt.alert_id = memoryStore.alerts.length + 1;
    memoryStore.alerts.unshift(alt);
    if (sqliteDb) {
      try {
        const stmt = sqliteDb.prepare(`
          INSERT INTO alerts (location_id, alert_type, severity, message, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(alt.location_id, alt.alert_type, alt.severity, alt.message, alt.timestamp);
      } catch (e) {
        console.warn('SQLite alert insert error:', e.message);
      }
    }
  }

  if (memoryStore.alerts.length > 50) {
    memoryStore.alerts = memoryStore.alerts.slice(0, 50);
  }

  return newAlerts;
}

// ========================================================
// 4. Live 5G Telemetry & IoT Edge Simulator Loop
// ========================================================
const sseClients = new Set();

function broadcastSSE(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Background generator: Emits real-time 5G packet telemetry every 2.5s
setInterval(() => {
  const targetLoc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const variance = (Math.random() - 0.5) * 0.15;
  const temp = Number((targetLoc.base_temp + (variance * 4)).toFixed(1));
  const hum = Math.max(20, Math.min(99, Number((targetLoc.base_hum + (variance * 6)).toFixed(1))));
  const pm25 = Math.max(10, Number((targetLoc.base_pm25 * (1 + variance)).toFixed(1)));
  const pm10 = Math.max(20, Number((targetLoc.base_pm10 * (1 + variance)).toFixed(1)));
  const co2 = Math.max(380, Number((targetLoc.base_co2 * (1 + variance * 0.4)).toFixed(0)));
  const aqi = Math.max(20, Math.round(targetLoc.base_aqi * (1 + variance)));

  // Calculate slice-specific latency
  let sliceLatency = memoryStore.networkSim.baseLatency;
  let sliceDelivery = 99.999;
  if (memoryStore.networkSim.activeSlice === 'eMBB') {
    sliceLatency = 24.2 + (Math.random() - 0.5) * 3;
    sliceDelivery = 99.92;
  } else if (memoryStore.networkSim.activeSlice === 'mMTC') {
    sliceLatency = 42.8 + (Math.random() - 0.5) * 6;
    sliceDelivery = 99.85;
  } else {
    sliceLatency = 11.2 + (Math.random() - 0.5) * 2;
    sliceDelivery = 99.998;
  }
  sliceLatency = Math.max(4.0, Number(sliceLatency.toFixed(1)));

  const reading = {
    reading_id: memoryStore.readings.length + 1,
    location_id: targetLoc.location_id,
    city_name: targetLoc.city_name,
    temperature: temp,
    humidity: hum,
    aqi: aqi,
    pm25: pm25,
    pm10: pm10,
    co2: co2,
    timestamp: new Date().toISOString()
  };

  const metric = {
    metric_id: memoryStore.metrics.length + 1,
    location_id: targetLoc.location_id,
    latency: sliceLatency,
    delivery_rate: sliceDelivery,
    timestamp: reading.timestamp
  };

  memoryStore.readings.push(reading);
  memoryStore.metrics.push(metric);
  if (memoryStore.readings.length > 500) memoryStore.readings.shift();
  if (memoryStore.metrics.length > 500) memoryStore.metrics.shift();

  // Check alert conditions
  const triggered = evaluateAlerts(targetLoc, reading);

  const payload = {
    type: 'TELEMETRY_PACKET',
    data: {
      location: targetLoc,
      reading: reading,
      metric: metric,
      pollution_risk: calculatePollutionRisk(aqi, pm25, temp, co2),
      slice: memoryStore.networkSim.activeSlice,
      alerts_triggered: triggered.length
    }
  };

  broadcastSSE(payload);
}, 2500);

// ========================================================
// 5. HTTP Helper Functions
// ========================================================
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// ========================================================
// 6. HTTP Server & Endpoint Routing
// ========================================================
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    // ----------------------------------------------------
    // SSE Real-Time Telemetry Stream
    // ----------------------------------------------------
    if (pathname === '/api/stream' && method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(': connected\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    // ----------------------------------------------------
    // 1. GET /api/locations - 8 Indian Cities
    // ----------------------------------------------------
    if (pathname === '/api/locations' && method === 'GET') {
      return sendJson(res, 200, memoryStore.locations);
    }

    // ----------------------------------------------------
    // 2. GET /api/environment/current - Latest Readings
    // ----------------------------------------------------
    if (pathname === '/api/environment/current' && method === 'GET') {
      const locId = parsedUrl.query.location_id ? parseInt(parsedUrl.query.location_id) : null;

      const getLatestForLoc = (lId) => {
        const loc = memoryStore.locations.find(l => l.location_id === lId);
        const readings = memoryStore.readings.filter(r => r.location_id === lId);
        const latestR = readings.slice(-1)[0] || {
          temperature: loc.base_temp,
          humidity: loc.base_hum,
          aqi: loc.base_aqi,
          pm25: loc.base_pm25,
          pm10: loc.base_pm10,
          co2: loc.base_co2,
          timestamp: new Date().toISOString()
        };
        const metrics = memoryStore.metrics.filter(m => m.location_id === lId);
        const latestM = metrics.slice(-1)[0] || { latency: 11.2, delivery_rate: 99.98 };
        const aqiInfo = getAQICategory(latestR.aqi);
        const risk = calculatePollutionRisk(latestR.aqi, latestR.pm25, latestR.temperature, latestR.co2);

        return {
          location_id: loc.location_id,
          city_name: loc.city_name,
          state: loc.state,
          latitude: loc.latitude,
          longitude: loc.longitude,
          station_name: loc.station_name,
          temperature: latestR.temperature,
          humidity: latestR.humidity,
          aqi: latestR.aqi,
          aqi_category: aqiInfo.category,
          aqi_color: aqiInfo.color,
          health_message: aqiInfo.healthMsg,
          pm25: latestR.pm25,
          pm10: latestR.pm10,
          co2: latestR.co2,
          pollution_risk: risk,
          communication: {
            latency_ms: latestM.latency,
            delivery_rate: latestM.delivery_rate,
            network_slice: memoryStore.networkSim.activeSlice,
            edge_delay_ms: memoryStore.networkSim.edgeProcessingMs
          },
          timestamp: latestR.timestamp
        };
      };

      if (locId) {
        return sendJson(res, 200, getLatestForLoc(locId));
      }

      const allLatest = memoryStore.locations.map(loc => getLatestForLoc(loc.location_id));
      return sendJson(res, 200, allLatest);
    }

    // ----------------------------------------------------
    // 3. GET /api/environment/history - Historical Telemetry
    // ----------------------------------------------------
    if (pathname === '/api/environment/history' && method === 'GET') {
      const locId = parsedUrl.query.location_id ? parseInt(parsedUrl.query.location_id) : 1;
      const hours = parsedUrl.query.hours ? parseInt(parsedUrl.query.hours) : 24;

      const filtered = memoryStore.readings
        .filter(r => r.location_id === locId)
        .slice(-hours);

      return sendJson(res, 200, filtered);
    }

    // ----------------------------------------------------
    // 4. GET /api/analytics - Summary Across All Stations
    // ----------------------------------------------------
    if ((pathname === '/api/analytics' || pathname === '/api/analytics/summary') && method === 'GET') {
      const currentStations = memoryStore.locations.map(loc => {
        const readings = memoryStore.readings.filter(r => r.location_id === loc.location_id);
        const latest = readings.slice(-1)[0] || { aqi: loc.base_aqi, pm25: loc.base_pm25, temperature: loc.base_temp, humidity: loc.base_hum, co2: loc.base_co2 };
        const risk = calculatePollutionRisk(latest.aqi, latest.pm25, latest.temperature, latest.co2);
        return {
          location_id: loc.location_id,
          city_name: loc.city_name,
          state: loc.state,
          latitude: loc.latitude,
          longitude: loc.longitude,
          aqi: latest.aqi,
          pm25: latest.pm25,
          temperature: latest.temperature,
          humidity: latest.humidity,
          co2: latest.co2,
          risk_level: risk.level,
          risk_score: risk.score
        };
      });

      const aqiValues = currentStations.map(s => s.aqi);
      const avgAqi = Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length);
      const worstCity = currentStations.reduce((prev, curr) => curr.aqi > prev.aqi ? curr : prev, currentStations[0]);
      const cleanestCity = currentStations.reduce((prev, curr) => curr.aqi < prev.aqi ? curr : prev, currentStations[0]);

      // Category breakdown
      const breakdown = {
        good: currentStations.filter(s => s.aqi <= 50).length,
        satisfactory: currentStations.filter(s => s.aqi > 50 && s.aqi <= 100).length,
        moderate: currentStations.filter(s => s.aqi > 100 && s.aqi <= 200).length,
        poor: currentStations.filter(s => s.aqi > 200 && s.aqi <= 300).length,
        very_poor: currentStations.filter(s => s.aqi > 300 && s.aqi <= 400).length,
        severe: currentStations.filter(s => s.aqi > 400).length
      };

      const avgLatency = Number((memoryStore.metrics.slice(-20).reduce((a, b) => a + b.latency, 0) / Math.max(1, memoryStore.metrics.slice(-20).length)).toFixed(1));
      const avgDelivery = Number((memoryStore.metrics.slice(-20).reduce((a, b) => a + b.delivery_rate, 0) / Math.max(1, memoryStore.metrics.slice(-20).length)).toFixed(3));

      return sendJson(res, 200, {
        total_stations: memoryStore.locations.length,
        total_readings: memoryStore.readings.length,
        avg_aqi: avgAqi,
        min_aqi: Math.min(...aqiValues),
        max_aqi: Math.max(...aqiValues),
        worst_station: worstCity,
        cleanest_station: cleanestCity,
        category_breakdown: breakdown,
        stations: currentStations,
        five_g_summary: {
          average_latency_ms: avgLatency,
          average_delivery_rate: avgDelivery,
          active_slice: memoryStore.networkSim.activeSlice,
          edge_latency_reduction_pct: 86.4
        }
      });
    }

    // ----------------------------------------------------
    // 5. GET /api/alerts - Threshold Breaches
    // ----------------------------------------------------
    if (pathname === '/api/alerts' && method === 'GET') {
      const activeOnly = parsedUrl.query.active_only === 'true';
      const results = activeOnly ? memoryStore.alerts.filter(a => a.status === 'ACTIVE') : memoryStore.alerts;
      return sendJson(res, 200, results);
    }

    // POST /api/alerts/:id/resolve
    if (pathname.startsWith('/api/alerts/') && pathname.endsWith('/resolve') && method === 'POST') {
      const id = parseInt(pathname.split('/')[3]);
      const alert = memoryStore.alerts.find(a => a.alert_id === id);
      if (alert) alert.status = 'RESOLVED';
      return sendJson(res, 200, { success: true, message: `Alert ${id} resolved.` });
    }

    // ----------------------------------------------------
    // 6. POST /api/sensor-data - Ingest Edge Readings
    // ----------------------------------------------------
    if (pathname === '/api/sensor-data' && method === 'POST') {
      const body = await parseJsonBody(req);
      const locId = parseInt(body.location_id) || 1;
      const location = memoryStore.locations.find(l => l.location_id === locId) || memoryStore.locations[0];

      const reading = {
        reading_id: memoryStore.readings.length + 1,
        location_id: location.location_id,
        city_name: location.city_name,
        temperature: Number(body.temperature || 25.0),
        humidity: Number(body.humidity || 60.0),
        aqi: parseInt(body.aqi) || 85,
        pm25: Number(body.pm25 || 35.0),
        pm10: Number(body.pm10 || 65.0),
        co2: Number(body.co2 || 480.0),
        timestamp: body.timestamp || new Date().toISOString()
      };

      const metric = {
        metric_id: memoryStore.metrics.length + 1,
        location_id: location.location_id,
        latency: Number(body.latency || 11.2),
        delivery_rate: Number(body.delivery_rate || 99.98),
        timestamp: reading.timestamp
      };

      memoryStore.readings.push(reading);
      memoryStore.metrics.push(metric);

      const triggeredAlerts = evaluateAlerts(location, reading);

      // Persist to SQLite if active
      if (sqliteDb) {
        try {
          const rStmt = sqliteDb.prepare(`
            INSERT INTO sensor_readings (location_id, temperature, humidity, aqi, pm25, pm10, co2, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          rStmt.run(reading.location_id, reading.temperature, reading.humidity, reading.aqi, reading.pm25, reading.pm10, reading.co2, reading.timestamp);

          const mStmt = sqliteDb.prepare(`
            INSERT INTO communication_metrics (location_id, latency, delivery_rate, timestamp)
            VALUES (?, ?, ?, ?)
          `);
          mStmt.run(metric.location_id, metric.latency, metric.delivery_rate, metric.timestamp);
        } catch (e) {
          console.warn('SQLite insert error:', e.message);
        }
      }

      return sendJson(res, 201, {
        status: 'SUCCESS',
        reading_id: reading.reading_id,
        alerts_triggered: triggeredAlerts.length,
        pollution_risk: calculatePollutionRisk(reading.aqi, reading.pm25, reading.temperature, reading.co2)
      });
    }

    // ----------------------------------------------------
    // 7. GET /api/5g/metrics - 5G Latency & Telemetry
    // ----------------------------------------------------
    if ((pathname === '/api/5g/metrics' || pathname === '/api/network/stats') && method === 'GET') {
      const recentMetrics = memoryStore.metrics.slice(-30);
      const latencies = recentMetrics.map(m => m.latency);
      const sorted = [...latencies].sort((a, b) => a - b);
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 14.5;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 13.2;
      const mean = Number((latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length)).toFixed(1));

      return sendJson(res, 200, {
        active_slice: memoryStore.networkSim.activeSlice,
        mean_latency_ms: mean,
        p95_latency_ms: p95,
        p99_latency_ms: p99,
        jitter_ms: Number((Math.random() * 0.8 + 0.6).toFixed(2)),
        packet_delivery_rate: 99.985,
        packet_loss_rate: 0.015,
        timeline: recentMetrics.map((m, idx) => ({
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          latency_ms: m.latency,
          jitter_ms: Number((Math.abs(m.latency - mean)).toFixed(2)),
          delivery_rate: m.delivery_rate
        })),
        slice_benchmarks: {
          URLLC: { mean_latency: 11.2, p99_latency: 13.8, sla_reliability: 99.999, typical_use: 'Emergency Environmental Alerts & Drone Intercepts' },
          eMBB: { mean_latency: 24.5, p99_latency: 29.8, sla_reliability: 99.92, typical_use: 'Multi-Spectral Aerial Imagery & Thermal Streaming' },
          mMTC: { mean_latency: 42.8, p99_latency: 52.4, sla_reliability: 99.85, typical_use: 'Dense City-Wide Stationary PM2.5 Micro-Sensors' }
        },
        edge_vs_cloud: {
          edge_processing_ms: memoryStore.networkSim.edgeProcessingMs,
          five_g_transmission_ms: mean,
          total_edge_turnaround_ms: Number((memoryStore.networkSim.edgeProcessingMs + mean).toFixed(1)),
          cloud_roundtrip_ms: memoryStore.networkSim.cloudRoundtripMs,
          latency_savings_pct: Number((((memoryStore.networkSim.cloudRoundtripMs - (memoryStore.networkSim.edgeProcessingMs + mean)) / memoryStore.networkSim.cloudRoundtripMs) * 100).toFixed(1))
        }
      });
    }

    // ----------------------------------------------------
    // 8. POST /api/5g/simulate - Interactive 5G Simulation
    // ----------------------------------------------------
    if ((pathname === '/api/5g/simulate' || pathname === '/api/mqtt/simulate') && method === 'POST') {
      const body = await parseJsonBody(req);
      const slice = body.slice_type || body.slice || 'URLLC';
      const burstCount = parseInt(body.burst_count) || 250;
      const injectJitter = body.simulate_jitter === true || body.simulate_jitter === 'true';

      memoryStore.networkSim.activeSlice = slice;

      // Calculate burst statistics
      let latencyMean = 11.2;
      let slaCompliance = 99.999;
      if (slice === 'eMBB') {
        latencyMean = 24.5;
        slaCompliance = 99.92;
      } else if (slice === 'mMTC') {
        latencyMean = 42.8;
        slaCompliance = 99.85;
      }

      if (injectJitter) {
        latencyMean += (Math.random() * 8.0);
      }

      const simResult = {
        timestamp: new Date().toISOString(),
        slice_configured: slice,
        packets_transmitted: burstCount,
        packets_delivered: Math.round(burstCount * (slaCompliance / 100)),
        packet_delivery_rate: slaCompliance,
        measured_latency_ms: Number(latencyMean.toFixed(1)),
        jitter_ms: Number((injectJitter ? 3.4 : 0.9).toFixed(2)),
        edge_processing_time_ms: Number((burstCount * 0.012 + 1.2).toFixed(2)),
        sla_met: latencyMean < (slice === 'URLLC' ? 20 : 50),
        status: 'SUCCESS'
      };

      memoryStore.networkSim.packetBurstHistory.unshift(simResult);
      if (memoryStore.networkSim.packetBurstHistory.length > 10) {
        memoryStore.networkSim.packetBurstHistory.pop();
      }

      return sendJson(res, 200, simResult);
    }

    // ----------------------------------------------------
    // Compatibility Endpoints for existing frontend widgets
    // ----------------------------------------------------
    if (pathname === '/api/devices' && method === 'GET') {
      const enrichedDevices = memoryStore.locations.map(loc => {
        const readings = memoryStore.readings.filter(r => r.location_id === loc.location_id);
        const latest = readings.slice(-1)[0] || {};
        return {
          id: `dev_${loc.location_id}`,
          deviceId: `ECO-5G-${loc.city_name.slice(0, 3).toUpperCase()}-01`,
          name: loc.station_name,
          locationId: `loc_${loc.location_id}`,
          city: loc.city_name,
          status: 'ONLINE',
          networkType: `5G SA (${memoryStore.networkSim.activeSlice})`,
          latencyMs: 11.2,
          packetLoss: 0.02,
          battery: 98,
          cpuUsage: 24,
          latestMeasurement: {
            aqi: latest.aqi || loc.base_aqi,
            pm25: latest.pm25 || loc.base_pm25,
            pm10: latest.pm10 || loc.base_pm10,
            co2: latest.co2 || loc.base_co2,
            temperature: latest.temperature || loc.base_temp,
            humidity: latest.humidity || loc.base_hum,
            timestamp: latest.timestamp || new Date().toISOString()
          }
        };
      });
      return sendJson(res, 200, enrichedDevices);
    }

    if (pathname === '/api/aqi/current' && method === 'GET') {
      const summaryList = memoryStore.locations.map(loc => {
        const readings = memoryStore.readings.filter(r => r.location_id === loc.location_id);
        const latest = readings.slice(-1)[0] || {};
        const aqi = latest.aqi || loc.base_aqi;
        return {
          location_id: loc.location_id,
          city: loc.city_name,
          aqi: aqi,
          category: getAQICategory(aqi).category,
          pm25: latest.pm25 || loc.base_pm25,
          pm10: latest.pm10 || loc.base_pm10,
          temperature: latest.temperature || loc.base_temp,
          humidity: latest.humidity || loc.base_hum,
          co2: latest.co2 || loc.base_co2
        };
      });
      return sendJson(res, 200, summaryList);
    }

    if (pathname === '/api/predictions' && method === 'GET') {
      const cityId = parseInt(parsedUrl.query.location_id) || 1;
      const loc = memoryStore.locations.find(l => l.location_id === cityId) || memoryStore.locations[0];
      const readings = memoryStore.readings.filter(r => r.location_id === loc.location_id);
      const latest = readings.slice(-1)[0] || { aqi: loc.base_aqi };
      
      const forecast = [];
      for (let h = 1; h <= 6; h++) {
        const factor = 1 + (Math.sin(h * 0.8) * 0.1);
        forecast.push({
          hour: `+${h}h`,
          predicted_aqi: Math.round(latest.aqi * factor),
          confidence: Number((0.95 - (h * 0.03)).toFixed(2))
        });
      }

      return sendJson(res, 200, {
        city: loc.city_name,
        current_aqi: latest.aqi,
        forecast_horizon_hours: 6,
        predictions: forecast
      });
    }

    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'HEALTHY',
        database: sqliteDb ? 'SQLite (database/ecowatch.db)' : 'In-Memory DB',
        cities_count: memoryStore.locations.length,
        readings_count: memoryStore.readings.length,
        active_slice: memoryStore.networkSim.activeSlice,
        uptime_seconds: process.uptime()
      });
    }

    // ----------------------------------------------------
    // Static Files Handling
    // ----------------------------------------------------
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const extname = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.svg': 'image/svg+xml'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';
    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500);
        res.end('Error loading asset');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });

  } catch (error) {
    console.error('Server execution error:', error);
    sendJson(res, 500, { error: 'Internal Server Error', details: error.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🌍 EcoWatch India 5G Platform Server`);
  console.log(`📍 Web UI & API active at: http://localhost:${PORT}`);
  console.log(`📡 Monitored Cities: Bengaluru, Mysuru, Delhi, Mumbai, Chennai, Hyderabad, Pune, Kolkata`);
  console.log(`⚡ 5G Network Slicing & Edge Simulator: URLLC <12ms SLA active`);
  console.log(`======================================================\n`);
});
