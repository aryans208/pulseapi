import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statusPagesApi, monitorsApi } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Alert } from '../components/common/Alert';
import { PlusIcon, TrashIcon, ExternalLinkIcon, ServerIcon, ServerIcon as GlobeIcon } from '../components/common/Icons';

export const StatusPages = () => {
  const [pages, setPages] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Modal Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMonitorIds, setSelectedMonitorIds] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [pagesRes, monitorsRes] = await Promise.all([
        statusPagesApi.getUserPages(),
        monitorsApi.getAll()
      ]);
      setPages(pagesRes.data.data.statusPages);
      setMonitors(monitorsRes.data.data.monitors);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to load status pages.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await statusPagesApi.create({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        is_public: true,
        monitor_ids: selectedMonitorIds
      });

      setAlert({ type: 'success', message: 'Public status page generated successfully.' });
      setIsModalOpen(false);
      setName('');
      setSlug('');
      setDescription('');
      setSelectedMonitorIds([]);
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to create status page.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Delete status page "${title}"?`)) {
      try {
        await statusPagesApi.delete(id);
        setAlert({ type: 'success', message: 'Status page deleted.' });
        fetchData();
      } catch (err) {
        setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to delete page.' });
      }
    }
  };

  const toggleMonitorSelection = (mId) => {
    setSelectedMonitorIds((prev) =>
      prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Public Status Pages</h1>
          <p className="text-xs text-slate-400 mt-1">
            Publish customer-facing status dashboards with real-time uptime indicators
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Status Page</span>
        </button>
      </div>

      {alert.message && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ type: '', message: '' })}
        />
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-xs font-medium">Loading status pages...</span>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <GlobeIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No status pages yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Build trust with your users by creating a branded public status page showcasing high service uptime.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pages.map((page) => (
            <div
              key={page.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Public
                  </span>
                  <button
                    onClick={() => handleDelete(page.id, page.name)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight">{page.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {page.description || 'No description provided.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Slug: <code className="text-indigo-300 font-mono">/{page.slug}</code></span>
                  <span>{page.monitor_count || 0} monitors</span>
                </div>
              </div>

              <div className="mt-6 pt-3">
                <Link
                  to={`/status/${page.slug}`}
                  target="_blank"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center justify-center gap-2 border border-slate-700/60"
                >
                  <span>Open Public Dashboard</span>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Status Page Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Branded Status Page"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-sm">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Page Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Cloud Status"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Public URL Slug</label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus-within:border-indigo-500 transition">
              <span className="text-slate-500 text-xs mr-1 font-mono">/status/</span>
              <input
                type="text"
                required
                placeholder="acme-status"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Only lowercase alphanumeric characters and hyphens.</p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Live service availability and scheduled maintenance updates."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2">Include Monitors</label>
            {monitors.length === 0 ? (
              <p className="text-xs text-slate-500">No monitors created yet.</p>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-2 border border-slate-800/80 rounded-xl p-3 bg-slate-950/50">
                {monitors.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonitorIds.includes(m.id)}
                      onChange={() => toggleMonitorSelection(m.id)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-900 w-4 h-4"
                    />
                    <div className="truncate">
                      <div className="font-semibold text-white">{m.name}</div>
                      <div className="font-mono text-slate-500 text-[10px] truncate">{m.url}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800/80 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              {formLoading ? 'Publishing...' : 'Publish Status Page'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
