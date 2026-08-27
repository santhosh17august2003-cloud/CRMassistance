import React from 'react';

function ColdDealCard({ deal }) {
  return (
    <div className="cold-deal-item">
      <div style={{ fontSize: 22 }}>🧊</div>
      <div className="cold-deal-info">
        <div className="cold-deal-name">{deal.customer_name}</div>
        <div className="cold-deal-meta">{deal.title} · ${(deal.amount || 0).toLocaleString()} · <em>{deal.status}</em></div>
        <div className="cold-deal-meta">Owner: {deal.assigned_to}</div>
      </div>
      <div className="cold-deal-days">
        <div className={`risk-badge risk-${deal.risk_level}`}>{deal.risk_level}</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: deal.risk_level === 'High' ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
          {deal.inactive_days}d
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>inactive</div>
      </div>
    </div>
  );
}

function HighValueCard({ deal }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      background: 'rgba(52,211,153,0.05)',
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 20 }}>🎯</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{deal.customer_name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{deal.title}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-green)' }}>
          ${(deal.amount || 0).toLocaleString()}
        </div>
        <span className={`badge badge-${deal.status}`}>{deal.status}</span>
      </div>
    </div>
  );
}

function NBACard({ action }) {
  const icons = { 'Follow Up Cold Deal': '📞', 'Assign Lead': '👤', 'Schedule Demo': '📅' };
  return (
    <div className="nba-item">
      <div className="nba-icon">{icons[action.type] || '💡'}</div>
      <div className="nba-info">
        <div className="nba-type">{action.type}</div>
        <div className="nba-text">{action.suggestion}</div>
      </div>
    </div>
  );
}

export default function SmartInsights({ insights, loading }) {
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <span>Analyzing CRM data…</span>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💡</div>
        <div className="empty-state-text">No insights available. Seed the database first.</div>
      </div>
    );
  }

  const cold = insights.cold_deals || [];
  const hv = insights.high_value_opportunities || [];
  const nba = insights.next_best_actions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="section-header">
        <div>
          <div className="section-title">💡 Smart AI Insights</div>
          <div className="section-subtitle">Auto-generated from your live CRM data</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          background: 'var(--accent-green-dim)',
          border: '1px solid var(--accent-green)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12,
          color: 'var(--accent-green)',
          fontWeight: 600,
        }}>
          <span>●</span> AI Powered
        </div>
      </div>

      <div className="insight-grid">
        {/* Cold Deals */}
        <div className="insight-card">
          <div className="insight-card-title">
            <span>🧊</span>
            <span>Cold Deals at Risk</span>
            <span style={{ marginLeft: 'auto', background: 'var(--accent-red-dim)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
              {cold.length}
            </span>
          </div>
          {cold.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>✅ No cold deals! Pipeline looks healthy.</div>
            : cold.map((d, i) => <ColdDealCard key={i} deal={d} />)
          }
        </div>

        {/* High Value */}
        <div className="insight-card">
          <div className="insight-card-title">
            <span>🎯</span>
            <span>High-Value Opportunities</span>
            <span style={{ marginLeft: 'auto', background: 'var(--accent-green-dim)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
              {hv.length}
            </span>
          </div>
          {hv.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No high-value deals in active pipeline.</div>
            : hv.map((d, i) => <HighValueCard key={i} deal={d} />)
          }
        </div>

        {/* Next Best Actions */}
        <div className="insight-card" style={{ gridColumn: '1 / -1' }}>
          <div className="insight-card-title">
            <span>🚀</span>
            <span>Recommended Next Best Actions</span>
          </div>
          {nba.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No actions recommended at this time.</div>
            : nba.map((a, i) => <NBACard key={i} action={a} />)
          }
          <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(167,139,250,0.08)', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(167,139,250,0.3)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 4 }}>💬 Ask the AI Assistant</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              You can ask the assistant to act on any of these: e.g. <em>"Assign Apex Systems to Alice Parker"</em> or <em>"Add a follow-up note to Acme Corp"</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
