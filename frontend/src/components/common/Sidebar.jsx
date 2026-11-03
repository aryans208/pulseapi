import React from 'react';
import { NavLink } from 'react-router-dom';
import { PulseIcon, ServerIcon, AlertTriangleIcon, ServerIcon as GlobeIcon } from './Icons';

export const Sidebar = () => {
  const navItems = [
    { label: 'Overview', to: '/', icon: PulseIcon },
    { label: 'Monitors', to: '/monitors', icon: ServerIcon },
    { label: 'Incidents', to: '/incidents', icon: AlertTriangleIcon },
    { label: 'Status Pages', to: '/status-pages', icon: GlobeIcon },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <PulseIcon className="w-5 h-5" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
            Pulse<span className="text-indigo-400">API</span>
          </span>
          <span className="block text-[10px] text-slate-500 font-medium tracking-wide uppercase">
            Ops & Incident Center
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="p-4 flex-1 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Core Monitoring
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Info Widget */}
      <div className="p-4 m-4 rounded-xl bg-slate-800/40 border border-slate-800/80 text-xs">
        <div className="font-semibold text-slate-300">SSRF Guard Active</div>
        <div className="text-slate-500 mt-0.5 leading-relaxed">
          Localhost and private cloud IP ranges blocked.
        </div>
      </div>
    </aside>
  );
};
