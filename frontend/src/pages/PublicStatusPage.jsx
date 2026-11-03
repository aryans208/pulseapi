import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { statusPagesApi } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { CheckCircleIcon, AlertTriangleIcon, PulseIcon, ClockIcon } from '../components/common/Icons';

export const PublicStatusPage = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatusPage = async () => {
    try {
      const res = await statusPagesApi.getPublic(slug);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load public status page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusPage();
    const interval = setInterval(fetchStatusPage, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Querying system availability...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 mb-4">
          <AlertTriangleIcon className="w-8 h-8 text-rose-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Status Page Unavailable</h1>
        <p className="text-slate-400 text-sm mt-2 max-w-md">{error}</p>
        <Link
          to="/login"
          className="mt-6 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
        >
          PulseAPI Portal
        </Link>
      </div>
    );
  }

  const { statusPage, systemStatus, monitors, recentIncidents } = data;
  const isOperational = systemStatus === 'operational';
  const isMajor = systemStatus === 'major_outage';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <PulseIcon className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                PulseAPI Live Status
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{statusPage.name}</h1>
            {statusPage.description && (
              <p className="text-sm text-slate-400 mt-1">{statusPage.description}</p>
            )}
          </div>
          <div className="text-xs text-slate-500 font-mono sm:text-right">
            Last evaluated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Global Operational State Banner */}
        <div
          className={`p-6 rounded-3xl border flex items-center gap-4 transition-all shadow-xl ${
            isOperational
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : isMajor
              ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}
        >
          <div
            className={`p-3 rounded-2xl ${
              isOperational
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : isMajor
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isOperational ? (
              <CheckCircleIcon className="w-7 h-7" />
            ) : (
              <AlertTriangleIcon className="w-7 h-7" />
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isOperational
                ? 'All Core Systems Operational'
                : isMajor
                ? 'Major Service Disruption Detected'
                : 'Partial Service Degradation'}
            </h2>
            <p className="text-xs opacity-90 mt-0.5">
              {isOperational
                ? 'Every monitored API endpoint and backend service is functioning smoothly within normal thresholds.'
                : 'Engineering teams are currently responding to active endpoint downtime events.'}
            </p>
          </div>
        </div>

        {/* Monitored Services List */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Monitored Services & Microservices</h3>
            <span className="text-xs text-slate-500">{monitors.length} Services Tracked</span>
          </div>

          {monitors.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No services currently published to this status page.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {monitors.map((m) => (
                <div key={m.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 uppercase">
                      {m.method}
                    </span>
                    <span className="font-semibold text-white text-sm">{m.name}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right">
                      <div className="font-mono text-xs font-semibold text-slate-300">
                        {m.uptime_percentage ? `${Number(m.uptime_percentage).toFixed(1)}%` : '100%'}
                      </div>
                      <div className="text-[10px] text-slate-500">24h Uptime</div>
                    </div>
                    <StatusBadge status={m.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incident History & Maintenance */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Recent Incident Log (Past 7 Days)</h3>

          {recentIncidents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
              Zero downtime incidents recorded in the last 7 days.
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{inc.monitor_name}</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">
                        {new Date(inc.started_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <StatusBadge status={inc.status} size="sm" />
                  </div>

                  <div className="text-xs text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    {inc.cause}
                  </div>

                  {inc.resolved_at && (
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>
                        Resolved in {Math.round((inc.duration_seconds || 0) / 60)} minutes (
                        {new Date(inc.resolved_at).toLocaleTimeString()})
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <span>Protected & Powered by</span>
          <Link to="/" className="font-semibold text-indigo-400 hover:text-indigo-300 transition">
            PulseAPI
          </Link>
          <span>— Real-time System Telemetry</span>
        </div>
      </footer>
    </div>
  );
};
