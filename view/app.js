import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import Monitors from './components/Monitors.jsx';

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

function App() {
  const [token, setToken] = useState(null);
  const [mode, setMode] = useState('login');

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  if (!token) {
    return (
      <div className="auth-root">
        <div className="brand">
          <div className="brand-icon"><ActivityIcon /></div>
          <span className="brand-name">Uptime Check</span>
        </div>
        {mode === 'login' ? (
          <Login onSuccess={(t) => setToken(t)} switchToRegister={() => setMode('register')} />
        ) : (
          <Register switchToLogin={() => setMode('login')} />
        )}
      </div>
    );
  }

  return <Monitors onLogout={() => setToken(null)} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
