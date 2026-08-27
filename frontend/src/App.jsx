import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import { api } from './api';
import ChatAssistant from './components/ChatAssistant';
import CRMDataView from './components/CRMDataView';
import SmartInsights from './components/SmartInsights';
import AddCustomerModal from './components/AddCustomerModal';
import AddDealModal from './components/AddDealModal';
import LoginPage from './components/LoginPage';

/* ─── Toast ─────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.icon}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── AuditLog Panel ─────────────────────────── */
function AuditLogPanel({ logs }) {
  const ACTION_COLORS = {
    UPDATE_DEAL_STATUS: 'var(--accent-green)',
    ADD_NOTE: 'var(--accent-blue)',
    ASSIGN_LEAD: 'var(--accent-purple)',
  };
  const ACTION_ICONS = {
    UPDATE_DEAL_STATUS: '✅',
    ADD_NOTE: '📝',
    ASSIGN_LEAD: '👤',
  };

  return (
    <div className="data-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Tool Called</th>
              <th>Description</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0
              ? <tr><td colSpan={4}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">No audit log entries yet. Take an AI action!</div></div></td></tr>
              : logs.slice(0, 50).map(l => (
                <tr key={l.id} className={`audit-${l.action_type}`}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{ACTION_ICONS[l.action_type] || '⚙️'}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ACTION_COLORS[l.action_type] || 'var(--text-secondary)' }}>
                        {l.action_type}
                      </span>
                    </span>
                  </td>
                  <td><code style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: 4 }}>{l.tool_called || '—'}</code></td>
                  <td><span style={{ fontSize: 12 }}>{l.description}</span></td>
                  <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.created_at?.substring(0, 19).replace('T', ' ')}</span></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Stats Row ───────────────────────────────── */
