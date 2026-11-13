import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Camera,
  ChevronDown,
  ImagePlus,
  KeyRound,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { GalleryCard } from './components/GalleryCard';
import { GitHubSyncDialog } from './components/GitHubSyncDialog';
import { LightboxDialog } from './components/LightboxDialog';
import { UploadCommitPayload, UploadDialog, UploadDraft } from './components/UploadDialog';
import {
  ColorFamily,
  GitHubConfig,
  PhotoItem,
  PRESET_TAXONOMY,
  PublicArchiveConfig,
  SortMode,
  SubjectCategory,
  UiAestheticConfig,
} from './types';
import { processImageToWebP } from './utils/imageProcessor';
import {
  checkEdgeStatus,
  deleteImageFromGitHub,
  deleteImageViaEdge,
  deletePhotoLocal,
  EdgeStatus,
  fetchEdgeGallery,
  fetchPublicGalleryIndex,
  loadAllPhotos,
  loadGitHubConfig,
  loadInstantUploadPref,
  loadPublicArchiveConfig,
  loadUiConfig,
  loginEdgeCurator,
  logoutEdgeCurator,
  pullGalleryIndexFromGitHub,
  saveGitHubConfig,
  saveInstantUploadPref,
  savePhotoLocal,
  saveUiConfig,
  syncGalleryIndexToGitHub,
  syncGalleryIndexViaEdge,
  uploadImageToGitHub,
  uploadImageViaEdge,
} from './utils/storage';
import {
  applyColorSchemePreference,
  closeTopLayerDialog,
  ColorSchemePref,
  initPopoverPolyfillIfNeeded,
  isImeComposing,
  readColorSchemePreference,
  runViewTransition,
  useScrollHideTopBar,
} from './utils/webPlatform';

function getEffectiveColumns(pref: UiAestheticConfig['columns'], width: number): number {
  if (width < 640) return 1;
  if (width < 1024) return pref === 'auto' ? 2 : Math.min(pref, 2);
  if (width < 1380) return pref === 'auto' ? 3 : Math.min(pref, 3);
  return pref === 'auto' ? 4 : pref;
}

function positionPopoverUnder(popoverId: string, trigger: HTMLElement) {
  const el = document.getElementById(popoverId);
  if (!el) return;
  const rect = trigger.getBoundingClientRect();
  const estWidth = Math.min(340, window.innerWidth - 24);
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - estWidth - 12));
  const top = Math.min(rect.bottom + 8, window.innerHeight - 260);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.maxHeight = 'calc(100dvh - 24px)';
  el.style.overflowY = 'auto';
  el.style.margin = '0';
}

function hidePopoverById(popoverId: string) {
  const el = document.getElementById(popoverId) as (HTMLElement & { hidePopover?: () => void }) | null;
  if (el && typeof el.hidePopover === 'function') {
    try {
      el.hidePopover();
    } catch {
      // ignore if already closed
    }
  }
}

