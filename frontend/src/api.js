const API_BASE = (import.meta.env.VITE_API_URL || 'https://crmassistance.onrender.com/api').replace(/\/+$/, '');

const getAuthHeaders = () => {
  const token = localStorage.getItem('crm_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return headers;
};

export const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `API error: ${res.statusText}`);
    }
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.detail || `API error: ${res.statusText}`);
    }
    return data;
  },

  getStats: () => api.get('/stats/'),
  getCustomers: () => api.get('/customers/'),
  getDeals: () => api.get('/deals/'),
  getNotes: () => api.get('/notes/'),
  getAuditLogs: () => api.get('/audit-logs/'),
  getInsights: () => api.get('/insights/'),
  seedData: () => api.post('/seed/', {}),
  chat: (prompt, history) => api.post('/chat/', { prompt, history }),

  // Manual Data Entry
  createCustomer: (customerData) => api.post('/customers/', customerData),
  createDeal: (dealData) => api.post('/deals/', dealData),
  createNote: (noteData) => api.post('/notes/', noteData),

  // Auth
  register: (username, email, password) => api.post('/auth/register/', { username, email, password }),
  login: (username, password) => api.post('/auth/login/', { username, password }),
  logout: () => api.post('/auth/logout/', {}),
};
