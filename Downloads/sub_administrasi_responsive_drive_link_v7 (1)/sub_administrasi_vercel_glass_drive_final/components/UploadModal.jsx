'use client';

import { useRef, useState } from 'react';

export default function UploadModal({ open, folder, onClose, onUploaded, onToast }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [conflict, setConflict] = useState(null);

  if (!open) return null;

  function reset() {
    setFile(null);
    setProgress(0);
    setUploading(false);
    setConflict(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function close() {
    if (uploading) return;
    reset();
    onClose();
  }

  function upload(conflictMode = 'cancel') {
    if (!file) {
      onToast('Pilih file terlebih dahulu.', 'error');
      return;
    }

    setUploading(true);
    setProgress(0);
    setConflict(null);

    const form = new FormData();
    form.append('file', file);
    form.append('folderId', folder?.id || '');
    form.append('conflict', conflictMode);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/drive/upload');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || '{}'); } catch {}
      setUploading(false);
      if (xhr.status === 409) {
        setConflict(data.message || 'File dengan nama sama sudah ada.');
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || data.ok === false) {
        onToast(data.message || 'Upload gagal.', 'error');
        return;
      }
      setProgress(100);
      onToast('Upload berhasil.', 'success');
      onUploaded(data.item);
      reset();
      onClose();
    };
    xhr.onerror = () => {
      setUploading(false);
      onToast('Upload gagal karena koneksi terputus.', 'error');
    };
    xhr.send(form);
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="modal-card glass-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Upload File</p>
            <h2>{folder?.name || 'Folder utama'}</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Tutup">×</button>
        </div>

        <label className="drop-zone">
          <input ref={inputRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <span className="drop-icon">⇪</span>
          <strong>{file ? file.name : 'Pilih file untuk diupload'}</strong>
          <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, gambar, dokumen, spreadsheet, video, ZIP, dan file teks.'}</small>
        </label>

        <div className="progress-shell">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {conflict ? (
          <div className="conflict-box">
            <strong>{conflict}</strong>
            <span>Pilih tindakan untuk nama file yang sama.</span>
            <div className="modal-actions wrap-actions">
              <button className="ghost-button" disabled={uploading} onClick={() => upload('replace')}>Replace</button>
              <button className="ghost-button" disabled={uploading} onClick={() => upload('rename')}>Rename otomatis</button>
              <button className="danger-button" disabled={uploading} onClick={() => setConflict(null)}>Cancel</button>
            </div>
          </div>
        ) : null}

        <div className="modal-actions">
          <button className="ghost-button" onClick={close} disabled={uploading}>Batal</button>
          <button className="primary-button" onClick={() => upload('cancel')} disabled={uploading || !file}>
            {uploading ? <span className="spinner" /> : null}
            {uploading ? 'Mengupload...' : 'Upload'}
          </button>
        </div>
      </section>
    </div>
  );
}
