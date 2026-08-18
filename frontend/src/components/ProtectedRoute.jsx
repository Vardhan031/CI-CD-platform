import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-mono text-slate-400">Verifying JWT Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-slate-900 border border-rose-500/30 rounded-2xl text-center space-y-4">
        <div className="inline-flex p-3 bg-rose-500/10 text-rose-400 rounded-full">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-100">403 - Access Denied</h2>
        <p className="text-sm text-slate-400">
          Your role (<span className="font-mono text-cyan-400">{user.role}</span>) does not have sufficient permissions to access this page.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
