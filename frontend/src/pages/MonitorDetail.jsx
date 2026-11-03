import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { monitorsApi } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { ResponseTimeChart } from '../components/monitors/ResponseTimeChart';
import { MonitorFormModal } from '../components/monitors/MonitorFormModal';
import { IncidentTable } from '../components/incidents/IncidentTable';
import { Alert } from '../components/common/Alert';
import {
  PulseIcon,
  RefreshIcon,
  PlayIcon,
  PauseIcon,
  EditIcon,
  TrashIcon,
  ExternalLinkIcon,
  ClockIcon,
  ChevronRightIcon
} from '../components/common/Icons';

export const MonitorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('checks'); // 'checks' | 'incidents'
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchDetail = async () => {
    try {
      const res = await monitorsApi.getById(id);
      setData(res.data.data);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to load monitor details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 15000); // 15s poll
    return () => clearInterval(interval);
  }, [id]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const res = await monitorsApi.checkNow(id);
      const isUp = res.data.data.check.isUp;
      setAlert({
        type: isUp ? 'success' : 'error',
        message: `Health check finished: ${isUp ? 'Endpoint Healthy (UP)' : 'Endpoint Failed (DOWN)'} in ${res.data.data.check.responseTimeMs}ms`
      });
      fetchDetail();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Check request failed.' });
    } finally {
      setChecking(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      await monitorsApi.togglePause(id);
      fetchDetail();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to update monitor.' });
    }
  };

  const handleUpdate = async (formData) => {
    await monitorsApi.update(id, formData);
    setAlert({ type: 'success', message: 'Monitor configuration updated.' });
    fetchDetail();
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${data?.monitor?.name}"?`)) {
      try {
        await monitorsApi.delete(id);
        navigate('/monitors');
      } catch (err) {
        setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to delete.' });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-xs font-medium">Loading telemetry analytics...</span>
      </div>
    );
  }

  if (!data?.monitor) {
    return (
      <div className="p-8 text-center text-slate-400">
        Monitor not found or deleted. <Link to="/monitors" className="text-indigo-400 underline">Return to Monitors</Link>
      </div>
    );
  }

  const { monitor, metrics, checks, recentChecksList, incidents } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/monitors" className="hover:text-white transition">Monitors</Link>
        <ChevronRightIcon className="w-3.5 h-3.5" />
        <span className="text-slate-200 font-medium truncate">{monitor.name}</span>
      </div>

      {alert.message && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ type: '', message: '' })}
        />
      )}

      {/* Main Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700/60 uppercase">
                {monitor.method}
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">{monitor.name}</h1>
              <StatusBadge status={monitor.status} />
            </div>

            <div className="flex items-center gap-2 mt-2 font-mono text-xs text-slate-400">
              <span>{monitor.url}</span>
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-indigo-400 transition"
              >
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400">
              <div>Interval: <span className="text-white font-medium">{monitor.check_interval} min</span></div>
              <div>•</div>
              <div>Expected HTTP: <span className="text-white font-medium">{monitor.expected_status}</span></div>
              <div>•</div>
              <div>Timeout: <span className="text-white font-medium">{monitor.timeout_ms}ms</span></div>
              <div>•</div>
              <div>
                Last ping:{' '}
                <span className="text-white font-medium">
                  {monitor.last_checked_at ? new Date(monitor.last_checked_at).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleManualCheck}
              disabled={checking}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : 'Check Now'}</span>
            </button>

            <button
              onClick={handleTogglePause}
              className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-200 transition flex items-center gap-1.5"
            >
              {monitor.is_active ? (
                <>
                  <PauseIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resume</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2 rounded-xl border border-slate-800 bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition"
              title="Edit Configuration"
            >
              <EditIcon className="w-4 h-4" />
            </button>

            <button
              onClick={handleDelete}
              className="p-2 rounded-xl border border-slate-800 bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
              title="Delete Monitor"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Uptime Windows Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="24-Hour Availability"
          value={`${metrics?.uptime24h || 100}%`}
          subtitle="Rolling 24 hours uptime"
          icon={PulseIcon}
          trend={metrics?.uptime24h >= 99 ? 'Nominal' : 'Outages'}
          trendColor={metrics?.uptime24h >= 99 ? 'emerald' : 'rose'}
        />
        <StatCard
          title="7-Day Availability"
          value={`${metrics?.uptime7d || 100}%`}
          subtitle="Rolling 7 days uptime"
          icon={ClockIcon}
        />
        <StatCard
          title="30-Day Availability"
          value={`${metrics?.uptime30d || 100}%`}
          subtitle="Rolling 30 days uptime"
          icon={ClockIcon}
        />
      </div>

      {/* Latency History Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Response Time Telemetry</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latency track (ms) for the last 50 health ping checks</p>
          </div>
          <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            {checks.length} Data Points
          </span>
        </div>
        <ResponseTimeChart data={checks} height={280} />
      </div>

      {/* Tabs: Check History & Incidents */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('checks')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'checks'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Check History ({recentChecksList?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'incidents'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Incidents & Outages ({incidents?.length || 0})
          </button>
        </div>

        {activeTab === 'checks' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Status Code</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Error / Response Message</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {recentChecksList?.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 sm:px-6">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        c.is_up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {c.status_code || 'ERR'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {c.response_time_ms} ms
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold">
                      <span className={c.is_up ? 'text-emerald-400' : 'text-rose-400'}>
                        {c.is_up ? 'SUCCESS' : 'FAILURE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans max-w-xs truncate">
                      {c.error_message || 'OK'}
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-right text-slate-500 whitespace-nowrap">
                      {new Date(c.checked_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'incidents' && (
          <IncidentTable incidents={incidents} />
        )}
      </div>

      <MonitorFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
        initialData={monitor}
        title="Edit Monitor Settings"
      />
    </div>
  );
};
