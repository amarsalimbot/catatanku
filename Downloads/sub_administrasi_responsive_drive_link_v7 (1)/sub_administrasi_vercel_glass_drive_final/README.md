# SUB Administrasi Drive Glass

Aplikasi Next.js untuk manajemen file Google Drive folder SUB ADMINISTRASI PEMBANGUNAN. Project ini siap untuk Vercel, memakai login server-side, session cookie HTTP-only, dashboard glassmorphism, upload per folder, pencarian, filter tipe file, grid/list view, breadcrumb, folder expand/collapse, settings admin, dan API route server agar credential tidak terekspos ke client.

## Revisi terbaru

- Layout responsif diperbaiki untuk mode layar terbagi/split screen. Pada lebar layar sedang, sidebar otomatis berubah menjadi drawer supaya konten tidak menyempit.
- Tampilan dibuat lebih compact lagi: header, hero, statistik, tombol, dan card file/folder lebih kecil agar nyaman di layar sempit.
- Tombol/link Google Drive ditambahkan di bagian atas folder aktif, hero folder, panel detail, dan card folder agar setiap folder bisa langsung dibuka di Google Drive.
- Logo folder tersimpan online melalui Upstash Redis sehingga bisa tampil di browser/perangkat lain.
- Tampilan dibuat lebih transparan agar background ruangan terlihat jelas di balik panel.
- Background ruangan dipasang sebagai latar aplikasi dan login memakai file WebP teroptimasi agar lebih ringan.
- Fitur ganti background ditambahkan pada dashboard dan halaman settings. Background custom otomatis dikompres dan disimpan di browser perangkat.
- Loading daftar file dibuat lebih cepat dengan page size awal yang lebih ringan, cache server singkat, lazy image decoding, dan pengurangan animasi berat.
- Tema UI diganti ke spatial UI seperti referensi yang diberikan.
- Logo Tanah Bumbu dipasang pada sidebar, drawer mobile, dan login.
- Color grading diganti ke dark spatial glass, gold, green, dan neutral studio tone.
- Layout dashboard dibuat seperti workspace profesional dengan topbar, hero folder, command center, browser card, dan detail rail.
- Ikon file dibuat sesuai jenis file, PDF, Excel, Word, PowerPoint, gambar, video, arsip, dan folder.
- Card file dan list view diperbarui agar metadata lebih jelas dan modern.
- Root aplikasi tetap dibatasi ke folder SUB ADMINISTRASI PEMBANGUNAN.
- Tambah folder baru dan logo gambar per folder tetap tersedia.

## Login awal

Username:

```txt
admin
```

Password:

```txt
admin12345
```

Jika password selalu salah, jalankan:

```bat
fix-login-windows.bat
npm run dev
```

Penyebab paling sering adalah karakter `$` pada `ADMIN_PASSWORD_HASH` belum ditulis sebagai `\$` di `.env.local`. Alternatif yang lebih aman adalah memakai `ADMIN_PASSWORD_HASH_B64`.

## Jalankan di local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka:

```txt
http://localhost:3000
```

Di Windows, jika npm error, jalankan:

```bat
install-windows.bat
```

## Environment variable penting

```env
AUTH_SECRET=sub-administrasi-pembangunan-vercel-auth-secret-2026-64chars
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH_B64=cGJrZGYyX3NoYTI1NiQyMTAwMDAkYTRmNmFhMTkzOGViMTc1YjcxYzRiYjdmNmEyZTY0MWMkYTA4NDUxNmI1MTQzYjM0NGU3M2UyNjBlYTk1YzRjYTExMjljODk1NDUyODdmYTYwNTE0NmNkY2VjYWZhZGQxMw==
SESSION_HOURS=8

NEXT_PUBLIC_DRIVE_ROOT_NAME=SUB ADMINISTRASI PEMBANGUNAN
DRIVE_ROOT_FOLDER_NAME=SUB ADMINISTRASI PEMBANGUNAN
DRIVE_ROOT_FOLDER_ID=
NEXT_PUBLIC_DRIVE_ROOT_FOLDER_ID=
DRIVE_ASSUME_SCRIPT_ROOT_IS_SCOPED=true

DRIVE_PROVIDER=apps-script
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbw6nMruBdSuLHnt8nGf5Ya2NkIPH5whfrjftj4DoJ8S-aCcPC538W5-ULDECEzB4qRB/exec

MAX_UPLOAD_MB=25
MAX_FOLDER_LOGO_MB=5
NEXT_PUBLIC_DRIVE_PAGE_SIZE=48
DRIVE_LIST_CACHE_SECONDS=18
```

