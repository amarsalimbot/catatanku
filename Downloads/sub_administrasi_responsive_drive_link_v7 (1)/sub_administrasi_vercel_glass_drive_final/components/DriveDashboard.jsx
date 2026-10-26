'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UploadModal from './UploadModal';
import FileDetailModal from './FileDetailModal';
import CreateFolderModal from './CreateFolderModal';
import FolderLogoModal from './FolderLogoModal';
import BackgroundSwitcher from './BackgroundSwitcher';

const ROOT_NAME = process.env.NEXT_PUBLIC_DRIVE_ROOT_NAME || 'SUB ADMINISTRASI PEMBANGUNAN';
const ROOT_DRIVE_ID = process.env.NEXT_PUBLIC_DRIVE_ROOT_FOLDER_ID || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID || '';
const ROOT = { id: '', driveId: ROOT_DRIVE_ID, name: ROOT_NAME, webViewLink: ROOT_DRIVE_ID ? `https://drive.google.com/drive/folders/${ROOT_DRIVE_ID}` : '' };
const PAGE_SIZE = Number(process.env.NEXT_PUBLIC_DRIVE_PAGE_SIZE || 48);

function toDriveFolderUrl(folder = {}) {
  const link = String(folder.webViewLink || '').trim();
  if (link) return link;
  const id = String(folder.driveId || folder.id || '').trim();
  return id ? `https://drive.google.com/drive/folders/${encodeURIComponent(id)}` : '';
}

function toFolderState(folder = {}) {
  const id = String(folder.id || '').trim();
  return {
    ...folder,
    id,
    driveId: String(folder.driveId || id || '').trim(),
    name: folder.name || ROOT_NAME,
    webViewLink: toDriveFolderUrl(folder)
  };
}

function fileTypeMeta(item = {}) {
  const name = String(item.name || '').toLowerCase();
  const kind = item.kind || 'other';
  if (item.type === 'folder') return { key: 'folder', label: 'Folder', abbr: '', title: 'Folder' };
  if (kind === 'pdf' || name.endsWith('.pdf')) return { key: 'pdf', label: 'PDF', abbr: 'PDF', title: 'PDF' };
  if (kind === 'sheet' || /\.(xlsx|xls|csv|gsheet)$/.test(name)) return { key: 'excel', label: 'Excel', abbr: 'X', title: 'Excel' };
  if (kind === 'doc' || /\.(docx|doc|gdoc|txt)$/.test(name)) return { key: 'word', label: 'Word', abbr: 'W', title: 'Word' };
  if (kind === 'slide' || /\.(pptx|ppt|gslides)$/.test(name)) return { key: 'ppt', label: 'PowerPoint', abbr: 'P', title: 'PowerPoint' };
  if (kind === 'image' || /\.(jpg|jpeg|png|webp|gif|svg)$/.test(name)) return { key: 'image', label: 'Gambar', abbr: 'IMG', title: 'Image' };
  if (kind === 'video' || /\.(mp4|mov|mkv|avi|webm)$/.test(name)) return { key: 'video', label: 'Video', abbr: '▶', title: 'Video' };
  if (kind === 'archive' || /\.(zip|rar|7z)$/.test(name)) return { key: 'archive', label: 'Arsip', abbr: 'ZIP', title: 'Archive' };
  return { key: 'other', label: 'File', abbr: 'FILE', title: 'File' };
}

function initials(name = '') {
  return String(name || 'FD').trim().slice(0, 2).toUpperCase();
}

function folderLogoOf(item) {
  return item?.folderLogoThumbnailLink || item?.folderLogoLink || '';
}

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
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function useDebounced(value, delay = 320) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function FileTypeIcon({ item, compact = false }) {
  const meta = fileTypeMeta(item);
  if (item?.type === 'folder') {
    return (
      <span className={`drive-icon folder-icon ${compact ? 'compact' : ''}`} aria-label="Folder">
        <span className="folder-tab" />
        <span className="folder-body" />
      </span>
    );
  }

  return (
    <span className={`drive-icon file-icon type-${meta.key} ${compact ? 'compact' : ''}`} title={meta.title}>
      <span className="file-fold" />
      <strong>{meta.abbr}</strong>
    </span>
  );
}

