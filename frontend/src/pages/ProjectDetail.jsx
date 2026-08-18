import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderGit2,
  GitBranch,
  Rocket,
  RotateCcw,
  Terminal,
  ExternalLink,
  Server,
  ArrowLeft,
  Activity,
  CheckCircle2,
  Clock,
  Box,
} from 'lucide-react';
import * as projectService from '../services/projectService';
import * as deploymentService from '../services/deploymentService';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const projData = await projectService.getProjectById(id);
      setProject(projData.project);

      const depData = await deploymentService.getProjectDeployments(id);
      setDeployments(depData.deployments || []);
    } catch (err) {
      console.error('Failed to load project details:', err);
      setError('Project not found or accessible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDeployNow = async () => {
    try {
      setDeploying(true);
      const res = await deploymentService.triggerDeployment(id, 'MANUAL');
      alert(`Deployment triggered! Version: ${res.deployment.version}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to trigger deployment');
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        Loading project configuration...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-200">{error || 'Project Not Found'}</h3>
        <Link to="/projects" className="text-cyan-400 text-sm font-semibold hover:underline block">
          ← Back to Projects List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div className="space-y-4">
        <Link
          to="/projects"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Projects</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono border ${
                  project.status === 'DEPLOYED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : project.status === 'BUILDING'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : project.status === 'FAILED'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {project.status || 'IDLE'}
              </span>
            </div>
            <p className="text-xs text-slate-400">{project.description || 'No description provided.'}</p>
          </div>

          {/* Action Trigger Buttons */}
          {user?.role !== 'VIEWER' && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDeployNow}
                disabled={deploying}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-2 disabled:opacity-50"
              >
                <Rocket size={15} />
                <span>{deploying ? 'Triggering...' : 'Deploy Now'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Specifications Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">GitHub Repository</span>
          <a
            href={project.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-cyan-400 hover:underline flex items-center space-x-1 truncate"
          >
            <span className="truncate">{project.repositoryUrl}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">Target Branch & Port</span>
          <p className="text-sm font-mono text-slate-200 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <GitBranch size={14} className="text-slate-500" />
              <span>{project.branch}</span>
            </span>
            <span className="text-cyan-400 font-bold">Port :{project.port}</span>
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">Current Deployed Version</span>
          <p className="text-sm font-mono text-emerald-400 font-bold">
            {project.currentVersion || 'v0.0.0'}
          </p>
        </div>
      </div>

      {/* Deployment History Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Deployment Pipeline History</h2>
          <span className="text-xs font-mono text-slate-400">Total: {deployments.length}</span>
        </div>

        {deployments.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No deployments recorded yet for this project repository.</p>
            <p className="text-[11px] text-slate-500 font-mono">
              Click "Deploy Now" above to trigger a pipeline execution.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Build #</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Trigger</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {deployments.map((dep) => (
                  <tr key={dep._id || dep.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-cyan-400">#{dep.buildNumber}</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">{dep.version}</td>
                    <td className="py-3.5 px-4 text-slate-400">{dep.branch}</td>
                    <td className="py-3.5 px-4 text-slate-400">{dep.triggerType}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {dep.status}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