export function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Taxonomy & Search Filters
  const [selectedSubject, setSelectedSubject] = useState<'all' | SubjectCategory>('all');
  const [selectedComposition, setSelectedComposition] = useState<string | null>(null);
  const [selectedLighting, setSelectedLighting] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [selectedColorFamily, setSelectedColorFamily] = useState<ColorFamily | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  // Viewport & UI Config
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [uiConfig, setUiConfig] = useState<UiAestheticConfig>(() => loadUiConfig());
  const [colorSchemePref, setColorSchemePref] = useState<ColorSchemePref>(() => readColorSchemePreference());
  const [githubConfig, setGithubConfig] = useState<GitHubConfig>(() => loadGitHubConfig());
  const [publicArchive, setPublicArchive] = useState<PublicArchiveConfig | null>(null);
  const [edgeStatus, setEdgeStatus] = useState<EdgeStatus>({ edgeMode: false, authenticated: false });
  const [instantUpload, setInstantUpload] = useState<boolean>(() => loadInstantUploadPref());

  // Active Lightbox & Upload Queue
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadDraft[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Refs
  const topBarRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const lightboxDialogRef = useRef<HTMLDialogElement | null>(null);
  const uploadDialogRef = useRef<HTMLDialogElement | null>(null);
  const githubDialogRef = useRef<HTMLDialogElement | null>(null);
  const dragDepthRef = useRef(0);

  const showToast = useCallback((msg: string) => {
    setStatusToast(msg);
    window.setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  useScrollHideTopBar(topBarRef);

  useEffect(() => {
    initPopoverPolyfillIfNeeded();

    async function bootstrap() {
      try {
        const [edge, pubCfg] = await Promise.all([checkEdgeStatus(), loadPublicArchiveConfig()]);
        setEdgeStatus(edge);
        const effectivePub = edge.target || pubCfg;
        setPublicArchive(effectivePub);

        if (effectivePub) {
          setGithubConfig((prev) => {
            if (prev.owner && prev.repo) return prev;
            return {
              ...prev,
              owner: prev.owner || effectivePub.owner,
              repo: prev.repo || effectivePub.repo,
              branch: prev.branch || effectivePub.branch,
              useJsDelivr: effectivePub.useJsDelivr,
            };
          });

          if (edge.edgeMode) {
            const edgeItems = await fetchEdgeGallery();
            if (edgeItems.length > 0) {
              setPhotos(edgeItems);
              return;
            }
          } else {
            const publicItems = await fetchPublicGalleryIndex(effectivePub, loadGitHubConfig().token);
            if (publicItems.length > 0) {
              setPhotos(publicItems);
              return;
            }
          }
        }

        const localItems = await loadAllPhotos();
        setPhotos(localItems);
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    saveUiConfig(uiConfig);
  }, [uiConfig]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cross-tab color-scheme sync per dark-mode-toggle guidance
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        const next = readColorSchemePreference();
        setColorSchemePref(next);
        applyColorSchemePreference(next);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // '/' shortcut focuses search when no modal is open
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      if (lightboxDialogRef.current?.open || uploadDialogRef.current?.open || githubDialogRef.current?.open) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isGitHubConnected = Boolean(githubConfig.owner && githubConfig.repo && githubConfig.token);
  const isEdgeAuthenticated = edgeStatus.edgeMode && edgeStatus.authenticated;
  const isCloudWritable = isEdgeAuthenticated || isGitHubConnected;
  const isPublicReadOnly = Boolean(publicArchive) && !isCloudWritable;
  const canEdit = !isPublicReadOnly;

  const commitDraftBatch = useCallback(
    async (
      items: {
        draft: UploadDraft;
        title: string;
        subject: SubjectCategory;
        compositionTags: string[];
        lightingTags: string[];
        toneTags: string[];
        note: string;
      }[]
    ) => {
      if (items.length === 0) return;

      const createdPhotos: PhotoItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i];
        if (items.length > 1) {
          showToast(`正在上传第 ${i + 1} / ${items.length} 张...`);
        }

        const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        let imageUrl = entry.draft.processed.webpDataUrl;
        let githubPath: string | undefined;
        let githubSha: string | undefined;

        if (isEdgeAuthenticated) {
          const uploaded = await uploadImageViaEdge(id, entry.draft.processed.base64Content);
          imageUrl = uploaded.remoteUrl;
          githubPath = uploaded.githubPath;
          githubSha = uploaded.githubSha;
        } else if (isGitHubConnected) {
          const uploaded = await uploadImageToGitHub(githubConfig, id, entry.draft.processed.base64Content);
          imageUrl = uploaded.remoteUrl;
          githubPath = uploaded.githubPath;
          githubSha = uploaded.githubSha;
        }

        const newPhoto: PhotoItem = {
          id,
          title: entry.title,
          subject: entry.subject,
          compositionTags: entry.compositionTags,
          lightingTags: entry.lightingTags,
          toneTags: entry.toneTags,
          note: entry.note,
          width: entry.draft.processed.width,
          height: entry.draft.processed.height,
          aspectRatio: entry.draft.processed.aspectRatio,
          sizeKB: entry.draft.processed.sizeKB,
          originalSizeKB: entry.draft.processed.originalSizeKB,
          palette: entry.draft.processed.palette,
          colorFamilies: entry.draft.processed.colorFamilies,
          exif: entry.draft.processed.exif,
          imageUrl,
          githubPath,
          githubSha,
          createdAt: new Date(Date.now() + i).toISOString(),
        };

        await savePhotoLocal(newPhoto);
        createdPhotos.push(newPhoto);
      }

      const nextList = [...createdPhotos.reverse(), ...photos];
      runViewTransition(() => {
        setPhotos(nextList);
      });

      if (isEdgeAuthenticated) {
        await syncGalleryIndexViaEdge(nextList);
        showToast(
          createdPhotos.length > 1
            ? `已一键上传 ${createdPhotos.length} 张作品至你的云端展馆！`
            : `已压制 WebP (${createdPhotos[0].sizeKB} KB) 并同步至云端`
        );
      } else if (isGitHubConnected) {
        await syncGalleryIndexToGitHub(githubConfig, nextList);
        showToast(
          createdPhotos.length > 1
            ? `已一键上传 ${createdPhotos.length} 张作品并同步至 GitHub！`
            : `已压缩为 WebP (${createdPhotos[0].sizeKB} KB) 并同步至 GitHub`
        );
      } else {
        showToast(
          createdPhotos.length > 1
            ? `已一键入库 ${createdPhotos.length} 张作品至本地库`
            : `已入库 (${createdPhotos[0].sizeKB} KB WebP)`
        );
      }
    },
    [githubConfig, isEdgeAuthenticated, isGitHubConnected, photos, showToast]
  );

  const ingestImageFiles = useCallback(
    async (files: File[]) => {
      if (!canEdit) {
        showToast(
          edgeStatus.edgeMode
            ? '请先点右上角「策展登录」输入策展口令'
            : '请先点右上角「策展登录」完成认证，再上传照片'
        );
        githubDialogRef.current?.showModal();
        return;
      }

      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      showToast(
        imageFiles.length > 1
          ? `正在处理 ${imageFiles.length} 张图片并提取色卡与 EXIF...`
          : '正在转为 WebP 并提取色卡与 EXIF...'
      );

      const drafts: UploadDraft[] = [];
      for (const file of imageFiles) {
        try {
          const processed = await processImageToWebP(file);
          drafts.push({
            id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            fileName: file.name || 'clipboard.png',
            processed,
          });
        } catch {
          // continue processing remaining files
        }
      }

      if (drafts.length === 0) {
        showToast('图片解析失败，请确认格式受浏览器支持');
        return;
      }

      if (instantUpload) {
        const defaultSubj: SubjectCategory = selectedSubject === 'all' ? 'humanities' : selectedSubject;
        try {
          await commitDraftBatch(
            drafts.map((d) => {
              const baseName = d.fileName.replace(/\.[^.]+$/, '').trim();
              const isGeneric =
                !baseName || baseName.toLowerCase() === 'image' || baseName.startsWith('clipboard');
              return {
                draft: d,
                title: isGeneric ? `暗房切片 · ${new Date().toLocaleDateString('zh-CN')}` : baseName,
                subject: defaultSubj,
                compositionTags: ['大面积留白'],
                lightingTags: ['柔光漫射'],
                toneTags: ['复古胶片暖调'],
                note: '',
              };
            })
          );
          return;
        } catch (err) {
          showToast(err instanceof Error ? err.message : '一键上传失败，已转入手动入库弹窗');
        }
      }

      setUploadQueue((prev) => [...prev, ...drafts]);
      if (uploadDialogRef.current && !uploadDialogRef.current.open) {
        uploadDialogRef.current.showModal();
      }
    },
    [canEdit, commitDraftBatch, edgeStatus.edgeMode, instantUpload, selectedSubject, showToast]
  );

  // Global Ctrl+V / Cmd+V paste upload
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        await ingestImageFiles(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [ingestImageFiles]);

  const handleCommitUpload = async (payload: UploadCommitPayload) => {
    await commitDraftBatch([payload]);
    const remaining = uploadQueue.slice(1);
    setUploadQueue(remaining);
    if (remaining.length === 0) {
      await closeTopLayerDialog(uploadDialogRef.current);
    }
  };

  const handleCommitAll = async (defaults: {
    subject: SubjectCategory;
    compositionTags: string[];
    lightingTags: string[];
    toneTags: string[];
  }) => {
    await commitDraftBatch(
      uploadQueue.map((d) => {
        const baseName = d.fileName.replace(/\.[^.]+$/, '').trim();
        const isGeneric = !baseName || baseName.toLowerCase() === 'image' || baseName.startsWith('clipboard');
        return {
          draft: d,
          title: isGeneric ? `暗房切片 · ${new Date().toLocaleDateString('zh-CN')}` : baseName,
          subject: defaults.subject,
          compositionTags: defaults.compositionTags,
          lightingTags: defaults.lightingTags,
          toneTags: defaults.toneTags,
          note: '',
        };
      })
    );
    setUploadQueue([]);
    await closeTopLayerDialog(uploadDialogRef.current);
  };

  const handleDeletePhoto = async (photo: PhotoItem) => {
    try {
      if (photo.githubPath && isEdgeAuthenticated) {
        showToast('正在删除云端 WebP 文件并更新索引...');
        await deleteImageViaEdge(photo.githubPath, photo.githubSha);
      } else if (photo.githubPath && isGitHubConnected) {
        showToast('正在删除云端 WebP 文件并更新索引...');
        await deleteImageFromGitHub(githubConfig, photo.githubPath, photo.githubSha);
      }
      await deletePhotoLocal(photo.id);
      const nextList = photos.filter((p) => p.id !== photo.id);

      if (activePhoto?.id === photo.id) {
        await closeTopLayerDialog(lightboxDialogRef.current);
        setActivePhoto(null);
      }

      runViewTransition(() => {
        setPhotos(nextList);
      });

      if (isEdgeAuthenticated && !photo.isSample) {
        await syncGalleryIndexViaEdge(nextList);
      } else if (isGitHubConnected && !photo.isSample) {
        await syncGalleryIndexToGitHub(githubConfig, nextList);
      }
      showToast(`已淘汰「${photo.title}」，释放 ${photo.sizeKB} KB`);
    } catch (err) {
      showToast(`删除失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const handleSaveEdit = async (updated: PhotoItem) => {
    await savePhotoLocal(updated);
    const nextList = photos.map((p) => (p.id === updated.id ? updated : p));
    setPhotos(nextList);
    setActivePhoto(updated);

    if (isEdgeAuthenticated && !updated.isSample) {
      await syncGalleryIndexViaEdge(nextList);
    } else if (isGitHubConnected && !updated.isSample) {
      await syncGalleryIndexToGitHub(githubConfig, nextList);
    }
    showToast('已更新审美拆解笔记与标签');
  };

  const handleClearSamples = async () => {
    const samples = photos.filter((p) => p.isSample);
    for (const s of samples) {
      await deletePhotoLocal(s.id);
    }
    runViewTransition(() => {
      setPhotos((prev) => prev.filter((p) => !p.isSample));
    });
    showToast('已移除全部内置示例');
  };

  // Scoped tag counts based on active subject
  const subjectScopedPhotos = useMemo(() => {
    if (selectedSubject === 'all') return photos;
    return photos.filter((p) => p.subject === selectedSubject);
  }, [photos, selectedSubject]);

  const dimensionCounts = useMemo(() => {
    const comp = new Map<string, number>();
    const light = new Map<string, number>();
    const tone = new Map<string, number>();
    const color = new Map<ColorFamily, number>();

    PRESET_TAXONOMY.composition.forEach((t) => comp.set(t, 0));
    PRESET_TAXONOMY.lighting.forEach((t) => light.set(t, 0));
    PRESET_TAXONOMY.tone.forEach((t) => tone.set(t, 0));
    PRESET_TAXONOMY.colorFamilies.forEach((c) => color.set(c.id, 0));

    for (const p of subjectScopedPhotos) {
      p.compositionTags.forEach((t) => comp.set(t, (comp.get(t) || 0) + 1));
      p.lightingTags.forEach((t) => light.set(t, (light.get(t) || 0) + 1));
      p.toneTags.forEach((t) => tone.set(t, (tone.get(t) || 0) + 1));
      p.colorFamilies.forEach((c) => color.set(c, (color.get(c) || 0) + 1));
    }

    return { comp, light, tone, color };
  }, [subjectScopedPhotos]);

  const filteredPhotos = useMemo(() => {
    const matched = subjectScopedPhotos.filter((p) => {
      if (selectedComposition && !p.compositionTags.includes(selectedComposition)) return false;
      if (selectedLighting && !p.lightingTags.includes(selectedLighting)) return false;
      if (selectedTone && !p.toneTags.includes(selectedTone)) return false;
      if (selectedColorFamily && !p.colorFamilies.includes(selectedColorFamily)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [
          p.title,
          p.note,
          ...p.compositionTags,
          ...p.lightingTags,
          ...p.toneTags,
          p.exif?.camera || '',
          p.exif?.focalLength || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortMode === 'portrait') {
      return [...matched].sort((a, b) => a.aspectRatio - b.aspectRatio);
    }
    if (sortMode === 'landscape') {
      return [...matched].sort((a, b) => b.aspectRatio - a.aspectRatio);
    }
    return matched;
  }, [
    subjectScopedPhotos,
    selectedComposition,
    selectedLighting,
    selectedTone,
    selectedColorFamily,
    searchQuery,
    sortMode,
  ]);

  // Balanced Left-to-Right Masonry Columns
  const colCount = getEffectiveColumns(uiConfig.columns, viewportWidth);
  const masonryColumns = useMemo(() => {
    const cols: { item: PhotoItem; globalIndex: number }[][] = Array.from({ length: colCount }, () => []);
    const heights = new Array<number>(colCount).fill(0);
    const captionWeight = uiConfig.captionMode === 'editorial' ? 0.36 : 0.04;

    filteredPhotos.forEach((item, idx) => {
      let shortestIdx = 0;
      for (let c = 1; c < colCount; c++) {
        if (heights[c] < heights[shortestIdx]) {
          shortestIdx = c;
        }
      }
      cols[shortestIdx].push({ item, globalIndex: idx });
      const ratio = item.aspectRatio > 0 ? item.aspectRatio : 1;
      heights[shortestIdx] += 1 / ratio + captionWeight;
    });

    return cols;
  }, [filteredPhotos, colCount, uiConfig.captionMode]);

  const hasSamples = useMemo(() => photos.some((p) => p.isSample), [photos]);
  const totalStorageMB = useMemo(
    () => (photos.reduce((acc, p) => acc + (p.sizeKB || 0), 0) / 1024).toFixed(2),
    [photos]
  );

  const hasActiveFilters = Boolean(
    selectedComposition || selectedLighting || selectedTone || selectedColorFamily || searchQuery.trim()
  );

  const resetAllFilters = () => {
    runViewTransition(() => {
      setSelectedComposition(null);
      setSelectedLighting(null);
      setSelectedTone(null);
      setSelectedColorFamily(null);
      setSearchQuery('');
    });
  };

  const openLightbox = (photo: PhotoItem) => {
    setActivePhoto(photo);
    if (lightboxDialogRef.current && !lightboxDialogRef.current.open) {
      lightboxDialogRef.current.showModal();
    }
  };

  const gapPx = uiConfig.density === 'gallery' ? 'gap-6' : 'gap-3';
  const stackGapPx = uiConfig.density === 'gallery' ? 'space-y-6' : 'space-y-3';

  return (
    <div
      className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--ink-primary)] transition-colors duration-200"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          dragDepthRef.current += 1;
          setIsDraggingOver(true);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDraggingOver(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        dragDepthRef.current = 0;
        setIsDraggingOver(false);
        const dropped = Array.from(e.dataTransfer.files || []);
        if (dropped.length > 0) {
          await ingestImageFiles(dropped);
        }
      }}
    >
      {/* Full-Viewport Darkroom Drop Curtain */}
      {isDraggingOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ colorScheme: 'dark' }}
        >
          <div className="border border-dashed border-[#d2b48c] bg-[#141416]/90 px-10 py-8 text-center">
            <Upload className="mx-auto mb-3 h-7 w-7 text-[#d2b48c]" aria-hidden="true" />
            <p className="font-editorial text-base text-[#ece9e2]">松开手即可收录进暗房</p>
            <p className="mt-1 text-xs text-[#9c978f]">自动转为高画质 WebP · 提取 5 色样本与 EXIF 参数</p>
          </div>
        </div>
      )}

      {/* Non-blocking Status Toast */}
      {statusToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 bottom-5 z-40 flex items-center gap-2 border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs text-[var(--ink-primary)] shadow-xl"
        >
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Compact Single-Row Sticky Top Bar */}
      <header
        ref={topBarRef}
        className="top-bar border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/92 backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7">
          {/* Brand + Subject Navigation */}
          <div className="flex items-center gap-6">
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-base font-semibold tracking-wide text-[var(--ink-primary)]">
                {publicArchive?.siteTitle || '暗房志'}
              </span>
              <span className="font-tabular hidden text-[10px] tracking-[0.18em] text-[var(--ink-muted)] uppercase sm:inline">
                {photos.length} Frames · {totalStorageMB} MB
              </span>
            </div>

            <nav aria-label="题材主轴" className="flex items-center gap-1">
              {[
                { id: 'all' as const, label: '全部', count: photos.length },
                {
                  id: 'humanities' as const,
                  label: '人文',
                  count: photos.filter((p) => p.subject === 'humanities').length,
                },
                {
                  id: 'nature' as const,
                  label: '自然',
                  count: photos.filter((p) => p.subject === 'nature').length,
                },
              ].map((tab) => {
                const active = selectedSubject === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      runViewTransition(() => {
                        setSelectedSubject(tab.id);
                      })
                    }
                    className={`relative px-2.5 py-1.5 text-xs transition-colors ${
                      active
                        ? 'font-medium text-[var(--ink-primary)]'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="font-tabular ml-1 text-[10px] opacity-60">{tab.count}</span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-2.5 -bottom-[11px] h-[2px] bg-[var(--accent)]"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search & Compact Controls */}
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isImeComposing(e)) return;
                }}
                placeholder="检索标题、笔记或机身 ( / )"
                aria-label="检索作品"
                className="w-44 border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1.5 pr-3 pl-8 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] transition-[width,border-color] focus:w-60 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            {/* Appearance Native Popover Trigger */}
            <button
              type="button"
              {...({ popovertarget: 'appearance-popover' } as Record<string, string>)}
              onClick={(e) => positionPopoverUnder('appearance-popover', e.currentTarget)}
              aria-label="视图与外观设置"
              className="flex h-8 items-center gap-1.5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">视图</span>
            </button>

            {/* GitHub Cloud Sync / Curator Auth Modal Trigger */}
            <button
              type="button"
              onClick={() => githubDialogRef.current?.showModal()}
              aria-label={isCloudWritable ? '策展权限已解锁' : isPublicReadOnly ? '策展登录' : '云同步'}
              className="flex h-8 items-center gap-1.5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
            >
              {isPublicReadOnly ? (
                <KeyRound className="h-3.5 w-3.5 text-[var(--ink-muted)]" aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    isCloudWritable ? 'bg-emerald-500' : 'bg-[var(--ink-muted)]'
                  }`}
                />
              )}
              <span className="hidden sm:inline">
                {isCloudWritable ? '策展中' : isPublicReadOnly ? '策展登录' : '云同步'}
              </span>
            </button>

            {/* Primary Upload & Mobile Camera Triggers (only shown when editable) */}
            {canEdit && (
              <>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const picked = Array.from(e.target.files || []);
                    if (picked.length > 0) {
                      await ingestImageFiles(picked);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  aria-label="手机拍照直传"
                  title="拍照直传"
                  className="flex h-8 items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs text-[var(--ink-primary)] transition hover:border-[var(--border-strong)] sm:hidden"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const picked = Array.from(e.target.files || []);
                    if (picked.length > 0) {
                      await ingestImageFiles(picked);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-8 items-center gap-1.5 bg-[var(--accent)] px-3.5 text-xs font-medium text-[var(--accent-ink)] transition hover:opacity-90"
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>收录</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Slim Non-Sticky Taxonomy Strip (Popover Dropdowns) */}
      <section
        aria-label="审美维度筛选"
        className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            {/* 构图 Popover Button */}
            <FilterTriggerButton
              popoverId="comp-popover"
              label="构图"
              activeValue={selectedComposition}
            />
            {/* 光影 Popover Button */}
            <FilterTriggerButton
              popoverId="light-popover"
              label="光影"
              activeValue={selectedLighting}
            />
            {/* 色调 Popover Button */}
            <FilterTriggerButton
              popoverId="tone-popover"
              label="色调"
              activeValue={selectedTone}
            />
            {/* 色相 Popover Button */}
            <FilterTriggerButton
              popoverId="color-popover"
              label="色相"
              activeValue={
                selectedColorFamily
                  ? PRESET_TAXONOMY.colorFamilies.find((c) => c.id === selectedColorFamily)?.label || null
                  : null
              }
              swatchColor={
                selectedColorFamily
                  ? PRESET_TAXONOMY.colorFamilies.find((c) => c.id === selectedColorFamily)?.swatch
                  : undefined
              }
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-[var(--accent)] underline decoration-dotted underline-offset-4 hover:opacity-80"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                <span>重置 ({filteredPhotos.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[var(--ink-muted)]">
            <button
              type="button"
              onClick={() =>
                runViewTransition(() => {
                  setSortMode((prev) =>
                    prev === 'newest' ? 'portrait' : prev === 'portrait' ? 'landscape' : 'newest'
                  );
                })
              }
              className="flex items-center gap-1 hover:text-[var(--ink-primary)]"
              title="切换排列顺序"
            >
              <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
              <span>
                {sortMode === 'newest' ? '最新收录' : sortMode === 'portrait' ? '竖幅优先' : '横幅优先'}
              </span>
            </button>

            {hasSamples && canEdit && (
              <button
                type="button"
                onClick={() => void handleClearSamples()}
                className="underline decoration-dotted underline-offset-4 hover:text-[var(--ink-primary)]"
              >
                清除示例图
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Balanced Masonry Canvas */}
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8">
        {loading ? (
          <div className="py-24 text-center text-xs tracking-wider text-[var(--ink-muted)]">
            正在显影暗房索引...
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="mx-auto my-20 max-w-md border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] px-8 py-12 text-center">
            <Upload className="mx-auto mb-3 h-6 w-6 text-[var(--ink-muted)]" aria-hidden="true" />
            <h2 className="font-editorial text-base font-medium text-[var(--ink-primary)]">
              当前筛选条件下暂无切片
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--ink-secondary)]">
              可直接拖入本地照片，或按 <kbd className="font-tabular border border-[var(--border-strong)] px-1.5 py-0.5">Ctrl + V</kbd> 粘贴剪贴板画面，浏览器将自动压制 WebP 并提取色卡。
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-5 border border-[var(--border-strong)] px-4 py-1.5 text-xs text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)]"
              >
                清除当前筛选条件
              </button>
            )}
          </div>
        ) : (
          <div
            className={`grid items-start ${gapPx}`}
            style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
          >
            {masonryColumns.map((column, colIdx) => (
              <div key={`col-${colIdx}`} className={stackGapPx}>
                {column.map(({ item, globalIndex }) => (
                  <GalleryCard
                    key={item.id}
                    photo={item}
                    isLcpCandidate={globalIndex === 0}
                    canEdit={canEdit}
                    uiConfig={uiConfig}
                    onOpen={openLightbox}
                    onDelete={handleDeletePhoto}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Native Popover: 构图筛选 */}
      <TaxonomyPopover
        id="comp-popover"
        title="构图维度"
        counts={dimensionCounts.comp}
        selected={selectedComposition}
        onSelect={(tag) => {
          runViewTransition(() => {
            setSelectedComposition((prev) => (prev === tag ? null : tag));
          });
          hidePopoverById('comp-popover');
        }}
      />

      {/* Native Popover: 光影筛选 */}
      <TaxonomyPopover
        id="light-popover"
        title="光影维度"
        counts={dimensionCounts.light}
        selected={selectedLighting}
        onSelect={(tag) => {
          runViewTransition(() => {
            setSelectedLighting((prev) => (prev === tag ? null : tag));
          });
          hidePopoverById('light-popover');
        }}
      />

      {/* Native Popover: 色调筛选 */}
      <TaxonomyPopover
        id="tone-popover"
        title="色调维度"
        counts={dimensionCounts.tone}
        selected={selectedTone}
        onSelect={(tag) => {
          runViewTransition(() => {
            setSelectedTone((prev) => (prev === tag ? null : tag));
          });
          hidePopoverById('tone-popover');
        }}
      />

      {/* Native Popover: 色相筛选 */}
      <div
        id="color-popover"
        {...({ popover: 'auto' } as Record<string, string>)}
        className="w-72 border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4 text-xs text-[var(--ink-primary)] shadow-2xl"
      >
        <div className="mb-2.5 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[11px] tracking-wider text-[var(--ink-muted)] uppercase">色彩倾向筛选</span>
          {selectedColorFamily && (
            <button
              type="button"
              onClick={() => {
                runViewTransition(() => setSelectedColorFamily(null));
                hidePopoverById('color-popover');
              }}
              className="text-[11px] text-[var(--accent)]"
            >
              清除
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESET_TAXONOMY.colorFamilies.map((cf) => {
            const active = selectedColorFamily === cf.id;
            const count = dimensionCounts.color.get(cf.id) || 0;
            return (
              <button
                key={cf.id}
                type="button"
                onClick={() => {
                  runViewTransition(() => {
                    setSelectedColorFamily((prev) => (prev === cf.id ? null : cf.id));
                  });
                  hidePopoverById('color-popover');
                }}
                className={`flex items-center justify-between border px-2.5 py-2 text-left transition ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 border border-black/20"
                    style={{ backgroundColor: cf.swatch, forcedColorAdjust: 'none' }}
                    aria-hidden="true"
                  />
                  <span>{cf.label}</span>
                </span>
                <span className="font-tabular text-[10px] text-[var(--ink-muted)]">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Native Popover: 视图与主题偏好 (Darkroom / Paper / System + Grid Density) */}
      <div
        id="appearance-popover"
        {...({ popover: 'auto' } as Record<string, string>)}
        className="w-80 border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4 text-xs text-[var(--ink-primary)] shadow-2xl"
      >
        <div className="mb-3 border-b border-[var(--border-subtle)] pb-2 text-[11px] tracking-wider text-[var(--ink-muted)] uppercase">
          暗房视图偏好
        </div>

        <div className="space-y-4">
          {/* 3-State Color Scheme Toggle per dark-mode-toggle guidance */}
          <div>
            <span className="block text-[11px] text-[var(--ink-muted)]">纸基 / 暗房色调</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'system', label: '跟随系统' },
                  { id: 'dark', label: '暗房黑' },
                  { id: 'light', label: '宣纸白' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={colorSchemePref === opt.id}
                  onClick={() => {
                    setColorSchemePref(opt.id);
                    applyColorSchemePreference(opt.id);
                  }}
                  className={`border py-1.5 text-center transition ${
                    colorSchemePref === opt.id
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--ink-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div>
            <span className="block text-[11px] text-[var(--ink-muted)]">画布列数</span>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {(['auto', 2, 3, 4] as const).map((col) => (
                <button
                  key={String(col)}
                  type="button"
                  onClick={() => runViewTransition(() => setUiConfig({ ...uiConfig, columns: col }))}
                  className={`border py-1.5 text-center transition ${
                    uiConfig.columns === col
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--ink-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {col === 'auto' ? '自动' : `${col} 列`}
                </button>
              ))}
            </div>
          </div>

          {/* Density & Radius */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <span className="block text-[11px] text-[var(--ink-muted)]">留白呼吸</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                {[
                  { id: 'gallery' as const, label: '画廊' },
                  { id: 'compact' as const, label: '印相' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => runViewTransition(() => setUiConfig({ ...uiConfig, density: d.id }))}
                    className={`border py-1.5 text-center ${
                      uiConfig.density === d.id
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium'
                        : 'border-[var(--border-subtle)] text-[var(--ink-secondary)]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[11px] text-[var(--ink-muted)]">画框边角</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                {[
                  { id: 'sharp' as const, label: '锐利' },
                  { id: 'soft' as const, label: '微弧' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setUiConfig({ ...uiConfig, radius: r.id })}
                    className={`border py-1.5 text-center ${
                      uiConfig.radius === r.id
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium'
                        : 'border-[var(--border-subtle)] text-[var(--ink-secondary)]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Caption Mode */}
          <div>
            <span className="block text-[11px] text-[var(--ink-muted)]">卡片文字展示</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {[
                { id: 'editorial' as const, label: '底注题记 + 色卡条' },
                { id: 'pure' as const, label: '纯图静默（悬停显字）' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => runViewTransition(() => setUiConfig({ ...uiConfig, captionMode: m.id }))}
                  className={`border py-1.5 text-center ${
                    uiConfig.captionMode === m.id
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium'
                      : 'border-[var(--border-subtle)] text-[var(--ink-secondary)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {canEdit && (
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-[11px] text-[var(--ink-secondary)]">
                <span>选图 / 粘贴后直接一键入库</span>
                <input
                  type="checkbox"
                  checked={instantUpload}
                  onChange={(e) => {
                    setInstantUpload(e.target.checked);
                    saveInstantUploadPref(e.target.checked);
                  }}
                  className="h-3.5 w-3.5"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Archival Lightbox Modal */}
      <LightboxDialog
        dialogRef={lightboxDialogRef}
        photo={activePhoto}
        photos={filteredPhotos}
        canEdit={canEdit}
        onClose={() => setActivePhoto(null)}
        onSelectPhoto={(next) => setActivePhoto(next)}
        onSaveEdit={handleSaveEdit}
        onDelete={handleDeletePhoto}
      />

      {/* Upload & Breakdown Modal */}
      <UploadDialog
        dialogRef={uploadDialogRef}
        queue={uploadQueue}
        defaultSubject={selectedSubject === 'all' ? 'humanities' : selectedSubject}
        isGitHubConnected={isCloudWritable}
        instantUpload={instantUpload}
        onToggleInstantUpload={(enabled) => {
          setInstantUpload(enabled);
          saveInstantUploadPref(enabled);
        }}
        onCloseAll={() => setUploadQueue([])}
        onSkipCurrent={() => {
          const rest = uploadQueue.slice(1);
          setUploadQueue(rest);
          if (rest.length === 0) {
            void closeTopLayerDialog(uploadDialogRef.current);
          }
        }}
        onCommitCurrent={handleCommitUpload}
        onCommitAll={handleCommitAll}
      />

      {/* GitHub Sync Modal */}
      <GitHubSyncDialog
        dialogRef={githubDialogRef}
        config={githubConfig}
        publicArchive={publicArchive}
        edgeStatus={edgeStatus}
        onEdgeLogin={async (passcode) => {
          await loginEdgeCurator(passcode);
          const nextEdge = await checkEdgeStatus();
          setEdgeStatus(nextEdge);
          const latest = await fetchEdgeGallery();
          if (latest.length > 0) {
            runViewTransition(() => setPhotos(latest));
          }
          showToast('已解锁策展模式（30 天内免再次输入口令）');
        }}
        onEdgeLogout={async () => {
          await logoutEdgeCurator();
          setEdgeStatus((prev) => ({ ...prev, authenticated: false }));
          showToast('已切换回访客只读模式');
        }}
        onRefreshGallery={async () => {
          const latest = await fetchEdgeGallery();
          if (latest.length > 0) {
            runViewTransition(() => setPhotos(latest));
          }
        }}
        onSaveConfig={(next) => {
          setGithubConfig(next);
          saveGitHubConfig(next);
          showToast(next.token ? '已解锁策展写入权限，可直接一键上传' : '已切换为只读 / 本地模式');
          if (next.token && next.owner && next.repo) {
            void fetchPublicGalleryIndex(
              { owner: next.owner, repo: next.repo, branch: next.branch || 'main', useJsDelivr: next.useJsDelivr },
              next.token
            ).then((latest) => {
              if (latest.length > 0) {
                runViewTransition(() => setPhotos(latest));
              }
            });
          }
        }}
        onPullFromGitHub={async (cfg) => {
          const pulled = await pullGalleryIndexFromGitHub(cfg);
          if (pulled.length > 0) {
            runViewTransition(() => setPhotos(pulled.sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
          } else {
            const merged = await loadAllPhotos();
            runViewTransition(() => setPhotos(merged));
          }
          showToast(`已从云端恢复 ${pulled.length} 张切片记录`);
          await closeTopLayerDialog(githubDialogRef.current);
        }}
        onPushIndexToGitHub={async (cfg) => {
          await syncGalleryIndexToGitHub(cfg, photos);
          showToast('已将当前图库索引推送至 GitHub');
        }}
      />
    </div>
  );
}

function FilterTriggerButton({
  popoverId,
  label,
  activeValue,
  swatchColor,
}: {
  popoverId: string;
  label: string;
  activeValue: string | null;
  swatchColor?: string;
}) {
  return (
    <button
      type="button"
      {...({ popovertarget: popoverId } as Record<string, string>)}
      onClick={(e) => positionPopoverUnder(popoverId, e.currentTarget)}
      className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs transition ${
        activeValue
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--ink-primary)]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]'
      }`}
    >
      {swatchColor && (
        <span
          className="h-2.5 w-2.5 border border-black/20"
          style={{ backgroundColor: swatchColor, forcedColorAdjust: 'none' }}
          aria-hidden="true"
        />
      )}
      <span>{activeValue ? `${label}：${activeValue}` : label}</span>
      <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
    </button>
  );
}

function TaxonomyPopover({
  id,
  title,
  counts,
  selected,
  onSelect,
}: {
  id: string;
  title: string;
  counts: Map<string, number>;
  selected: string | null;
  onSelect: (tag: string) => void;
}) {
  const entries = Array.from(counts.entries());
  return (
    <div
      id={id}
      {...({ popover: 'auto' } as Record<string, string>)}
      className="w-80 border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4 text-xs text-[var(--ink-primary)] shadow-2xl"
    >
      <div className="mb-2.5 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
        <span className="text-[11px] tracking-wider text-[var(--ink-muted)] uppercase">{title}</span>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(selected)}
            className="text-[11px] text-[var(--accent)]"
          >
            清除
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {entries.map(([tag, count]) => {
          const active = selected === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onSelect(tag)}
              className={`border px-2.5 py-1 text-[11px] transition ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent)] font-medium text-[var(--accent-ink)]'
                  : count > 0
                  ? 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                  : 'border-[var(--border-subtle)] text-[var(--ink-muted)] opacity-55 hover:opacity-90'
              }`}
            >
              <span>{tag}</span>
              {count > 0 && <span className="font-tabular ml-1 opacity-65">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
