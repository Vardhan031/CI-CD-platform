import React, { useState, useEffect } from 'react';
import { Rocket, CheckCircle2, XCircle, Clock, Server, GitBranch, ArrowUpRight } from 'lucide-react';
import axios from 'axios';

export default function Dashboard() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch backend health endpoint to confirm API connection
    axios.get('/api/health')
      .then((res) => {
        setHealthStatus(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Health fetch failed:', err);
        setLoading(false);
      });
  }, []);

  const stats = [
    { name: 'Total Projects', value: '3', icon: Server, color: 'from-blue-500 to-cyan-500' },
    { name: 'Active Deployments', value: '1', icon: Rocket, color: 'from-amber-500 to-orange-500' },
    { name: 'Successful Builds', value: '24', icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { name: 'Failed Builds', value: '2', icon: XCircle, color: 'from-rose-500 to-pink-500' },
  ];

  const recentDeployments = [
    {
      id: 'dep-101',
      project: 'NodeShop API',
      version: 'v1.2.0',
      branch: 'main',
      status: 'SUCCESS',
      trigger: 'WEBHOOK',
      timestamp: '10 mins ago',
    },
    {
      id: 'dep-100',
      project: 'Parking App Backend',
      version: 'v2.1.0',
      branch: 'main',
      status: 'SUCCESS',
      trigger: 'MANUAL',
      timestamp: '2 hours ago',
    },
    {
      id: 'dep-099',
      project: 'Chat Service',
      version: 'v0.4.0',
      branch: 'dev',
      status: 'FAILED',
      trigger: 'WEBHOOK',
      timestamp: '5 hours ago',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">CI/CD Management Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor real-time pipeline status, Jenkins build triggers, and Docker container deployments.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2">
            <Rocket size={16} />
            <span>New Deployment</span>
          </button>
        </div>
      </div>

      {/* Backend API Connection Status Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${healthStatus?.status === 'ok' ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`}></div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Backend API Connectivity</span>
            <p className="text-sm font-mono text-slate-200">
              {loading ? 'Checking server connection...' : healthStatus ? `Connected to ${healthStatus.service}` : 'Disconnected / Error'}
            </p>
          </div>
        </div>
        {healthStatus && (
          <span className="text-xs font-mono px-2.5 py-1 bg-slate-800 text-cyan-400 rounded-md border border-slate-700">
            HTTP 200 OK
          </span>
        )}
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{stat.name}</span>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} text-white shadow-md`}>
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100 mt-3 font-mono">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Deployments Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Recent Deployments</h2>
            <p className="text-xs text-slate-400">Latest build pipelines executed across projects</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Trigger</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentDeployments.map((dep) => (
                <tr key={dep.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center space-x-2">
                    <Server size={16} className="text-cyan-400" />
                    <span>{dep.project}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-cyan-300">{dep.version}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                    <span className="inline-flex items-center space-x-1">
                      <GitBranch size={12} />
                      <span>{dep.branch}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{dep.trigger}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono border ${
                      dep.status === 'SUCCESS'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {dep.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-400 flex items-center space-x-1">
                    <Clock size={12} />
                    <span>{dep.timestamp}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
