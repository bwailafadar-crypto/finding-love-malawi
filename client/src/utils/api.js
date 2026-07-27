const API_URL = '/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  get(ep) { return this.request(ep); }
  post(ep, body) { return this.request(ep, { method: 'POST', body: JSON.stringify(body) }); }
  put(ep, body) { return this.request(ep, { method: 'PUT', body: JSON.stringify(body) }); }
  delete(ep) { return this.request(ep, { method: 'DELETE' }); }

  auth = {
    register: (d) => this.post('/auth/register', d),
    login: (d) => this.post('/auth/login', d),
    me: () => this.get('/auth/me'),
    logout: () => this.post('/auth/logout'),
  };

  profiles = {
    get: () => this.get('/profiles/me'),
    update: (d) => this.put('/profiles/me', d),
    uploadPhotos: (photos) => this.post('/profiles/photos', { photos }),
    getUser: (id) => this.get(`/profiles/${id}`),
  };

  swipes = {
    discover: () => this.get('/swipes/discover'),
    discoverScored: () => this.get('/discover/scored'),
    swipe: (id, action) => this.post('/swipes', { swipedId: id, action }),
    likes: () => this.get('/swipes/likes'),
    rewind: () => this.post('/swipes/rewind'),
  };

  matches = {
    list: () => this.get('/matches'),
    new: () => this.get('/matches/new'),
    remove: (id) => this.delete(`/matches/${id}`),
  };

  messages = {
    list: (matchId) => this.get(`/messages/${matchId}`),
    send: (matchId, content, type) => this.post(`/messages/${matchId}`, { content, messageType: type }),
    unread: (matchId) => this.get(`/messages/${matchId}/unread`),
    react: (matchId, messageId, reaction) => this.post(`/messages/${matchId}/react`, { messageId, reaction }),
  };

  reports = {
    report: (id, reason, desc) => this.post('/reports', { reportedId: id, reason, description: desc }),
    block: (id) => this.post('/reports/block', { blockedId: id }),
    unblock: (id) => this.delete(`/reports/block/${id}`),
    list: () => this.get('/reports'),
  };

  subscriptions = {
    plans: () => this.get('/subscriptions/plans'),
    current: () => this.get('/subscriptions/current'),
    subscribe: (plan, ref) => this.post('/subscriptions/subscribe', { plan, paymentReference: ref }),
    boost: () => this.post('/subscriptions/boost'),
  };

  verification = {
    challenge: () => this.get('/verification/challenge'),
    submit: (photoUrl, challengeId) => this.post('/verification/submit', { photoUrl, challengeId }),
    status: () => this.get('/verification/status'),
  };

  notifications = {
    get: () => this.get('/notifications'),
  };

  admin = {
    users: () => this.get('/admin/users'),
    banUser: (id) => this.post(`/admin/ban/${id}`),
    unbanUser: (id) => this.post(`/admin/unban/${id}`),
    reports: () => this.get('/admin/reports'),
    resolveReport: (id) => this.post(`/admin/resolve-report/${id}`),
  };

  stories = {
    feed: () => this.get('/stories'),
    byUser: (userId) => this.get(`/stories/user/${userId}`),
    post: (content, contentType) => this.post('/stories', { content, contentType }),
    view: (storyId) => this.post(`/stories/${storyId}/view`),
    delete: (storyId) => this.delete(`/stories/${storyId}`),
  };
}

const api = new ApiClient();
export default api;
