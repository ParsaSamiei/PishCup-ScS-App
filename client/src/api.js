// In production (Vercel), the client and API are served from the same
// deployment, so a relative '/api' path just works. For local development,
// set VITE_API_URL=http://localhost:4000/api in client/.env
const BASE = import.meta.env.VITE_API_URL || '/api';

async function req(path, options) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'خطای ناشناخته' }));
    throw new Error(err.error || 'خطا در ارتباط با سرور');
  }
  return res.json();
}

export const api = {
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
  exportUrl: (league) => BASE + '/export' + (league ? `?league=${league}` : ''),
};