function StatsRow({ stats }) {
  if (!stats) return null;
  const cards = [
    { icon: '👥', label: 'Total Customers', value: stats.total_customers, accent: '#4f8ef7' },
    { icon: '💰', label: 'Pipeline Value', value: `$${(stats.pipeline_value || 0).toLocaleString()}`, accent: '#34d399' },
    { icon: '🏆', label: 'Deals Won', value: stats.won_deals, accent: '#a78bfa' },
    { icon: '📈', label: 'Win Rate', value: `${stats.win_rate}%`, accent: '#22d3ee' },
    { icon: '🧊', label: 'Cold Deals', value: stats.cold_deals_count, accent: '#f87171' },
  ];

  return (
    <div className="stats-row">
      {cards.map((c, i) => (
        <div key={i} className="stat-card" style={{ '--accent': c.accent }}>
          <div className="stat-icon">{c.icon}</div>
          <div className="stat-value" style={{ color: c.accent }}>{c.value}</div>
          <div className="stat-label">{c.label}</div>
        </div>
      ))}

      {/* Status breakdown mini chart */}
      <div className="stat-card" style={{ '--accent': '#fbbf24', gridColumn: 'span 2' }}>
        <div className="stat-label" style={{ marginBottom: 10 }}>Pipeline by Status</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(stats.status_breakdown || []).map(s => {
            const statusColors = {
              New: 'var(--accent-blue)', Contacted: 'var(--accent-purple)', Qualified: 'var(--accent-cyan)',
              Proposal: 'var(--accent-yellow)', Won: 'var(--accent-green)', Lost: 'var(--accent-red)'
            };
            return (
              <div key={s.status} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: statusColors[s.status] }}>{s.count}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'customers', icon: '👥', label: 'Customers & Deals' },
  { id: 'insights', icon: '💡', label: 'Smart Insights' },
  { id: 'audit', icon: '📋', label: 'Audit Log' },
];

/* ─── Main App ─────────────────────────────────── */
export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [coldCount, setColdCount] = useState(0);

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // User state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('crm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const addToast = useCallback((message, type = 'info', icon = '💬') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [custs, ds, statsData, insightsData, logs] = await Promise.all([
        api.getCustomers(),
        api.getDeals(),
        api.getStats(),
        api.getInsights(),
        api.getAuditLogs(),
      ]);
      setCustomers(custs.results || custs);
      setDeals(ds.results || ds);
      setStats(statsData);
      setInsights(insightsData);
      setAuditLogs(logs.results || logs);
      setColdCount(insightsData?.cold_deals_count || 0);
    } catch (err) {
      addToast(`Failed to load data: ${err.message}`, 'error', '❌');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchAll(); }, []);

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      await api.seedData();
      addToast('CRM data seeded successfully!', 'success', '✅');
      await fetchAll();
    } catch (err) {
      addToast(`Seed failed: ${err.message}`, 'error', '❌');
    } finally {
      setSeeding(false);
    }
  }, [addToast, fetchAll]);

  const handleDataChanged = useCallback(async () => {
    await fetchAll();
    addToast('CRM data updated!', 'success', '🤖');
  }, [fetchAll, addToast]);

  const handleCustomerAdded = useCallback(async () => {
    await fetchAll();
    addToast('New customer added successfully!', 'success', '👥');
  }, [fetchAll, addToast]);

  const handleDealAdded = useCallback(async () => {
    await fetchAll();
    addToast('New deal created successfully!', 'success', '💰');
  }, [fetchAll, addToast]);

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
    addToast('Logged out successfully', 'info', '👋');
  };

  const PAGE_TITLES = {
    dashboard: '📊 Dashboard',
    customers: '👥 Customers & Deals',
    insights: '💡 Smart Insights',
    audit: '📋 Audit Log',
  };

  // ── If not logged in, show Login Page ──
  if (!user) {
    return (
      <>
        <LoginPage onAuthSuccess={(u) => {
          setUser(u);
          addToast(`Welcome, ${u.username}! 🎉`, 'success', '👋');
          fetchAll();
        }} />
        <Toast toasts={toasts} />
      </>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🤖</div>
          <div>
            <div className="logo-text">CRM AI</div>
            <div className="logo-sub">Assistant</div>
          </div>
        </div>

        <div className="sidebar-section">Navigation</div>
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'insights' && coldCount > 0 && (
              <span className="nav-badge">{coldCount}</span>
            )}
          </div>
        ))}

        <div className="sidebar-bottom">
          <button
            className="ai-chat-btn"
            onClick={() => setChatOpen(o => !o)}
          >
            🤖 {chatOpen ? 'Hide' : 'Show'} AI Chat
          </button>
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user.username ? user.username[0].toUpperCase() : '👤'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.username}</div>
              <div className="sidebar-user-role">Sales Team</div>
            </div>
            <button className="sidebar-logout-btn" onClick={handleLogout} title="Logout">
              ⏏
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-title">{PAGE_TITLES[activePage]}</div>
          <div className="topbar-actions">
            {loading && <div className="loading-spinner" />}
            <button className="btn" onClick={fetchAll} disabled={loading} title="Refresh data">
              🔄 Refresh
            </button>
            <button className="btn btn-primary" onClick={handleSeed} disabled={seeding}>
              {seeding ? <><div className="loading-spinner" style={{ width: 13, height: 13 }} /> Seeding…</> : '🌱 Seed Data'}
            </button>
          </div>
        </div>

        {/* Page Area */}
        <div className="page-area">
          {activePage === 'dashboard' && (
            <>
              <StatsRow stats={stats} />
              <CRMDataView
                customers={customers}
                deals={deals}
                loading={loading}
                onAddCustomerClick={() => setIsAddCustomerOpen(true)}
                onAddDealClick={() => setIsAddDealOpen(true)}
                onDataChanged={fetchAll}
              />
            </>
          )}
          {activePage === 'customers' && (
            <CRMDataView
              customers={customers}
              deals={deals}
              loading={loading}
              onAddCustomerClick={() => setIsAddCustomerOpen(true)}
              onAddDealClick={() => setIsAddDealOpen(true)}
              onDataChanged={fetchAll}
            />
          )}
          {activePage === 'insights' && (
            <SmartInsights insights={insights} loading={loading} />
          )}
          {activePage === 'audit' && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Audit Log</div>
                  <div className="section-subtitle">All AI agent actions with full audit trail</div>
                </div>
              </div>
              <AuditLogPanel logs={auditLogs} />
            </>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {chatOpen && (
        <ChatAssistant onDataChanged={handleDataChanged} />
      )}

      {/* Collapsed Chat Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24,
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f8ef7, #a78bfa)',
            border: 'none', color: 'white', fontSize: 22,
            cursor: 'pointer', zIndex: 100,
            boxShadow: '0 4px 20px rgba(79,142,247,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Open AI Assistant"
        >🤖</button>
      )}

      {/* Modals */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onCustomerAdded={handleCustomerAdded}
      />
      <AddDealModal
        isOpen={isAddDealOpen}
        onClose={() => setIsAddDealOpen(false)}
        customers={customers}
        onDealAdded={handleDealAdded}
      />


      <Toast toasts={toasts} />
    </div>
  );
}
