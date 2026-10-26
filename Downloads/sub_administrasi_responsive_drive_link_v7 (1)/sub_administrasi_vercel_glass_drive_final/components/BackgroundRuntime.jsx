'use client';

import { useEffect } from 'react';

export const DEFAULT_BACKGROUND = '/branding/room-wallpaper-optimized.webp';
export const BACKGROUND_STORAGE_KEY = 'sub-admin-background-image';
export const PANEL_TRANSPARENCY_STORAGE_KEY = 'sub-admin-panel-transparency';
export const DEFAULT_PANEL_TRANSPARENCY = 78;

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function setAppBackground(value) {
  if (typeof document === 'undefined') return;
  const source = value || DEFAULT_BACKGROUND;
  document.documentElement.style.setProperty('--app-bg-image', `url(${JSON.stringify(source)})`);
}

export function setPanelTransparency(value) {
  if (typeof document === 'undefined') return DEFAULT_PANEL_TRANSPARENCY;

  const percent = clampNumber(value, 20, 90, DEFAULT_PANEL_TRANSPARENCY);
  const alpha = Math.max(0.10, Math.min(0.72, (100 - percent) / 100));
  const strongAlpha = Math.max(0.18, Math.min(0.82, alpha + 0.12));
  const softAlpha = Math.max(0.035, Math.min(0.18, alpha * 0.42));
  const controlAlpha = Math.max(0.055, Math.min(0.22, alpha * 0.58));

  const root = document.documentElement;
  root.style.setProperty('--panel-alpha', alpha.toFixed(3));
  root.style.setProperty('--panel-alpha-strong', strongAlpha.toFixed(3));
  root.style.setProperty('--panel-alpha-soft', softAlpha.toFixed(3));
  root.style.setProperty('--control-alpha', controlAlpha.toFixed(3));
  root.style.setProperty('--current-transparency', `${percent}%`);
  return percent;
}

export function applyStoredAppearance() {
  if (typeof window === 'undefined') return;

  try {
    setAppBackground(localStorage.getItem(BACKGROUND_STORAGE_KEY) || DEFAULT_BACKGROUND);
  } catch {
    setAppBackground(DEFAULT_BACKGROUND);
  }

  try {
    setPanelTransparency(localStorage.getItem(PANEL_TRANSPARENCY_STORAGE_KEY) || DEFAULT_PANEL_TRANSPARENCY);
  } catch {
    setPanelTransparency(DEFAULT_PANEL_TRANSPARENCY);
  }
}

export default function BackgroundRuntime() {
  useEffect(() => {
    applyStoredAppearance();

    window.addEventListener('storage', applyStoredAppearance);
    window.addEventListener('sub-admin-background-changed', applyStoredAppearance);
    window.addEventListener('sub-admin-transparency-changed', applyStoredAppearance);

    return () => {
      window.removeEventListener('storage', applyStoredAppearance);
      window.removeEventListener('sub-admin-background-changed', applyStoredAppearance);
      window.removeEventListener('sub-admin-transparency-changed', applyStoredAppearance);
    };
  }, []);

  return null;
}
