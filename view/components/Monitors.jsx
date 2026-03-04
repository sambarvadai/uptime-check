import React, { useEffect, useState } from 'react';
import { getMonitors, createMonitor, updateMonitor, deleteMonitor } from '../services/api';
import MonitorForm from './MonitorForm';

const METHOD_STYLE = {
  GET:     { color: '#60a5fa', background: 'rgba(59,130,246,0.12)',  borderColor: 'rgba(59,130,246,0.25)' },
  POST:    { color: '#4ade80', background: 'rgba(34,197,94,0.12)',   borderColor: 'rgba(34,197,94,0.25)' },
  PUT:     { color: '#fbbf24', background: 'rgba(245,158,11,0.12)',  borderColor: 'rgba(245,158,11,0.25)' },
  PATCH:   { color: '#c084fc', background: 'rgba(168,85,247,0.12)',  borderColor: 'rgba(168,85,247,0.25)' },
  DELETE:  { color: '#f87171', background: 'rgba(239,68,68,0.12)',   borderColor: 'rgba(239,68,68,0.25)' },
  HEAD:    { color: '#9ca3af', background: 'rgba(107,114,128,0.12)', borderColor: 'rgba(107,114,128,0.25)' },
  OPTIONS: { color: '#22d3ee', background: 'rgba(6,182,212,0.12)',   borderColor: 'rgba(6,182,212,0.25)' },
};

function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 5)     return 'just now';
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function rtClass(ms) {
  if (!ms) return '';
  if (ms < 300)  return 'fast';
  if (ms < 1000) return 'medium';
  return 'slow';
}

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export default function Monitors({ onLogout }) {
  const [monitors, setMonitors]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [editing, setEditing]     = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [now, setNow]             = useState(Date.now());

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMonitors();
      setMonitors(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load monitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleCreate = async (payload) => {
    setError('');
    try {
      await createMonitor(payload);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(formatError(err));
    }
  };

  const handleUpdate = async (id, payload) => {
    setError('');
    try {
      await updateMonitor(id, payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(formatError(err));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this monitor?')) return;
    setError('');
    try {
      await deleteMonitor(id);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to delete monitor');
    }
  };

  // Stats
  const upCount      = monitors.filter(m => m.last_up === true).length;
  const downCount    = monitors.filter(m => m.last_up === false).length;
  const unknownCount = monitors.filter(m => m.last_up == null).length;

  return (
    <>
      {/* Nav */}
      <nav className="app-nav">
        <div className="nav-brand">
          <div className="nav-icon"><ActivityIcon /></div>
          Uptime Check
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { localStorage.removeItem('token'); onLogout(); }}>
          Sign out
        </button>
      </nav>

      <div className="dashboard">

        {/* Stats row */}
        {monitors.length > 0 && (
          <div className="stats-row">
            <div className="stat-chip">
              <span className="stat-dot" />
              {monitors.length} total
            </div>
            {upCount > 0 && (
              <div className="stat-chip up">
                <span className="stat-dot pulse" />
                {upCount} up
              </div>
            )}
            {downCount > 0 && (
              <div className="stat-chip down">
                <span className="stat-dot" />
                {downCount} down
              </div>
            )}
            {unknownCount > 0 && (
              <div className="stat-chip">
                <span className="stat-dot" />
                {unknownCount} pending
              </div>
            )}
          </div>
        )}

        {error && <div className="global-err">{error}</div>}

        {/* Add Monitor */}
        <div className="section-hd">
          <span className="section-title">Monitors</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setShowForm(v => !v); setEditing(null); }}
          >
            {showForm ? '✕ Cancel' : '+ Add Monitor'}
          </button>
        </div>

        {showForm && (
          <div className="form-panel">
            <p className="form-panel-title">New Monitor</p>
            <MonitorForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Monitor list */}
        {loading && monitors.length === 0 ? (
          <div className="loading-state">Loading monitors…</div>
        ) : monitors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <h3>No monitors yet</h3>
            <p>Add a monitor to start tracking your services.</p>
          </div>
        ) : (
          <ul className="monitor-list">
            {monitors.map((m) => {
              const ms   = METHOD_STYLE[m.method || 'GET'] || METHOD_STYLE.GET;
              const statusClass = m.last_up === true ? 'is-up' : m.last_up === false ? 'is-down' : '';
              const dotClass    = m.last_up === true ? 'up'    : m.last_up === false ? 'down'    : '';
              const badgeClass  = m.last_up === true ? 'up'    : m.last_up === false ? 'down'    : 'unknown';

              const nextIn = m.last_ping_at
                ? Math.max(0, Math.ceil(
                    (new Date(m.last_ping_at).getTime() + (m.interval || 0) * 1000 - now) / 1000
                  ))
                : null;

              return (
                <li key={m.id} className={`monitor-card ${statusClass}`}>
                  {editing === m.id ? (
                    <div style={{width:'100%'}}>
                      <div className="form-panel-title" style={{marginBottom:14}}>Edit Monitor</div>
                      <MonitorForm
                        initial={m}
                        onSubmit={(payload) => handleUpdate(m.id, payload)}
                        onCancel={() => setEditing(null)}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="monitor-body">
                        <div className="monitor-title-row">
                          <span className={`status-dot ${dotClass}`} />
                          <span
                            className="method-tag"
                            style={{ color: ms.color, background: ms.background, borderColor: ms.borderColor }}
                          >
                            {m.method || 'GET'}
                          </span>
                          <span className="monitor-name">{m.name || m.url}</span>
                        </div>

                        {m.name && (
                          <div className="monitor-url">{m.url}</div>
                        )}

                        <div className="monitor-meta">
                          <div className="meta-item">
                            Every <span className="meta-value">{m.interval}s</span>
                          </div>
                          <div className="meta-item">
                            Codes: <span className="meta-value">{(m.status_codes || m.statusCodes || []).join(', ')}</span>
                          </div>
                          {m.last_response_time != null && (
                            <div className="meta-item">
                              <span className={`meta-value ${rtClass(m.last_response_time)}`}>
                                {m.last_response_time}ms
                              </span>
                            </div>
                          )}
                          <div className="meta-item">
                            Next: <span className="meta-value">
                              {nextIn !== null ? `${nextIn}s` : 'scheduled'}
                            </span>
                          </div>
                          <div className="meta-item">
                            Last: <span className="meta-value">{timeAgo(m.last_ping_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="monitor-side">
                        <span className={`status-badge ${badgeClass}`}>
                          {m.last_up === true
                            ? `↑ UP${m.last_status_code ? ` ${m.last_status_code}` : ''}`
                            : m.last_up === false
                              ? `↓ DOWN${m.last_status_code ? ` ${m.last_status_code}` : ''}`
                              : '? Pending'}
                        </span>
                        <div className="action-row">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setEditing(m.id); setShowForm(false); }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(m.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function formatError(err) {
  if (err?.response?.data?.errors) {
    return err.response.data.errors.map((e) => e.msg).join('; ');
  }
  return err?.response?.data?.error || 'Request failed';
}
