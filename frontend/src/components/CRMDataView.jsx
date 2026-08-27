import React, { useState, useMemo } from 'react';
import { api } from '../api';

const STATUS_OPTIONS = ['All', 'New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

function Badge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function Avatar({ name }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  return <div className="avatar">{initials}</div>;
}

function InlineAddNote({ customerId, onNoteAdded }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      await api.createNote({
        customer: customerId,
        content: text.trim(),
        note_type: 'General',
        author: 'Sales Rep'
      });
      setText('');
      if (onNoteAdded) onNoteAdded();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAdd} style={{ display: 'flex', gap: 6, marginTop: 10 }}>
      <input
        type="text"
        placeholder="Type a quick note…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ flex: 1, padding: '6px 10px', fontSize: 11, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
      />
      <button type="submit" className="btn btn-sm btn-primary" disabled={loading} style={{ padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap' }}>
        {loading ? '…' : '➕ Note'}
      </button>
    </form>
  );
}

function CustomerTable({ customers, onDataChanged }) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    let list = [...customers];
    if (statusFilter !== 'All') list = list.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av = a[sortField] || '';
      let bv = b[sortField] || '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [customers, statusFilter, search, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortIcon = (field) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="data-card">
      {/* Filters */}
      <div className="filter-bar">
        <input
          placeholder="🔍 Search customers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 200 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>Customer{sortIcon('name')}</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('total_deal_value')}>Deal Value{sortIcon('total_deal_value')}</th>
              <th>Deals</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('updated_at')}>Last Updated{sortIcon('updated_at')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-text">No customers match your filter</div>
                </div>
              </td></tr>
            ) : filtered.map(c => (
              <React.Fragment key={c.id}>
                <tr
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <td>
                    <div className="customer-name-cell">
                      <Avatar name={c.name} />
                      <div className="customer-info-cell">
                        <div className="primary">{c.name}</div>
                        <div className="secondary">{c.company || c.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><Badge status={c.status} /></td>
                  <td><span style={{ fontSize: 12 }}>{c.assigned_to}</span></td>
                  <td className="amount-cell">${(c.total_deal_value || 0).toLocaleString()}</td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.deals_count || 0}</span></td>
                  <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.updated_at ? c.updated_at.substring(0, 10) : '—'}</span></td>
                </tr>
                {expanded === c.id && (
                  <tr>
                    <td colSpan={6} style={{ padding: 0, background: 'rgba(79,142,247,0.04)' }}>
                      <div style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          {/* Deals sub-table */}
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>💰 Deals</div>
                            {(c.deals || []).length === 0
                              ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No deals</div>
                              : (c.deals || []).map(d => (
                                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>{d.title}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.assigned_to}</div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="amount-cell" style={{ fontSize: 12 }}>${(d.amount || 0).toLocaleString()}</span>
                                    <Badge status={d.status} />
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                          {/* Notes */}
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📝 Notes</span>
                            </div>
                            {(c.notes || []).length === 0
                              ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No notes yet</div>
                              : (c.notes || []).slice(0, 4).map(n => (
                                <div key={n.id} className="note-item" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                  <div className="note-dot" />
                                  <div className="note-body">
                                    <div className="note-header">
                                      <span className="note-author">{n.author}</span>
                                      <Badge status={n.note_type} />
                                      <span className="note-date">{(n.created_at || '').substring(0, 10)}</span>
                                    </div>
                                    <div className="note-text">{n.content}</div>
                                  </div>
                                </div>
                              ))
                            }
                            <InlineAddNote customerId={c.id} onNoteAdded={onDataChanged} />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DealsTable({ deals }) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [minAmt, setMinAmt] = useState('');

  const filtered = useMemo(() => {
    let list = [...deals];
    if (statusFilter !== 'All') list = list.filter(d => d.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.customer_name || '').toLowerCase().includes(q)
      );
    }
    if (minAmt) list = list.filter(d => parseFloat(d.amount) >= parseFloat(minAmt));
    list.sort((a, b) => b.amount - a.amount);
    return list;
  }, [deals, statusFilter, search, minAmt]);

  const now = new Date();

  return (
    <div className="data-card">
      <div className="filter-bar">
        <input
          placeholder="🔍 Search deals…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 200 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <input
          type="number"
          placeholder="Min $"
          value={minAmt}
          onChange={e => setMinAmt(e.target.value)}
          style={{ minWidth: 90, width: 90 }}
        />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Deal Title</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Inactive</th>
              <th>Close Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">💰</div><div className="empty-state-text">No deals match your filter</div></div></td></tr>
              : filtered.map(d => {
                const updatedAt = new Date(d.updated_at);
                const inactiveDays = Math.floor((now - updatedAt) / 86400000);
                const isCold = inactiveDays >= 14 && !['Won', 'Lost'].includes(d.status);

                return (
                  <tr key={d.id} style={{ borderLeft: isCold ? '3px solid var(--accent-red)' : undefined }}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
                      {isCold && <div style={{ fontSize: 10, color: 'var(--accent-red)', marginTop: 2 }}>⚠️ Cold deal</div>}
                    </td>
                    <td><span style={{ fontSize: 12 }}>{d.customer_name}</span></td>
                    <td className="amount-cell">${parseFloat(d.amount).toLocaleString()}</td>
                    <td><Badge status={d.status} /></td>
                    <td><span style={{ fontSize: 12 }}>{d.assigned_to}</span></td>
                    <td>
                      <span style={{ fontSize: 11, color: isCold ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: isCold ? 700 : 400 }}>
                        {inactiveDays}d
                      </span>
                    </td>
                    <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.expected_close_date || '—'}</span></td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CRMDataView({ customers, deals, loading, onAddCustomerClick, onAddDealClick, onDataChanged }) {
  const [tab, setTab] = useState('customers');

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <span>Loading CRM data…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="section-header">
        <div>
          <div className="section-title">CRM Data Management</div>
          <div className="section-subtitle">Click any customer row to expand deals & notes</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="tabs">
            <button className={`tab-btn ${tab === 'customers' ? 'active' : ''}`} onClick={() => setTab('customers')}>
              👥 Customers ({customers.length})
            </button>
            <button className={`tab-btn ${tab === 'deals' ? 'active' : ''}`} onClick={() => setTab('deals')}>
              💰 Deals ({deals.length})
            </button>
          </div>
          {tab === 'customers' && (
            <button className="btn btn-primary btn-sm" onClick={onAddCustomerClick}>
              ➕ Add Customer
            </button>
          )}
          {tab === 'deals' && (
            <button className="btn btn-primary btn-sm" onClick={onAddDealClick}>
              ➕ Add Deal
            </button>
          )}
        </div>
      </div>

      {tab === 'customers' && <CustomerTable customers={customers} onDataChanged={onDataChanged} />}
      {tab === 'deals' && <DealsTable deals={deals} />}
    </div>
  );
}
