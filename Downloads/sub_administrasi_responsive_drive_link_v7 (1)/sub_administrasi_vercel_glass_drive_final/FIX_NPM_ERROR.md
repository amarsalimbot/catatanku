# Perbaikan npm error: Exit handler never called

Error ini berasal dari npm di Windows, cache npm, atau lockfile lama yang berisi registry tidak cocok.
Versi ini sudah diperbaiki dengan:

1. `package-lock.json` lama dihapus agar npm membuat lockfile baru di komputer Anda.
2. `.npmrc` ditambahkan agar install memakai registry publik npm.
3. `install-windows.bat` ditambahkan untuk membersihkan cache dan install ulang otomatis.

## Cara paling mudah di Windows

Buka CMD di folder project, lalu jalankan:

```bat
install-windows.bat
```

Setelah selesai:

```bat
npm run dev
```

## Cara manual

```bat
npm cache clean --force
rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
npm config set registry https://registry.npmjs.org/
npm install --registry=https://registry.npmjs.org/ --no-audit --no-fund
npm run dev
```

## Jika masih gagal

Cek versi:

```bat
node -v
npm -v
```

Gunakan Node.js LTS versi 20 atau 22. Setelah update Node.js, tutup CMD, buka lagi, lalu jalankan `install-windows.bat`.
