import React, { useEffect, useState } from 'react';
import { api, isLoggedIn } from './api.js';
import Login from './Login.jsx';
import ScoreForm from './ScoreForm.jsx';
import logo from './assets/Pishnam_logo.png';

const LEAGUE_KEYS = ['Junior', 'AdvJunior', 'Senior'];

function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const reload = () => {
    setState((s) => ({ ...s, loading: true }));
    fn().then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error: error.message }));
  };
  useEffect(reload, deps);
  return [state, reload];
}

function TeamsTab({ config }) {
  const [league, setLeague] = useState('Junior');
  const [name, setName] = useState('');
  const [{ data: teams, loading, error }, reload] = useAsync(() => api.getTeams(), []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.addTeam(name.trim(), league);
    setName('');
    reload();
  };

  const remove = async (id) => {
    if (!confirm('حذف این تیم و تمام امتیازات آن؟')) return;
    await api.deleteTeam(id);
    reload();
  };

  return (
    <div className="tab-content">
      <h2>مدیریت تیم‌ها</h2>
      <form onSubmit={add} className="inline-form">
        <input placeholder="نام تیم" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={league} onChange={(e) => setLeague(e.target.value)}>
          {LEAGUE_KEYS.map((k) => (
            <option key={k} value={k}>{config[k].label}</option>
          ))}
        </select>
        <button type="submit">افزودن تیم</button>
      </form>

      {loading && <p>در حال بارگذاری...</p>}
      {error && <p className="error">{error}</p>}

      {LEAGUE_KEYS.map((k) => (
        <div key={k} className="team-league-block">
          <h3>{config[k].label}</h3>
          <ul className="team-list">
            {(teams || []).filter((t) => t.league === k).map((t) => (
              <li key={t.id}>
                {t.name}
                <button className="link-danger" onClick={() => remove(t.id)}>حذف</button>
              </li>
            ))}
            {(teams || []).filter((t) => t.league === k).length === 0 && <li className="muted">تیمی ثبت نشده</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ScoreEntryTab({ config }) {
  const [league, setLeague] = useState('Junior');
  const [{ data: teams }] = useAsync(() => api.getTeams(league), [league]);
  const [teamId, setTeamId] = useState('');
  const [round, setRound] = useState(1);
  const [judge, setJudge] = useState('');
  const [values, setValues] = useState({ performance: {}, technical: {}, negative: {}, group: {} });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { setTeamId(''); setValues({ performance: {}, technical: {}, negative: {}, group: {} }); }, [league]);

  const save = async () => {
    if (!teamId) { setMessage('لطفا تیم را انتخاب کنید'); return; }
    setSaving(true);
    setMessage('');
    try {
      await api.addScore({ team_id: teamId, league, round_number: Number(round), values, judge_name: judge });
      setMessage('امتیاز با موفقیت ذخیره شد ✔');
      setValues({ performance: {}, technical: {}, negative: {}, group: {} });
      setRound((r) => Number(r) + 1);
    } catch (e) {
      setMessage('خطا: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-content">
      <h2>ثبت امتیاز راند</h2>
      <div className="entry-controls">
        <label>
          لیگ
          <select value={league} onChange={(e) => setLeague(e.target.value)}>
            {LEAGUE_KEYS.map((k) => <option key={k} value={k}>{config[k].label}</option>)}
          </select>
        </label>
        <label>
          تیم
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">-- انتخاب تیم --</option>
            {(teams || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label>
          شماره راند
          <input type="number" min={1} value={round} onChange={(e) => setRound(e.target.value)} />
        </label>
        <label>
          نام داور
          <input value={judge} onChange={(e) => setJudge(e.target.value)} placeholder="اختیاری" />
        </label>
      </div>

      <ScoreForm league={config[league]} values={values} onValuesChange={setValues} />

      <div className="save-row">
        <button disabled={saving} onClick={save} className="primary">
          {saving ? 'در حال ذخیره...' : 'ذخیره امتیاز این راند'}
        </button>
        {message && <span className="message">{message}</span>}
      </div>
    </div>
  );
}

function HistoryTab({ config }) {
  const [league, setLeague] = useState('Junior');
  const [{ data: scores, loading }, reload] = useAsync(() => api.getScores({ league }), [league]);

  const remove = async (id) => {
    if (!confirm('حذف این رکورد امتیاز؟')) return;
    await api.deleteScore(id);
    reload();
  };

  return (
    <div className="tab-content">
      <h2>سوابق امتیازات</h2>
      <select value={league} onChange={(e) => setLeague(e.target.value)}>
        {LEAGUE_KEYS.map((k) => <option key={k} value={k}>{config[k].label}</option>)}
      </select>

      {loading && <p>در حال بارگذاری...</p>}

      <table className="score-table">
        <thead>
          <tr>
            <th>تیم</th><th>راند</th><th>عملکرد</th><th>فنی</th><th>منفی</th><th>گروهی</th><th>نهایی</th><th>داور</th><th></th>
          </tr>
        </thead>
        <tbody>
          {(scores || []).map((s) => (
            <tr key={s.id}>
              <td>{s.team_name}</td>
              <td>{s.round_number}</td>
              <td>{s.performance_total}</td>
              <td>{s.technical_total}</td>
              <td>{s.negative_total}</td>
              <td>{s.group_total}</td>
              <td><strong>{s.final_total}</strong></td>
              <td>{s.judge_name || '-'}</td>
              <td><button className="link-danger" onClick={() => remove(s.id)}>حذف</button></td>
            </tr>
          ))}
          {(scores || []).length === 0 && !loading && (
            <tr><td colSpan={9} className="muted">رکوردی ثبت نشده</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardTab({ config }) {
  const [league, setLeague] = useState('Junior');
  const [{ data: rows, loading, error }] = useAsync(() => api.getLeaderboard(league), [league]);

  return (
    <div className="tab-content">
      <h2>جدول رده‌بندی (بهترین راند هر تیم)</h2>
      <select value={league} onChange={(e) => setLeague(e.target.value)}>
        {LEAGUE_KEYS.map((k) => <option key={k} value={k}>{config[k].label}</option>)}
      </select>

      {loading && <p>در حال بارگذاری...</p>}
      {error && <p className="error">{error}</p>}

      <table className="score-table">
        <thead>
          <tr><th>رتبه</th><th>تیم</th><th>بهترین امتیاز</th><th>تعداد راندها</th></tr>
        </thead>
        <tbody>
          {(rows || []).map((r, i) => (
            <tr key={r.team_id}>
              <td>{i + 1}</td>
              <td>{r.team_name}</td>
              <td><strong>{r.best_score ?? '-'}</strong></td>
              <td>{r.rounds_played}</td>
            </tr>
          ))}
          {(rows || []).length === 0 && !loading && (
            <tr><td colSpan={4} className="muted">تیمی ثبت نشده</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ExportTab({ config }) {
  const [league, setLeague] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');

  const download = async () => {
    setDownloading(true);
    setMessage('');
    try {
      await api.exportScores(league);
      setMessage('فایل با موفقیت دانلود شد ✔');
    } catch (e) {
      setMessage('خطا: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="tab-content">
      <h2>خروجی اکسل</h2>
      <p>یک فایل Excel شامل تمام امتیازات و جدول رده‌بندی دانلود می‌شود.</p>
      <select value={league} onChange={(e) => setLeague(e.target.value)}>
        <option value="">همه لیگ‌ها</option>
        {LEAGUE_KEYS.map((k) => <option key={k} value={k}>{config[k].label}</option>)}
      </select>
      <div className="save-row">
        <button className="primary" disabled={downloading} onClick={download}>
          {downloading ? 'در حال آماده‌سازی...' : 'دانلود فایل Excel'}
        </button>
        {message && <span className={message.startsWith('خطا') ? 'error' : 'message'}>{message}</span>}
      </div>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn);
  const [config, setConfig] = useState(null);
  const [tab, setTab] = useState('entry');
  const [error, setError] = useState('');

  useEffect(() => {
    const onLogout = () => {
      setAuthenticated(false);
      setConfig(null);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    api.getConfig()
      .then(setConfig)
      .catch((e) => setError('اتصال به سرور برقرار نشد. مطمئن شوید سرور در پورت 4000 در حال اجراست. (' + e.message + ')'));
  }, [authenticated]);

  const logout = () => {
    api.logout();
    setAuthenticated(false);
    setConfig(null);
    setError('');
  };

  if (!authenticated) {
    return <Login onSuccess={() => setAuthenticated(true)} />;
  }

  if (error) return <div className="app-error">{error}</div>;
  if (!config) return <div className="app-loading">در حال اتصال به سرور...</div>;

  return (
    <div className="app">
      <header className="app-header">
        <img src={logo} alt="Pishnam Robotics Academy" className="app-logo" />
        <div className="app-header-text">
          <h1>سامانه داوری مسابقات پیشکاپ</h1>
          <p className="subtitle">پیشکاپ · Junior / Advance Junior / Senior</p>
        </div>
        <button type="button" className="logout-btn" onClick={logout}>خروج</button>
      </header>
      <nav className="tabs">
        <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>تیم‌ها</button>
        <button className={tab === 'entry' ? 'active' : ''} onClick={() => setTab('entry')}>ثبت امتیاز</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>سوابق</button>
        <button className={tab === 'leaderboard' ? 'active' : ''} onClick={() => setTab('leaderboard')}>رده‌بندی</button>
        <button className={tab === 'export' ? 'active' : ''} onClick={() => setTab('export')}>خروجی اکسل</button>
      </nav>
      <main>
        {tab === 'teams' && <TeamsTab config={config} />}
        {tab === 'entry' && <ScoreEntryTab config={config} />}
        {tab === 'history' && <HistoryTab config={config} />}
        {tab === 'leaderboard' && <LeaderboardTab config={config} />}
        {tab === 'export' && <ExportTab config={config} />}
      </main>
    </div>
  );
}
