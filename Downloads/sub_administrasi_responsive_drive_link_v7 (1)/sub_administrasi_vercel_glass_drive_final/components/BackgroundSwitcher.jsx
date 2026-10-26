'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BACKGROUND_STORAGE_KEY,
  DEFAULT_BACKGROUND,
  DEFAULT_PANEL_TRANSPARENCY,
  PANEL_TRANSPARENCY_STORAGE_KEY,
  setAppBackground,
  setPanelTransparency
} from './BackgroundRuntime';

const COMPRESSION_ATTEMPTS = [
  { maxDimension: 1920, quality: 0.82 },
  { maxDimension: 1600, quality: 0.78 },
  { maxDimension: 1360, quality: 0.72 },
  { maxDimension: 1080, quality: 0.68 },
  { maxDimension: 900, quality: 0.62 },
  { maxDimension: 720, quality: 0.58 }
];
const MAX_DATA_URL_LENGTH = 2_850_000;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const PRESET_TRANSPARENCIES = [60, 78, 88];

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gambar gagal dibaca. Coba gunakan file JPG, PNG, atau WEBP lain.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gambar tidak valid atau rusak.'));
    img.src = src;
  });
}

function renderCompressedDataUrl(image, maxDimension, quality) {
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Browser tidak mendukung kompresi gambar.');

  context.fillStyle = '#111827';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/webp', quality);
}

async function compressBackground(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Pilih file gambar PNG, JPG, WEBP, atau GIF.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Ukuran gambar terlalu besar. Gunakan gambar maksimal 25 MB.');

  const dataUrl = await readImage(file);
  const image = await loadImage(dataUrl);
  let smallest = '';

  for (const attempt of COMPRESSION_ATTEMPTS) {
    const optimized = renderCompressedDataUrl(image, attempt.maxDimension, attempt.quality);
    if (!smallest || optimized.length < smallest.length) smallest = optimized;
    if (optimized.length <= MAX_DATA_URL_LENGTH) return optimized;
  }

  if (smallest && smallest.length <= MAX_DATA_URL_LENGTH + 200_000) return smallest;
  throw new Error('Background masih terlalu besar setelah dikompres. Gunakan gambar dengan resolusi lebih kecil.');
}

function saveBackgroundToStorage(value) {
  try {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, value);
  } catch (error) {
    const isQuotaError = error?.name === 'QuotaExceededError' || String(error?.message || '').toLowerCase().includes('quota');
    if (isQuotaError) {
      try { localStorage.removeItem(BACKGROUND_STORAGE_KEY); } catch {}
      throw new Error('Penyimpanan browser penuh. Background sudah dikompres, tetapi belum bisa disimpan. Hapus background lama atau gunakan gambar yang lebih kecil.');
    }
    throw new Error('Background gagal disimpan di browser.');
  }
}

function getPopoverPosition(anchor) {
  const margin = 12;
  const width = Math.min(400, Math.max(320, window.innerWidth - 24));
  const left = Math.max(margin, Math.min(anchor.right - width, window.innerWidth - width - margin));
  const top = Math.min(anchor.bottom + 12, window.innerHeight - margin - 120);
  return { left, top, width };
}

