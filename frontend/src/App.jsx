import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl">
                <h2 className="text-xl font-bold text-slate-100">Projects Management</h2>
                <p className="text-slate-400 text-sm mt-1">Project CRUD will be fully operational in Phase 3.</p>
              </div>
            } />
            <Route path="/deployments" element={
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl">
                <h2 className="text-xl font-bold text-slate-100">Deployments History</h2>
                <p className="text-slate-400 text-sm mt-1">Deployment pipelines tracking will be configured in Phase 4.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}
