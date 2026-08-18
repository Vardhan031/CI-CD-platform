import React from 'react';
import { Terminal, Shield, Bell, User } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand / Logo */}
      <div className="flex items-center space-x-3">
        <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg text-white shadow-lg shadow-cyan-500/20">
          <Terminal size={22} className="stroke-[2.5]" />
        </div>
        <div>
          <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            AutoOps
          </span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
            CI/CD v1.0
          </span>
        </div>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center space-x-4">
        {/* Environment Status Pill */}
        <div className="flex items-center space-x-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Healthy</span>
        </div>

        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
          <Bell size={18} />
        </button>

        {/* User Pill Placeholder */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-sm">
            D
          </div>
          <div className="hidden sm:block text-left text-xs">
            <p className="font-semibold text-slate-200">DevOps Engineer</p>
            <p className="text-slate-400 font-mono text-[10px]">ADMIN</p>
          </div>
        </div>
      </div>
    </header>
  );
}
