import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="center-page">
      <section className="glass-card notfound-card">
        <p className="eyebrow">404</p>
        <h1>Halaman tidak ditemukan</h1>
        <p>Alamat yang dibuka tidak tersedia di aplikasi ini.</p>
        <Link className="primary-button" href="/dashboard">Kembali ke dashboard</Link>
      </section>
    </main>
  );
}
