import React, { useState } from 'react';
import { api } from '../api';

/* ─── Login Page ─── */
function Login({ onAuthSuccess, onGoToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Username and Password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.login(username, password);
      localStorage.setItem('crm_token', res.token);
      localStorage.setItem('crm_user', JSON.stringify(res.user));
      onAuthSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page-bg" />
      <div className="auth-page-card glass-card">
        <div className="auth-page-logo">
          <div className="auth-page-logo-icon">🤖</div>
          <div className="auth-page-logo-text">AI CRM</div>
        </div>
        <h2 className="auth-page-title">Welcome back</h2>
        <p className="auth-page-sub">Sign in to your Sales Intelligence Dashboard</p>

        {error && <div className="error-alert">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="e.g. alex_morgan"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : '🚀 Log In'}
          </button>
        </form>

        <div className="auth-page-footer">
          Don't have an account?{' '}
          <span className="auth-switch-link" onClick={onGoToRegister}>
            Create one
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Register Page ─── */
function Register({ onGoToLogin }) {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Username and Password are required.');
      return;
    }
    if (formData.password !== formData.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.register(formData.username, formData.email, formData.password);
      // Clear token — don't auto-login, redirect to Login instead
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      setSuccess(true);
      setTimeout(() => onGoToLogin(), 1500);
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different username.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-page-bg" />
      <div className="auth-page-card glass-card">
        <div className="auth-page-logo">
          <div className="auth-page-logo-icon">🤖</div>
          <div className="auth-page-logo-text">AI CRM</div>
        </div>
        <h2 className="auth-page-title">Create Account</h2>
        <p className="auth-page-sub">Join your team's Sales Intelligence Platform</p>

        {error && <div className="error-alert">⚠️ {error}</div>}
        {success && (
          <div className="success-alert" style={{ textAlign: 'center', padding: '16px' }}>
            ✅ Account created! Redirecting to Login…
          </div>
        )}

        {!success && <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Username *</label>
            <input
              type="text"
              placeholder="e.g. alex_morgan"
              value={formData.username}
              onChange={set('username')}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="alex@company.com"
              value={formData.email}
              onChange={set('email')}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={formData.password}
                onChange={set('password')}
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                placeholder="Repeat password"
                value={formData.confirm}
                onChange={set('confirm')}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : '✅ Create Account'}
          </button>
        </form>}

        <div className="auth-page-footer">
          Already have an account?{' '}
          <span className="auth-switch-link" onClick={onGoToLogin}>
            Log In
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Default Export: routes between Login & Register ─── */
export default function LoginPage({ onAuthSuccess }) {
  const [page, setPage] = useState('login');

  if (page === 'register') {
    return (
      <Register
        onGoToLogin={() => setPage('login')}
      />
    );
  }
  return (
    <Login
      onAuthSuccess={onAuthSuccess}
      onGoToRegister={() => setPage('register')}
    />
  );
}
