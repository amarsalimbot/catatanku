'use client';

import { useState } from 'react';

export default function CreateFolderModal({ open, parentFolder, onClose, onCreated, onToast }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [conflict, setConflict] = useState('');

  if (!open) return null;

  function reset() {
    setName('');
    setCreating(false);
    setConflict('');
  }

  function close() {
    if (creating) return;
    reset();
    onClose();
  }

  async function submit(conflictMode = 'cancel') {
    const finalName = name.trim();
    if (!finalName) {
      onToast('Nama folder wajib diisi.', 'error');
      return;
    }

    setCreating(true);
    setConflict('');
    try {
      const response = await fetch('/api/drive/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentFolderId: parentFolder?.id || '',
          name: finalName,
          conflict: conflictMode
        })
      });
      const data = await response.json();
      if (response.status === 409) {
        setConflict(data.message || 'Folder dengan nama sama sudah ada.');
        return;
      }
      if (!response.ok || !data.ok) throw new Error(data.message || 'Tambah folder gagal.');
      onCreated(data.item);
      onToast('Folder berhasil dibuat.', 'success');
      reset();
      onClose();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="modal-card glass-card compact-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Tambah Folder</p>
            <h2>{parentFolder?.name || 'Folder utama'}</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Tutup">×</button>
        </div>

        <label className="field-label">
          Nama folder baru
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Dokumen Rencana 2026" autoFocus />
        </label>

        {conflict ? (
          <div className="conflict-box">
            <strong>{conflict}</strong>
            <span>Pilih rename otomatis untuk membuat folder baru dengan nama unik.</span>
            <div className="modal-actions wrap-actions">
              <button className="ghost-button" disabled={creating} onClick={() => submit('rename')}>Rename otomatis</button>
              <button className="danger-button" disabled={creating} onClick={() => setConflict('')}>Cancel</button>
            </div>
          </div>
        ) : null}

        <div className="modal-actions">
          <button className="ghost-button" onClick={close} disabled={creating}>Batal</button>
          <button className="primary-button" onClick={() => submit('cancel')} disabled={creating || !name.trim()}>
            {creating ? <span className="spinner" /> : null}
            {creating ? 'Membuat...' : 'Buat Folder'}
          </button>
        </div>
      </section>
    </div>
  );
}
