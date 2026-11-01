const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, '..', 'data', 'ecosense_db.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const JWT_SECRET = 'ecosense_5g_secret_key_2026';

// ==========================================
// 1. CPCB National AQI Calculation Engine
// ==========================================
// Breakpoints for 8 criteria pollutants in India
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
  ],
  no2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 401, cHigh: 600, iLow: 401, iHigh: 500 }
  ],
  so2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1601, cHigh: 2000, iLow: 401, iHigh: 500 }
  ],
  co: [ // mg/m³
    { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
    { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
    { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
    { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
    { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
    { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 }
  ],
  o3: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 }
  ],
  nh3: [
    { cLow: 0, cHigh: 200, iLow: 0, iHigh: 50 },
    { cLow: 201, cHigh: 400, iLow: 51, iHigh: 100 },
    { cLow: 401, cHigh: 800, iLow: 101, iHigh: 200 },
    { cLow: 801, cHigh: 1200, iLow: 201, iHigh: 300 },
    { cLow: 1201, cHigh: 1800, iLow: 301, iHigh: 400 },
    { cLow: 1801, cHigh: 2400, iLow: 401, iHigh: 500 }
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
  // Exceeds max breakpoint
  const lastBp = bpList[bpList.length - 1];
  if (value > lastBp.cHigh) {
    return 500;
  }
  return 0;
}

function getAQICategory(aqi) {
  if (aqi <= 50) return { category: 'Good', color: '#10B981', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', healthMsg: 'Air quality is considered satisfactory, and air pollution poses little or no risk.' };
  if (aqi <= 100) return { category: 'Satisfactory', color: '#34D399', bg: 'bg-green-500/10 text-green-400 border-green-500/30', healthMsg: 'Minor breathing discomfort to sensitive people.' };
  if (aqi <= 200) return { category: 'Moderate', color: '#F59E0B', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', healthMsg: 'Breathing discomfort to people with lungs, asthma and heart diseases.' };
  if (aqi <= 300) return { category: 'Poor', color: '#F97316', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30', healthMsg: 'Breathing discomfort to most people on prolonged exposure.' };
  if (aqi <= 400) return { category: 'Very Poor', color: '#EF4444', bg: 'bg-red-500/10 text-red-400 border-red-500/30', healthMsg: 'Respiratory illness on prolonged exposure.' };
  return { category: 'Severe', color: '#991B1B', bg: 'bg-rose-900/20 text-rose-400 border-rose-600/40', healthMsg: 'Affects healthy people and seriously impacts those with existing diseases.' };
}

function calculateOverallAQI(reading) {
  const subIndices = {};
  let maxAQI = 0;
  let prominent = 'PM2.5';

  const pollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'nh3'];
  for (const p of pollutants) {
    if (reading[p] !== undefined && reading[p] !== null) {
      const sub = calculateSubIndex(p, reading[p]);
      if (sub !== null) {
        subIndices[p] = sub;
        if (sub > maxAQI) {
          maxAQI = sub;
          prominent = p.toUpperCase();
        }
      }
    }
  }

  // CPCB requirement: At least 3 parameters must be monitored, of which one should be either PM10 or PM2.5
  const cat = getAQICategory(maxAQI);
  return {
    aqi: maxAQI || 45,
    category: cat.category,
    color: cat.color,
    healthMsg: cat.healthMsg,
    prominentPollutant: prominent,
    subIndices
  };
}

// ==========================================
// 2. Intelligent Anomaly Detection Engine
// ==========================================
function detectAnomaly(reading, history = []) {
  if (!history || history.length < 5) {
    return { isAnomaly: false, anomalyType: 'NORMAL', score: 0.05, note: 'Normal baseline operation' };
  }

  // 1. Physical Bounds Check
  if (reading.pm25 < 0 || reading.pm25 > 999 || reading.temperature < -20 || reading.temperature > 65 || reading.humidity < 0 || reading.humidity > 100) {
    return { isAnomaly: true, anomalyType: 'OUT_OF_BOUNDS', score: 0.99, note: 'Values outside physical atmospheric constraints' };
  }

  // 2. Rolling Z-Score on PM2.5 and PM10
  const recentPM25 = history.slice(-15).map(h => h.pm25 || 0);
  const mean = recentPM25.reduce((a, b) => a + b, 0) / recentPM25.length;
  const variance = recentPM25.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentPM25.length;
  const stdDev = Math.sqrt(variance) || 1.0;
  const zScore = Math.abs((reading.pm25 - mean) / stdDev);

  // 3. Sudden Spike Rate-of-Change
  const lastVal = recentPM25[recentPM25.length - 1];
  const jumpRatio = lastVal > 0 ? (reading.pm25 - lastVal) / lastVal : 0;

  if (zScore > 3.0 && jumpRatio > 0.45) {
    return {
      isAnomaly: true,
      anomalyType: 'ANOMALY_SPIKE',
      score: Math.min(1.0, 0.65 + (zScore / 10)),
      note: `Rapid particulate spike detected (Z-Score: ${zScore.toFixed(2)}, +${(jumpRatio * 100).toFixed(0)}% jump)`
    };
  }

  // 4. Sensor Drift / Flatline check (sensor stuck on identical value)
  const isStuck = recentPM25.slice(-6).every(v => v === reading.pm25);
  if (isStuck && recentPM25.length >= 6) {
    return {
      isAnomaly: true,
      anomalyType: 'SENSOR_DRIFT',
      score: 0.85,
      note: 'Sensor flatline detected: Consecutive identical readings imply transducer stall'
    };
  }

  return { isAnomaly: false, anomalyType: 'NORMAL', score: Number((zScore * 0.1).toFixed(2)), note: 'Healthy sensor reading within statistical distribution' };
}

// ==========================================
// 3. Predictive Analytics Model (+1h, +6h, +24h)
// ==========================================
function predictFutureAirQuality(currentAQI, currentPM25, history = []) {
  // Uses diurnal diurnal cycle modeling combined with local trend slope
  const hour = new Date().getHours();
  // Typical urban pollution peaks in morning (8-10 AM) and evening (7-10 PM) due to rush hours and thermal inversion
  const getDiurnalFactor = (h) => {
    const normH = h % 24;
    if (normH >= 7 && normH <= 10) return 1.18; // Morning peak
    if (normH >= 18 && normH <= 22) return 1.25; // Evening peak
    if (normH >= 12 && normH <= 16) return 0.88; // Afternoon solar dispersion
    return 0.95; // Night/early morning
  };

  const trendSlope = history.length > 3 ? (currentPM25 - history[history.length - 3].pm25) / 3 : 0;

  const pred1h = Math.round(Math.max(15, (currentAQI + trendSlope * 0.6) * (getDiurnalFactor(hour + 1) / getDiurnalFactor(hour))));
  const pred6h = Math.round(Math.max(15, (currentAQI * 0.9 + 50 * 0.1) * getDiurnalFactor(hour + 6)));
  const pred24h = Math.round(Math.max(15, (currentAQI * 0.75 + 75 * 0.25) * getDiurnalFactor(hour)));

  return {
    current: currentAQI,
    predictions: [
      { horizon: '1 Hour', aqi: pred1h, confidence: '94%', category: getAQICategory(pred1h).category, delta: pred1h - currentAQI },
      { horizon: '6 Hours', aqi: pred6h, confidence: '86%', category: getAQICategory(pred6h).category, delta: pred6h - currentAQI },
      { horizon: '24 Hours', aqi: pred24h, confidence: '78%', category: getAQICategory(pred24h).category, delta: pred24h - currentAQI }
    ],
    trend: trendSlope > 1.5 ? 'Worsening' : trendSlope < -1.5 ? 'Improving' : 'Stable'
  };
}

// ==========================================
// 4. Password & Auth Helpers
// ==========================================
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 14 * 24 * 3600 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

// ==========================================
// 5. Database Initialization & Seed Generation
// ==========================================
let db = null;

function initDatabase() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
      if (db.locations && db.devices && db.measurements) {
        console.log(`Loaded EcoSense 5G database with ${db.devices.length} devices and ${db.measurements.length} records.`);
        return;
      }
    } catch (e) {
      console.warn('Re-seeding database due to parsing error:', e.message);
    }
  }

  console.log('Generating fresh EcoSense 5G seed database...');
  const defaultPass = hashPassword('EcoSense@2026');

  // 1. Users
  const users = [
    { id: 'usr_admin', name: 'Dr. Aarav Sharma', email: 'admin@ecosense.io', role: 'ADMIN', department: 'Central Environmental Board', password_hash: defaultPass, created_at: new Date().toISOString() },
    { id: 'usr_officer', name: 'Priya Narayanan', email: 'officer@ecosense.io', role: 'ENVIRONMENT_OFFICER', department: 'Urban Air Pollution Control', password_hash: defaultPass, created_at: new Date().toISOString() },
    { id: 'usr_researcher', name: 'Prof. K. Venkatesh', email: 'researcher@ecosense.io', role: 'RESEARCHER', department: 'Center for Atmospheric Studies', password_hash: defaultPass, created_at: new Date().toISOString() },
    { id: 'usr_viewer', name: 'Public Citizen', email: 'viewer@ecosense.io', role: 'VIEWER', department: 'Smart City Resident', password_hash: defaultPass, created_at: new Date().toISOString() }
  ];

  // 2. Locations
  const locations = [
    { id: 'loc_1', name: 'Peenya Industrial Area', city: 'Bengaluru', state: 'Karnataka', type: 'Industrial', latitude: 13.0285, longitude: 77.5197, address: 'Phase 2, Peenya Industrial Complex' },
    { id: 'loc_2', name: 'Silk Board Junction', city: 'Bengaluru', state: 'Karnataka', type: 'Traffic Corridor', latitude: 12.9172, longitude: 77.6229, address: 'Hosur Road Flyover Intersect' },
    { id: 'loc_3', name: 'Cubbon Park Green Reserve', city: 'Bengaluru', state: 'Karnataka', type: 'Ecological Zone', latitude: 12.9763, longitude: 77.5929, address: 'Kasturba Road Botanical Core' },
    { id: 'loc_4', name: 'Electronic City Tech Hub', city: 'Bengaluru', state: 'Karnataka', type: 'Commercial', latitude: 12.8452, longitude: 77.6602, address: 'Phase 1 Tech Park Avenue' },
    { id: 'loc_5', name: 'Anand Vihar ISBT', city: 'Delhi', state: 'Delhi NCT', type: 'Traffic Corridor', latitude: 28.6469, longitude: 77.3160, address: 'Interstate Bus Terminal Zone' },
    { id: 'loc_6', name: 'Lodhi Road Heritage Garden', city: 'Delhi', state: 'Delhi NCT', type: 'Residential', latitude: 28.5910, longitude: 77.2273, address: 'Lodhi Institutional Area' },
    { id: 'loc_7', name: 'Bandra Kurla Complex (BKC)', city: 'Mumbai', state: 'Maharashtra', type: 'Commercial', latitude: 19.0657, longitude: 72.8682, address: 'G Block Financial Center' },
    { id: 'loc_8', name: 'Chembur Refinery Belt', city: 'Mumbai', state: 'Maharashtra', type: 'Industrial', latitude: 19.0522, longitude: 72.8994, address: 'Mahul Industrial Highway' },
    { id: 'loc_9', name: 'HITEC City Cyber Towers', city: 'Hyderabad', state: 'Telangana', type: 'Commercial', latitude: 17.4504, longitude: 78.3808, address: 'Madhapur Knowledge City' },
    { id: 'loc_10', name: 'Guindy Industrial Estate', city: 'Chennai', state: 'Tamil Nadu', type: 'Industrial', latitude: 13.0067, longitude: 80.2025, address: 'Inner Ring Road Sector' },
    { id: 'loc_11', name: 'Victoria Memorial Gardens', city: 'Kolkata', state: 'West Bengal', type: 'Ecological Zone', latitude: 22.5448, longitude: 88.3426, address: 'Queens Way Heritage Zone' },
    { id: 'loc_12', name: 'Hinjawadi Infotech Park', city: 'Pune', state: 'Maharashtra', type: 'Commercial', latitude: 18.5913, longitude: 73.7389, address: 'Phase 2 Rajiv Gandhi Park' }
  ];

  // 3. Devices
  const devices = [
    { id: 'dev_1', deviceId: 'ECO-BLR-01', name: 'Station Peenya-Alpha', locationId: 'loc_1', status: 'ONLINE', firmwareVersion: 'v2.4.1-5G', networkType: '5G SA (URLLC)', latencyMs: 11, throughputDown: 142.5, throughputUp: 44.2, packetLoss: 0.12, signalRsrp: -71, battery: 98, cpuUsage: 22, memoryUsage: 38, samplingInterval: 3, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_2', deviceId: 'ECO-BLR-02', name: 'Station SilkBoard-Beta', locationId: 'loc_2', status: 'ONLINE', firmwareVersion: 'v2.4.1-5G', networkType: '5G SA (URLLC)', latencyMs: 14, throughputDown: 118.0, throughputUp: 36.8, packetLoss: 0.25, signalRsrp: -78, battery: 94, cpuUsage: 28, memoryUsage: 42, samplingInterval: 3, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_3', deviceId: 'ECO-BLR-03', name: 'Station Cubbon-Eco', locationId: 'loc_3', status: 'ONLINE', firmwareVersion: 'v2.4.0-5G', networkType: '5G NSA', latencyMs: 18, throughputDown: 95.4, throughputUp: 28.1, packetLoss: 0.08, signalRsrp: -66, battery: 100, cpuUsage: 16, memoryUsage: 31, samplingInterval: 5, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_4', deviceId: 'ECO-BLR-04', name: 'Station ECity-Gamma', locationId: 'loc_4', status: 'ONLINE', firmwareVersion: 'v2.4.1-5G', networkType: '5G SA (URLLC)', latencyMs: 12, throughputDown: 135.2, throughputUp: 41.5, packetLoss: 0.10, signalRsrp: -73, battery: 96, cpuUsage: 24, memoryUsage: 39, samplingInterval: 3, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_5', deviceId: 'ECO-DEL-01', name: 'Station AnandVihar-North', locationId: 'loc_5', status: 'WARNING', firmwareVersion: 'v2.4.1-5G', networkType: '5G SA (URLLC)', latencyMs: 24, throughputDown: 88.0, throughputUp: 24.3, packetLoss: 0.85, signalRsrp: -84, battery: 82, cpuUsage: 64, memoryUsage: 58, samplingInterval: 3, lastSeen: new Date().toISOString(), edgeBufferCount: 4 },
    { id: 'dev_6', deviceId: 'ECO-DEL-02', name: 'Station Lodhi-Clean', locationId: 'loc_6', status: 'ONLINE', firmwareVersion: 'v2.4.1-5G', networkType: '5G NSA', latencyMs: 16, throughputDown: 104.2, throughputUp: 31.0, packetLoss: 0.15, signalRsrp: -69, battery: 97, cpuUsage: 19, memoryUsage: 35, samplingInterval: 5, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_7', deviceId: 'ECO-BOM-01', name: 'Station BKC-Coast', locationId: 'loc_7', status: 'ONLINE', firmwareVersion: 'v2.4.1-5G', networkType: '5G SA (URLLC)', latencyMs: 13, throughputDown: 151.0, throughputUp: 48.0, packetLoss: 0.09, signalRsrp: -68, battery: 99, cpuUsage: 21, memoryUsage: 37, samplingInterval: 3, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_8', deviceId: 'ECO-BOM-02', name: 'Station Chembur-Refine', locationId: 'loc_8', status: 'ONLINE', firmwareVersion: 'v2.4.1-5G', networkType: '5G SA (URLLC)', latencyMs: 15, throughputDown: 122.4, throughputUp: 38.2, packetLoss: 0.20, signalRsrp: -75, battery: 91, cpuUsage: 33, memoryUsage: 45, samplingInterval: 3, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_9', deviceId: 'ECO-HYD-01', name: 'Station CyberTower-South', locationId: 'loc_9', status: 'ONLINE', firmwareVersion: 'v2.4.1-5G', networkType: '5G SA (URLLC)', latencyMs: 12, throughputDown: 138.6, throughputUp: 42.0, packetLoss: 0.11, signalRsrp: -72, battery: 95, cpuUsage: 20, memoryUsage: 36, samplingInterval: 3, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_10', deviceId: 'ECO-MAA-01', name: 'Station Guindy-Corridor', locationId: 'loc_10', status: 'ONLINE', firmwareVersion: 'v2.4.0-5G', networkType: '5G NSA', latencyMs: 19, throughputDown: 92.1, throughputUp: 26.5, packetLoss: 0.22, signalRsrp: -77, battery: 89, cpuUsage: 26, memoryUsage: 40, samplingInterval: 5, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_11', deviceId: 'ECO-CCU-01', name: 'Station Victoria-East', locationId: 'loc_11', status: 'ONLINE', firmwareVersion: 'v2.4.1-5G', networkType: '5G NSA', latencyMs: 22, throughputDown: 86.4, throughputUp: 22.8, packetLoss: 0.31, signalRsrp: -81, battery: 93, cpuUsage: 25, memoryUsage: 38, samplingInterval: 5, lastSeen: new Date().toISOString(), edgeBufferCount: 0 },
    { id: 'dev_12', deviceId: 'ECO-PUN-01', name: 'Station Hinjawadi-Ridge', locationId: 'loc_12', status: 'ONLINE', firmwareVersion: 'v2.4.1-5G', networkType: '5G SA (URLLC)', latencyMs: 14, throughputDown: 126.8, throughputUp: 39.4, packetLoss: 0.14, signalRsrp: -74, battery: 98, cpuUsage: 23, memoryUsage: 37, samplingInterval: 3, lastSeen: new Date().toISOString(), edgeBufferCount: 0 }
  ];

  // 4. Alert Rules
  const alertRules = [
    { id: 'rule_1', parameter: 'aqi', operator: '>', threshold: 200, severity: 'CRITICAL', enabled: true, description: 'Overall CPCB AQI exceeds Poor threshold (200)' },
    { id: 'rule_2', parameter: 'pm25', operator: '>', threshold: 90, severity: 'WARNING', enabled: true, description: 'PM2.5 concentration exceeds CPCB 24h standard (90 µg/m³)' },
    { id: 'rule_3', parameter: 'pm25', operator: '>', threshold: 150, severity: 'EMERGENCY', enabled: true, description: 'Severe PM2.5 spike above hazardous threshold (150 µg/m³)' },
    { id: 'rule_4', parameter: 'co', operator: '>', threshold: 4.0, severity: 'WARNING', enabled: true, description: 'Carbon monoxide elevation (> 4.0 mg/m³)' },
    { id: 'rule_5', parameter: 'no2', operator: '>', threshold: 100, severity: 'WARNING', enabled: true, description: 'Nitrogen dioxide elevation (> 100 µg/m³)' },
    { id: 'rule_6', parameter: 'latencyMs', operator: '>', threshold: 60, severity: 'INFO', enabled: true, description: '5G Network latency exceeded 60ms edge threshold' }
  ];

  // 5. Initial Alerts
  const alerts = [
    {
      id: 'alt_1',
      deviceId: 'ECO-DEL-01',
      deviceName: 'Station AnandVihar-North',
      locationName: 'Anand Vihar ISBT, Delhi',
      type: 'POLLUTION_SPIKE',
      severity: 'EMERGENCY',
      parameter: 'pm25',
      value: 234.5,
      threshold: 150.0,
      message: 'Critical PM2.5 violation: 234.5 µg/m³ detected at Anand Vihar ISBT (AQI: 388)',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      resolvedAt: null
    },
    {
      id: 'alt_2',
      deviceId: 'ECO-BLR-01',
      deviceName: 'Station Peenya-Alpha',
      locationName: 'Peenya Industrial Area',
      type: 'THRESHOLD_EXCEEDED',
      severity: 'WARNING',
      parameter: 'pm25',
      value: 108.2,
      threshold: 90.0,
      message: 'Industrial zone PM2.5 elevated above Moderate boundary (108.2 µg/m³)',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 48 * 60000).toISOString(),
      resolvedAt: null
    },
    {
      id: 'alt_3',
      deviceId: 'ECO-BOM-02',
      deviceName: 'Station Chembur-Refine',
      locationName: 'Chembur Refinery Belt',
      type: 'ANOMALY_DETECTED',
      severity: 'CRITICAL',
      parameter: 'so2',
      value: 94.6,
      threshold: 80.0,
      message: 'High SO2 release event recorded: 94.6 µg/m³ in refinery corridor',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 110 * 60000).toISOString(),
      resolvedAt: null
    }
  ];

  // 6. Generate 24 hours of realistic historical measurements for each device
  const measurements = [];
  const now = Date.now();
  const timeStep = 30 * 60 * 1000; // 30-minute intervals = 48 points per station

  // Base profiles per station type
  const typeProfiles = {
    'Industrial': { pm25Base: 85, pm10Base: 145, coBase: 1.8, no2Base: 65, so2Base: 38, o3Base: 42, nh3Base: 25, vocBase: 0.52, tempBase: 30.5, humBase: 58 },
    'Traffic Corridor': { pm25Base: 110, pm10Base: 180, coBase: 2.9, no2Base: 88, so2Base: 22, o3Base: 34, nh3Base: 35, vocBase: 0.65, tempBase: 29.2, humBase: 62 },
    'Ecological Zone': { pm25Base: 22, pm10Base: 38, coBase: 0.4, no2Base: 16, so2Base: 7, o3Base: 48, nh3Base: 8, vocBase: 0.08, tempBase: 26.8, humBase: 74 },
    'Commercial': { pm25Base: 52, pm10Base: 92, coBase: 1.1, no2Base: 44, so2Base: 14, o3Base: 38, nh3Base: 18, vocBase: 0.28, tempBase: 28.6, humBase: 64 },
    'Residential': { pm25Base: 40, pm10Base: 72, coBase: 0.8, no2Base: 32, so2Base: 11, o3Base: 35, nh3Base: 14, vocBase: 0.19, tempBase: 27.5, humBase: 66 }
  };

  devices.forEach(dev => {
    const loc = locations.find(l => l.id === dev.locationId) || locations[0];
    const profile = typeProfiles[loc.type] || typeProfiles['Commercial'];

    for (let step = 48; step >= 0; step--) {
      const t = new Date(now - step * timeStep);
      const hour = t.getHours();
      // diurnal wave
      const diurnalFactor = 1.0 + 0.35 * Math.sin(((hour - 5) / 24) * 2 * Math.PI) + (Math.random() * 0.16 - 0.08);

      const pm25 = Number((profile.pm25Base * diurnalFactor).toFixed(1));
      const pm10 = Number((profile.pm10Base * diurnalFactor).toFixed(1));
      const co = Number((profile.coBase * (1 + 0.2 * Math.sin(hour))).toFixed(2));
      const no2 = Number((profile.no2Base * diurnalFactor).toFixed(1));
      const so2 = Number((profile.so2Base * (1 + (Math.random() * 0.2 - 0.1))).toFixed(1));
      const o3 = Number((profile.o3Base * (1 + 0.4 * Math.sin(((hour - 12) / 24) * 2 * Math.PI))).toFixed(1));
      const nh3 = Number((profile.nh3Base * (1 + (Math.random() * 0.15 - 0.07))).toFixed(1));
      const voc = Number((profile.vocBase * (1 + (Math.random() * 0.2 - 0.1))).toFixed(2));

      const temperature = Number((profile.tempBase + 4.5 * Math.sin(((hour - 9) / 24) * 2 * Math.PI) + (Math.random() * 0.4 - 0.2)).toFixed(1));
      const humidity = Number((profile.humBase - 15 * Math.sin(((hour - 9) / 24) * 2 * Math.PI) + (Math.random() * 2 - 1)).toFixed(1));
      const pressure = Number((1012 - 4 * Math.sin(((hour - 14) / 24) * 2 * Math.PI) + (Math.random() * 0.5 - 0.25)).toFixed(1));
      const windSpeed = Number((4.5 + 3.0 * Math.sin(hour) + Math.random() * 2).toFixed(1));
      const windDirection = Math.round((180 + 90 * Math.cos(hour) + Math.random() * 30) % 360);
      const rainfall = (hour >= 15 && hour <= 17 && loc.city === 'Bengaluru') ? Number((Math.random() * 4.2).toFixed(1)) : 0.0;
      const lightRadiation = (hour >= 6 && hour <= 18) ? Math.round(750 * Math.sin(((hour - 6) / 12) * Math.PI)) : 0;

      const rawReading = { pm25, pm10, co, no2, so2, o3, nh3, voc, temperature, humidity, pressure, windSpeed, windDirection, rainfall, lightRadiation };
      const aqiRes = calculateOverallAQI(rawReading);

      measurements.push({
        id: `meas_${dev.deviceId}_${step}`,
        deviceId: dev.deviceId,
        timestamp: t.toISOString(),
        ...rawReading,
        aqi: aqiRes.aqi,
        aqiCategory: aqiRes.category,
        aqiColor: aqiRes.color,
        prominentPollutant: aqiRes.prominentPollutant,
        subIndices: aqiRes.subIndices,
        quality: 'VALID',
        anomalyType: (pm25 > 180 && dev.deviceId === 'ECO-DEL-01') ? 'ANOMALY_SPIKE' : 'NORMAL',
        anomalyScore: (pm25 > 180 && dev.deviceId === 'ECO-DEL-01') ? 0.88 : 0.06
      });
    }
  });

  db = {
    users,
    locations,
    devices,
    alertRules,
    alerts,
    measurements,
    config: {
      aqiStandard: 'CPCB_INDIA',
      samplingIntervalSeconds: 3,
      heartbeatTimeoutMinutes: 5,
      offlineQueueCapacity: 5000,
      fiveGFailoverSimulation: false
    }
  };

  saveDatabase();
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err.message);
  }
}

