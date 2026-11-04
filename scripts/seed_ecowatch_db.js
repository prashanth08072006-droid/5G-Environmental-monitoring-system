const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = path.join(__dirname, '..', 'database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = path.join(DB_DIR, 'ecowatch.db');
console.log('🌱 Initializing SQLite Database at:', DB_FILE);

const db = new DatabaseSync(DB_FILE);

// 1. Create Tables as specified in Section 6 of EcoWatch India PRD
db.exec(`
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

console.log('✅ Tables created: locations, sensor_readings, alerts, communication_metrics');

// 2. Insert 8 Indian Cities
const locations = [
  { id: 1, city: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { id: 2, city: 'Mysuru', lat: 12.2958, lon: 76.6394 },
  { id: 3, city: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { id: 4, city: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { id: 5, city: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { id: 6, city: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { id: 7, city: 'Pune', lat: 18.5204, lon: 73.8567 },
  { id: 8, city: 'Kolkata', lat: 22.5726, lon: 88.3639 }
];

const insertLoc = db.prepare(`
  INSERT OR IGNORE INTO locations (location_id, city_name, latitude, longitude)
  VALUES (?, ?, ?, ?)
`);

for (const loc of locations) {
  insertLoc.run(loc.id, loc.city, loc.lat, loc.lon);
}

// 3. Insert Historical Sensor Readings & 5G Metrics
const baseProfiles = {
  1: { temp: 24.5, hum: 62, pm25: 42, pm10: 78, co2: 520, aqi: 88 },
  2: { temp: 26.0, hum: 58, pm25: 28, pm10: 45, co2: 440, aqi: 48 },
  3: { temp: 32.5, hum: 45, pm25: 168, pm10: 280, co2: 1120, aqi: 315 },
  4: { temp: 31.0, hum: 78, pm25: 58, pm10: 110, co2: 680, aqi: 115 },
  5: { temp: 33.0, hum: 82, pm25: 48, pm10: 85, co2: 590, aqi: 95 },
  6: { temp: 29.5, hum: 54, pm25: 65, pm10: 125, co2: 720, aqi: 128 },
  7: { temp: 27.0, hum: 59, pm25: 52, pm10: 92, co2: 610, aqi: 105 },
  8: { temp: 30.5, hum: 74, pm25: 88, pm10: 160, co2: 850, aqi: 165 }
};

const insertReading = db.prepare(`
  INSERT INTO sensor_readings (location_id, temperature, humidity, aqi, pm25, pm10, co2, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMetric = db.prepare(`
  INSERT INTO communication_metrics (location_id, latency, delivery_rate, timestamp)
  VALUES (?, ?, ?, ?)
`);

const insertAlert = db.prepare(`
  INSERT INTO alerts (location_id, alert_type, severity, message, timestamp)
  VALUES (?, ?, ?, ?, ?)
`);

const now = Date.now();
let readingsCount = 0;

for (const loc of locations) {
  const p = baseProfiles[loc.id];
  // 24 hours of historical hourly data
  for (let h = 24; h >= 0; h--) {
    const ts = new Date(now - h * 3600 * 1000).toISOString();
    const temp = +(p.temp + Math.sin(h) * 2.5).toFixed(1);
    const hum = +(p.hum + Math.cos(h) * 4).toFixed(1);
    const pm25 = +(p.pm25 + (h % 5 - 2) * 6).toFixed(1);
    const pm10 = +(pm25 * 1.85).toFixed(1);
    const co2 = +(p.co2 + (h % 4 - 2) * 35).toFixed(1);
    const aqi = Math.round(pm25 > 60 ? pm25 * 2.1 : pm25 * 1.6);
    const latency = +(10.5 + (h % 4) * 0.9).toFixed(1);
    const deliveryRate = +(99.98 - (h % 3) * 0.015).toFixed(3);

    insertReading.run(loc.id, temp, hum, aqi, pm25, pm10, co2, ts);
    insertMetric.run(loc.id, latency, deliveryRate, ts);
    readingsCount++;

    // Generate threshold alerts if exceeded
    if (aqi > 200) {
      insertAlert.run(loc.id, 'High Pollution', aqi > 300 ? 'CRITICAL' : 'HIGH', `AQI reached ${aqi} (> 200 threshold) in ${loc.city}.`, ts);
    }
    if (pm25 > 60) {
      insertAlert.run(loc.id, 'Particulate Pollution', 'HIGH', `PM2.5 recorded at ${pm25} µg/m³ (> 60 µg/m³ threshold) in ${loc.city}.`, ts);
    }
    if (temp > 40) {
      insertAlert.run(loc.id, 'High Temperature', 'CRITICAL', `Extreme temperature ${temp}°C (> 40°C threshold) in ${loc.city}.`, ts);
    }
    if (co2 > 1000) {
      insertAlert.run(loc.id, 'Elevated CO2', 'MODERATE', `CO2 concentration elevated to ${co2} ppm (> 1000 ppm threshold) in ${loc.city}.`, ts);
    }
  }
}

console.log(`✅ Seeded ${readingsCount} historical readings and alerts into ecowatch.db`);
db.close();
