import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { ClockIcon, AlertTriangleIcon } from '../common/Icons';

export const IncidentTable = ({ incidents, onUpdateStatus }) => {
  const formatDuration = (seconds, isResolved) => {
    if (!isResolved || seconds == null) return 'Ongoing';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (!incidents || incidents.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
          <ClockIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">No incidents detected</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          All endpoints are performing reliably with zero active or recent downtime events.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <tr>
            <th className="py-3.5 px-4 sm:px-6">Status</th>
            <th className="py-3.5 px-4">Monitor / Endpoint</th>
            <th className="py-3.5 px-4">Root Cause / Error</th>
            <th className="py-3.5 px-4">Started At</th>
            <th className="py-3.5 px-4">Duration</th>
            {onUpdateStatus && <th className="py-3.5 px-4 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {incidents.map((incident) => {
            const isResolved = incident.status === 'resolved';
            return (
              <tr key={incident.id} className="hover:bg-slate-800/30 transition">
                <td className="py-4 px-4 sm:px-6">
                  <StatusBadge status={incident.status} />
                </td>
                <td className="py-4 px-4 font-semibold text-white">
                  {incident.monitor_name || `Monitor #${incident.monitor_id}`}
                </td>
                <td className="py-4 px-4 text-xs text-rose-300 font-mono max-w-xs sm:max-w-md truncate">
                  {incident.cause}
                </td>
                <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                  {new Date(incident.started_at).toLocaleString()}
                </td>
                <td className="py-4 px-4 text-xs font-medium">
                  <span className={isResolved ? 'text-slate-300' : 'text-rose-400 font-bold animate-pulse'}>
                    {formatDuration(incident.duration_seconds, isResolved)}
                  </span>
                </td>
                {onUpdateStatus && (
                  <td className="py-4 px-4 text-right">
                    {!isResolved && (
                      <button
                        onClick={() => onUpdateStatus(incident.id, 'resolved')}
                        className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30 transition"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