export default function BackgroundSwitcher({ onToast }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasCustom, setHasCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panelTransparency, setPanelTransparencyState] = useState(DEFAULT_PANEL_TRANSPARENCY);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 380 });
  const fileRef = useRef(null);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    try {
      setHasCustom(Boolean(localStorage.getItem(BACKGROUND_STORAGE_KEY)));
      const storedTransparency = Number(localStorage.getItem(PANEL_TRANSPARENCY_STORAGE_KEY));
      if (Number.isFinite(storedTransparency)) setPanelTransparencyState(storedTransparency);
    } catch {
      setHasCustom(false);
      setPanelTransparencyState(DEFAULT_PANEL_TRANSPARENCY);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition(getPopoverPosition(rect));
    };

    const onPointerDown = (event) => {
      const target = event.target;
      if (
        wrapperRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    updatePosition();
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  async function onPick(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const optimized = await compressBackground(file);
      saveBackgroundToStorage(optimized);
      setAppBackground(optimized);
      setHasCustom(true);
      window.dispatchEvent(new Event('sub-admin-background-changed'));
      onToast?.('Background berhasil diganti dan dioptimalkan.', 'success');
    } catch (error) {
      onToast?.(error.message || 'Background gagal diganti.', 'error');
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function changeTransparency(value) {
    const percent = setPanelTransparency(value);
    setPanelTransparencyState(percent);
    try {
      localStorage.setItem(PANEL_TRANSPARENCY_STORAGE_KEY, String(percent));
    } catch {
      onToast?.('Pengaturan transparansi tidak bisa disimpan di browser ini.', 'error');
    }
    window.dispatchEvent(new Event('sub-admin-transparency-changed'));
  }

  function applyPreset(percent) {
    changeTransparency(percent);
  }

  function resetBackground() {
    try {
      localStorage.removeItem(BACKGROUND_STORAGE_KEY);
    } catch {}
    setAppBackground(DEFAULT_BACKGROUND);
    setHasCustom(false);
    window.dispatchEvent(new Event('sub-admin-background-changed'));
    onToast?.('Background dikembalikan ke default.', 'success');
  }

  function resetTransparency() {
    changeTransparency(DEFAULT_PANEL_TRANSPARENCY);
    onToast?.('Transparansi panel dikembalikan ke default.', 'success');
  }

  const popover = open && mounted ? createPortal(
    <div className="bg-popover-portal" aria-hidden={!open}>
      <div
        ref={popoverRef}
        className="bg-popover glass-card"
        role="dialog"
        aria-modal="false"
        aria-label="Pengaturan background dan transparansi"
        style={{ position: 'fixed', left: position.left, top: position.top, width: position.width }}
      >
        <div>
          <strong>Background & transparansi</strong>
          <p>Upload gambar baru, atur tingkat transparansi panel, lalu lihat hasilnya langsung tanpa reload halaman.</p>
        </div>

        <div className="bg-live-preview" aria-hidden="true">
          <div className="bg-preview-card">
            <span className="bg-preview-chip">Preview</span>
            <div className="bg-preview-panel">Panel transparan {panelTransparency}%</div>
          </div>
        </div>

        <label className={`bg-upload ${saving ? 'is-saving' : ''}`}>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onPick} disabled={saving} />
          <span>{saving ? 'Mengoptimalkan...' : 'Pilih gambar background'}</span>
        </label>

        <div className="bg-control">
          <div className="range-row">
            <span>Transparansi panel</span>
            <strong>{panelTransparency}%</strong>
          </div>
          <input
            className="range-input"
            type="range"
            min="20"
            max="90"
            step="1"
            value={panelTransparency}
            onChange={(event) => changeTransparency(event.target.value)}
            aria-label="Atur transparansi panel"
          />
          <div className="bg-preset-row">
            {PRESET_TRANSPARENCIES.map((value) => (
              <button
                key={value}
                type="button"
                className={`ghost-mini ${panelTransparency === value ? 'is-active' : ''}`}
                onClick={() => applyPreset(value)}
              >
                {value}%
              </button>
            ))}
          </div>
          <small>Geser ke kanan agar background makin terlihat. Geser ke kiri bila ingin panel lebih pekat dan teks lebih tegas.</small>
        </div>

        <div className="bg-popover-actions">
          <button className="ghost-mini" type="button" onClick={resetBackground} disabled={!hasCustom || saving}>Default background</button>
          <button className="ghost-mini" type="button" onClick={resetTransparency} disabled={saving}>Default transparansi</button>
          <button className="ghost-mini" type="button" onClick={() => setOpen(false)} disabled={saving}>Tutup</button>
        </div>
        <small>Pengaturan disimpan per browser/perangkat, jadi menu ini tidak membebani server.</small>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="background-switcher" ref={wrapperRef}>
      <button
        ref={buttonRef}
        className="ghost-button bg-switch-button"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Ganti Background
      </button>
      {popover}
    </div>
  );
}
