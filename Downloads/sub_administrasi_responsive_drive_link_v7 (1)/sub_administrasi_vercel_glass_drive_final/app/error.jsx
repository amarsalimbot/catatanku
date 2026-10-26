'use client';

export default function ErrorPage({ error, reset }) {
  return (
    <main className="center-page">
      <section className="glass-card notfound-card">
        <p className="eyebrow">ERROR</p>
        <h1>Aplikasi mengalami masalah</h1>
        <p>{error?.message || 'Terjadi gangguan saat memuat halaman.'}</p>
        <button className="primary-button" onClick={reset}>Muat ulang</button>
      </section>
    </main>
  );
}