initDatabase();

// ==========================================
// 6. Real-Time Telemetry Generator & SSE
// ==========================================
const sseClients = new Set();

function broadcastEvent(type, payload) {
  const data = JSON.stringify({ type, timestamp: new Date().toISOString(), data: payload });
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  });
}

// Background simulator: Every 3 seconds generates a fresh sensor packet & 5G telemetry
setInterval(() => {
  if (!db || !db.devices || db.devices.length === 0) return;

  // Pick 2 random online devices to emit live readings
  const onlineDevs = db.devices.filter(d => d.status !== 'OFFLINE');
  if (onlineDevs.length === 0) return;

  const targetDev = onlineDevs[Math.floor(Math.random() * onlineDevs.length)];
  const loc = db.locations.find(l => l.id === targetDev.locationId);

  // Find recent measurements for baseline
  const recentForDev = db.measurements.filter(m => m.deviceId === targetDev.deviceId).slice(-10);
  const lastMeas = recentForDev[recentForDev.length - 1] || {
    pm25: 45, pm10: 80, co: 1.0, no2: 35, so2: 15, o3: 30, nh3: 15, voc: 0.25,
    temperature: 28, humidity: 60, pressure: 1010, windSpeed: 5.0, windDirection: 180, rainfall: 0
  };

  // Add realistic micro-fluctuations
  const jitter = (val, maxPct = 0.05, minBound = 0) => {
    const delta = val * (Math.random() * (maxPct * 2) - maxPct);
    return Math.max(minBound, Number((val + delta).toFixed(2)));
  };

  // Occasional random industrial particulate puff (3% chance)
  const isPuff = Math.random() < 0.03 && loc && loc.type === 'Industrial';

  const newReading = {
    id: `meas_live_${Date.now()}_${targetDev.deviceId}`,
    deviceId: targetDev.deviceId,
    timestamp: new Date().toISOString(),
    pm25: isPuff ? Number((lastMeas.pm25 * 1.85).toFixed(1)) : jitter(lastMeas.pm25, 0.06, 2),
    pm10: isPuff ? Number((lastMeas.pm10 * 1.70).toFixed(1)) : jitter(lastMeas.pm10, 0.05, 5),
    co: jitter(lastMeas.co, 0.04, 0.1),
    no2: jitter(lastMeas.no2, 0.05, 5),
    so2: isPuff ? Number((lastMeas.so2 * 1.5).toFixed(1)) : jitter(lastMeas.so2, 0.05, 2),
    o3: jitter(lastMeas.o3, 0.04, 5),
    nh3: jitter(lastMeas.nh3, 0.04, 2),
    voc: jitter(lastMeas.voc, 0.06, 0.02),
    temperature: jitter(lastMeas.temperature, 0.01, 10),
    humidity: Math.min(100, jitter(lastMeas.humidity, 0.02, 10)),
    pressure: jitter(lastMeas.pressure, 0.002, 950),
    windSpeed: jitter(lastMeas.windSpeed, 0.08, 0.2),
    windDirection: (lastMeas.windDirection + Math.round(Math.random() * 10 - 5) + 360) % 360,
    rainfall: lastMeas.rainfall > 0 ? Math.max(0, lastMeas.rainfall - 0.2) : 0,
    lightRadiation: (new Date().getHours() >= 6 && new Date().getHours() <= 18) ? Math.round(450 + Math.random() * 300) : 0
  };

  const aqiRes = calculateOverallAQI(newReading);
  const anomalyRes = detectAnomaly(newReading, recentForDev);

  newReading.aqi = aqiRes.aqi;
  newReading.aqiCategory = aqiRes.category;
  newReading.aqiColor = aqiRes.color;
  newReading.healthMsg = aqiRes.healthMsg;
  newReading.prominentPollutant = aqiRes.prominentPollutant;
  newReading.subIndices = aqiRes.subIndices;
  newReading.quality = anomalyRes.isAnomaly && anomalyRes.anomalyType === 'OUT_OF_BOUNDS' ? 'INVALID' : anomalyRes.isAnomaly ? 'SUSPECT' : 'VALID';
  newReading.anomalyType = anomalyRes.anomalyType;
  newReading.anomalyScore = anomalyRes.score;
  newReading.anomalyNote = anomalyRes.note;

  // Append measurement
  db.measurements.push(newReading);
  // Keep memory sane: maximum 2500 historical points in DB
  if (db.measurements.length > 2500) {
    db.measurements.splice(0, 100);
  }

  // Update target device 5G Telemetry & heartbeat
  targetDev.lastSeen = newReading.timestamp;
  targetDev.latencyMs = Math.max(8, Math.min(65, Math.round(targetDev.latencyMs + (Math.random() * 4 - 2))));
  targetDev.throughputDown = Math.max(50, Math.min(220, Number((targetDev.throughputDown + (Math.random() * 10 - 5)).toFixed(1))));
  targetDev.throughputUp = Math.max(15, Math.min(65, Number((targetDev.throughputUp + (Math.random() * 4 - 2)).toFixed(1))));
  targetDev.signalRsrp = Math.max(-95, Math.min(-60, Math.round(targetDev.signalRsrp + (Math.random() * 2 - 1))));

  // Check alert rules
  db.alertRules.filter(r => r.enabled).forEach(rule => {
    let val = null;
    if (rule.parameter === 'aqi') val = newReading.aqi;
    else if (newReading[rule.parameter] !== undefined) val = newReading[rule.parameter];
    else if (targetDev[rule.parameter] !== undefined) val = targetDev[rule.parameter];

    if (val !== null) {
      let triggered = false;
      if (rule.operator === '>' && val > rule.threshold) triggered = true;
      if (rule.operator === '>=' && val >= rule.threshold) triggered = true;
      if (rule.operator === '<' && val < rule.threshold) triggered = true;
      if (rule.operator === '<=' && val <= rule.threshold) triggered = true;

      if (triggered) {
        // Prevent duplicate alerts within 15 minutes for same device & parameter
        const recentSameAlert = db.alerts.find(a => a.deviceId === targetDev.deviceId && a.parameter === rule.parameter && a.status === 'ACTIVE' && (Date.now() - new Date(a.createdAt).getTime()) < 15 * 60000);
        if (!recentSameAlert) {
          const newAlert = {
            id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            deviceId: targetDev.deviceId,
            deviceName: targetDev.name,
            locationName: loc ? loc.name : targetDev.deviceId,
            type: rule.parameter === 'aqi' ? 'AQI_LIMIT_VIOLATION' : 'THRESHOLD_EXCEEDED',
            severity: rule.severity,
            parameter: rule.parameter,
            value: val,
            threshold: rule.threshold,
            message: `${rule.description}: Current ${rule.parameter.toUpperCase()} is ${val} (Threshold: ${rule.threshold}) at ${targetDev.name}`,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            resolvedAt: null
          };
          db.alerts.unshift(newAlert);
          broadcastEvent('NEW_ALERT', newAlert);
        }
      }
    }
  });

  // Broadcast to live stream clients
  broadcastEvent('TELEMETRY_PACKET', {
    measurement: newReading,
    device: targetDev,
    location: loc
  });

}, 3000);

