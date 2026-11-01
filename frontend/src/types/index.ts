export interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
  type: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  locationId: string;
  status: 'ONLINE' | 'WARNING' | 'OFFLINE' | 'MAINTENANCE';
  firmwareVersion: string;
  networkType: string;
  latencyMs: number;
  throughputDown: number;
  throughputUp: number;
  packetLoss: number;
  signalRsrp: number;
  battery: number;
  cpuUsage: number;
  memoryUsage: number;
  samplingInterval: number;
  lastSeen: string;
  edgeBufferCount: number;
  location?: Location;
  latestMeasurement?: Measurement;
}

export interface Measurement {
  id: string;
  deviceId: string;
  timestamp: string;
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  so2: number;
  o3: number;
  nh3: number;
  voc: number;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  rainfall: number;
  lightRadiation: number;
  aqi: number;
  aqiCategory: string;
  aqiColor: string;
  prominentPollutant: string;
  quality: 'VALID' | 'SUSPECT' | 'INVALID';
  anomalyType: string;
  anomalyScore: number;
}

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  locationName: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  parameter: string;
  value: number;
  threshold: number;
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string | null;
}

export interface AlertRule {
  id: string;
  parameter: string;
  operator: string;
  threshold: number;
  severity: string;
  enabled: boolean;
  description: string;
}

export interface NetworkStats {
  networkStatus: string;
  averageLatencyMs: number;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  packetLossPct: number;
  availabilityPct: number;
  connected5GNodes: number;
  totalRegisteredNodes: number;
  edgeGatewayLatencyMs: number;
  cloudIngestionLatencyMs: number;
  edgeOfflineQueuedCount: number;
  networkTopology: Array<{
    tier: string;
    protocol: string;
    processingTime?: string;
    transmissionTime?: string;
    deliveryTime?: string;
  }>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ENVIRONMENT_OFFICER' | 'RESEARCHER' | 'VIEWER';
  department: string;
}
