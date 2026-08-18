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
import { useAuth } from '../context/AuthContext';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const data = await projectService.getProjectById(id);
        setProject(data.project);
      } catch (err) {
        console.error('Failed to fetch project detail:', err);
        setError('Project not found or accessible');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

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
                onClick={() => alert('Jenkins Pipeline manual trigger will be executed in Phase 5!')}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
              >
                <Rocket size={15} />
                <span>Deploy Now</span>
              </button>

              <button
                onClick={() => alert('Rollback engine will deploy previous image version in Phase 8!')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-2"
              >
                <RotateCcw size={15} />
                <span>Rollback</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Specifications & Overview Cards */}
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

      {/* Deployment History Placeholder */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Deployment Pipeline History</h2>
          <span className="text-xs font-mono text-slate-500">Phase 4 Active</span>
        </div>

        <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-2">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
          <p>No deployments recorded yet for this project repository.</p>
          <p className="text-[11px] text-slate-500 font-mono">
            Deployment tracking models & build history will be configured in Phase 4.
          </p>
        </div>
      </div>
    </div>
  );
}