Isi `DRIVE_ROOT_FOLDER_ID` dengan ID folder SUB ADMINISTRASI PEMBANGUNAN agar hasil paling stabil. Isi juga `NEXT_PUBLIC_DRIVE_ROOT_FOLDER_ID` dengan ID yang sama agar tombol Google Drive untuk folder root muncul di dashboard. Jika kosong, aplikasi akan memakai nama folder `SUB ADMINISTRASI PEMBANGUNAN`.

## Struktur project

```txt
sub_administrasi_vercel_glass_drive_final/
├─ app/
│  ├─ api/
│  │  ├─ admin/settings/route.js
│  │  ├─ auth/login/route.js
│  │  ├─ auth/logout/route.js
│  │  ├─ auth/me/route.js
│  │  └─ drive/
│  │     ├─ list/route.js
│  │     ├─ upload/route.js
│  │     ├─ folder/route.js
│  │     ├─ folder-logo/route.js
│  │     ├─ rename/route.js
│  │     └─ delete/route.js
│  ├─ dashboard/page.jsx
│  ├─ login/page.jsx
│  ├─ settings/page.jsx
│  ├─ error.jsx
│  ├─ not-found.jsx
│  ├─ layout.jsx
│  └─ globals.css
├─ components/
│  ├─ AdminSettings.jsx
│  ├─ BackgroundRuntime.jsx
│  ├─ BackgroundSwitcher.jsx
│  ├─ DriveDashboard.jsx
│  ├─ CreateFolderModal.jsx
│  ├─ FileDetailModal.jsx
│  ├─ FolderLogoModal.jsx
│  ├─ LoginForm.jsx
│  └─ UploadModal.jsx
├─ lib/
│  ├─ apps-script-drive.js
│  ├─ drive-common.js
│  ├─ drive-service.js
│  ├─ google-drive.js
│  ├─ security.js
│  ├─ session.js
│  └─ store.js
├─ apps-script/Code.gs
├─ public/
│  └─ branding/
│     ├─ room-wallpaper.png
│     ├─ room-wallpaper-optimized.webp
│     └─ tanah-bumbu-logo.png
├─ scripts/
│  ├─ hash-password.js
│  ├─ reset-local-auth.js
│  └─ fix-login-env.ps1
├─ .env.example
├─ .npmrc
├─ install-windows.bat
├─ fix-login-windows.bat
├─ next.config.mjs
├─ jsconfig.json
└─ package.json
```

## Deploy ke Vercel

1. Upload project ke GitHub.
2. Import repository di Vercel.
3. Buka Project Settings, Environment Variables.
4. Salin isi `.env.example`.
5. Isi `AUTH_SECRET` dengan string random panjang.
6. Isi `DRIVE_ROOT_FOLDER_ID` dengan ID folder SUB ADMINISTRASI PEMBANGUNAN jika tersedia.
7. Deploy.

