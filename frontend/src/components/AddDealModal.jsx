import React, { useState } from 'react';
import { api } from '../api';

export default function AddDealModal({ isOpen, onClose, customers, onDealAdded }) {
  const [formData, setFormData] = useState({
    customer: '',
    title: '',
    amount: '',
    status: 'New',
    assigned_to: 'Alex Morgan',
    expected_close_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || !formData.title.trim() || !formData.amount) {
      setError('Customer, Deal Title, and Amount are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.createDeal({
        ...formData,
        customer: parseInt(formData.customer, 10),
        amount: parseFloat(formData.amount),
        expected_close_date: formData.expected_close_date || null
      });
      onDealAdded();
      onClose();
      setFormData({
        customer: '',
        title: '',
        amount: '',
        status: 'New',
        assigned_to: 'Alex Morgan',
        expected_close_date: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to create deal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💰 Add New Sales Deal</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-alert">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Select Customer *</label>
            <select
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              required
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Deal Title / Opportunity Name *</label>
            <input
              type="text"
              placeholder="e.g. Enterprise Cloud Package Upgrade"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Deal Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="25000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Stage / Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Assigned Rep</label>
              <input
                type="text"
                placeholder="Alex Morgan"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Expected Close Date</label>
              <input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving Deal...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
