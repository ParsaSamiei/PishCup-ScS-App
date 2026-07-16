import React, { useState } from 'react';
import logo from './assets/Pishnam_logo.png';
import { api } from './api.js';

function EyeIcon({ crossed }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <line x1="3" y1="21" x2="21" y2="3" />}
    </svg>
  );
}

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login(username, password);
      onSuccess();
    } catch (err) {
      setError(err.message || 'ورود ناموفق بود');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="Pishnam Robotics Academy" className="login-logo" />
        <h1>سامانه داوری مسابقات پیشکاپ دوره چهارم</h1>
        <p className="login-subtitle">ورود فقط برای داوران و مسئولین برگزاری</p>

        <form onSubmit={submit} className="login-form">
          <label>
            نام کاربری
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            رمز عبور
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                tabIndex={-1}
              >
                <EyeIcon crossed={showPassword} />
              </button>
            </div>
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="primary login-submit" disabled={loading}>
            {loading ? 'در حال ورود...' : 'ورود به سامانه'}
          </button>
        </form>
      </div>
    </div>
  );
}
