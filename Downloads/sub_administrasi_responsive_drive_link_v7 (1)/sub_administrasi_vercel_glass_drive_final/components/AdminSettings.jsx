'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BackgroundSwitcher from './BackgroundSwitcher';

export default function AdminSettings({ username }) {
  const [form, setForm] = useState({ username: username || '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [writable, setWritable] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/settings')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok || !data.ok) throw new Error(data.message || 'Gagal membaca settings.');
        setForm((prev) => ({ ...prev, username: data.username || username || '' }));
        setWritable(Boolean(data.writable));
      })
      .catch((err) => setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [username]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (form.newPassword && form.newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Konfirmasi password baru tidak sama.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, currentPassword: form.currentPassword, newPassword: form.newPassword })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Gagal menyimpan settings.');
      setMessage('Settings admin berhasil disimpan. Login berikutnya memakai data baru.');
      setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell settings-shell">
      <div className="animated-wallpaper" />
      <aside className="sidebar glass-card desktop-sidebar">
        <div className="brand-row">
          <div className="brand-mark small">SA</div>
          <div>
            <strong>SUB Administrasi</strong>
            <span>Settings</span>
          </div>
        </div>
        <nav className="side-nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/settings" className="active">Admin Settings</Link>
        </nav>
      </aside>

      <section className="content-area narrow-content">
        <header className="topbar glass-card">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Pengaturan Login</h1>
          </div>
          <div className="settings-top-actions">
            <BackgroundSwitcher onToast={(text, type) => (type === 'error' ? setError(text) : setMessage(text))} />
            <Link className="ghost-button" href="/dashboard">Kembali</Link>
          </div>
        </header>

        <form className="settings-card glass-card reveal-card" onSubmit={submit}>
          {loading ? <div className="skeleton-block tall" /> : null}

          {!loading ? (
            <>
              <div className="settings-note">
                <strong>Status penyimpanan</strong>
                <span>{writable ? 'Siap menyimpan perubahan.' : 'Mode produksi butuh Upstash Redis agar perubahan tersimpan permanen.'}</span>
              </div>

              <label className="field-label">
                Username baru
                <input value={form.username} onChange={(e) => updateField('username', e.target.value)} minLength={3} required />
              </label>

              <label className="field-label">
                Password lama
                <input value={form.currentPassword} onChange={(e) => updateField('currentPassword', e.target.value)} type="password" autoComplete="current-password" required />
              </label>

              <label className="field-label">
                Password baru
                <input value={form.newPassword} onChange={(e) => updateField('newPassword', e.target.value)} type="password" autoComplete="new-password" placeholder="Kosongkan jika tidak diganti" />
              </label>

              <label className="field-label">
                Konfirmasi password baru
                <input value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} type="password" autoComplete="new-password" placeholder="Ulangi password baru" />
              </label>

              {error ? <div className="alert error-alert">{error}</div> : null}
              {message ? <div className="alert success-alert">{message}</div> : null}

              <button className="primary-button" disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                {saving ? 'Menyimpan...' : 'Simpan settings'}
              </button>
            </>
          ) : null}
        </form>
      </section>
    </main>
  );
}