export default function DriveDashboard({ username }) {
  const [currentFolder, setCurrentFolder] = useState(ROOT);
  const [folderStack, setFolderStack] = useState([ROOT]);
  const [cache, setCache] = useState({});
  const [view, setView] = useState('grid');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('nameAsc');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [logoFolder, setLogoFolder] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState({ '': true });
  const [toast, setToast] = useState(null);
  const abortRef = useRef(null);
  const cacheRef = useRef({});
  const debouncedQuery = useDebounced(query);

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  const key = `${currentFolder.id || 'root'}::${debouncedQuery}`;
  const currentState = cache[key] || { items: [], nextPageToken: '', loading: true, error: '' };
  const currentItems = currentState.items || [];

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const setFolderCache = useCallback((folderId, search, updater) => {
    const cacheKey = `${folderId || 'root'}::${search || ''}`;
    setCache((prev) => ({ ...prev, [cacheKey]: typeof updater === 'function' ? updater(prev[cacheKey]) : updater }));
  }, []);

  const updateItemAcrossCache = useCallback((item) => {
    setCache((prev) => {
      const next = {};
      Object.entries(prev).forEach(([cacheKey, state]) => {
        next[cacheKey] = {
          ...(state || {}),
          items: (state?.items || []).map((entry) => (entry.id === item.id ? item : entry))
        };
      });
      return next;
    });
  }, []);

  const fetchFolder = useCallback(async ({ folderId = '', search = '', append = false, force = false, pageToken = '' }) => {
    const cacheKey = `${folderId || 'root'}::${search || ''}`;

    if (!force && !append && cacheRef.current[cacheKey]?.loaded) return;
    if (abortRef.current && !append) abortRef.current.abort();
    const controller = new AbortController();
    if (!append) abortRef.current = controller;

    setFolderCache(folderId, search, (old) => ({
      items: append ? old?.items || [] : old?.items || [],
      nextPageToken: append ? old?.nextPageToken || '' : '',
      loading: true,
      error: '',
      loaded: old?.loaded || false
    }));

    try {
      const params = new URLSearchParams({ folderId, pageSize: String(PAGE_SIZE) });
      if (pageToken) params.set('pageToken', pageToken);
      if (search) params.set('query', search);
      const response = await fetch(`/api/drive/list?${params.toString()}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Gagal membaca folder.');

      setFolderCache(folderId, search, (old) => ({
        items: append ? [...(old?.items || []), ...(data.items || [])] : data.items || [],
        nextPageToken: data.nextPageToken || '',
        loading: false,
        error: '',
        loaded: true,
        loadedAt: Date.now()
      }));
    } catch (err) {
      if (err.name === 'AbortError') return;
      setFolderCache(folderId, search, (old) => ({
        items: old?.items || [],
        nextPageToken: old?.nextPageToken || '',
        loading: false,
        error: err.message,
        loaded: false
      }));
      showToast(err.message, 'error');
    }
  }, [setFolderCache, showToast]);

  useEffect(() => {
    fetchFolder({ folderId: currentFolder.id, search: debouncedQuery });
  }, [currentFolder.id, debouncedQuery, fetchFolder]);

  const filteredItems = useMemo(() => {
    let items = [...currentItems];
    if (filter !== 'all') items = items.filter((item) => item.kind === filter);

    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      if (sort === 'nameDesc') return b.name.localeCompare(a.name, 'id');
      if (sort === 'newest') return new Date(b.modifiedTime || 0) - new Date(a.modifiedTime || 0);
      if (sort === 'oldest') return new Date(a.modifiedTime || 0) - new Date(b.modifiedTime || 0);
      if (sort === 'sizeDesc') return Number(b.size || 0) - Number(a.size || 0);
      if (sort === 'sizeAsc') return Number(a.size || 0) - Number(b.size || 0);
      return a.name.localeCompare(b.name, 'id');
    });
    return items;
  }, [currentItems, filter, sort]);

  const summary = useMemo(() => {
    const all = currentItems;
    const files = all.filter((item) => item.type !== 'folder');
    const foldersOnly = all.filter((item) => item.type === 'folder');
    const totalSize = files.reduce((sum, item) => sum + Number(item.size || 0), 0);
    const logos = foldersOnly.filter((item) => folderLogoOf(item)).length;
    return { total: all.length, files: files.length, folders: foldersOnly.length, size: formatSize(totalSize), logos };
  }, [currentItems]);

  function openFolder(folder) {
    const nextFolder = toFolderState(folder);
    setCurrentFolder(nextFolder);
    setFolderStack((prev) => {
      const index = prev.findIndex((entry) => entry.id === nextFolder.id);
      if (index >= 0) return prev.slice(0, index + 1);
      return [...prev, nextFolder];
    });
    setQuery('');
    setDrawerOpen(false);
  }

  function jumpToFolder(folder, index) {
    setCurrentFolder(toFolderState(folder));
    setFolderStack((prev) => prev.slice(0, index + 1));
    setQuery('');
  }

  function refresh() {
    fetchFolder({ folderId: currentFolder.id, search: debouncedQuery, force: true });
  }

  function loadMore() {
    if (!currentState.nextPageToken || currentState.loading) return;
    fetchFolder({ folderId: currentFolder.id, search: debouncedQuery, append: true, pageToken: currentState.nextPageToken, force: true });
  }

  function onUploaded(item) {
    setFolderCache(currentFolder.id, debouncedQuery, (old) => ({
      ...(old || {}),
      items: [item, ...((old?.items || []).filter((entry) => entry.id !== item.id))],
      loaded: true,
      loading: false
    }));
    fetchFolder({ folderId: currentFolder.id, search: debouncedQuery, force: true });
  }

  function onFolderCreated(item) {
    setFolderCache(currentFolder.id, debouncedQuery, (old) => ({
      ...(old || {}),
      items: [item, ...((old?.items || []).filter((entry) => entry.id !== item.id))],
      loaded: true,
      loading: false
    }));
    setExpanded((prev) => ({ ...prev, [currentFolder.id]: true }));
    fetchFolder({ folderId: currentFolder.id, search: debouncedQuery, force: true });
  }

  function onLogoChanged(item) {
    updateItemAcrossCache(item);
    if (currentFolder.id === item.id) setCurrentFolder((prev) => ({ ...prev, ...toFolderState(item) }));
    if (detailItem?.id === item.id) setDetailItem(item);
    setLogoFolder(null);
  }

  function onChanged(item) {
    updateItemAcrossCache(item);
    setDetailItem(item);
  }

  function onDeleted(id) {
    setCache((prev) => {
      const next = {};
      Object.entries(prev).forEach(([cacheKey, state]) => {
        next[cacheKey] = {
          ...(state || {}),
          items: (state?.items || []).filter((entry) => entry.id !== id)
        };
      });
      return next;
    });
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  function toggleFolder(folder) {
    setExpanded((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }));
    if (!expanded[folder.id]) fetchFolder({ folderId: folder.id, search: '' });
  }

  function renderTreeFolder(folder, depth = 0) {
    const folderKey = `${folder.id || 'root'}::`;
    const state = cache[folderKey] || { items: [] };
    const folders = (state.items || []).filter((item) => item.type === 'folder');
    const children = folders.slice(0, 10);
    const isOpen = Boolean(expanded[folder.id]);
    const isActive = currentFolder.id === folder.id;
    const logo = folderLogoOf(folder);

    return (
      <div key={folder.id || 'root'} className="tree-node" style={{ '--depth': depth }}>
        <div className={`tree-row ${isActive ? 'active' : ''}`}>
          <button className="tree-toggle" onClick={() => toggleFolder(folder)} aria-label="Expand folder">{isOpen ? '⌄' : '›'}</button>
          <button className="tree-title" onClick={() => openFolder(folder)}>
            <span className="tree-folder-icon">{logo ? <img src={logo} alt={folder.name} loading="lazy" decoding="async" /> : <FileTypeIcon item={{ type: 'folder' }} compact />}</span>
            <strong>{folder.name}</strong>
          </button>
        </div>
        {isOpen && children.length ? <div className="tree-children">{children.map((child) => renderTreeFolder(child, depth + 1))}</div> : null}
        {isOpen && folders.length > 10 ? <span className="tree-more">{folders.length - 10} folder lain disembunyikan</span> : null}
      </div>
    );
  }

  const selectedFolderLogo = folderStack.length === 1 ? '' : folderLogoOf(currentFolder);
  const activeDriveLink = toDriveFolderUrl(currentFolder);

  return (
    <main className="app-shell spatial-shell">
      <div className="animated-wallpaper" />
      <div className="room-vignette" />
      <div className="noise-layer" />

      <aside className="sidebar glass-card desktop-sidebar spatial-sidebar">
        <div className="brand-row official-brand">
          <img className="tanah-logo" src="/branding/tanah-bumbu-logo.png" alt="Logo Tanah Bumbu" loading="eager" decoding="async" />
          <div>
            <span>Pemerintah Kabupaten</span>
            <strong>Tanah Bumbu</strong>
            <small>Bersujud Membangun Daerah</small>
          </div>
        </div>

        <div className="sidebar-panel storage-panel">
          <span className="sidebar-kicker">Root Drive</span>
          <strong>{ROOT_NAME}</strong>
          <small>Data dibatasi pada folder ini dan subfolder di dalamnya.</small>
        </div>

        <div className="sidebar-title">Navigasi folder</div>
        <nav className="folder-tree">{renderTreeFolder(ROOT)}</nav>

        <nav className="side-nav bottom-nav">
          <Link href="/settings">Admin Settings</Link>
          <button onClick={logout}>Logout</button>
        </nav>
      </aside>

      {drawerOpen ? (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="sidebar glass-card mobile-drawer spatial-sidebar" onClick={(event) => event.stopPropagation()}>
            <div className="brand-row official-brand">
              <img className="tanah-logo" src="/branding/tanah-bumbu-logo.png" alt="Logo Tanah Bumbu" loading="eager" decoding="async" />
              <div>
                <span>Pemerintah Kabupaten</span>
                <strong>Tanah Bumbu</strong>
                <small>Drive Workspace</small>
              </div>
            </div>
            <div className="sidebar-panel compact">
              <span className="sidebar-kicker">Root Drive</span>
              <strong>{ROOT_NAME}</strong>
            </div>
            <nav className="folder-tree">{renderTreeFolder(ROOT)}</nav>
            <nav className="side-nav bottom-nav mobile-bottom-nav">
              <Link href="/settings">Admin Settings</Link>
              <button onClick={logout}>Logout</button>
            </nav>
          </aside>
        </div>
      ) : null}

      <section className="content-area studio-content">
        <header className="spatial-topbar glass-card reveal-card">
          <div className="topbar-title">
            <button className="icon-button mobile-only" onClick={() => setDrawerOpen(true)}>☰</button>
            <div>
              <p className="eyebrow">Drive Tanah Bumbu</p>
              <h1>Manajemen File Pembangunan</h1>
            </div>
          </div>
          <div className="search-box top-search">
            <span>⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari file atau folder di Drive" />
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={refresh} aria-label="Refresh">↻</button>
            {activeDriveLink ? <a className="ghost-button drive-link-button" href={activeDriveLink} target="_blank" rel="noreferrer">↗ Google Drive</a> : null}
            <BackgroundSwitcher onToast={showToast} />
            <button className="ghost-button" onClick={() => setCreateFolderOpen(true)}>+ Folder</button>
            <button className="primary-button" onClick={() => setUploadOpen(true)}>+ Upload</button>
            <div className="profile-chip" title={username}><strong>{username?.slice(0, 2)?.toUpperCase() || 'AD'}</strong><span>Admin</span></div>
          </div>
        </header>

        <div className="spatial-workspace">
          <div className="workspace-main">
            <section className="studio-hero spatial-hero glass-card reveal-card delay-one">
              <div className="hero-folder-tile">
                {selectedFolderLogo ? <img src={selectedFolderLogo} alt={currentFolder.name} loading="lazy" decoding="async" /> : <FileTypeIcon item={{ type: 'folder' }} />}
              </div>
              <div className="hero-left">
                <div>
                  <div className="breadcrumbs hero-breadcrumbs">
                    {folderStack.map((folder, index) => (
                      <button key={`${folder.id}-${index}`} onClick={() => jumpToFolder(folder, index)}>
                        {folder.name}{index < folderStack.length - 1 ? ' /' : ''}
                      </button>
                    ))}
                  </div>
                  <h2>{currentFolder.name}</h2>
                  <p className="hero-copy">Workspace khusus SUB ADMINISTRASI PEMBANGUNAN dengan tata letak spatial UI, logo folder, upload per folder, dan ikon file sesuai jenis dokumen.</p>
                  <div className="hero-badges">
                    <span>{summary.folders} Folder</span>
                    <span>{summary.files} File</span>
                    <span>{currentState.loading ? 'Sinkronisasi' : 'Siap digunakan'}</span>
                    {activeDriveLink ? <a className="hero-drive-link" href={activeDriveLink} target="_blank" rel="noreferrer">↗ Buka Google Drive</a> : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="command-center glass-card reveal-card delay-one">
              <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Semua tipe</option>
                <option value="folder">Folder</option>
                <option value="pdf">PDF</option>
                <option value="image">Gambar</option>
                <option value="doc">Dokumen</option>
                <option value="sheet">Spreadsheet</option>
                <option value="slide">Presentasi</option>
                <option value="video">Video</option>
                <option value="archive">Arsip</option>
                <option value="other">Lainnya</option>
              </select>
              <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="nameAsc">Nama A-Z</option>
                <option value="nameDesc">Nama Z-A</option>
                <option value="newest">Update terbaru</option>
                <option value="oldest">Update terlama</option>
                <option value="sizeDesc">Ukuran terbesar</option>
                <option value="sizeAsc">Ukuran terkecil</option>
              </select>
              <div className="view-buttons pill-switch">
                <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>Grid</button>
                <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button>
              </div>
              <span className="data-status">{currentState.loading ? 'Memuat data...' : `${filteredItems.length} item tampil`}</span>
            </section>

            <section className="stats-grid fresh-stats logo-stats-grid">
              <div className="stat-card glass-card"><span>Total item</span><strong>{summary.total}</strong></div>
              <div className="stat-card glass-card"><span>Folder</span><strong>{summary.folders}</strong></div>
              <div className="stat-card glass-card"><span>File</span><strong>{summary.files}</strong></div>
              <div className="stat-card glass-card"><span>Total ukuran</span><strong>{summary.size}</strong></div>
              <div className="stat-card glass-card"><span>Folder berlogo</span><strong>{summary.logos}</strong></div>
            </section>

            <section className="browser-card glass-card reveal-card">
              <div className="browser-head refined-head">
                <div>
                  <p className="eyebrow">File browser</p>
                  <h3>Isi folder aktif</h3>
                </div>
                <div className="browser-actions">
                  <button className="ghost-button" onClick={() => setCreateFolderOpen(true)}>Tambah folder</button>
                  <button className="primary-button" onClick={() => setUploadOpen(true)}>Upload file</button>
                </div>
              </div>

              {currentState.error ? (
                <div className="state-box error-state">
                  <strong>Data gagal dimuat</strong>
                  <span>{currentState.error}</span>
                  <button className="primary-button" onClick={refresh}>Coba lagi</button>
                </div>
              ) : null}

              {currentState.loading && !currentState.items?.length ? <SkeletonGrid /> : null}

              {!currentState.loading && !currentState.error && filteredItems.length === 0 ? (
                <div className="state-box empty-state">
                  <strong>Folder kosong</strong>
                  <span>Belum ada file atau folder yang cocok dengan filter.</span>
                  <div className="state-actions">
                    <button className="ghost-button" onClick={() => setCreateFolderOpen(true)}>Tambah folder</button>
                    <button className="primary-button" onClick={() => setUploadOpen(true)}>Upload file</button>
                  </div>
                </div>
              ) : null}

              {filteredItems.length ? (
                view === 'grid' ? (
                  <div className="file-grid">
                    {filteredItems.map((item) => <FileCard key={item.id} item={item} onOpenFolder={openFolder} onDetail={setDetailItem} onLogo={setLogoFolder} />)}
                  </div>
                ) : (
                  <div className="file-list">
                    {filteredItems.map((item) => <FileRow key={item.id} item={item} onOpenFolder={openFolder} onDetail={setDetailItem} onLogo={setLogoFolder} />)}
                  </div>
                )
              ) : null}

              {currentState.nextPageToken ? (
                <div className="load-more-row">
                  <button className="ghost-button" onClick={loadMore} disabled={currentState.loading}>
                    {currentState.loading ? 'Memuat...' : 'Muat data berikutnya'}
                  </button>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="detail-rail glass-card reveal-card delay-one">
            <button className="rail-close" aria-label="Panel detail">×</button>
            <div className="rail-folder-icon"><FileTypeIcon item={{ type: 'folder' }} /></div>
            <h2>{currentFolder.name}</h2>
            <div className="rail-tabs">
              <span className="active">Detail</span>
              <span>Aktivitas</span>
              <span>Akses</span>
            </div>
            <dl className="rail-info">
              <dt>Tipe</dt><dd>Folder Google Drive</dd>
              <dt>Lokasi</dt><dd>{folderStack.length > 1 ? folderStack[folderStack.length - 2]?.name : 'Root aktif'}</dd>
              <dt>Jumlah item</dt><dd>{summary.folders} folder, {summary.files} file</dd>
              <dt>Total ukuran</dt><dd>{summary.size}</dd>
              <dt>Logo folder</dt><dd>{summary.logos} folder</dd>
            </dl>
            {activeDriveLink ? <a className="primary-button full-button drive-open-rail" href={activeDriveLink} target="_blank" rel="noreferrer">↗ Buka di Google Drive</a> : null}
            <div className="rail-note">
              <strong>Identitas</strong>
              <p>Logo Tanah Bumbu sudah menjadi identitas utama aplikasi. Folder tetap dapat memakai logo masing-masing.</p>
            </div>
            <div className="rail-labels">
              <span>Pembangunan</span>
              <span>Resmi</span>
              <span>Drive</span>
            </div>
          </aside>
        </div>
      </section>

      <UploadModal open={uploadOpen} folder={currentFolder} onClose={() => setUploadOpen(false)} onUploaded={onUploaded} onToast={showToast} />
      <CreateFolderModal open={createFolderOpen} parentFolder={currentFolder} onClose={() => setCreateFolderOpen(false)} onCreated={onFolderCreated} onToast={showToast} />
      <FolderLogoModal folder={logoFolder} onClose={() => setLogoFolder(null)} onChanged={onLogoChanged} onToast={showToast} />
      <FileDetailModal item={detailItem} onClose={() => setDetailItem(null)} onChanged={onChanged} onDeleted={onDeleted} onToast={showToast} />
      {toast ? <div className={`toast ${toast.type}`}>{toast.message}</div> : null}
    </main>
  );
}

function SkeletonGrid() {
  return (
    <div className="file-grid">
      {Array.from({ length: 8 }).map((_, index) => (
        <article className="file-card glass-card skeleton-card" key={index}>
          <div className="skeleton-block thumb" />
          <div className="skeleton-block line wide" />
          <div className="skeleton-block line" />
          <div className="skeleton-block line short" />
        </article>
      ))}
    </div>
  );
}

function FileCard({ item, onOpenFolder, onDetail, onLogo }) {
  const isFolder = item.type === 'folder';
  const folderLogo = folderLogoOf(item);
  const meta = fileTypeMeta(item);
  return (
    <article className={`file-card glass-card reveal-card ${folderLogo ? 'has-folder-logo' : ''}`}>
      <button className={`file-thumb ${isFolder ? 'folder-thumb' : `type-${meta.key}`}`} onClick={() => (isFolder ? onOpenFolder(item) : onDetail(item))}>
        {isFolder && folderLogo ? (
          <img className="folder-logo-image" src={folderLogo} alt={item.name} loading="lazy" decoding="async" />
        ) : item.kind === 'image' && item.thumbnailLink ? (
          <img src={item.thumbnailLink} alt={item.name} loading="lazy" decoding="async" />
        ) : isFolder ? (
          <span className="folder-logo-fallback"><FileTypeIcon item={item} /></span>
        ) : (
          <FileTypeIcon item={item} />
        )}
      </button>
      <div className="file-body">
        <button className="file-name" onClick={() => (isFolder ? onOpenFolder(item) : onDetail(item))}>{item.name}</button>
        <div className="file-meta">
          <span>{meta.label}</span>
          <span>{formatSize(item.size)}</span>
          <span>{formatDate(item.modifiedTime)}</span>
        </div>
        <div className="file-actions">
          {isFolder ? <button className="primary-mini" onClick={() => onOpenFolder(item)}>Buka</button> : <a className="primary-mini" href={item.webViewLink} target="_blank" rel="noreferrer">Buka</a>}
          {isFolder && toDriveFolderUrl(item) ? <a className="ghost-mini" href={toDriveFolderUrl(item)} target="_blank" rel="noreferrer">Drive</a> : null}
          {isFolder ? <button className="ghost-mini" onClick={() => onLogo(item)}>{folderLogo ? 'Ganti logo' : 'Tambah logo'}</button> : null}
          {!isFolder && item.webContentLink ? <a className="ghost-mini" href={item.webContentLink} target="_blank" rel="noreferrer">Download</a> : null}
          <button className="ghost-mini" onClick={() => onDetail(item)}>Detail</button>
        </div>
      </div>
    </article>
  );
}

function FileRow({ item, onOpenFolder, onDetail, onLogo }) {
  const isFolder = item.type === 'folder';
  const folderLogo = folderLogoOf(item);
  const meta = fileTypeMeta(item);
  return (
    <article className="file-row">
      <button className="row-title" onClick={() => (isFolder ? onOpenFolder(item) : onDetail(item))}>
        <span className="row-icon">{isFolder && folderLogo ? <img src={folderLogo} alt={item.name} loading="lazy" decoding="async" /> : <FileTypeIcon item={item} compact />}</span>
        <strong>{item.name}</strong>
      </button>
      <span>{meta.label}</span>
      <span>{formatSize(item.size)}</span>
      <span>{formatDate(item.modifiedTime)}</span>
      <div className="row-actions">
        {isFolder ? <button onClick={() => onOpenFolder(item)}>Buka</button> : <a href={item.webViewLink} target="_blank" rel="noreferrer">Buka</a>}
        {isFolder && toDriveFolderUrl(item) ? <a href={toDriveFolderUrl(item)} target="_blank" rel="noreferrer">Drive</a> : null}
        {isFolder ? <button onClick={() => onLogo(item)}>Logo</button> : null}
        <button onClick={() => onDetail(item)}>Detail</button>
      </div>
    </article>
  );
}
