import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
                <h2 className="text-xl font-bold text-slate-100">Projects Management</h2>
                <p className="text-slate-400 text-sm">Register GitHub repositories, configure Dockerfiles, and manage deployments.</p>
              </div>
            } />
            <Route path="/deployments" element={
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
                <h2 className="text-xl font-bold text-slate-100">Deployments History</h2>
                <p className="text-slate-400 text-sm">Track real-time build logs, versioning, and status.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<AuthenticatedLayout />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
