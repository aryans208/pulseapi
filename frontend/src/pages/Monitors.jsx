import React, { useState, useEffect } from 'react';
import { monitorsApi } from '../api/client';
import { MonitorTable } from '../components/monitors/MonitorTable';
import { MonitorFormModal } from '../components/monitors/MonitorFormModal';
import { Alert } from '../components/common/Alert';
import { PlusIcon, SearchIcon, RefreshIcon } from '../components/common/Icons';

export const Monitors = () => {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchMonitors = async () => {
    try {
      const res = await monitorsApi.getAll();
      setMonitors(res.data.data.monitors);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to load monitors.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 20000); // 20s poll
    return () => clearInterval(interval);
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    if (editingMonitor) {
      await monitorsApi.update(editingMonitor.id, formData);
      setAlert({ type: 'success', message: 'Monitor updated successfully.' });
    } else {
      await monitorsApi.create(formData);
      setAlert({ type: 'success', message: 'Monitor created and ping queued.' });
    }
    setEditingMonitor(null);
    fetchMonitors();
  };

  const handleTogglePause = async (id) => {
    try {
      await monitorsApi.togglePause(id);
      fetchMonitors();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to toggle monitor.' });
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete monitor "${name}"? All historical check logs will be removed.`)) {
      try {
        await monitorsApi.delete(id);
        setAlert({ type: 'success', message: 'Monitor deleted successfully.' });
        fetchMonitors();
      } catch (err) {
        setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to delete monitor.' });
      }
    }
  };

  const handleCheckNow = async (id) => {
    try {
      const res = await monitorsApi.checkNow(id);
      const isUp = res.data.data.check.isUp;
      setAlert({
        type: isUp ? 'success' : 'error',
        message: `Health check finished: ${isUp ? 'Endpoint UP (Healthy)' : 'Endpoint DOWN (Failed)'} (${res.data.data.check.responseTimeMs}ms)`
      });
      fetchMonitors();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Manual check request failed.' });
    }
  };

  const filteredMonitors = monitors.filter((m) => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">API Monitors</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure uptime targets, health check frequencies, and HTTP expectations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMonitors}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditingMonitor(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Monitor</span>
          </button>
        </div>
      </div>

      {alert.message && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ type: '', message: '' })}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'up', label: 'Online' },
            { id: 'down', label: 'Offline' },
            { id: 'paused', label: 'Paused' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-xs font-medium">Loading monitors...</span>
        </div>
      ) : (
        <MonitorTable
          monitors={filteredMonitors}
          onTogglePause={handleTogglePause}
          onDelete={handleDelete}
          onEdit={(m) => {
            setEditingMonitor(m);
            setIsModalOpen(true);
          }}
          onCheckNow={handleCheckNow}
        />
      )}

      {/* Create / Edit Modal */}
      <MonitorFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMonitor(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingMonitor}
        title={editingMonitor ? 'Edit API Monitor' : 'Create New API Monitor'}
      />
    </div>
  );
};
