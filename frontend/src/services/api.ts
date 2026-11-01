import axios from 'axios';
import { Device, Measurement, Alert, AlertRule, NetworkStats, User } from '../types';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecosense_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ecosenseApi = {
  // Devices & Fleet
  getDevices: () => apiClient.get<Device[]>('/devices').then(r => r.data),
  getDeviceById: (id: string) => apiClient.get<Device & { history: Measurement[] }>(`/devices/${id}`).then(r => r.data),
  registerDevice: (payload: Partial<Device> & { locationName?: string; city?: string; latitude?: number; longitude?: number }) =>
    apiClient.post<Device>('/devices', payload).then(r => r.data),
  sendCommand: (id: string, command: string, payload?: any) =>
    apiClient.post(`/devices/${id}/command`, { command, payload }).then(r => r.data),

  // Telemetry & Measurements
  getMeasurements: (params?: { deviceId?: string; hours?: number; limit?: number }) =>
    apiClient.get<Measurement[]>('/measurements', { params }).then(r => r.data),
  getCurrentAQI: () => apiClient.get('/aqi/current').then(r => r.data),
  getSummary: () => apiClient.get('/analytics/summary').then(r => r.data),
  getTrends: (params?: { deviceId?: string; parameter?: string }) =>
    apiClient.get('/analytics/trends', { params }).then(r => r.data),
  getHotspots: () => apiClient.get('/analytics/hotspots').then(r => r.data),
  getComparison: (devA: string, devB: string) =>
    apiClient.get('/analytics/comparison', { params: { devA, devB } }).then(r => r.data),

  // 5G Network & Failover
  getNetworkStats: () => apiClient.get<NetworkStats>('/network/stats').then(r => r.data),
  toggleFailover: (deviceId: string, dropNetwork: boolean) =>
    apiClient.post('/network/toggle-failover', { deviceId, dropNetwork }).then(r => r.data),

  // Alerts & Rules
  getAlerts: () => apiClient.get<Alert[]>('/alerts').then(r => r.data),
  acknowledgeAlert: (id: string) => apiClient.post(`/alerts/${id}/acknowledge`).then(r => r.data),
  resolveAlert: (id: string) => apiClient.post(`/alerts/${id}/resolve`).then(r => r.data),
  getAlertRules: () => apiClient.get<AlertRule[]>('/alerts/rules').then(r => r.data),
  createAlertRule: (rule: Partial<AlertRule>) => apiClient.post('/alerts/rules', rule).then(r => r.data),

  // AI Assistant & Predictions
  getPredictions: (deviceId?: string) => apiClient.get('/predictions', { params: { deviceId } }).then(r => r.data),
  askAssistant: (question: string) => apiClient.post('/assistant/ask', { question }).then(r => r.data),

  // Reports
  generateReport: (deviceId?: string) => apiClient.get('/reports/generate', { params: { deviceId } }).then(r => r.data),
  getCsvDownloadUrl: (deviceId?: string) => `${API_BASE}/reports/export-csv?deviceId=${deviceId || 'ALL'}`
};
