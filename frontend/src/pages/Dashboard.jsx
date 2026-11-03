import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, monitorsApi } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { ResponseTimeChart } from '../components/monitors/ResponseTimeChart';
import { MonitorFormModal } from '../components/monitors/MonitorFormModal';
import {
  ServerIcon,
  PulseIcon,
  ClockIcon,
  AlertTriangleIcon,
  PlusIcon,
  RefreshIcon,
  ExternalLinkIcon
} from '../components/common/Icons';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await dashboardApi.getSummary();
      setData(res.data.data);
    } catch (err) {
      console.error('[Dashboard Error]:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh summary every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateMonitor = async (formData) => {
    await monitorsApi.create(formData);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading monitoring telemetry...</span>
      </div>
    );
  }

  const { stats, recentIncidents, recentChecks, monitorsOverview } = data || {
    stats: {},
    recentIncidents: [],
    recentChecks: [],
    monitorsOverview: []
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time health, response latencies, and availability metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 text-xs font-semibold text-slate-300 transition flex items-center gap-2"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>New Monitor</span>
          </button>
        </div>
      </div>

      {/* Active Incidents Alert Banner */}
      {stats.activeIncidents > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangleIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-semibold text-rose-200 text-sm">
                Active Outage Detected ({stats.activeIncidents} ongoing {stats.activeIncidents === 1 ? 'incident' : 'incidents'})
              </div>
              <div className="text-xs text-rose-300/80 mt-0.5">
                One or more endpoints are currently failing scheduled health checks.
              </div>
            </div>
          </div>
          <Link
            to="/incidents"
            className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition shrink-0"
          >
            View Incidents →
          </Link>
        </div>
      )}

      {/* 4 Primary Telemetry Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Endpoints"
          value={stats.totalMonitors || 0}
          subtitle={`${stats.onlineMonitors || 0} online • ${stats.offlineMonitors || 0} offline`}
          icon={ServerIcon}
        />
        <StatCard
          title="Average Uptime (24h)"
          value={`${stats.overallUptime || 100}%`}
          subtitle="Across all active endpoints"
          icon={PulseIcon}
          trend={stats.overallUptime >= 99 ? 'Stable' : 'Degraded'}
          trendColor={stats.overallUptime >= 99 ? 'emerald' : 'rose'}
        />
        <StatCard
          title="Avg Latency (24h)"
          value={`${stats.avgResponseTime || 0} ms`}
          subtitle="Mean ping response time"
          icon={ClockIcon}
        />
        <StatCard
          title="Active Incidents"
          value={stats.activeIncidents || 0}
          subtitle={stats.activeIncidents === 0 ? 'All services nominal' : 'Action required'}
          icon={AlertTriangleIcon}
          trendColor={stats.activeIncidents === 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Latency Trend Area Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Global Latency Performance</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live response times (ms) across recent health check intervals
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-indigo-400 border border-slate-700/60">
            Real-time Feed
          </span>
        </div>
        <ResponseTimeChart data={recentChecks} height={240} />
      </div>

      {/* Two Column Layout: Quick Monitors + Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Top Monitors (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Monitors Status</h2>
            <Link
              to="/monitors"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
            >
              <span>Manage all ({stats.totalMonitors || 0})</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {monitorsOverview.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No monitors yet. Add your first API monitor to begin telemetry.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {monitorsOverview.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 truncate">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 uppercase">
                      {m.method}
                    </span>
                    <div className="truncate">
                      <Link
                        to={`/monitors/${m.id}`}
                        className="font-medium text-white hover:text-indigo-400 text-sm transition"
                      >
                        {m.name}
                      </Link>
                      <div className="text-xs text-slate-500 font-mono truncate">{m.url}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="font-mono text-xs text-slate-300">
                        {m.last_latency ? `${m.last_latency}ms` : '—'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {m.uptime_percentage ? `${Number(m.uptime_percentage).toFixed(1)}%` : '100%'}
                      </div>
                    </div>
                    <StatusBadge status={m.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Incidents Log (1 col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Incidents</h2>
            <Link
              to="/incidents"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              History →
            </Link>
          </div>

          {recentIncidents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Zero incidents recorded. All endpoints operational.
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white text-xs truncate">
                      {incident.monitor_name}
                    </span>
                    <StatusBadge status={incident.status} size="sm" />
                  </div>
                  <div className="text-[11px] text-rose-300 font-mono line-clamp-2">
                    {incident.cause}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Started: {new Date(incident.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MonitorFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateMonitor}
      />
    </div>
  );
};
