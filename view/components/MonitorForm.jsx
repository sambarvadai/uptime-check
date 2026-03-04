import React, { useState, useEffect } from 'react';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

const METHOD_STYLE = {
  GET:     { color: '#60a5fa', background: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)' },
  POST:    { color: '#4ade80', background: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)' },
  PUT:     { color: '#fbbf24', background: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
  PATCH:   { color: '#c084fc', background: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.25)' },
  DELETE:  { color: '#f87171', background: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)' },
  HEAD:    { color: '#9ca3af', background: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.25)' },
  OPTIONS: { color: '#22d3ee', background: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.25)' },
};

export default function MonitorForm({ onSubmit, onCancel, initial }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [interval, setInterval] = useState(60);
  const [statusCodes, setStatusCodes] = useState('200');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [headersError, setHeadersError] = useState('');

  const needsBody = ['POST', 'PUT', 'PATCH'].includes(method);
  const ms = METHOD_STYLE[method] || METHOD_STYLE.GET;

  useEffect(() => {
    if (initial) {
      setUrl(initial.url || '');
      setName(initial.name || '');
      setMethod(initial.method || 'GET');
      setInterval(initial.interval || 60);
      setStatusCodes((initial.status_codes || initial.statusCodes || [200]).join(', '));
      setHeaders(
        initial.headers && Object.keys(initial.headers).length
          ? JSON.stringify(initial.headers, null, 2)
          : ''
      );
      setBody(initial.body || '');
    }
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setHeadersError('');

    // Auto-prepend https:// if user forgot the protocol
    const normalizedUrl = url.trim() && !url.trim().match(/^https?:\/\//)
      ? 'https://' + url.trim()
      : url.trim();

    const codes = statusCodes
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));

    let parsedHeaders = {};
    if (headers.trim()) {
      try {
        parsedHeaders = JSON.parse(headers);
        if (typeof parsedHeaders !== 'object' || Array.isArray(parsedHeaders)) {
          setHeadersError('Headers must be a JSON object, e.g. {"Authorization": "Bearer token"}');
          return;
        }
      } catch {
        setHeadersError('Headers must be valid JSON');
        return;
      }
    }

    onSubmit({
      url: normalizedUrl,
      name,
      method,
      interval: Number(interval),
      statusCodes: codes.length ? codes : [200],
      headers: parsedHeaders,
      body: needsBody && body.trim() ? body : null,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">

        {/* URL — full width */}
        <div className="form-field full">
          <label className="form-label">Endpoint URL</label>
          <input
            className="form-input"
            required
            placeholder="https://api.example.com/health"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {/* Name */}
        <div className="form-field full">
          <label className="form-label">Display Name <span style={{color:'var(--text-3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>(optional)</span></label>
          <input
            className="form-input"
            placeholder="e.g. Production API"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Method */}
        <div className="form-field">
          <label className="form-label">Method</label>
          <select
            className="form-select"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{ color: ms.color }}
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Interval */}
        <div className="form-field">
          <label className="form-label">Check Interval (seconds)</label>
          <input
            className="form-input"
            type="number"
            min="10"
            max="86400"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          />
        </div>

        {/* Status codes */}
        <div className="form-field full">
          <label className="form-label">Expected Status Codes <span style={{color:'var(--text-3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>(comma-separated)</span></label>
          <input
            className="form-input"
            placeholder="200, 201, 204"
            value={statusCodes}
            onChange={(e) => setStatusCodes(e.target.value)}
          />
        </div>

        {/* Headers */}
        <div className="form-field full">
          <label className="form-label">Request Headers <span style={{color:'var(--text-3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>(JSON, optional)</span></label>
          <textarea
            className="form-textarea"
            placeholder={'{\n  "Authorization": "Bearer your-token",\n  "Accept": "application/json"\n}'}
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
            rows={3}
          />
          {headersError && <span className="form-err">{headersError}</span>}
        </div>

        {/* Body — only for POST/PUT/PATCH */}
        {needsBody && (
          <div className="form-field full">
            <label className="form-label">Request Body <span style={{color:'var(--text-3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>(optional)</span></label>
            <textarea
              className="form-textarea"
              placeholder='{"key": "value"}'
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
          </div>
        )}

      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm">
          {initial ? 'Save Changes' : 'Add Monitor'}
        </button>
      </div>
    </form>
  );
}
