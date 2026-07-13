import React, { useState } from 'react';
import logo from './assets/pishnam_logo.png';
import { api } from './api.js';

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
        <h1>سامانه داوری مسابقات پیشکاپ</h1>
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
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
