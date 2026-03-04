import React, { useState } from 'react';
import { login } from '../services/api';

export default function Login({ onSuccess, switchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await login(username.trim(), password);
      localStorage.setItem('token', token);
      onSuccess(token);
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Welcome back</h2>
      <p className="auth-subtitle">Sign in to your account to continue</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="login-user">Username</label>
          <input
            id="login-user"
            className="field-input"
            placeholder="your-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="login-pass">Password</label>
          <input
            id="login-pass"
            className="field-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary btn-full" disabled={loading} type="submit">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-footer">
        No account?{' '}
        <button className="link-btn" onClick={switchToRegister}>Create one</button>
      </p>
    </div>
  );
}
