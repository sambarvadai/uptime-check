import React, { useState } from 'react';
import { register as doRegister } from '../services/api';

export default function Register({ switchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await doRegister(username.trim(), password);
      setSuccess('Account created! You can now sign in.');
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed. Please try a different username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Create an account</h2>
      <p className="auth-subtitle">Start monitoring your services in seconds</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="reg-user">Username</label>
          <input
            id="reg-user"
            className="field-input"
            placeholder="your-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="reg-pass">Password</label>
          <input
            id="reg-pass"
            className="field-input"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <button className="btn btn-primary btn-full" disabled={loading} type="submit">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account?{' '}
        <button className="link-btn" onClick={switchToLogin}>Sign in</button>
      </p>
    </div>
  );
}
