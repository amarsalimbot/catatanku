# Perbaikan login selalu password salah

Penyebab utama biasanya ada pada file `.env.local`. Hash password memakai karakter `$`. Pada Next.js, karakter `$` dalam file env diproses sebagai referensi variable. Jika tidak di-escape, nilai `ADMIN_PASSWORD_HASH` berubah dan login selalu gagal.

## Login awal

Username:

```txt
admin
```

Password:

```txt
admin12345
```

## Isi `.env.local` yang benar

Pastikan baris hash password seperti ini:

```env
ADMIN_PASSWORD_HASH=pbkdf2_sha256\$210000\$a4f6aa1938eb175b71c4bb7f6a2e641c\$a084516b5143b344e73e260ea95c4ca1129c89545287fa605146cdcecafadd13
```

Jangan tulis seperti ini:

```env
ADMIN_PASSWORD_HASH=pbkdf2_sha256$210000$a4f6aa1938eb175b71c4bb7f6a2e641c$a084516b5143b344e73e260ea95c4ca1129c89545287fa605146cdcecafadd13
```

## Cara cepat Windows

Jalankan:

```bat
fix-login-windows.bat
```

Lalu jalankan ulang server:

```bat
npm run dev
```

## Jika sebelumnya sempat mengganti password dari web

Pada local development, aplikasi menyimpan auth di `.data/auth.json`. Jika file itu berisi hash lama atau rusak, login juga gagal. Reset dengan:

```bat
npm run reset-local-auth
```

Lalu jalankan lagi:

```bat
npm run dev
```

## Buat password baru

```bat
npm run hash-password -- password-baru
```

Salin hasilnya ke `.env.local`, lalu beri escape pada semua karakter `$` menjadi `\$`.
