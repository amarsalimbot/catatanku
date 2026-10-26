# Fix Upload Logo Folder - Izin Google Drive Apps Script

Error:

> Anda tidak memiliki izin untuk memanggil DriveApp.Folder.createFolder

Penyebabnya biasanya Apps Script belum mendapat scope Google Drive penuh atau deployment web app masih memakai versi lama.

## Langkah wajib

1. Buka project Google Apps Script yang dipakai aplikasi.
2. Ganti isi file `Code.gs` dengan file `apps-script/Code.gs` dari ZIP ini.
3. Aktifkan dan ganti file `appsscript.json`:
   - Klik **Project Settings**.
   - Aktifkan **Show “appsscript.json” manifest file in editor**.
   - Buka file `appsscript.json`.
   - Ganti isinya dengan file `apps-script/appsscript.json` dari ZIP ini.
4. Kembali ke editor `Code.gs`.
5. Pada dropdown function di bagian atas, pilih:

```text
setupDrivePermission
```

6. Klik **Run / Jalankan**.
7. Pilih akun Google yang sama dengan pemilik Drive.
8. Klik **Allow / Izinkan**.
9. Setelah berhasil, deploy ulang:
   - **Deploy**
   - **Manage deployments**
   - Klik ikon pensil/edit
   - **Version: New version**
   - **Deploy**

## Setting deployment yang benar

- **Execute as:** Me / Saya
- **Who has access:** Anyone / Siapa saja

## Catatan

Fungsi `setupDrivePermission` membuat folder/file tes sebentar lalu langsung memindahkannya ke Trash. Ini hanya untuk memaksa Google memunculkan izin Drive yang diperlukan oleh fitur upload logo, upload file, dan tambah folder.
