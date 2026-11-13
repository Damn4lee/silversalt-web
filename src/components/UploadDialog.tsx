import React, { useEffect, useState } from 'react';
import { Cloud, ShieldAlert, Upload, X, Zap } from 'lucide-react';
import { PRESET_TAXONOMY, SubjectCategory } from '../types';
import { ProcessedImageResult } from '../utils/imageProcessor';
import { closeTopLayerDialog, isImeComposing, useDialogController } from '../utils/webPlatform';

export interface UploadDraft {
  id: string;
  fileName: string;
  processed: ProcessedImageResult;
}

export interface UploadCommitPayload {
  draft: UploadDraft;
  title: string;
  subject: SubjectCategory;
  compositionTags: string[];
  lightingTags: string[];
  toneTags: string[];
  note: string;
}

interface UploadDialogProps {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  queue: UploadDraft[];
  defaultSubject: SubjectCategory;
  isGitHubConnected: boolean;
  instantUpload: boolean;
  onToggleInstantUpload: (enabled: boolean) => void;
  onCloseAll: () => void;
  onSkipCurrent: () => void;
  onCommitCurrent: (payload: UploadCommitPayload) => Promise<void>;
  onCommitAll: (payload: {
    subject: SubjectCategory;
    compositionTags: string[];
    lightingTags: string[];
    toneTags: string[];
  }) => Promise<void>;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({
  dialogRef,
  queue,
  defaultSubject,
  isGitHubConnected,
  instantUpload,
  onToggleInstantUpload,
  onCloseAll,
  onSkipCurrent,
  onCommitCurrent,
  onCommitAll,
}) => {
  const current = queue[0] ?? null;

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectCategory>(defaultSubject);
  const [compTags, setCompTags] = useState<string[]>([]);
  const [lightTags, setLightTags] = useState<string[]>([]);
  const [toneTags, setToneTags] = useState<string[]>([]);
  const [customComp, setCustomComp] = useState('');
  const [customLight, setCustomLight] = useState('');
  const [customTone, setCustomTone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState<'single' | 'batch' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useDialogController(dialogRef, () => {
    setErrorMsg(null);
    onCloseAll();
  });

  useEffect(() => {
    if (!current) return;
    const baseName = current.fileName.replace(/\.[^.]+$/, '').trim();
    const isGeneric = !baseName || baseName.toLowerCase() === 'image' || baseName.startsWith('clipboard');
    setTitle(isGeneric ? `暗房切片 · ${new Date().toLocaleDateString('zh-CN')}` : baseName);
    setSubject(defaultSubject);
    setCompTags([]);
    setLightTags([]);
    setToneTags([]);
    setCustomComp('');
    setCustomLight('');
    setCustomTone('');
    setNote('');
    setErrorMsg(null);
  }, [current?.id, defaultSubject]);

  const toggleTag = (list: string[], tag: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || submitting) return;
    setSubmitting('single');
    setErrorMsg(null);
    try {
      await onCommitCurrent({
        draft: current,
        title: title.trim() || '无题摄影切片',
        subject,
        compositionTags: compTags.length > 0 ? compTags : ['大面积留白'],
        lightingTags: lightTags.length > 0 ? lightTags : ['柔光漫射'],
        toneTags: toneTags.length > 0 ? toneTags : ['复古胶片暖调'],
        note: note.trim(),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '入库失败，请检查网络连接或 GitHub Token 权限');
    } finally {
      setSubmitting(null);
    }
  };

  const handleBatchUpload = async () => {
    if (queue.length === 0 || submitting) return;
    setSubmitting('batch');
    setErrorMsg(null);
    try {
      await onCommitAll({
        subject,
        compositionTags: compTags.length > 0 ? compTags : ['大面积留白'],
        lightingTags: lightTags.length > 0 ? lightTags : ['柔光漫射'],
        toneTags: toneTags.length > 0 ? toneTags : ['复古胶片暖调'],
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '批量上传失败，请检查网络或 Token 权限');
    } finally {
      setSubmitting(null);
    }
  };

  const savedPercent = current
    ? Math.max(0, Math.round((1 - current.processed.sizeKB / current.processed.originalSizeKB) * 100))
    : 0;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="upload-dialog-title"
      className="m-auto max-h-[92dvh] w-[95vw] max-w-4xl overflow-y-auto border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-6 text-[var(--ink-primary)] shadow-2xl"
    >
      {current && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 id="upload-dialog-title" className="font-editorial text-lg font-medium">
                  入库审美拆解
                </h2>
                {queue.length > 1 && (
                  <span className="font-tabular border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10.5px] text-[var(--accent)]">
                    队列待处理 {queue.length} 张
                  </span>
                )}
              </div>
              <p className="font-tabular mt-1 text-[11.5px] text-[var(--ink-muted)]">
                {current.fileName} ({current.processed.originalSizeKB} KB) → WebP {current.processed.sizeKB} KB · 压缩节省{' '}
                {savedPercent}% · {current.processed.width} × {current.processed.height}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void closeTopLayerDialog(dialogRef.current)}
              aria-label="关闭入库面板"
              className="flex h-8 w-8 items-center justify-center border border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 border border-[var(--danger)] bg-red-500/10 px-3.5 py-2.5 text-xs text-[var(--danger)]"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Multi-file thumbnail strip */}
          {queue.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2">
              {queue.map((item, idx) => (
                <div
                  key={item.id}
                  className={`relative h-12 w-12 shrink-0 overflow-hidden border ${
                    idx === 0 ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border-subtle)] opacity-60'
                  }`}
                >
                  <img src={item.processed.webpDataUrl} alt={item.fileName} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Left Print Preview + Pigment + EXIF */}
            <div className="space-y-4 md:col-span-5">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden border border-[var(--border-subtle)] bg-[#080809] p-3">
                <img
                  src={current.processed.webpDataUrl}
                  alt="待入库作品预览"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div>
                <span className="block text-[11px] text-[var(--ink-muted)]">自动提取 5 色样本</span>
                <div className="mt-1.5 grid grid-cols-5 gap-1">
                  {current.processed.palette.map((hex) => (
                    <div key={hex}>
                      <div
                        className="h-6 border border-[var(--border-subtle)]"
                        style={{ backgroundColor: hex, forcedColorAdjust: 'none' }}
                      />
                      <span className="font-tabular mt-0.5 block text-center text-[9.5px] text-[var(--ink-muted)]">
                        {hex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {current.processed.exif && (
                <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-[11px] text-[var(--ink-secondary)]">
                  <div className="text-[10px] tracking-wider text-[var(--ink-muted)] uppercase">读取到 EXIF</div>
                  <div className="font-tabular mt-1">
                    {[
                      current.processed.exif.camera,
                      current.processed.exif.focalLength,
                      current.processed.exif.aperture,
                      current.processed.exif.shutter,
                      current.processed.exif.iso,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              )}
            </div>

            {/* Right Taxonomy & Note Form */}
            <div className="space-y-4 text-xs md:col-span-7">
              <div>
                <label htmlFor="upload-title" className="block text-[11px] text-[var(--ink-muted)]">
                  作品标题 / 视觉记忆点
                </label>
                <input
                  id="upload-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-[11px] text-[var(--ink-muted)]">1. 一级题材归属</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {PRESET_TAXONOMY.subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubject(s.id)}
                      className={`border p-2.5 text-left transition ${
                        subject === s.id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="font-medium">
                        {s.label} <span className="text-[10px] opacity-60">{s.en}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--ink-muted)]">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <DimensionPicker
                label="2. 构图维度"
                presets={PRESET_TAXONOMY.composition}
                selected={compTags}
                customInput={customComp}
                onCustomInputChange={setCustomComp}
                onToggle={(t) => toggleTag(compTags, t, setCompTags)}
              />

              <DimensionPicker
                label="3. 光影维度"
                presets={PRESET_TAXONOMY.lighting}
                selected={lightTags}
                customInput={customLight}
                onCustomInputChange={setCustomLight}
                onToggle={(t) => toggleTag(lightTags, t, setLightTags)}
              />

              <DimensionPicker
                label="4. 色调维度"
                presets={PRESET_TAXONOMY.tone}
                selected={toneTags}
                customInput={customTone}
                onCustomInputChange={setCustomTone}
                onToggle={(t) => toggleTag(toneTags, t, setToneTags)}
              />

              <div>
                <label htmlFor="upload-note" className="block text-[11px] text-[var(--ink-muted)]">
                  审美拆解笔记（可留空，入库后随时补充）
                </label>
                <textarea
                  id="upload-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例如：利用门框二次构图压暗四周，让受光区域的人物动作显得更克制..."
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                checked={instantUpload}
                onChange={(e) => onToggleInstantUpload(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <Zap className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
              <span>下次选图 / 粘贴后直接一键入库（跳过此弹窗）</span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {queue.length > 1 && (
                <>
                  <button
                    type="button"
                    disabled={submitting !== null}
                    onClick={onSkipCurrent}
                    className="border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--ink-secondary)] hover:border-[var(--border-strong)]"
                  >
                    跳过当前
                  </button>
                  <button
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => void handleBatchUpload()}
                    className="flex items-center gap-1.5 border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-xs font-medium text-[var(--accent)] transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{submitting === 'batch' ? '批量上传中...' : `一键全部入库 (${queue.length} 张)`}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => void closeTopLayerDialog(dialogRef.current)}
                className="border border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--ink-secondary)] hover:border-[var(--border-strong)]"
              >
                取消
              </button>

              <button
                type="submit"
                disabled={submitting !== null}
                className="flex items-center gap-1.5 bg-[var(--accent)] px-5 py-2 text-xs font-medium text-[var(--accent-ink)] transition hover:opacity-90 disabled:opacity-50"
              >
                {isGitHubConnected ? <Cloud className="h-3.5 w-3.5" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
                <span>
                  {submitting === 'single'
                    ? '正在上传...'
                    : queue.length > 1
                    ? '保存当前并下一张'
                    : isGitHubConnected
                    ? '一键上传至云端'
                    : '保存至本地'}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  );
};

function DimensionPicker({
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
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {allTags.map((t) => {
          const active = selected.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggle(t)}
              className={`border px-2.5 py-1 text-[11px] transition ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent)] font-medium text-[var(--accent-ink)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]'
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
          placeholder="+ 自定义回车"
          aria-label={`自定义${label}`}
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
          className="w-24 border border-dashed border-[var(--border-strong)] bg-transparent px-2 py-1 text-[11px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>
    </div>
  );
}
