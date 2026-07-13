// In production (Vercel), the client and API are served from the same
// deployment, so a relative '/api' path just works. For local development,
// set VITE_API_URL=http://localhost:4000/api in client/.env
const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'pishcup_auth_token';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

async function req(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('auth:logout'));
    const err = await res.json().catch(() => ({ error: 'ورود لازم است' }));
    throw new Error(err.error || 'ورود لازم است');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'خطای ناشناخته' }));
    throw new Error(err.error || 'خطا در ارتباط با سرور');
  }

  return res.json();
}

export const api = {
  login: async (username, password) => {
    const res = await fetch(BASE + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'ورود ناموفق بود');
    setToken(data.token);
    return data;
  },

  logout: () => clearToken(),

  getConfig: () => req('/config'),
  getTeams: (league) => req('/teams' + (league ? `?league=${league}` : '')),
  addTeam: (name, league) => req('/teams', { method: 'POST', body: JSON.stringify({ name, league }) }),
  deleteTeam: (id) => req(`/teams/${id}`, { method: 'DELETE' }),
  getScores: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('/scores' + (qs ? `?${qs}` : ''));
  },
  addScore: (payload) => req('/scores', { method: 'POST', body: JSON.stringify(payload) }),
  updateScore: (id, payload) => req(`/scores/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteScore: (id) => req(`/scores/${id}`, { method: 'DELETE' }),
  getLeaderboard: (league) => req('/leaderboard' + (league ? `?league=${league}` : '')),
  exportScores: async (league) => {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(BASE + '/export' + (league ? `?league=${league}` : ''), { headers });
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
      throw new Error('ورود لازم است');
    }
    if (!res.ok) throw new Error('خطا در دانلود فایل');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = league ? `robocup-${league}-scores.xlsx` : 'robocup-all-leagues-scores.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  },
};