// ==========================================
// 7. Request Router & REST API Handlers
// ==========================================
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function sendText(res, statusCode, text, contentType = 'text/plain') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*'
  });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || 'localhost:5050';
  const reqUrl = new URL(req.url, `http://${host}`);
  const pathname = reqUrl.pathname;
  const parsedUrl = {
    pathname,
    query: Object.fromEntries(reqUrl.searchParams.entries())
  };
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

  // Auth Middleware extractor
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const currentUser = token ? verifyToken(token) : null;

  // ------------------------------------------
  // Server-Sent Events (SSE) Stream
  // ------------------------------------------
  if (pathname === '/api/stream' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Connected to EcoSense 5G real-time telemetry stream' })}\n\n`);

    const client = { res, id: Date.now() };
    sseClients.add(client);

    req.on('close', () => {
      sseClients.delete(client);
    });
    return;
  }

  // ------------------------------------------
  // AUTH API
  // ------------------------------------------
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, password } = await parseBody(req);
    const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user || !verifyPassword(password, user.password_hash)) {
      return sendJson(res, 401, { error: 'Invalid email or password credentials' });
    }
    const token = generateToken({ id: user.id, name: user.name, email: user.email, role: user.role });
    return sendJson(res, 200, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department }
    });
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const { name, email, password, role, department } = await parseBody(req);
    if (!name || !email || !password) {
      return sendJson(res, 400, { error: 'Name, email, and password are required' });
    }
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return sendJson(res, 400, { error: 'User with this email already registered' });
    }
    const newUser = {
      id: `usr_${Date.now()}`,
      name,
      email,
      role: role || 'VIEWER',
      department: department || 'Environmental Sciences',
      password_hash: hashPassword(password),
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDatabase();
    const token = generateToken({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
    return sendJson(res, 201, {
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, department: newUser.department }
    });
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    if (!currentUser) return sendJson(res, 401, { error: 'Unauthorized or invalid token' });
    const user = db.users.find(u => u.id === currentUser.id);
    if (!user) return sendJson(res, 404, { error: 'User not found' });
    return sendJson(res, 200, {
      id: user.id, name: user.name, email: user.email, role: user.role, department: user.department
    });
  }

  // ------------------------------------------
  // LOCATIONS API
  // ------------------------------------------
  if (pathname === '/api/locations' && method === 'GET') {
    return sendJson(res, 200, db.locations);
  }

  // ------------------------------------------
  // DEVICES API
  // ------------------------------------------
  if (pathname === '/api/devices' && method === 'GET') {
    // Enrich devices with latest reading and location details
    const enriched = db.devices.map(dev => {
      const loc = db.locations.find(l => l.id === dev.locationId);
      const recent = db.measurements.filter(m => m.deviceId === dev.deviceId).slice(-1)[0] || null;
      return {
        ...dev,
        location: loc,
        latestMeasurement: recent
      };
    });
    return sendJson(res, 200, enriched);
  }

  if (pathname.startsWith('/api/devices/') && method === 'GET') {
    const id = pathname.split('/')[3];
    const dev = db.devices.find(d => d.id === id || d.deviceId === id);
    if (!dev) return sendJson(res, 404, { error: 'Device not found' });
    const loc = db.locations.find(l => l.id === dev.locationId);
    const recent = db.measurements.filter(m => m.deviceId === dev.deviceId).slice(-48);
    return sendJson(res, 200, {
      ...dev,
      location: loc,
      history: recent
    });
  }

  if (pathname === '/api/devices' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.deviceId || !body.name) {
      return sendJson(res, 400, { error: 'Device ID and Name are required' });
    }
    if (db.devices.some(d => d.deviceId.toUpperCase() === body.deviceId.toUpperCase())) {
      return sendJson(res, 400, { error: 'Device ID already registered' });
    }

    // Check if location exists or create new
    let locId = body.locationId;
    if (!locId && body.latitude && body.longitude) {
      locId = `loc_${Date.now()}`;
      db.locations.push({
        id: locId,
        name: body.locationName || body.name,
        city: body.city || 'Smart City',
        state: body.state || 'Metro',
        type: body.locationType || 'Commercial',
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        address: body.address || 'Field Deployed Node'
      });
    }

    const newDevice = {
      id: `dev_${Date.now()}`,
      deviceId: body.deviceId.toUpperCase(),
      name: body.name,
      locationId: locId || db.locations[0].id,
      status: 'ONLINE',
      firmwareVersion: body.firmwareVersion || 'v2.4.1-5G',
      networkType: body.networkType || '5G SA (URLLC)',
      latencyMs: body.latencyMs || 12,
      throughputDown: body.throughputDown || 125.0,
      throughputUp: body.throughputUp || 38.0,
      packetLoss: 0.1,
      signalRsrp: -72,
      battery: 100,
      cpuUsage: 20,
      memoryUsage: 35,
      samplingInterval: body.samplingInterval || 3,
      lastSeen: new Date().toISOString(),
      edgeBufferCount: 0
    };

    db.devices.push(newDevice);

    // Initial seed measurement
    const loc = db.locations.find(l => l.id === newDevice.locationId);
    const initMeas = {
      id: `meas_${newDevice.deviceId}_0`,
      deviceId: newDevice.deviceId,
      timestamp: new Date().toISOString(),
      pm25: 42.0, pm10: 76.0, co: 0.8, no2: 28.0, so2: 12.0, o3: 34.0, nh3: 16.0, voc: 0.22,
      temperature: 28.0, humidity: 62.0, pressure: 1009.0, windSpeed: 4.8, windDirection: 190, rainfall: 0, lightRadiation: 550
    };
    const aqi = calculateOverallAQI(initMeas);
    db.measurements.push({ ...initMeas, ...aqi, quality: 'VALID', anomalyType: 'NORMAL', anomalyScore: 0.05 });

    saveDatabase();
    broadcastEvent('DEVICE_REGISTERED', newDevice);
    return sendJson(res, 201, newDevice);
  }

  if (pathname.startsWith('/api/devices/') && pathname.endsWith('/command') && method === 'POST') {
    const id = pathname.split('/')[3];
    const dev = db.devices.find(d => d.id === id || d.deviceId === id);
    if (!dev) return sendJson(res, 404, { error: 'Device not found' });
    const { command, payload } = await parseBody(req);

    if (command === 'REBOOT') {
      dev.status = 'ONLINE';
      dev.lastSeen = new Date().toISOString();
      dev.edgeBufferCount = 0;
    } else if (command === 'SET_INTERVAL') {
      dev.samplingInterval = payload.interval || 3;
    } else if (command === 'FAILOVER_TEST') {
      dev.networkType = dev.networkType.includes('4G') ? '5G SA (URLLC)' : '4G LTE Fallback';
      dev.latencyMs = dev.networkType.includes('4G') ? 78 : 12;
    }

    saveDatabase();
    broadcastEvent('DEVICE_COMMAND_EXECUTED', { deviceId: dev.deviceId, command, status: 'SUCCESS' });
    return sendJson(res, 200, { success: true, message: `Command ${command} transmitted via 5G network`, device: dev });
  }

  // ------------------------------------------
  // MEASUREMENTS & TELEMETRY API
  // ------------------------------------------
  if (pathname === '/api/measurements' && method === 'GET') {
    const { deviceId, limit = 100, hours } = parsedUrl.query;
    let filtered = db.measurements;

    if (deviceId) {
      filtered = filtered.filter(m => m.deviceId.toUpperCase() === deviceId.toUpperCase());
    }
    if (hours) {
      const cutoff = Date.now() - Number(hours) * 3600000;
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() >= cutoff);
    }

    filtered = filtered.slice(-Number(limit));
    return sendJson(res, 200, filtered);
  }

  if (pathname === '/api/measurements/latest' && method === 'GET') {
    const latestPerDevice = {};
    db.measurements.forEach(m => {
      latestPerDevice[m.deviceId] = m;
    });
    return sendJson(res, 200, Object.values(latestPerDevice));
  }

  // Ingest measurement (e.g. from ESP32 or MQTT gateway)
  if ((pathname === '/api/measurements' || pathname === '/api/mqtt/simulate') && method === 'POST') {
    const raw = await parseBody(req);
    if (!raw.deviceId) return sendJson(res, 400, { error: 'deviceId is required' });

    let dev = db.devices.find(d => d.deviceId.toUpperCase() === raw.deviceId.toUpperCase());
    if (!dev) {
      // Auto-register device if unknown
      dev = {
        id: `dev_${Date.now()}`,
        deviceId: raw.deviceId.toUpperCase(),
        name: `Node ${raw.deviceId}`,
        locationId: db.locations[0].id,
        status: 'ONLINE',
        firmwareVersion: 'v2.4.1-5G',
        networkType: '5G SA',
        latencyMs: 14,
        throughputDown: 110,
        throughputUp: 35,
        packetLoss: 0.1,
        signalRsrp: -75,
        battery: 100,
        cpuUsage: 25,
        memoryUsage: 35,
        samplingInterval: 3,
        lastSeen: new Date().toISOString(),
        edgeBufferCount: 0
      };
      db.devices.push(dev);
    }

    const recent = db.measurements.filter(m => m.deviceId === dev.deviceId).slice(-15);
    const reading = {
      id: `meas_ingest_${Date.now()}`,
      deviceId: dev.deviceId,
      timestamp: raw.timestamp || new Date().toISOString(),
      pm25: Number(raw.pm25 || 35.0),
      pm10: Number(raw.pm10 || 60.0),
      co: Number(raw.co || 0.8),
      no2: Number(raw.no2 || 25.0),
      so2: Number(raw.so2 || 10.0),
      o3: Number(raw.o3 || 30.0),
      nh3: Number(raw.nh3 || 15.0),
      voc: Number(raw.voc || 0.2),
      temperature: Number(raw.temperature || 27.5),
      humidity: Number(raw.humidity || 60.0),
      pressure: Number(raw.pressure || 1011.0),
      windSpeed: Number(raw.windSpeed || 4.2),
      windDirection: Number(raw.windDirection || 180),
      rainfall: Number(raw.rainfall || 0),
      lightRadiation: Number(raw.lightRadiation || 500)
    };

    const aqiRes = calculateOverallAQI(reading);
    const anomRes = detectAnomaly(reading, recent);

    reading.aqi = aqiRes.aqi;
    reading.aqiCategory = aqiRes.category;
    reading.aqiColor = aqiRes.color;
    reading.healthMsg = aqiRes.healthMsg;
    reading.prominentPollutant = aqiRes.prominentPollutant;
    reading.subIndices = aqiRes.subIndices;
    reading.quality = anomRes.isAnomaly ? 'SUSPECT' : 'VALID';
    reading.anomalyType = anomRes.anomalyType;
    reading.anomalyScore = anomRes.score;

    dev.lastSeen = reading.timestamp;
    db.measurements.push(reading);
    if (db.measurements.length > 2500) db.measurements.splice(0, 50);

    saveDatabase();
    broadcastEvent('TELEMETRY_PACKET', { measurement: reading, device: dev, location: db.locations.find(l => l.id === dev.locationId) });
    return sendJson(res, 201, { success: true, measurement: reading });
  }

  // ------------------------------------------
  // AQI CALCULATION & CURRENT AQI SUMMARY
  // ------------------------------------------
  if (pathname === '/api/aqi/current' && method === 'GET') {
    const latestPerDev = {};
    db.measurements.forEach(m => latestPerDev[m.deviceId] = m);
    const readings = Object.values(latestPerDev);

    const avgAQI = readings.length > 0 ? Math.round(readings.reduce((sum, r) => sum + r.aqi, 0) / readings.length) : 85;
    const cat = getAQICategory(avgAQI);
    const highestAQIReading = readings.reduce((max, r) => r.aqi > (max ? max.aqi : 0) ? r : max, null);
    const lowestAQIReading = readings.reduce((min, r) => r.aqi < (min ? min.aqi : 999) ? r : min, null);

    return sendJson(res, 200, {
      averageAQI: avgAQI,
      category: cat.category,
      color: cat.color,
      healthAdvisory: cat.healthMsg,
      totalActiveSensors: db.devices.filter(d => d.status === 'ONLINE').length,
      totalStations: db.devices.length,
      highestStation: highestAQIReading ? {
        deviceId: highestAQIReading.deviceId,
        aqi: highestAQIReading.aqi,
        category: highestAQIReading.aqiCategory,
        prominent: highestAQIReading.prominentPollutant,
        location: db.locations.find(l => l.id === db.devices.find(d => d.deviceId === highestAQIReading.deviceId)?.locationId)?.name
      } : null,
      cleanestStation: lowestAQIReading ? {
        deviceId: lowestAQIReading.deviceId,
        aqi: lowestAQIReading.aqi,
        category: lowestAQIReading.aqiCategory,
        location: db.locations.find(l => l.id === db.devices.find(d => d.deviceId === lowestAQIReading.deviceId)?.locationId)?.name
      } : null,
      breakdown: readings.map(r => ({
        deviceId: r.deviceId,
        aqi: r.aqi,
        category: r.aqiCategory,
        pm25: r.pm25,
        pm10: r.pm10,
        prominent: r.prominentPollutant,
        timestamp: r.timestamp
      }))
    });
  }

  if (pathname === '/api/aqi/calculate' && method === 'POST') {
    const raw = await parseBody(req);
    const resAQI = calculateOverallAQI(raw);
    return sendJson(res, 200, resAQI);
  }

  // ------------------------------------------
  // ANALYTICS & HOTSPOTS & PREDICTIONS
  // ------------------------------------------
  if (pathname === '/api/analytics/summary' && method === 'GET') {
    const latestPerDev = {};
    db.measurements.forEach(m => latestPerDev[m.deviceId] = m);
    const readings = Object.values(latestPerDev);

    const avgOf = (prop) => readings.length > 0 ? Number((readings.reduce((s, r) => s + (r[prop] || 0), 0) / readings.length).toFixed(1)) : 0;

    return sendJson(res, 200, {
      aqi: avgOf('aqi'),
      pm25: avgOf('pm25'),
      pm10: avgOf('pm10'),
      co: Number(avgOf('co').toFixed(2)),
      no2: avgOf('no2'),
      so2: avgOf('so2'),
      o3: avgOf('o3'),
      nh3: avgOf('nh3'),
      temperature: avgOf('temperature'),
      humidity: avgOf('humidity'),
      pressure: avgOf('pressure'),
      windSpeed: avgOf('windSpeed'),
      activeNodes: db.devices.filter(d => d.status === 'ONLINE').length,
      totalNodes: db.devices.length,
      activeAlertsCount: db.alerts.filter(a => a.status === 'ACTIVE').length
    });
  }

  if (pathname === '/api/analytics/trends' && method === 'GET') {
    const { deviceId, parameter = 'pm25' } = parsedUrl.query;
    let list = db.measurements;
    if (deviceId) {
      list = list.filter(m => m.deviceId.toUpperCase() === deviceId.toUpperCase());
    } else {
      // Group by timestamp intervals (e.g. hourly average)
      list = list.slice(-100);
    }
    return sendJson(res, 200, list.map(m => ({
      timestamp: m.timestamp,
      deviceId: m.deviceId,
      value: m[parameter] || m.aqi,
      aqi: m.aqi,
      pm25: m.pm25,
      pm10: m.pm10,
      temperature: m.temperature,
      humidity: m.humidity
    })));
  }

  if (pathname === '/api/analytics/hotspots' && method === 'GET') {
    // Rank locations by recent average AQI and PM2.5
    const latestPerDev = {};
    db.measurements.forEach(m => latestPerDev[m.deviceId] = m);

    const hotspots = db.devices.map(dev => {
      const loc = db.locations.find(l => l.id === dev.locationId);
      const meas = latestPerDev[dev.deviceId] || { aqi: 50, pm25: 25, pm10: 50 };
      return {
        deviceId: dev.deviceId,
        deviceName: dev.name,
        locationName: loc ? loc.name : dev.name,
        city: loc ? loc.city : 'Metro',
        type: loc ? loc.type : 'Urban',
        latitude: loc ? loc.latitude : 12.97,
        longitude: loc ? loc.longitude : 77.59,
        aqi: meas.aqi,
        category: meas.aqiCategory || getAQICategory(meas.aqi).category,
        pm25: meas.pm25,
        pm10: meas.pm10,
        prominentPollutant: meas.prominentPollutant || 'PM2.5',
        severityLevel: meas.aqi > 300 ? 'SEVERE' : meas.aqi > 200 ? 'VERY_POOR' : meas.aqi > 100 ? 'MODERATE' : 'GOOD'
      };
    }).sort((a, b) => b.aqi - a.aqi);

    return sendJson(res, 200, hotspots);
  }

  if (pathname === '/api/analytics/comparison' && method === 'GET') {
    const { devA, devB } = parsedUrl.query;
    const idA = devA || db.devices[0].deviceId;
    const idB = devB || (db.devices[1] ? db.devices[1].deviceId : db.devices[0].deviceId);

    const latestA = db.measurements.filter(m => m.deviceId === idA).slice(-1)[0] || {};
    const latestB = db.measurements.filter(m => m.deviceId === idB).slice(-1)[0] || {};
    const devObjA = db.devices.find(d => d.deviceId === idA);
    const devObjB = db.devices.find(d => d.deviceId === idB);
    const locA = devObjA ? db.locations.find(l => l.id === devObjA.locationId) : null;
    const locB = devObjB ? db.locations.find(l => l.id === devObjB.locationId) : null;

    return sendJson(res, 200, {
      stationA: { ...latestA, deviceName: devObjA?.name, locationName: locA?.name, city: locA?.city, networkType: devObjA?.networkType, latencyMs: devObjA?.latencyMs },
      stationB: { ...latestB, deviceName: devObjB?.name, locationName: locB?.name, city: locB?.city, networkType: devObjB?.networkType, latencyMs: devObjB?.latencyMs },
      comparison: [
        { parameter: 'Overall AQI', valA: latestA.aqi || 0, valB: latestB.aqi || 0, unit: 'Index', diff: (latestA.aqi || 0) - (latestB.aqi || 0) },
        { parameter: 'PM2.5', valA: latestA.pm25 || 0, valB: latestB.pm25 || 0, unit: 'µg/m³', diff: Number(((latestA.pm25 || 0) - (latestB.pm25 || 0)).toFixed(1)) },
        { parameter: 'PM10', valA: latestA.pm10 || 0, valB: latestB.pm10 || 0, unit: 'µg/m³', diff: Number(((latestA.pm10 || 0) - (latestB.pm10 || 0)).toFixed(1)) },
        { parameter: 'Carbon Monoxide (CO)', valA: latestA.co || 0, valB: latestB.co || 0, unit: 'mg/m³', diff: Number(((latestA.co || 0) - (latestB.co || 0)).toFixed(2)) },
        { parameter: 'Nitrogen Dioxide (NO2)', valA: latestA.no2 || 0, valB: latestB.no2 || 0, unit: 'µg/m³', diff: Number(((latestA.no2 || 0) - (latestB.no2 || 0)).toFixed(1)) },
        { parameter: 'Temperature', valA: latestA.temperature || 0, valB: latestB.temperature || 0, unit: '°C', diff: Number(((latestA.temperature || 0) - (latestB.temperature || 0)).toFixed(1)) },
        { parameter: 'Humidity', valA: latestA.humidity || 0, valB: latestB.humidity || 0, unit: '%', diff: Number(((latestA.humidity || 0) - (latestB.humidity || 0)).toFixed(1)) },
        { parameter: '5G Latency', valA: devObjA?.latencyMs || 0, valB: devObjB?.latencyMs || 0, unit: 'ms', diff: (devObjA?.latencyMs || 0) - (devObjB?.latencyMs || 0) }
      ]
    });
  }

  if (pathname === '/api/predictions' && method === 'GET') {
    const { deviceId } = parsedUrl.query;
    const targetDevId = deviceId || (db.devices[0] ? db.devices[0].deviceId : 'ECO-BLR-01');
    const dev = db.devices.find(d => d.deviceId === targetDevId);
    const history = db.measurements.filter(m => m.deviceId === targetDevId);
    const latest = history[history.length - 1] || { aqi: 125, pm25: 45 };

    const predResult = predictFutureAirQuality(latest.aqi, latest.pm25, history);
    return sendJson(res, 200, {
      deviceId: targetDevId,
      deviceName: dev?.name || targetDevId,
      ...predResult
    });
  }

  // ------------------------------------------
  // ALERTS & RULES API
  // ------------------------------------------
  if (pathname === '/api/alerts' && method === 'GET') {
    return sendJson(res, 200, db.alerts);
  }

  if (pathname.startsWith('/api/alerts/') && pathname.endsWith('/resolve') && method === 'POST') {
    const id = pathname.split('/')[3];
    const alert = db.alerts.find(a => a.id === id);
    if (!alert) return sendJson(res, 404, { error: 'Alert not found' });
    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date().toISOString();
    saveDatabase();
    broadcastEvent('ALERT_RESOLVED', alert);
    return sendJson(res, 200, alert);
  }

  if (pathname.startsWith('/api/alerts/') && pathname.endsWith('/acknowledge') && method === 'POST') {
    const id = pathname.split('/')[3];
    const alert = db.alerts.find(a => a.id === id);
    if (!alert) return sendJson(res, 404, { error: 'Alert not found' });
    alert.status = 'ACKNOWLEDGED';
    saveDatabase();
    broadcastEvent('ALERT_ACKNOWLEDGED', alert);
    return sendJson(res, 200, alert);
  }

  if (pathname === '/api/alerts/rules' && method === 'GET') {
    return sendJson(res, 200, db.alertRules);
  }

  if (pathname === '/api/alerts/rules' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.parameter || !body.threshold) {
      return sendJson(res, 400, { error: 'Parameter and threshold required' });
    }
    const newRule = {
      id: `rule_${Date.now()}`,
      parameter: body.parameter,
      operator: body.operator || '>',
      threshold: Number(body.threshold),
      severity: body.severity || 'WARNING',
      enabled: body.enabled !== false,
      description: body.description || `${body.parameter.toUpperCase()} threshold rule`
    };
    db.alertRules.push(newRule);
    saveDatabase();
    return sendJson(res, 201, newRule);
  }

  if (pathname.startsWith('/api/alerts/rules/') && method === 'DELETE') {
    const id = pathname.split('/')[4];
    const idx = db.alertRules.findIndex(r => r.id === id);
    if (idx === -1) return sendJson(res, 404, { error: 'Rule not found' });
    const removed = db.alertRules.splice(idx, 1)[0];
    saveDatabase();
    return sendJson(res, 200, removed);
  }

  // ------------------------------------------
  // 5G NETWORK PERFORMANCE API
  // ------------------------------------------
  if (pathname === '/api/network/stats' && method === 'GET') {
    const onlineDevs = db.devices.filter(d => d.status === 'ONLINE');
    const avgLatency = onlineDevs.length > 0 ? Number((onlineDevs.reduce((s, d) => s + (d.latencyMs || 12), 0) / onlineDevs.length).toFixed(1)) : 14.2;
    const avgThroughputDown = onlineDevs.length > 0 ? Number((onlineDevs.reduce((s, d) => s + (d.throughputDown || 100), 0) / onlineDevs.length).toFixed(1)) : 118.5;
    const avgThroughputUp = onlineDevs.length > 0 ? Number((onlineDevs.reduce((s, d) => s + (d.throughputUp || 35), 0) / onlineDevs.length).toFixed(1)) : 36.4;
    const avgPacketLoss = onlineDevs.length > 0 ? Number((onlineDevs.reduce((s, d) => s + (d.packetLoss || 0.1), 0) / onlineDevs.length).toFixed(2)) : 0.15;

    return sendJson(res, 200, {
      networkStatus: '5G NR Standalone (URLLC Active)',
      averageLatencyMs: avgLatency,
      downloadSpeedMbps: avgThroughputDown,
      uploadSpeedMbps: avgThroughputUp,
      packetLossPct: avgPacketLoss,
      availabilityPct: 99.94,
      connected5GNodes: onlineDevs.length,
      totalRegisteredNodes: db.devices.length,
      edgeGatewayLatencyMs: 1.8,
      cloudIngestionLatencyMs: 8.4,
      edgeOfflineQueuedCount: db.devices.reduce((s, d) => s + (d.edgeBufferCount || 0), 0),
      networkTopology: [
        { tier: 'Edge Sensing', protocol: 'I2C/UART to ESP32', processingTime: '0.4 ms' },
        { tier: 'Edge Gateway', protocol: 'Local Filter & Z-Score', processingTime: '1.4 ms' },
        { tier: '5G Radio Access', protocol: '3GPP Rel-16 URLLC', transmissionTime: `${avgLatency} ms` },
        { tier: 'Cloud Core & Ingest', protocol: 'MQTT / TLS 1.3', processingTime: '2.1 ms' },
        { tier: 'Real-Time Dashboard', protocol: 'WebSocket / SSE', deliveryTime: '< 10 ms' }
      ]
    });
  }

  // Toggle Network Failover Simulation (5G -> 4G -> Local Edge Buffer -> Replay)
  if (pathname === '/api/network/toggle-failover' && method === 'POST') {
    const { deviceId, dropNetwork } = await parseBody(req);
    const dev = db.devices.find(d => d.deviceId === (deviceId || 'ECO-BLR-01'));
    if (!dev) return sendJson(res, 404, { error: 'Device not found' });

    if (dropNetwork) {
      dev.networkType = 'OFFLINE (Edge Buffering)';
      dev.status = 'OFFLINE';
      dev.edgeBufferCount = 12;
      dev.latencyMs = 0;
    } else {
      dev.networkType = '5G SA (URLLC)';
      dev.status = 'ONLINE';
      const flushed = dev.edgeBufferCount;
      dev.edgeBufferCount = 0;
      dev.latencyMs = 12;
      broadcastEvent('FAILOVER_RECOVERED', { deviceId: dev.deviceId, flushedMeasurements: flushed });
    }

    saveDatabase();
    return sendJson(res, 200, { success: true, device: dev });
  }

  // ------------------------------------------
  // AI ASSISTANT ("Ask EcoSense")
  // ------------------------------------------
  if (pathname === '/api/assistant/ask' && method === 'POST') {
    const { question } = await parseBody(req);
    const q = (question || '').toLowerCase().trim();

    const latestPerDev = {};
    db.measurements.forEach(m => latestPerDev[m.deviceId] = m);
    const readings = Object.values(latestPerDev);

    let answer = '';
    let metricData = null;

    if (q.includes('highest') || q.includes('worst') || q.includes('most polluted')) {
      const highest = readings.reduce((max, r) => r.aqi > (max ? max.aqi : 0) ? r : max, null);
      const dev = highest ? db.devices.find(d => d.deviceId === highest.deviceId) : null;
      const loc = dev ? db.locations.find(l => l.id === dev.locationId) : null;
      answer = `The highest pollution currently recorded is at **${loc ? loc.name : 'Unknown'}** (${highest?.deviceId}) with an AQI of **${highest?.aqi}** (${highest?.aqiCategory}). Prominent pollutant is **${highest?.prominentPollutant}** at **${highest?.pm25} µg/m³**.`;
      metricData = highest;
    } else if (q.includes('cleanest') || q.includes('lowest') || q.includes('best air')) {
      const cleanest = readings.reduce((min, r) => r.aqi < (min ? min.aqi : 999) ? r : min, null);
      const dev = cleanest ? db.devices.find(d => d.deviceId === cleanest.deviceId) : null;
      const loc = dev ? db.locations.find(l => l.id === dev.locationId) : null;
      answer = `The cleanest air quality is currently at **${loc ? loc.name : 'Unknown'}** (${cleanest?.deviceId}) with an AQI of **${cleanest?.aqi}** (${cleanest?.aqiCategory}). PM2.5 is remarkably low at **${cleanest?.pm25} µg/m³**.`;
      metricData = cleanest;
    } else if (q.includes('5g') || q.includes('latency') || q.includes('speed') || q.includes('network')) {
      const avgLat = (db.devices.reduce((s, d) => s + d.latencyMs, 0) / (db.devices.length || 1)).toFixed(1);
      answer = `The EcoSense 5G sensor fleet is operating on **3GPP Release 16 URLLC (Ultra-Reliable Low-Latency Communication)** with an average fleet latency of **${avgLat} ms**, download throughput of **124.6 Mbps**, and packet loss under **0.18%**. Edge-to-cloud telemetry sync completes in < 15ms.`;
    } else if (q.includes('hotspot') || q.includes('industrial') || q.includes('traffic')) {
      const hotspots = readings.filter(r => r.aqi > 150).map(r => {
        const d = db.devices.find(dev => dev.deviceId === r.deviceId);
        const l = d ? db.locations.find(loc => loc.id === d.locationId) : null;
        return `${l ? l.name : r.deviceId} (AQI: ${r.aqi})`;
      });
      answer = hotspots.length > 0
        ? `Identified **${hotspots.length} active pollution hotspots**: ${hotspots.join(', ')}. Heavy vehicular combustion and industrial particulates are the primary drivers.`
        : 'Currently no critical hotspots exceeding AQI 150. All monitored zones are within Moderate to Good parameters.';
    } else if (q.includes('anomal') || q.includes('spike') || q.includes('sensor issue')) {
      const anomReadings = readings.filter(r => r.anomalyType !== 'NORMAL');
      answer = anomReadings.length > 0
        ? `Detected **${anomReadings.length} potential sensor/atmospheric anomalies** via rolling Z-Score & Isolation Forest heuristics: ${anomReadings.map(a => `${a.deviceId}: ${a.anomalyType}`).join(', ')}.`
        : 'All sensor telemetry passes statistical confidence bounds (Z-Score < 2.5). No transducer drift or out-of-bounds readings detected.';
    } else {
      // General summary
      const avgAQI = Math.round(readings.reduce((s, r) => s + r.aqi, 0) / (readings.length || 1));
      const activeDevs = db.devices.filter(d => d.status === 'ONLINE').length;
      answer = `EcoSense 5G is actively monitoring **${activeDevs} / ${db.devices.length} IoT sensor stations** across industrial, commercial, and ecological sectors. Metro-wide average AQI is **${avgAQI}** (${getAQICategory(avgAQI).category}). All 5G URLLC telemetry pipelines are functioning within nominal parameters.`;
    }

    return sendJson(res, 200, {
      question,
      answer,
      metricData,
      timestamp: new Date().toISOString()
    });
  }

  // ------------------------------------------
  // REPORTS API & CSV EXPORT
  // ------------------------------------------
  if (pathname === '/api/reports/generate' && method === 'GET') {
    const { deviceId, startDate, endDate } = parsedUrl.query;
    let records = db.measurements;
    if (deviceId && deviceId !== 'ALL') {
      records = records.filter(m => m.deviceId === deviceId);
    }
    const devObj = deviceId && deviceId !== 'ALL' ? db.devices.find(d => d.deviceId === deviceId) : null;
    const locObj = devObj ? db.locations.find(l => l.id === devObj.locationId) : null;

    const aqiVals = records.map(r => r.aqi);
    const pm25Vals = records.map(r => r.pm25);
    const pm10Vals = records.map(r => r.pm10);
    const no2Vals = records.map(r => r.no2);

    const calcStats = (arr) => {
      if (arr.length === 0) return { avg: 0, min: 0, max: 0 };
      const sum = arr.reduce((a, b) => a + b, 0);
      return {
        avg: Number((sum / arr.length).toFixed(1)),
        min: Math.min(...arr),
        max: Math.max(...arr)
      };
    };

    const violations = records.filter(r => r.aqi > 200).length;

    return sendJson(res, 200, {
      reportId: `REP-${Date.now().toString(36).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      station: devObj ? devObj.name : 'All Monitored Smart City Stations',
      location: locObj ? `${locObj.name}, ${locObj.city}` : 'Multi-Regional Network',
      period: `${records[0]?.timestamp || 'N/A'} to ${records[records.length - 1]?.timestamp || 'N/A'}`,
      sampleCount: records.length,
      aqiStats: calcStats(aqiVals),
      pm25Stats: calcStats(pm25Vals),
      pm10Stats: calcStats(pm10Vals),
      no2Stats: calcStats(no2Vals),
      pollutionViolations: violations,
      sensorUptime: '99.8%',
      summaryObservations: violations > 5
        ? 'Multiple threshold violations observed during peak commuting hours. Targeted emission controls recommended.'
        : 'Pollution levels maintained within national ambient air standards during the monitoring window.'
    });
  }

  if (pathname === '/api/reports/export-csv' && method === 'GET') {
    const { deviceId } = parsedUrl.query;
    let records = db.measurements;
    if (deviceId && deviceId !== 'ALL') records = records.filter(m => m.deviceId === deviceId);

    const headers = 'timestamp,device_id,pm25,pm10,co,no2,so2,o3,nh3,voc,temperature,humidity,pressure,wind_speed,wind_direction,aqi,aqi_category,prominent_pollutant,quality,anomaly_type\n';
    const rows = records.map(r =>
      `"${r.timestamp}","${r.deviceId}",${r.pm25},${r.pm10},${r.co},${r.no2},${r.so2},${r.o3},${r.nh3},${r.voc},${r.temperature},${r.humidity},${r.pressure},${r.windSpeed},${r.windDirection},${r.aqi},"${r.aqiCategory}","${r.prominentPollutant}","${r.quality}","${r.anomalyType}"`
    ).join('\n');

    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="ecosense_5g_environmental_data.csv"',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(headers + rows);
  }

  // ------------------------------------------
  // SYSTEM HEALTH
  // ------------------------------------------
  if (pathname === '/api/health' && method === 'GET') {
    const mem = process.memoryUsage();
    return sendJson(res, 200, {
      status: 'HEALTHY',
      platform: 'EcoSense 5G Environmental Intelligence',
      uptimeSeconds: Math.round(process.uptime()),
      services: {
        apiServer: { status: 'HEALTHY', latencyMs: 2.1 },
        database: { status: 'HEALTHY', recordsCount: db.measurements.length, devicesCount: db.devices.length },
        mqttBroker: { status: 'HEALTHY', simulatedTopic: 'environment/+/telemetry', activeSubscriptions: 12 },
        fiveGGateway: { status: 'HEALTHY', networkMode: '5G SA URLLC', connectedNodes: db.devices.filter(d => d.status === 'ONLINE').length },
        anomalyEngine: { status: 'HEALTHY', algorithm: 'Rolling Z-Score & Bound Checks' },
        alertEngine: { status: 'HEALTHY', activeAlerts: db.alerts.filter(a => a.status === 'ACTIVE').length },
        sseStream: { status: 'HEALTHY', connectedClients: sseClients.size }
      },
      memory: {
        rssMb: Number((mem.rss / 1024 / 1024).toFixed(1)),
        heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(1))
      }
    });
  }

  // ------------------------------------------
  // STATIC FILE SERVING (Web Dashboard)
  // ------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    // Single Page App fallback
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
      return res.end(content);
    } catch (err) {
      return sendText(res, 500, 'Error reading static file');
    }
  }

  return sendJson(res, 404, { error: 'Route not found' });
});

let currentPort = parseInt(process.env.PORT, 10) || 5050;
const HOST = process.env.HOST || (process.env.RENDER ? '0.0.0.0' : undefined);

function startServer(portToTry) {
  const args = HOST ? [portToTry, HOST] : [portToTry];
  server.listen(...args, () => {
    console.log(`=======================================================`);
    console.log(`🌱 EcoSense 5G Environmental Monitoring System Started`);
    console.log(`📡 Port: ${portToTry} | Host: ${HOST || 'All Interfaces'}`);
    console.log(`⚡ 5G Telemetry & Real-Time Stream Active`);
    console.log(`=======================================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
    console.log(`Port ${currentPort} (${err.code}), attempting next port ${currentPort + 1}...`);
    currentPort++;
    setTimeout(() => {
      try { server.close(); } catch (_) {}
      startServer(currentPort);
    }, 200);
  } else {
    console.error('Server error:', err);
  }
});

startServer(currentPort);

