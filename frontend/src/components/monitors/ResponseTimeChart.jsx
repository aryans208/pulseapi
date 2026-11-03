import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1">
        <div className="text-slate-400 font-medium">
          {new Date(data.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-300">Latency:</span>
          <span className="font-bold text-indigo-400">{data.response_time_ms} ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Status:</span>
          <span className={`font-semibold ${data.is_up ? 'text-emerald-400' : 'text-rose-400'}`}>
            {data.status_code || 'Error'} ({data.is_up ? 'UP' : 'DOWN'})
          </span>
        </div>
        {data.error_message && (
          <div className="text-rose-400 text-[11px] max-w-xs break-words">
            {data.error_message}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const ResponseTimeChart = ({ data = [], height = 260 }) => {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center rounded-xl bg-slate-950/40 border border-slate-800/80 text-slate-500 text-sm"
        style={{ height }}
      >
        No latency data recorded yet.
      </div>
    );
  }

  // Format timestamp for X-Axis display
  const chartData = data.map((d) => ({
    ...d,
    formattedTime: new Date(d.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="formattedTime"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            unit="ms"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="response_time_ms"
            stroke="#818cf8"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#latencyGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
