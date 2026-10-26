'use client';

import { useRef, useState } from 'react';

const MAX_LOGO_SIZE = 8 * 1024 * 1024;
const LOGO_CANVAS_SIZE = 300;
const MAX_LOGO_DATA_URL = 280_000;

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gambar logo gagal dibaca.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar logo tidak valid atau rusak.'));
    image.src = src;
  });
}

async function makeOptimizedLogo(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Logo folder harus berupa gambar PNG, JPG, WEBP, GIF, atau SVG.');
  if (file.size > MAX_LOGO_SIZE) throw new Error('Ukuran logo terlalu besar. Gunakan gambar maksimal 8 MB.');

  const src = await readImage(file);
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = LOGO_CANVAS_SIZE;
  canvas.height = LOGO_CANVAS_SIZE;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Browser tidak mendukung proses logo.');

  context.clearRect(0, 0, LOGO_CANVAS_SIZE, LOGO_CANVAS_SIZE);
  const side = Math.min(image.width, image.height);
  const sx = Math.max(0, Math.round((image.width - side) / 2));
  const sy = Math.max(0, Math.round((image.height - side) / 2));
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, sx, sy, side, side, 0, 0, LOGO_CANVAS_SIZE, LOGO_CANVAS_SIZE);

  const qualities = [0.78, 0.68, 0.58, 0.48];
  let lastDataUrl = '';
  for (const quality of qualities) {
    const dataUrl = canvas.toDataURL('image/webp', quality);
    lastDataUrl = dataUrl;
    if (dataUrl.length <= MAX_LOGO_DATA_URL) return dataUrl;
  }

  if (lastDataUrl.length <= MAX_LOGO_DATA_URL + 90_000) return lastDataUrl;
  throw new Error('Logo masih terlalu besar setelah dikompres. Gunakan gambar resolusi lebih kecil.');
}

export default function FolderLogoModal({ folder, onClose, onChanged, onToast }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  if (!folder) return null;

  function close() {
    if (uploading) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
    setProgress(0);
    onClose();
  }

  function selectFile(nextFile) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile || null);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : '');
    setProgress(nextFile ? 20 : 0);
  }

  async function upload() {
    if (!file) {
      onToast('Pilih gambar logo terlebih dahulu.', 'error');
      return;
    }

    setUploading(true);
    setProgress(35);

    try {
      const logoDataUrl = await makeOptimizedLogo(file);
      setProgress(70);

      const response = await fetch('/api/drive/folder-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folder.id,
          folderName: folder.name,
          name: file.name,
          logoDataUrl
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || 'Logo folder gagal disimpan.');

      setProgress(100);
      onChanged(data.item || {
        ...folder,
        folderLogoFileId: `logo-${folder.id}`,
        folderLogoName: file.name,
        folderLogoLink: logoDataUrl,
        folderLogoThumbnailLink: logoDataUrl,
        folderLogoWebViewLink: logoDataUrl
      });
      onToast(data.persisted === false
        ? 'Logo tampil di perangkat ini, tetapi belum tersimpan online. Isi Upstash Redis di Vercel agar sinkron ke semua device.'
        : 'Logo folder berhasil disimpan online dan akan tampil di device lain.', 'success');
      close();
    } catch (error) {
      setUploading(false);
      onToast(error.message || 'Logo folder gagal disimpan.', 'error');
    }
  }

  const currentLogo = folder.folderLogoThumbnailLink || folder.folderLogoLink;

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="modal-card glass-card compact-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Logo Folder</p>
            <h2>{folder.name}</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Tutup">×</button>
        </div>

        <div className="logo-editor-preview">
          {preview || currentLogo ? <img src={preview || currentLogo} alt={folder.name} /> : <span>📁</span>}
        </div>

        <label className="drop-zone compact-drop">
          <input ref={inputRef} type="file" accept="image/*" onChange={(e) => selectFile(e.target.files?.[0] || null)} />
          <span className="drop-icon">◎</span>
          <strong>{file ? file.name : 'Pilih gambar logo folder'}</strong>
          <small>Logo akan disimpan online melalui Upstash Redis, sehingga tampil juga di perangkat lain.</small>
        </label>

        <div className="progress-shell">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="modal-actions">
          <button className="ghost-button" onClick={close} disabled={uploading}>Batal</button>
          <button className="primary-button" onClick={upload} disabled={uploading || !file}>
            {uploading ? <span className="spinner" /> : null}
            {uploading ? 'Menyimpan...' : 'Simpan Logo Online'}
          </button>
        </div>
      </section>
    </div>
  );
}
