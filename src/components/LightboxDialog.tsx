import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import {
  CompositionGuide,
  PhotoItem,
  PRESET_TAXONOMY,
  SubjectCategory,
} from '../types';
import { closeTopLayerDialog, isImeComposing, useDialogController } from '../utils/webPlatform';

interface LightboxDialogProps {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  photo: PhotoItem | null;
  photos: PhotoItem[];
  canEdit: boolean;
  onClose: () => void;
  onSelectPhoto: (photo: PhotoItem) => void;
  onSaveEdit: (updated: PhotoItem) => Promise<void>;
  onDelete: (photo: PhotoItem) => Promise<void>;
}

const GUIDE_OPTIONS: { id: CompositionGuide; label: string }[] = [
  { id: 'none', label: '原片' },
  { id: 'thirds', label: '三分法' },
  { id: 'phi', label: '黄金分割' },
  { id: 'diagonals', label: '对角张力' },
];

export const LightboxDialog: React.FC<LightboxDialogProps> = ({
  dialogRef,
  photo,
  photos,
  canEdit,
  onClose,
  onSelectPhoto,
  onSaveEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [guide, setGuide] = useState<CompositionGuide>('none');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  useDialogController(dialogRef, () => {
    setIsEditing(false);
    setConfirmingDelete(false);
    onClose();
  });

  useEffect(() => {
    setIsEditing(false);
    setConfirmingDelete(false);
  }, [photo?.id]);

  const currentIndex = photo ? photos.findIndex((p) => p.id === photo.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

  useEffect(() => {
    if (!photo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (!dialogRef.current?.open || isEditing) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        onSelectPhoto(photos[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        onSelectPhoto(photos[currentIndex + 1]);
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setGuide((prev) => {
          const idx = GUIDE_OPTIONS.findIndex((o) => o.id === prev);
          return GUIDE_OPTIONS[(idx + 1) % GUIDE_OPTIONS.length].id;
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [photo, dialogRef, isEditing, hasPrev, hasNext, currentIndex, photos, onSelectPhoto]);

  const copyHex = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => {
      setCopiedHex((prev) => (prev === hex ? null : prev));
    }, 1400);
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="lightbox-title"
      className="m-auto max-h-[94dvh] w-[96vw] max-w-[1320px] overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-0 text-[var(--ink-primary)] shadow-2xl"
    >
      {photo && (
        <div className="grid max-h-[94dvh] grid-cols-1 lg:grid-cols-12">
          {/* Left Darkroom Viewing Stage */}
          <div
            className="relative flex min-h-[360px] flex-col items-center justify-center bg-[#080809] p-5 sm:p-8 lg:col-span-8 lg:max-h-[94dvh]"
            style={{ colorScheme: 'dark' }}
          >
            <div className="relative inline-flex max-h-[78dvh] max-w-full items-center justify-center overflow-hidden">
              <img
                src={photo.imageUrl}
                alt={photo.title}
                width={photo.width}
                height={photo.height}
                className="block max-h-[78dvh] w-auto max-w-full object-contain select-none"
              />

              {/* Composition Study Overlay */}
              {guide !== 'none' && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {guide === 'thirds' && (
                    <g stroke="rgba(236, 233, 226, 0.42)" strokeWidth="0.35">
                      <line x1="33.33" y1="0" x2="33.33" y2="100" />
                      <line x1="66.66" y1="0" x2="66.66" y2="100" />
                      <line x1="0" y1="33.33" x2="100" y2="33.33" />
                      <line x1="0" y1="66.66" x2="100" y2="66.66" />
                    </g>
                  )}
                  {guide === 'phi' && (
                    <g stroke="rgba(210, 180, 140, 0.48)" strokeWidth="0.35">
                      <line x1="38.2" y1="0" x2="38.2" y2="100" />
                      <line x1="61.8" y1="0" x2="61.8" y2="100" />
                      <line x1="0" y1="38.2" x2="100" y2="38.2" />
                      <line x1="0" y1="61.8" x2="100" y2="61.8" />
                    </g>
                  )}
                  {guide === 'diagonals' && (
                    <g stroke="rgba(236, 233, 226, 0.42)" strokeWidth="0.35">
                      <line x1="0" y1="0" x2="100" y2="100" />
                      <line x1="100" y1="0" x2="0" y2="100" />
                      <line x1="0" y1="100" x2="38.2" y2="0" strokeDasharray="1.5 1.5" />
                      <line x1="100" y1="0" x2="61.8" y2="100" strokeDasharray="1.5 1.5" />
                    </g>
                  )}
                </svg>
              )}
            </div>

            {/* Bottom Stage HUD */}
            <div className="mt-4 flex w-full max-w-xl flex-wrap items-center justify-between gap-3 text-[11px] text-[#9c978f]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && onSelectPhoto(photos[currentIndex - 1])}
                  aria-label="上一张"
                  className="flex h-7 w-7 items-center justify-center border border-white/10 bg-white/[0.04] text-[#ece9e2] transition hover:bg-white/10 disabled:opacity-25"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="font-tabular px-2 text-[11px] tracking-wider">
                  {String(currentIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => hasNext && onSelectPhoto(photos[currentIndex + 1])}
                  aria-label="下一张"
                  className="flex h-7 w-7 items-center justify-center border border-white/10 bg-white/[0.04] text-[#ece9e2] transition hover:bg-white/10 disabled:opacity-25"
                >
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center gap-1 border border-white/10 bg-white/[0.03] p-0.5">
                <span className="flex items-center gap-1 px-2 text-[10px] text-[#9c978f]">
                  <Grid3x3 className="h-3 w-3" aria-hidden="true" />
                  <span>辅助线 (G)</span>
                </span>
                {GUIDE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGuide(opt.id)}
                    className={`px-2 py-1 text-[10.5px] transition ${
                      guide === opt.id
                        ? 'bg-[#d2b48c] font-medium text-[#11100e]'
                        : 'text-[#9c978f] hover:text-[#ece9e2]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Curatorial Inspector */}
          <div className="flex max-h-[94dvh] flex-col justify-between overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 lg:col-span-4 lg:border-t-0 lg:border-l">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10.5px] tracking-widest text-[var(--accent)] uppercase">
                    <span>{photo.subject === 'humanities' ? '人文 Humanities' : '自然 Nature'}</span>
                    {photo.sourceAuthor && (
                      <>
                        <span className="text-[var(--ink-muted)]">/</span>
                        <span className="text-[var(--ink-muted)]">{photo.sourceAuthor}</span>
                      </>
                    )}
                  </div>
                  <h2 id="lightbox-title" className="font-editorial mt-2 text-lg leading-snug font-medium">
                    {photo.title}
                  </h2>
                  <p className="font-tabular mt-1 text-[11px] text-[var(--ink-muted)]">
                    {photo.width} × {photo.height} px · WebP {photo.sizeKB} KB
                    {photo.originalSizeKB ? ` (原片 ${photo.originalSizeKB} KB)` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void closeTopLayerDialog(dialogRef.current)}
                  aria-label="关闭灯箱"
                  className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--border-subtle)] text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* 5-Color Extracted Pigment Strip */}
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                  <span>色彩样本 (点击复制色值)</span>
                  {copiedHex && (
                    <span className="font-tabular flex items-center gap-1 text-[var(--accent)]">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      {copiedHex}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {photo.palette.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => copyHex(hex)}
                      title={`复制 ${hex}`}
                      className="group text-left focus:outline-none"
                    >
                      <div
                        className="h-9 w-full border border-[var(--border-subtle)] transition-transform group-hover:-translate-y-0.5"
                        style={{ backgroundColor: hex, forcedColorAdjust: 'none' }}
                      />
                      <span className="font-tabular mt-1 block text-center text-[10px] text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)]">
                        {hex}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {!isEditing ? (
                <div className="space-y-5">
                  {/* 3-Dimension Breakdown */}
                  <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] text-xs">
                    <div className="grid grid-cols-12 gap-2 py-3">
                      <span className="col-span-3 text-[11px] text-[var(--ink-muted)]">构图</span>
                      <div className="col-span-9 flex flex-wrap gap-1.5">
                        {photo.compositionTags.map((t) => (
                          <span
                            key={t}
                            className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px] text-[var(--ink-primary)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 py-3">
                      <span className="col-span-3 text-[11px] text-[var(--ink-muted)]">光影</span>
                      <div className="col-span-9 flex flex-wrap gap-1.5">
                        {photo.lightingTags.map((t) => (
                          <span
                            key={t}
                            className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px] text-[var(--ink-primary)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 py-3">
                      <span className="col-span-3 text-[11px] text-[var(--ink-muted)]">色调</span>
                      <div className="col-span-9 flex flex-wrap gap-1.5">
                        {photo.toneTags.map((t) => (
                          <span
                            key={t}
                            className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px] text-[var(--ink-primary)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Curatorial Note */}
                  <div>
                    <h3 className="text-[11px] tracking-wider text-[var(--ink-muted)] uppercase">审美拆解笔记</h3>
                    <p className="font-editorial mt-2 text-[13.5px] leading-relaxed text-[var(--ink-secondary)]">
                      {photo.note || '尚无文字笔记，可点击下方「修订拆解」记录这张照片打动你的光线、构图或情绪理由。'}
                    </p>
                  </div>

                  {/* EXIF Optical Strip */}
                  {photo.exif && (
                    <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5">
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
                        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>光学拍摄信息 (EXIF)</span>
                      </div>
                      <dl className="font-tabular grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11.5px] text-[var(--ink-secondary)]">
                        {photo.exif.camera && (
                          <div>
                            <dt className="inline text-[var(--ink-muted)]">机身 </dt>
                            <dd className="inline text-[var(--ink-primary)]">{photo.exif.camera}</dd>
                          </div>
                        )}
                        {photo.exif.focalLength && (
                          <div>
                            <dt className="inline text-[var(--ink-muted)]">焦段 </dt>
                            <dd className="inline text-[var(--ink-primary)]">{photo.exif.focalLength}</dd>
                          </div>
                        )}
                        {photo.exif.aperture && (
                          <div>
                            <dt className="inline text-[var(--ink-muted)]">光圈 </dt>
                            <dd className="inline text-[var(--ink-primary)]">{photo.exif.aperture}</dd>
                          </div>
                        )}
                        {photo.exif.shutter && (
                          <div>
                            <dt className="inline text-[var(--ink-muted)]">快门 </dt>
                            <dd className="inline text-[var(--ink-primary)]">{photo.exif.shutter}</dd>
                          </div>
                        )}
                        {photo.exif.iso && (
                          <div>
                            <dt className="inline text-[var(--ink-muted)]">感光 </dt>
                            <dd className="inline text-[var(--ink-primary)]">{photo.exif.iso}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              ) : (
                <EditPhotoForm
                  photo={photo}
                  onCancel={() => setIsEditing(false)}
                  onSave={async (updated) => {
                    await onSaveEdit(updated);
                    setIsEditing(false);
                  }}
                />
              )}
            </div>

            {/* Footer Controls */}
            {!isEditing && canEdit && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--ink-primary)] transition hover:bg-[var(--bg-surface)]"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  <span>修订拆解</span>
                </button>

                {!confirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="flex items-center gap-1.5 border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--ink-secondary)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    <span>淘汰此片</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] hover:bg-[var(--bg-surface)]"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(photo)}
                      className="bg-[var(--danger)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                    >
                      确认永久删除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
};

function EditPhotoForm({
  photo,
  onCancel,
  onSave,
}: {
  photo: PhotoItem;
  onCancel: () => void;
  onSave: (updated: PhotoItem) => Promise<void>;
}) {
  const [title, setTitle] = useState(photo.title);
  const [subject, setSubject] = useState<SubjectCategory>(photo.subject);
  const [compTags, setCompTags] = useState<string[]>(photo.compositionTags);
  const [lightTags, setLightTags] = useState<string[]>(photo.lightingTags);
  const [toneTags, setToneTags] = useState<string[]>(photo.toneTags);
  const [note, setNote] = useState(photo.note);
  const [customComp, setCustomComp] = useState('');
  const [customLight, setCustomLight] = useState('');
  const [customTone, setCustomTone] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (list: string[], tag: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...photo,
        title: title.trim() || photo.title,
        subject,
        compositionTags: compTags,
        lightingTags: lightTags,
        toneTags: toneTags,
        note: note.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 text-xs">
      <div>
        <label htmlFor="edit-title" className="block text-[11px] text-[var(--ink-muted)]">
          标题
        </label>
        <input
          id="edit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div>
        <span className="block text-[11px] text-[var(--ink-muted)]">题材归属</span>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {PRESET_TAXONOMY.subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubject(s.id)}
              className={`border py-1.5 text-xs transition ${
                subject === s.id
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--ink-primary)]'
                  : 'border-[var(--border-subtle)] text-[var(--ink-secondary)]'
              }`}
            >
              {s.label} {s.en}
            </button>
          ))}
        </div>
      </div>

      <TagEditorGroup
        label="构图"
        presets={PRESET_TAXONOMY.composition}
        selected={compTags}
        customInput={customComp}
        onCustomInputChange={setCustomComp}
        onToggle={(t) => toggle(compTags, t, setCompTags)}
      />

      <TagEditorGroup
        label="光影"
        presets={PRESET_TAXONOMY.lighting}
        selected={lightTags}
        customInput={customLight}
        onCustomInputChange={setCustomLight}
        onToggle={(t) => toggle(lightTags, t, setLightTags)}
      />

      <TagEditorGroup
        label="色调"
        presets={PRESET_TAXONOMY.tone}
        selected={toneTags}
        customInput={customTone}
        onCustomInputChange={setCustomTone}
        onToggle={(t) => toggle(toneTags, t, setToneTags)}
      />

      <div>
        <label htmlFor="edit-note" className="block text-[11px] text-[var(--ink-muted)]">
          审美拆解笔记
        </label>
        <textarea
          id="edit-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-xs text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--ink-secondary)]"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-ink)] disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存修订'}
        </button>
      </div>
    </form>
  );
}

function TagEditorGroup({
  label,
  presets,
  selected,
  customInput,
  onCustomInputChange,
  onToggle,
}: {
  label: string;
  presets: string[];
  selected: string[];
  customInput: string;
  onCustomInputChange: (v: string) => void;
  onToggle: (tag: string) => void;
}) {
  const allTags = Array.from(new Set([...presets, ...selected]));
  return (
    <div>
      <span className="block text-[11px] text-[var(--ink-muted)]">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1">
        {allTags.map((t) => {
          const active = selected.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggle(t)}
              className={`border px-2 py-0.5 text-[11px] transition ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent)] font-medium text-[var(--accent-ink)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              {t}
            </button>
          );
        })}
        <input
          type="text"
          value={customInput}
          onChange={(e) => onCustomInputChange(e.target.value)}
          placeholder="+ 自定义"
          aria-label={`添加自定义${label}标签`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (isImeComposing(e)) return;
              const trimmed = customInput.trim();
              if (trimmed && !selected.includes(trimmed)) {
                onToggle(trimmed);
              }
              onCustomInputChange('');
            }
          }}
          className="w-20 border border-dashed border-[var(--border-strong)] bg-transparent px-1.5 py-0.5 text-[11px] text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>
    </div>
  );
}
