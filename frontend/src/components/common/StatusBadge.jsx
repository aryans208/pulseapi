import React from 'react';

export const StatusBadge = ({ status, size = "md" }) => {
  const norm = (status || '').toLowerCase();

  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  let dot = 'bg-slate-400';
  let label = status || 'Unknown';

  if (norm === 'up' || norm === 'operational' || norm === 'resolved') {
    bg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    dot = 'bg-emerald-400 animate-pulse';
    label = norm === 'up' ? 'Online' : norm === 'operational' ? 'Operational' : 'Resolved';
  } else if (norm === 'down' || norm === 'major_outage') {
    bg = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    dot = 'bg-rose-500 animate-ping';
    label = norm === 'down' ? 'Down' : 'Major Outage';
  } else if (norm === 'paused') {
    bg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    dot = 'bg-amber-400';
    label = 'Paused';
  } else if (norm === 'pending') {
    bg = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    dot = 'bg-sky-400 animate-bounce';
    label = 'Pending Check';
  } else if (norm === 'investigating' || norm === 'identified' || norm === 'monitoring' || norm === 'partial_outage') {
    bg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    dot = 'bg-amber-400 animate-pulse';
    label = norm === 'partial_outage' ? 'Partial Outage' : norm.charAt(0).toUpperCase() + norm.slice(1);
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  );
};
