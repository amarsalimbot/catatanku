# Perbaikan error AUTH_SECRET

Error:

```txt
Aplikasi mengalami masalah
AUTH_SECRET belum valid. Isi minimal 32 karakter
```

Penyebab:

`AUTH_SECRET` kosong, terlalu pendek, atau belum diisi di `.env.local` / Vercel Environment Variables.

## Perbaikan lokal Windows

Jalankan di folder project:

```bat
fix-auth-secret-windows.bat
npm run dev
```

Atau jalankan manual:

```bat
npm run fix-auth-secret
npm run dev
```

## Perbaikan Vercel

Buka:

Project Vercel -> Settings -> Environment Variables

Tambahkan:

```env
AUTH_SECRET=sub-administrasi-pembangunan-vercel-auth-secret-2026-64chars
```

Nilai harus minimal 32 karakter. Lebih aman buat secret baru:

```bat
npm run generate-auth-secret
```

Salin hasilnya ke Vercel sebagai `AUTH_SECRET`, lalu redeploy.
