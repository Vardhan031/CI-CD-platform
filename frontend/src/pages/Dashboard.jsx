import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, CheckCircle2, XCircle, Clock, Server, GitBranch, FolderGit2, Loader2 } from 'lucide-react';
import axios from 'axios';
import * as projectService from '../services/projectService';
import * as deploymentService from '../services/deploymentService';

export default function Dashboard() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [projects, setProjects] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Probe Health
        const healthRes = await axios.get('/api/health').catch(() => null);
        if (healthRes) setHealthStatus(healthRes.data);

        // Fetch Projects & Deployments from API
        const projData = await projectService.getProjects().catch(() => ({ projects: [] }));
        setProjects(projData.projects || []);

        const depData = await deploymentService.getAllDeployments().catch(() => ({ deployments: [] }));
        setDeployments(depData.deployments || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalProjects = projects.length;
  const activeRuns = deployments.filter((d) => d.status === 'QUEUED' || d.status === 'RUNNING').length;
  const successfulBuilds = deployments.filter((d) => d.status === 'SUCCESS').length;
  const failedBuilds = deployments.filter((d) => d.status === 'FAILED').length;

  const stats = [
    { name: 'Total Projects', value: totalProjects, icon: Server, color: 'from-blue-500 to-cyan-500' },
    { name: 'Active CI Runs', value: activeRuns, icon: Terminal, color: 'from-amber-500 to-orange-500' },
    { name: 'Successful Builds', value: successfulBuilds, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { name: 'Failed Builds', value: failedBuilds, icon: XCircle, color: 'from-rose-500 to-pink-500' },
  ];

  const recentDeployments = deployments.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Terminal className="text-cyan-400" />
            <span>Project Management & CI Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor project repositories, application versions (`v1.0.x`), and Jenkins CI pipeline runs.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/projects"
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2"
          >
            <FolderGit2 size={16} />
            <span>Manage Projects</span>
          </Link>
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
              <p className="text-2xl font-bold text-slate-100 mt-3 font-mono">
                {loading ? <Loader2 size={20} className="animate-spin text-slate-500" /> : stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent CI Pipeline Runs Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Recent CI Pipeline Runs</h2>
            <p className="text-xs text-slate-400">Latest build execution records across registered project repositories</p>
          </div>
        </div>

        {recentDeployments.length === 0 ? (
          <p className="text-xs font-mono text-slate-500 py-6 text-center">
            {loading ? 'Loading pipeline history...' : 'No CI build runs recorded yet in MongoDB.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Build #</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Trigger</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {recentDeployments.map((dep) => {
                  const isRunning = dep.status === 'QUEUED' || dep.status === 'RUNNING';

                  return (
                    <tr key={dep._id || dep.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-cyan-400">#{dep.buildNumber || 1}</td>
                      <td className="py-3.5 px-4 font-sans font-semibold text-slate-100 flex items-center space-x-2">
                        <Server size={15} className="text-cyan-400" />
                        <span>{dep.project?.name || 'NodeShop API'}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-emerald-400 font-bold">{dep.version}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        <span className="inline-flex items-center space-x-1">
                          <GitBranch size={12} />
                          <span>{dep.branch}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{dep.triggerType}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono border flex items-center space-x-1 w-max ${
                            dep.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isRunning
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {isRunning && <Loader2 size={11} className="animate-spin" />}
                          <span>{dep.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <Link
                          to={`/deployments/${dep._id || dep.id}`}
                          className="text-xs font-semibold text-cyan-400 hover:underline"
                        >
                          View Logs →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
