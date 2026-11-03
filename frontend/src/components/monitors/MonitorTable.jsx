import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../common/StatusBadge';
import { PlayIcon, PauseIcon, TrashIcon, EditIcon, RefreshIcon, ExternalLinkIcon } from '../common/Icons';

export const MonitorTable = ({ monitors, onTogglePause, onDelete, onEdit, onCheckNow }) => {
  const [checkingIds, setCheckingIds] = useState(new Set());

  const handleManualCheck = async (id) => {
    setCheckingIds(prev => new Set(prev).add(id));
    try {
      await onCheckNow(id);
    } finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (!monitors || monitors.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <ExternalLinkIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">No monitors found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          Get started by adding your first endpoint monitor to track uptime and receive alerts on downtime.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <tr>
            <th className="py-3.5 px-4 sm:px-6">Endpoint</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4">Uptime (24h)</th>
            <th className="py-3.5 px-4">Interval</th>
            <th className="py-3.5 px-4">Last Check</th>
            <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {monitors.map((m) => {
            const isChecking = checkingIds.has(m.id);
            return (
              <tr key={m.id} className="hover:bg-slate-800/30 transition group">
                <td className="py-4 px-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700/60 uppercase">
                      {m.method}
                    </span>
                    <div>
                      <Link
                        to={`/monitors/${m.id}`}
                        className="font-semibold text-white hover:text-indigo-400 transition"
                      >
                        {m.name}
                      </Link>
                      <div className="font-mono text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                        {m.url}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <StatusBadge status={m.status} />
                </td>
                <td className="py-4 px-4 font-mono font-medium text-slate-200">
                  {m.uptime_percentage != null ? `${Number(m.uptime_percentage).toFixed(1)}%` : '100%'}
                </td>
                <td className="py-4 px-4 text-slate-400">
                  {m.check_interval}m
                </td>
                <td className="py-4 px-4 text-xs text-slate-400">
                  {m.last_checked_at ? (
                    <div>
                      <div>{new Date(m.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      {m.last_latency != null && (
                        <div className="font-mono text-indigo-400 text-[11px]">{m.last_latency}ms</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-600">Pending</span>
                  )}
                </td>
                <td className="py-4 px-4 sm:px-6 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Check Now */}
                    <button
                      onClick={() => handleManualCheck(m.id)}
                      disabled={isChecking}
                      title="Trigger Immediate Health Check"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      <RefreshIcon className={`w-4 h-4 ${isChecking ? 'animate-spin text-indigo-400' : ''}`} />
                    </button>

                    {/* Pause / Resume */}
                    <button
                      onClick={() => onTogglePause(m.id)}
                      title={m.is_active ? 'Pause Monitor' : 'Resume Monitor'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                    >
                      {m.is_active ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4 text-emerald-400" />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => onEdit(m)}
                      title="Edit Monitor"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(m.id, m.name)}
                      title="Delete Monitor"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
