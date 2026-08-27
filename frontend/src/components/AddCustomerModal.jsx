import React, { useState } from 'react';
import { api } from '../api';

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    company: '',
    email: '',
    phone: '',
    status: 'New',
    assigned_to: 'Alex Morgan'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.company.trim()) {
      setError('Customer Name and Company Name are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.createCustomer(formData);
      onCustomerAdded();
      onClose();
      setFormData({
        name: '',
        contact_name: '',
        company: '',
        email: '',
        phone: '',
        status: 'New',
        assigned_to: 'Alex Morgan'
      });
    } catch (err) {
      setError(err.message || 'Failed to create customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Add New Customer</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-alert">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Customer / Account Name *</label>
              <input
                type="text"
                placeholder="e.g. Acme Corporation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                placeholder="e.g. Acme Inc."
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Primary Contact Person</label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="sarah@acme.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                placeholder="+1 (555) 234-5678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Lead Status</label>
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

          <div className="form-group">
            <label>Assigned Salesperson</label>
            <input
              type="text"
              placeholder="Alex Morgan"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
