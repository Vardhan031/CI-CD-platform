import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Server, GitBranch, Clock, CheckCircle2, XCircle, Play, RotateCcw, Box } from 'lucide-react';
import * as deploymentService from '../services/deploymentService';

export default function Deployments() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        setLoading(true);
        const data = await deploymentService.getAllDeployments();
        setDeployments(data.deployments || []);
      } catch (err) {
        console.error('Failed to fetch deployments:', err);
        setError('Could not load deployment history');
      } finally {
        setLoading(false);
      }
    };

    fetchDeployments();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Rocket className="text-cyan-400" />
            <span>Deployment Pipelines History</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track real-time build executions, container image versions, and pipeline logs.
          </p>
        </div>
      </div>

      {/* Deployments List Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm font-mono">
          Loading deployment pipeline records...
        </div>
      ) : deployments.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <Box className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-300">No Deployments Executed Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Deployments triggered manually or via GitHub webhooks will automatically record build numbers and logs here.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Build #</th>
                  <th className="py-3.5 px-5">Project</th>
                  <th className="py-3.5 px-5">Version</th>
                  <th className="py-3.5 px-5">Branch & Commit</th>
                  <th className="py-3.5 px-5">Trigger</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Duration</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {deployments.map((dep) => (
                  <tr key={dep._id || dep.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5 font-bold text-cyan-400">
                      #{dep.buildNumber || 1}
                    </td>
                    <td className="py-4 px-5 font-sans font-semibold text-slate-100 flex items-center space-x-2">
                      <Server size={15} className="text-slate-500" />
                      <span>{dep.project?.name || 'NodeShop API'}</span>
                    </td>
                    <td className="py-4 px-5 text-emerald-400 font-bold">{dep.version}</td>
                    <td className="py-4 px-5 text-slate-400">
                      <span className="inline-flex items-center space-x-1.5">
                        <GitBranch size={13} className="text-slate-500" />
                        <span>{dep.branch}</span>
                        <span className="text-slate-600">({dep.commitHash})</span>
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2 py-0.5 rounded border text-[10px] ${
                        dep.triggerType === 'WEBHOOK'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {dep.triggerType}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          dep.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : dep.status === 'RUNNING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {dep.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-400 flex items-center space-x-1">
                      <Clock size={13} />
                      <span>{dep.duration ? `${dep.duration}s` : '12s'}</span>
                    </td>
                    <td className="py-4 px-5 text-right font-sans">
                      <Link
                        to={`/deployments/${dep._id || dep.id}`}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors inline-flex items-center space-x-1"
                      >
                        <span>View Logs</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
