import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderGit2, Rocket, Settings, Activity } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderGit2 },
    { name: 'Deployments', path: '/deployments', icon: Rocket },
    { name: 'Health Status', path: '/health', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/30 flex flex-col justify-between py-6 px-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Core Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Jenkins & Docker Status Footnote */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Jenkins Engine</span>
          </span>
          <span className="font-mono text-[10px] text-emerald-400">READY</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Docker Engine</span>
          </span>
          <span className="font-mono text-[10px] text-emerald-400">ACTIVE</span>
        </div>
      </div>
    </aside>
  );
}
