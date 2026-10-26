'use client';

import { useState } from 'react';

function formatSize(bytes) {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(bytes);
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function FileDetailModal({ item, onClose, onChanged, onDeleted, onToast }) {
  const [name, setName] = useState(item?.name || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  async function copyLink() {
    await navigator.clipboard.writeText(item.webViewLink || '');
    onToast('Link berhasil disalin.', 'success');
  }

  async function rename() {
    if (!name.trim() || name.trim() === item.name) return;
    setSaving(true);
    try {
      const response = await fetch('/api/drive/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: item.id, name: name.trim() })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Rename gagal.');
      onToast('Nama file berhasil diganti.', 'success');
      onChanged(data.item);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = window.confirm(item.type === 'folder' ? 'Pindahkan folder ini ke Trash Google Drive?' : 'Pindahkan file ini ke Trash Google Drive?');
    if (!ok) return;
    setDeleting(true);
    try {
      const response = await fetch('/api/drive/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: item.id })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Delete gagal.');
      onToast(item.type === 'folder' ? 'Folder dipindahkan ke Trash.' : 'File dipindahkan ke Trash.', 'success');
      onDeleted(item.id);
      onClose();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card detail-modal glass-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{item.type === 'folder' ? 'Detail Folder' : 'Detail File'}</p>
            <h2>{item.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup">×</button>
        </div>

        {item.type === 'folder' && (item.folderLogoThumbnailLink || item.folderLogoLink) ? (
          <img className="preview-image folder-detail-logo" src={item.folderLogoThumbnailLink || item.folderLogoLink} alt={item.name} />
        ) : item.kind === 'image' && item.thumbnailLink ? (
          <img className="preview-image" src={item.thumbnailLink} alt={item.name} />
        ) : (
          <div className="preview-placeholder">{item.type === 'folder' ? '📁' : '📄'}</div>
        )}

        <div className="detail-grid">
          <span>Tipe</span><strong>{item.kind?.toUpperCase() || '-'}</strong>
          <span>Ukuran</span><strong>{formatSize(item.size)}</strong>
          <span>Update</span><strong>{formatDate(item.modifiedTime)}</strong>
          <span>ID</span><strong className="mono-text">{item.id}</strong>
        </div>

        <label className="field-label">
          Rename
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="modal-actions wrap-actions">
          <a className="primary-button" href={item.webViewLink} target="_blank" rel="noreferrer">Buka</a>
          {item.webContentLink ? <a className="ghost-button" href={item.webContentLink} target="_blank" rel="noreferrer">Download</a> : null}
          <button className="ghost-button" onClick={copyLink}>Copy link</button>
          <button className="ghost-button" onClick={rename} disabled={saving}>{saving ? 'Menyimpan...' : 'Rename'}</button>
          <button className="danger-button" onClick={remove} disabled={deleting}>{deleting ? 'Menghapus...' : 'Delete'}</button>
        </div>
      </section>
    </div>
  );
}