Untuk fitur ganti username/password dan logo folder online lintas perangkat di Vercel, isi juga:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
FOLDER_LOGO_SETTINGS_KEY=sub_administrasi_folder_logos
SETTINGS_KEY=sub_administrasi_auth
```

Tanpa Redis, settings dan logo folder tidak tersimpan permanen/lintas perangkat di Vercel.

## Mode Apps Script

URL Apps Script lama sudah dipasang di `.env.example`.

Jika upload, rename, delete, atau pembatasan folder belum berjalan, pakai file:

```txt
apps-script/Code.gs
```

Langkah Apps Script:

1. Buka `script.google.com`.
2. Buat project baru atau buka project lama.
3. Tempel semua isi `apps-script/Code.gs`.
4. Buka Project Settings, Script Properties.
5. Tambahkan `ROOT_FOLDER_ID` dengan ID folder SUB ADMINISTRASI PEMBANGUNAN.
6. Tambahkan `ROOT_FOLDER_NAME` dengan nilai `SUB ADMINISTRASI PEMBANGUNAN`.
7. Deploy, New deployment, Web app.
8. Execute as: Me.
9. Who has access: Anyone atau sesuai kebutuhan.
10. Salin URL `/exec` ke `APPS_SCRIPT_URL`.

## Mode Google Drive API langsung

Set env:

```env
DRIVE_PROVIDER=google
GOOGLE_SERVICE_ACCOUNT_EMAIL=email-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
DRIVE_ROOT_FOLDER_ID=id_folder_SUB_ADMINISTRASI_PEMBANGUNAN
GOOGLE_SHARED_DRIVE_ID=
```

Bagikan folder SUB ADMINISTRASI PEMBANGUNAN ke email service account. Beri akses Editor jika perlu upload, rename, dan delete.

## Fitur utama

- Login admin dengan password hash PBKDF2.
- Session cookie HTTP-only.
- Dashboard spatial UI dengan glassmorphism modern.
- Wallpaper ruangan sebagai latar aplikasi.
- Logo Tanah Bumbu sebagai identitas aplikasi.
- Ikon jenis file untuk PDF, Excel, Word, PowerPoint, gambar, video, dan folder.
- Sidebar folder dan mobile drawer.
- Expand dan collapse subfolder.
- Root Drive dibatasi ke SUB ADMINISTRASI PEMBANGUNAN.
- Breadcrumb folder.
- Search dengan debounce.
- Filter tipe file.
- Grid view dan list view.
- Upload per folder dengan progress bar.
- Tambah folder baru di folder yang sedang dibuka.
- Logo gambar custom untuk setiap folder.
- Logo folder tersimpan online lewat Upstash Redis agar tampil lintas browser/perangkat.
- Konflik nama file: replace, rename otomatis, cancel.
- Refresh tanpa halaman blank.
- Skeleton loading, empty state, error state, dan toast.
- Detail modal dengan buka, download, copy link, rename, dan delete.
- Pagination untuk folder besar.

## Catatan produksi

Simpan credential hanya di Environment Variables Vercel. Jangan menaruh private key, token, atau password di component React client.

## Perbaikan error AUTH_SECRET

Jika muncul pesan `AUTH_SECRET belum valid. Isi minimal 32 karakter`, jalankan perintah ini di folder project:

```bat
npm run fix-auth-secret
npm run dev
```

Di Windows, bisa juga klik atau jalankan:

```bat
fix-auth-secret-windows.bat
```

Untuk Vercel, isi Environment Variable berikut dengan nilai acak minimal 32 karakter:

```env
AUTH_SECRET=sub-administrasi-pembangunan-vercel-auth-secret-2026-64chars
```

Lebih aman jika membuat secret baru:

```bat
npm run generate-auth-secret
```

Salin hasilnya ke `AUTH_SECRET` di `.env.local` dan di Vercel Environment Variables.


## Fitur tambah folder dan logo folder

Tambah folder:

1. Buka dashboard.
2. Masuk ke folder tujuan.
3. Klik `Tambah Folder`.
4. Isi nama folder.
5. Jika nama sama, pilih rename otomatis atau cancel.

Logo folder:

1. Buka dashboard.
2. Pada card atau baris folder, klik `Tambah logo` atau `Logo`.
3. Pilih gambar PNG, JPG, WEBP, atau SVG.
4. Klik `Simpan Logo Online`.
5. Logo tampil di card folder, list folder, sidebar tree, dan detail folder.

Penyimpanan logo:

- Logo folder disimpan sebagai gambar WebP kecil di Upstash Redis dengan key `FOLDER_LOGO_SETTINGS_KEY`.
- Karena disimpan di Redis, logo tampil di perangkat/browser lain setelah daftar folder dimuat ulang.
- Isi `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, dan `FOLDER_LOGO_SETTINGS_KEY` di Vercel.
- Tanpa Redis, aplikasi akan menolak penyimpanan logo online agar tidak membingungkan pengguna.

Setelah update Apps Script, redeploy Web App dan salin URL `/exec` terbaru ke `APPS_SCRIPT_URL` jika URL berubah.
