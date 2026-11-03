import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Alert } from '../common/Alert';

export const MonitorFormModal = ({ isOpen, onClose, onSubmit, initialData = null, title = 'Add New API Monitor' }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [checkInterval, setCheckInterval] = useState(1);
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setUrl(initialData.url || '');
      setMethod(initialData.method || 'GET');
      setCheckInterval(initialData.check_interval || 1);
      setExpectedStatus(initialData.expected_status || 200);
      setTimeoutMs(initialData.timeout_ms || 5000);
    } else {
      setName('');
      setUrl('');
      setMethod('GET');
      setCheckInterval(1);
      setExpectedStatus(200);
      setTimeoutMs(5000);
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Monitor name is required.');
      return;
    }
    if (!url.trim()) {
      setError('Target URL is required.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        url: url.trim(),
        method,
        check_interval: Number(checkInterval),
        expected_status: Number(expectedStatus),
        timeout_ms: Number(timeoutMs)
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save monitor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block font-medium text-slate-300 mb-1.5">Monitor Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Production Authentication API"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-medium text-slate-300">Target Endpoint URL</label>
            <span className="text-[11px] text-slate-500">SSRF Guard Protected</span>
          </div>
          <input
            type="url"
            required
            placeholder="https://api.yourdomain.com/health"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Internal network addresses (localhost, 127.0.0.1, 10.x, 192.168.x, 169.254.x) are automatically blocked.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-300 mb-1.5">HTTP Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="HEAD">HEAD</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Check Interval</label>
            <select
              value={checkInterval}
              onChange={(e) => setCheckInterval(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value={1}>Every 1 minute</option>
              <option value={2}>Every 2 minutes</option>
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Expected HTTP Status</label>
            <input
              type="number"
              min="100"
              max="599"
              value={expectedStatus}
              onChange={(e) => setExpectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Timeout Limit (ms)</label>
            <input
              type="number"
              min="500"
              max="30000"
              step="500"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800/80 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Validating & Saving...</span>
              </>
            ) : (
              <span>{initialData ? 'Update Monitor' : 'Create Monitor'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
