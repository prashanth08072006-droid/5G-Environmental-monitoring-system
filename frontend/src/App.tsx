import React, { useState, useEffect } from 'react';
import { ecosenseApi } from './services/api';
import { Device, Alert, NetworkStats } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    Promise.all([
      ecosenseApi.getDevices(),
      ecosenseApi.getAlerts(),
      ecosenseApi.getNetworkStats()
    ]).then(([d, a, n]) => {
      setDevices(d);
      setAlerts(a);
      setNetworkStats(n);
    }).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F172A] border-r border-slate-800 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-2xl">🌱</span>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center space-x-1">
                <span>EcoSense</span>
                <span className="text-emerald-400 font-mono text-sm">5G</span>
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Environmental AI</p>
            </div>
          </div>

          <div className="px-3 py-2 bg-slate-900 rounded-lg border border-emerald-500/30 flex items-center justify-between text-xs mb-4">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-slate-300">5G URLLC</span>
            </div>
            <span className="font-mono text-emerald-400 font-bold">{networkStats?.averageLatencyMs || 12} ms</span>
          </div>

          <nav className="space-y-1 text-sm font-medium">
            {['dashboard', 'map', 'sensors', 'analytics', 'network', 'alerts', 'reports'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl capitalize transition-colors ${
                  activeTab === tab ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <p className="font-bold text-slate-200">Dr. Aarav Sharma</p>
          <p className="text-[10px] text-emerald-400 font-mono uppercase">ADMINISTRATOR</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-white capitalize">{activeTab}</h2>
            <p className="text-xs text-slate-400">National Ambient Air Quality Monitoring Network • CPCB Standards</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ● 5G Fleet Online: {devices.length} Nodes
          </span>
        </header>

        {/* Dynamic Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800">
            <span className="text-xs text-slate-400">Average Metro AQI</span>
            <div className="my-2 flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold font-mono text-amber-400">148</span>
              <span className="text-xs font-bold text-amber-400 uppercase">Moderate</span>
            </div>
            <p className="text-[11px] text-slate-500">Prominent pollutant: PM2.5</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800">
            <span className="text-xs text-slate-400">5G Fleet Latency</span>
            <div className="my-2 flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold font-mono text-emerald-400">{networkStats?.averageLatencyMs || 12}</span>
              <span className="text-xs font-mono text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold">● 3GPP Rel-16 URLLC Active</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800">
            <span className="text-xs text-slate-400">Active Sensors</span>
            <div className="my-2 flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold font-mono text-white">{devices.length}</span>
              <span className="text-xs font-mono text-slate-400">/ {devices.length} Nodes</span>
            </div>
            <p className="text-[11px] text-slate-500">Multi-regional telemetry grid</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800">
            <span className="text-xs text-slate-400">Unresolved Incidents</span>
            <div className="my-2 flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold font-mono text-red-400">{alerts.filter(a => a.status === 'ACTIVE').length}</span>
              <span className="text-xs font-bold text-red-400 uppercase">Alerts</span>
            </div>
            <p className="text-[11px] text-red-400">Automated thresholds triggered</p>
          </div>
        </div>

        {/* Stations Table */}
        <div className="rounded-2xl bg-[#111827] border border-slate-800 p-5">
          <h3 className="font-bold text-sm text-slate-200 mb-3">Live 5G Monitoring Node Fleet</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {devices.slice(0, 6).map(dev => (
              <div key={dev.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-100">{dev.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400">{dev.networkType}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  ID: {dev.deviceId} • Latency: {dev.latencyMs}ms • RSRP: {dev.signalRsrp} dBm
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
