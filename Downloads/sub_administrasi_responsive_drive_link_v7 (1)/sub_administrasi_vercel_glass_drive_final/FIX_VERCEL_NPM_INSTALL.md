# Fix Vercel npm install error

Jika Vercel menampilkan error:

```text
npm error Exit handler never called!
Error: Command "npm install" exited with 1
```

Penyebab paling sering adalah bug npm pada runtime Node terbaru di Vercel. Project ini sudah dikunci memakai Node 20 dan npm 10 agar dependency install stabil.

File yang ditambahkan/diubah:

- `package.json` -> `engines.node` menjadi `20.x` dan `packageManager` menjadi `npm@10.8.2`
- `.nvmrc` -> `20`
- `vercel.json` -> install memakai `npm ci --no-audit --no-fund --prefer-offline`

Setelah upload ke GitHub, di Vercel lakukan Redeploy. Jika masih memakai cache lama, pilih **Redeploy > Clear cache and redeploy**.
