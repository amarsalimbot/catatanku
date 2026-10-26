'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Login gagal.');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="login-hero glass-card reveal-card">
        <div className="brand-mark logo-mark"><img src="/branding/tanah-bumbu-logo.png" alt="Logo Tanah Bumbu" /></div>
        <p className="eyebrow">Drive Tanah Bumbu</p>
        <h1>SUB Administrasi Pembangunan</h1>
        <p className="muted-text">Dashboard file internal dengan tema spatial UI, wallpaper ruangan, ikon file sesuai jenis dokumen, upload folder aktif, dan sinkronisasi Drive dari server.</p>
        <div className="login-badges">
          <span>Secure session</span>
          <span>Drive sync</span>
          <span>Mobile ready</span>
        </div>
      </section>

      <form className="login-card glass-card reveal-card delay-one" onSubmit={submit}>
        <div>
          <p className="eyebrow">Admin Login</p>
          <h2>Masuk Dashboard</h2>
        </div>

        <label className="field-label">
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Masukkan username" required />
        </label>

        <label className="field-label">
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Masukkan password" required />
        </label>

        {error ? <div className="alert error-alert">{error}</div> : null}

        <button className="primary-button full-button" disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Memeriksa...' : 'Login'}
        </button>
      </form>
    </main>
  );
}
