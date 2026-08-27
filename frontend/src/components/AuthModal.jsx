import React, { useState } from 'react';
import { api } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Username and Password are required.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login(formData.username, formData.password);
        localStorage.setItem('crm_token', res.token);
        localStorage.setItem('crm_user', JSON.stringify(res.user));
        setSuccessMsg('Login successful!');
        setTimeout(() => {
          onAuthSuccess(res.user);
          onClose();
        }, 500);
      } else {
        const res = await api.register(formData.username, formData.email, formData.password);
        localStorage.setItem('crm_token', res.token);
        localStorage.setItem('crm_user', JSON.stringify(res.user));
        setSuccessMsg('Account created successfully!');
        setTimeout(() => {
          onAuthSuccess(res.user);
          onClose();
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">✨</span>
            <span className="logo-text">AI CRM Access</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(null); setSuccessMsg(null); }}
          >
            🔑 Log In
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(null); setSuccessMsg(null); }}
          >
            📝 Register
          </button>
        </div>

        {error && <div className="error-alert">⚠️ {error}</div>}
        {successMsg && <div className="success-alert">✅ {successMsg}</div>}

        <form onSubmit={handleSubmit} className="modal-form auth-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="e.g. alex_morgan"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="alex@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (isLogin ? 'Signing in...' : 'Creating Account...') : (isLogin ? 'Log In to CRM' : 'Create Account')}
          </button>

          <div className="auth-footer-note">
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <span
                className="auth-switch-link"
                onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMsg(null); }}
              >
                {isLogin ? 'Register now' : 'Log In'}
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
