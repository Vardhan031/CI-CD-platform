import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  ArrowLeft,
  RotateCcw,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import * as deploymentService from '../services/deploymentService';

export default function DeploymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deploymentData, setDeploymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let intervalId = null;

    const fetchDeployment = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        const data = await deploymentService.getDeploymentById(id);
        setDeploymentData(data);

        // If build is QUEUED or RUNNING, poll status every 3 seconds
        const currentStatus = data?.deployment?.status;
        if (currentStatus === 'QUEUED' || currentStatus === 'RUNNING') {
          if (!intervalId) {
            intervalId = setInterval(() => {
              fetchDeployment(false);
            }, 3000);
          }
        } else if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch (err) {
        console.error('Failed to fetch CI run details:', err);
        setError('CI Run record not found');
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    fetchDeployment(true);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id]);

  const handleRollback = async () => {
    if (window.confirm(`Re-trigger CI Build Pipeline for version ${deploymentData?.deployment?.version}?`)) {
      try {
        const res = await deploymentService.rollbackDeployment(id);
        alert(res.message);
        navigate('/deployments');
      } catch (err) {
        alert(err.response?.data?.message || 'Re-trigger failed');
      }
    }
  };

  const handleCopyLogs = () => {
    if (deploymentData?.build?.logs) {
      navigator.clipboard.writeText(deploymentData.build.logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm flex items-center justify-center space-x-3">
        <Loader2 size={18} className="animate-spin text-cyan-400" />
        <span>Loading CI build execution status and logs...</span>
      </div>
    );
  }

  if (error || !deploymentData?.deployment) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-200">{error || 'CI Run Not Found'}</h3>
        <Link to="/deployments" className="text-cyan-400 text-sm font-semibold hover:underline block">
          ← Back to CI Pipeline Runs
        </Link>
      </div>
    );
  }

  const { deployment, build } = deploymentData;
  const isRunning = deployment.status === 'QUEUED' || deployment.status === 'RUNNING';
  const isFailed = deployment.status === 'FAILED';

  // 5 Declarative CI Stages
  const ciStages = [
    { name: '1. Checkout Code' },
    { name: '2. Install Dependencies' },
    { name: '3. Run Unit Tests' },
    { name: '4. Build Docker Image' },
    { name: '5. Push to Docker Hub' },
  ];

  return (
    <div className="space-y-8">
      {/* Back Link & Top Header Bar */}
      <div className="space-y-4">
        <Link
          to="/deployments"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to CI Pipeline Runs</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-100 font-mono">
                Build #{deployment.buildNumber || 1}
              </h1>
              <span className="text-sm font-mono text-cyan-400 font-bold px-2.5 py-0.5 bg-slate-800 rounded border border-slate-700">
                {deployment.version}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono border flex items-center space-x-1.5 ${
                  deployment.status === 'SUCCESS'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : isRunning
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {isRunning && <Loader2 size={12} className="animate-spin" />}
                <span>{deployment.status}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Triggered via {deployment.triggerType} on branch{' '}
              <span className="text-slate-200 font-bold">{deployment.branch}</span> ({deployment.commitHash})
            </p>
          </div>

          <button
            onClick={handleRollback}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-2 shrink-0"
          >
            <RotateCcw size={15} />
            <span>Re-trigger Version CI Build</span>
          </button>
        </div>
      </div>

      {/* CI Pipeline Stages Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Jenkins CI Pipeline Stages
          </h2>
          {isRunning && (
            <span className="text-xs font-mono text-amber-400 flex items-center space-x-1.5">
              <Loader2 size={13} className="animate-spin" />
              <span>Live Syncing from Jenkins...</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ciStages.map((stage, idx) => {
            const isStagePassed = deployment.status === 'SUCCESS';
            const isStageFailed = isFailed && idx >= 2; // Failed at tests or later

            return (
              <div
                key={stage.name}
                className={`bg-slate-950/80 border rounded-xl p-3 text-center space-y-1.5 shadow-sm ${
                  isStagePassed
                    ? 'border-emerald-500/30'
                    : isRunning
                    ? 'border-amber-500/30'
                    : 'border-rose-500/30'
                }`}
              >
                <div className="inline-flex p-1.5 rounded-full">
                  {isStagePassed ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : isRunning ? (
                    <Loader2 size={16} className="text-amber-400 animate-spin" />
                  ) : (
                    <XCircle size={16} className="text-rose-400" />
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-200">{stage.name}</p>
                <span
                  className={`text-[10px] font-mono block ${
                    isStagePassed
                      ? 'text-emerald-400'
                      : isRunning
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {isStagePassed ? 'PASSED' : isRunning ? 'RUNNING' : 'FAILED'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Console Log Viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal size={16} className="text-cyan-400" />
            <span className="text-xs font-mono font-semibold text-slate-300">
              Jenkins Real Console Output Stream
            </span>
          </div>

          <button
            onClick={handleCopyLogs}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy Logs'}</span>
          </button>
        </div>

        <div className="p-6 font-mono text-xs leading-relaxed text-slate-300 bg-slate-950 max-h-[450px] overflow-y-auto space-y-1">
          {build?.logs ? (
            build.logs.split('\n').map((line, i) => (
              <div key={i} className="flex items-start space-x-4 hover:bg-slate-900/40 px-2 py-0.5 rounded">
                <span className="text-slate-600 select-none w-6 text-right shrink-0">{i + 1}</span>
                <span
                  className={
                    line.includes('SUCCESS') || line.includes('passed')
                      ? 'text-emerald-400 font-semibold'
                      : line.includes('Stage') || line.includes('Docker')
                      ? 'text-cyan-400'
                      : line.includes('Error') || line.includes('FAILED')
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }
                >
                  {line}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 italic">No console output logs recorded for this build run.</p>
          )}
        </div>
      </div>
    </div>
  );
}
