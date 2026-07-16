import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, isLoggedIn } from './api.js';
import Login from './Login.jsx';
import ScoreForm, { calcSection } from './ScoreForm.jsx';
import { formatRoundTime, roundTimeToSeconds, ScoreNum } from './formatScore.jsx';
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
  const [roundMinutes, setRoundMinutes] = useState('');
  const [roundSeconds, setRoundSeconds] = useState('');
  const [values, setValues] = useState({ performance: {}, technical: {}, negative: {}, group: {} });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Round timer: start/stop stopwatch that auto-fills the minute/second boxes
  // above. The boxes stay editable by hand once the timer is stopped.
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerIntervalRef = useRef(null);
  const timerStartRef = useRef(0);

  useEffect(() => {
    if (!timerRunning) return undefined;
    timerStartRef.current = Date.now() - elapsedMs;
    timerIntervalRef.current = setInterval(() => {
      const ms = Date.now() - timerStartRef.current;
      setElapsedMs(ms);
      setRoundMinutes(String(Math.floor(ms / 60000)));
      setRoundSeconds(String(Math.floor((ms % 60000) / 1000)));
    }, 200);
    return () => clearInterval(timerIntervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning]);

  const toggleTimer = () => setTimerRunning((r) => !r);
  const resetTimer = () => {
    setTimerRunning(false);
    setElapsedMs(0);
    setRoundMinutes('');
    setRoundSeconds('');
  };

  const leagueConfig = config[league];
  const selectedTeam = (teams || []).find((t) => String(t.id) === String(teamId));

  const previewTotals = useMemo(() => {
    const v = values || { performance: {}, technical: {}, negative: {}, group: {} };
    const perf = calcSection(leagueConfig.performance, v.performance || {});
    const tech = calcSection(leagueConfig.technical, v.technical || {});
    const neg = calcSection(leagueConfig.negative, v.negative || {});
    const group = calcSection(leagueConfig.group, v.group || {});
    return {
      performance: perf.total,
      technical: tech.total,
      negative: neg.total,
      group: group.total,
      final: perf.total + tech.total + neg.total + group.total,
    };
  }, [leagueConfig, values]);

  const resetForm = () => {
    setValues({ performance: {}, technical: {}, negative: {}, group: {} });
    setRoundMinutes('');
    setRoundSeconds('');
    setTimerRunning(false);
    setElapsedMs(0);
    setRound((r) => Number(r) + 1);
  };

  useEffect(() => {
    setTeamId('');
    setValues({ performance: {}, technical: {}, negative: {}, group: {} });
    setRoundMinutes('');
    setRoundSeconds('');
    setTimerRunning(false);
    setElapsedMs(0);
  }, [league]);

  const openConfirm = () => {
    if (!teamId) { setMessage('لطفا تیم را انتخاب کنید'); return; }
    setMessage('');
    setConfirmOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const round_time_seconds = roundTimeToSeconds(roundMinutes, roundSeconds);
      await api.addScore({
        team_id: teamId,
        league,
        round_number: Number(round),
        values,
        judge_name: judge,
        round_time_seconds: round_time_seconds || null,
      });
      setMessage('امتیاز با موفقیت ذخیره شد ✔');
      setConfirmOpen(false);
      resetForm();
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
        <label className="entry-field">
          <span className="entry-field-label">لیگ</span>
          <select value={league} onChange={(e) => setLeague(e.target.value)}>
            {LEAGUE_KEYS.map((k) => <option key={k} value={k}>{config[k].label}</option>)}
          </select>
        </label>
        <label className="entry-field entry-field--team">
          <span className="entry-field-label">تیم</span>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">-- انتخاب تیم --</option>
            {(teams || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="entry-field entry-field--round">
          <span className="entry-field-label">شماره راند</span>
          <input type="number" min={1} value={round} onChange={(e) => setRound(e.target.value)} />
        </label>
        <label className="entry-field entry-field--time">
          <span className="entry-field-label">زمان راند</span>
          <div className="time-inputs" dir="ltr" title="دقیقه : ثانیه">
            <input
              type="number"
              min={0}
              value={roundMinutes}
              onChange={(e) => setRoundMinutes(e.target.value)}
              placeholder="0"
              className="time-box"
              aria-label="دقیقه"
              disabled={timerRunning}
            />
            <span className="time-sep" aria-hidden="true">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={roundSeconds}
              onChange={(e) => setRoundSeconds(e.target.value)}
              placeholder="00"
              className="time-box"
              aria-label="ثانیه"
              disabled={timerRunning}
            />
          </div>
        </label>
        <label className="entry-field">
          <span className="entry-field-label">نام داور</span>
          <input value={judge} onChange={(e) => setJudge(e.target.value)} placeholder="اختیاری" />
        </label>
      </div>

      <div className="timer-row">
        <span className="timer-row-label">تایمر راند:</span>
        <span className="timer-display" dir="ltr">{formatRoundTime(Math.floor(elapsedMs / 1000))}</span>
        <button
          type="button"
          className={timerRunning ? 'timer-btn timer-btn--stop' : 'timer-btn timer-btn--start'}
          onClick={toggleTimer}
        >
          {timerRunning ? '⏸ توقف' : '▶ شروع'}
        </button>
        <button type="button" className="timer-btn timer-btn--reset" onClick={resetTimer} disabled={timerRunning}>
          ریست
        </button>
        <span className="timer-hint">تایمر جعبه‌های دقیقه/ثانیه را پر می‌کند؛ پس از توقف می‌توانید آن‌ها را دستی هم اصلاح کنید.</span>
      </div>

      <ScoreForm league={leagueConfig} values={values} onValuesChange={setValues} />

      <div className="save-row">
        <button disabled={saving} onClick={openConfirm} className="primary">
          بررسی و ثبت امتیاز
        </button>
        {message && <span className="message">{message}</span>}
      </div>

      {confirmOpen && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="confirm-card">
            <h3 id="confirm-title">آیا از ثبت امتیاز مطمئن هستید؟</h3>
            <p className="confirm-hint">لطفاً قبل از ذخیره، اطلاعات زیر را یک‌بار دیگر بررسی کنید.</p>
            <dl className="confirm-summary">
              <div><dt>تیم</dt><dd>{selectedTeam?.name || '—'}</dd></div>
              <div><dt>لیگ</dt><dd>{leagueConfig.label}</dd></div>
              <div><dt>راند</dt><dd><span className="num-ltr" dir="ltr">{round}</span></dd></div>
              <div><dt>زمان راند</dt><dd><span className="num-ltr" dir="ltr">{formatRoundTime(roundTimeToSeconds(roundMinutes, roundSeconds))}</span></dd></div>
              <div><dt>عملکرد</dt><dd><ScoreNum value={previewTotals.performance} /></dd></div>
              <div><dt>فنی</dt><dd><ScoreNum value={previewTotals.technical} /></dd></div>
              <div><dt>منفی</dt><dd><ScoreNum value={previewTotals.negative} /></dd></div>
              <div><dt>گروهی</dt><dd><ScoreNum value={previewTotals.group} /></dd></div>
              <div className="confirm-final"><dt>امتیاز نهایی</dt><dd><ScoreNum value={previewTotals.final} /></dd></div>
            </dl>
            <div className="confirm-actions">
              <button type="button" className="primary" disabled={saving} onClick={save}>
                {saving ? 'در حال ذخیره...' : 'بله، ذخیره شود'}
              </button>
              <button type="button" disabled={saving} onClick={() => setConfirmOpen(false)}>
                بازگشت و بررسی مجدد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRecordModal({ mode, record, config, onClose, onSaved }) {
  const readOnly = mode === 'view';
  const leagueConfig = config[record.league];
  const [values, setValues] = useState(record.values_json || { performance: {}, technical: {}, negative: {}, group: {} });
  const [roundNumber, setRoundNumber] = useState(record.round_number);
  const [judgeName, setJudgeName] = useState(record.judge_name || '');
  const [minutes, setMinutes] = useState(
    record.round_time_seconds != null ? String(Math.floor(record.round_time_seconds / 60)) : ''
  );
  const [seconds, setSeconds] = useState(
    record.round_time_seconds != null ? String(record.round_time_seconds % 60) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateScore(record.id, {
        values,
        round_number: Number(roundNumber) || record.round_number,
        judge_name: judgeName,
        round_time_seconds: roundTimeToSeconds(minutes, seconds),
      });
      onSaved();
    } catch (e) {
      setError(e.message || 'خطا در ذخیره‌سازی');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-card record-modal">
        <h3>{readOnly ? 'مشاهده رکورد امتیاز' : 'ویرایش رکورد امتیاز'}</h3>
        <div className="record-modal-meta">
          <div><span>تیم</span><strong>{record.team_name}</strong></div>
          <div><span>لیگ</span><strong>{leagueConfig.label}</strong></div>
          <label>
            <span>شماره راند</span>
            <input
              type="number"
              min={1}
              value={roundNumber}
              onChange={(e) => setRoundNumber(e.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            <span>زمان راند</span>
            <div className="time-inputs" dir="ltr" title="دقیقه : ثانیه">
              <input
                type="number"
                min={0}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                className="time-box"
                aria-label="دقیقه"
                disabled={readOnly}
              />
              <span className="time-sep" aria-hidden="true">:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                placeholder="00"
                className="time-box"
                aria-label="ثانیه"
                disabled={readOnly}
              />
            </div>
          </label>
          <label>
            <span>نام داور</span>
            <input value={judgeName} onChange={(e) => setJudgeName(e.target.value)} placeholder="اختیاری" disabled={readOnly} />
          </label>
        </div>

        <ScoreForm league={leagueConfig} values={values} onValuesChange={setValues} readOnly={readOnly} />

        {error && <p className="login-error">{error}</p>}

        <div className="confirm-actions">
          {!readOnly && (
            <button type="button" className="primary" disabled={saving} onClick={save}>
              {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          )}
          <button type="button" disabled={saving} onClick={onClose}>
            {readOnly ? 'بستن' : 'انصراف'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ config }) {
  const [league, setLeague] = useState('Junior');
  const [{ data: scores, loading }, reload] = useAsync(() => api.getScores({ league }), [league]);
  const [modal, setModal] = useState(null); // { mode: 'view' | 'edit', record }

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
            <th>تیم</th><th>راند</th><th>زمان</th><th>عملکرد</th><th>فنی</th><th>منفی</th><th>گروهی</th><th>نهایی</th><th>داور</th><th></th>
          </tr>
        </thead>
        <tbody>
          {(scores || []).map((s) => (
            <tr key={s.id}>
              <td>{s.team_name}</td>
              <td>{s.round_number}</td>
              <td><span className="num-ltr" dir="ltr">{formatRoundTime(s.round_time_seconds)}</span></td>
              <td><ScoreNum value={s.performance_total} /></td>
              <td><ScoreNum value={s.technical_total} /></td>
              <td><ScoreNum value={s.negative_total} /></td>
              <td><ScoreNum value={s.group_total} /></td>
              <td><strong><ScoreNum value={s.final_total} /></strong></td>
              <td>{s.judge_name || '-'}</td>
              <td className="row-actions">
                <button className="link" onClick={() => setModal({ mode: 'view', record: s })}>نمایش</button>
                <button className="link" onClick={() => setModal({ mode: 'edit', record: s })}>ویرایش</button>
                <button className="link-danger" onClick={() => remove(s.id)}>حذف</button>
              </td>
            </tr>
          ))}
          {(scores || []).length === 0 && !loading && (
            <tr><td colSpan={10} className="muted">رکوردی ثبت نشده</td></tr>
          )}
        </tbody>
      </table>

      {modal && (
        <ScoreRecordModal
          mode={modal.mode}
          record={modal.record}
          config={config}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload(); }}
        />
      )}
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
          <tr><th>رتبه</th><th>تیم</th><th>بهترین امتیاز</th><th>زمان بهترین راند</th><th>تعداد راندها</th></tr>
        </thead>
        <tbody>
          {(rows || []).map((r, i) => (
            <tr key={r.team_id}>
              <td>{i + 1}</td>
              <td>{r.team_name}</td>
              <td><strong><ScoreNum value={r.best_score} /></strong></td>
              <td><span className="num-ltr" dir="ltr">{formatRoundTime(r.best_time_seconds)}</span></td>
              <td>{r.rounds_played}</td>
            </tr>
          ))}
          {(rows || []).length === 0 && !loading && (
            <tr><td colSpan={5} className="muted">تیمی ثبت نشده</td></tr>
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
      <p>یک فایل Excel شامل تمام امتیازات<p>
        {league
          ? 'یک فایل Excel شامل امتیازات و جدول رده‌بندی همین لیگ (در دو تب جداگانه) دانلود می‌شود.'
          : 'یک فایل Excel شامل تمام لیگ‌ها دانلود می‌شود؛ هر لیگ در تب امتیازات و تب رده‌بندی مخصوص به خودش قرار می‌گیرد.'}
      </p> و جدول رده‌بندی دانلود می‌شود.</p>
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

  const tabs = [
    { id: 'teams', label: 'تیم‌ها' },
    { id: 'entry', label: 'ثبت امتیاز' },
    { id: 'history', label: 'سوابق' },
    { id: 'leaderboard', label: 'رده‌بندی' },
    { id: 'export', label: 'خروجی اکسل' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <div className="app-logo-wrap">
              <img src={logo} alt="Pishnam Robotics Academy" className="app-logo" />
            </div>
            <div className="app-header-text">
              <h1>سامانه داوری مسابقات پیشکاپ دوره چهارم</h1>
              <p className="subtitle">
                <span className="league-chip">Junior</span>
                <span className="league-chip">Advance Junior</span>
                <span className="league-chip">Senior</span>
              </p>
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={logout} aria-label="خروج از حساب">
            خروج
          </button>
        </div>
      </header>
      <nav className="tabs" aria-label="ناوبری اصلی">
        <div className="tabs-inner">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
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
