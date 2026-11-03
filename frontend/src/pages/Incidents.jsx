import React, { useState, useEffect } from 'react';
import { incidentsApi } from '../api/client';
import { IncidentTable } from '../components/incidents/IncidentTable';
import { Alert } from '../components/common/Alert';
import { AlertTriangleIcon, RefreshIcon } from '../components/common/Icons';

export const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchIncidents = async () => {
    try {
      const res = await incidentsApi.getAll({ status: filter });
      setIncidents(res.data.data.incidents);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to load incidents.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [filter]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await incidentsApi.updateStatus(id, { status: newStatus });
      setAlert({ type: 'success', message: 'Incident resolved successfully.' });
      fetchIncidents();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to update incident.' });
    }
  };

  const activeCount = incidents.filter(i => i.status !== 'resolved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Incident Timeline</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated outage detection, downtime calculation, and recovery records
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>

      {alert.message && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ type: '', message: '' })}
        />
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'all', label: `All Events (${incidents.length})` },
          { id: 'active', label: `Active (${activeCount})` },
          { id: 'resolved', label: 'Resolved' }
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-xs font-medium">Loading incidents...</span>
        </div>
      ) : (
        <IncidentTable incidents={incidents} onUpdateStatus={handleUpdateStatus} />
      )}
    </div>
  );
};
