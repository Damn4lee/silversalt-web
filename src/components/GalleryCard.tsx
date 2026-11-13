import React from 'react';
import { Cloud, Trash2 } from 'lucide-react';
import { PhotoItem, UiAestheticConfig } from '../types';

interface GalleryCardProps {
  photo: PhotoItem;
  isLcpCandidate: boolean;
  canEdit: boolean;
  uiConfig: UiAestheticConfig;
  onOpen: (photo: PhotoItem) => void;
  onDelete: (photo: PhotoItem) => void;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({
  photo,
  isLcpCandidate,
  canEdit,
  uiConfig,
  onOpen,
  onDelete,
}) => {
  const radiusClass = uiConfig.radius === 'sharp' ? 'rounded-[2px]' : 'rounded-lg';
  const isPure = uiConfig.captionMode === 'pure';

  const compactExif = [photo.exif?.focalLength, photo.exif?.aperture].filter(Boolean).join(' · ');
  const summaryTags = [
    photo.compositionTags[0],
    photo.lightingTags[0],
    photo.toneTags[0],
  ].filter(Boolean);

  const safeTransitionName = `card-${photo.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return (
    <article
      className={`photo-card group overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-[border-color,box-shadow] duration-200 hover:border-[var(--border-strong)] ${radiusClass}`}
      style={{ viewTransitionName: safeTransitionName } as React.CSSProperties}
    >
      {/* Print Stage */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          backgroundColor: photo.palette[0] || 'var(--bg-elevated)',
          aspectRatio: `${photo.width} / ${photo.height}`,
        }}
      >
        {isLcpCandidate ? (
          <img
            src={photo.imageUrl}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            fetchPriority="high"
            className="block h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.018]"
          />
        ) : (
          <img
            src={photo.imageUrl}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            className="block h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.018]"
          />
        )}

        {/* Quiet Top-Right Actions (Revealed on Hover / Focus) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="bg-black/65 px-2 py-0.5 text-[10px] tracking-widest text-[#ece9e2] uppercase backdrop-blur-sm">
            {photo.subject === 'humanities' ? '人文' : '自然'}
          </span>

          <div className="pointer-events-auto flex items-center gap-1.5">
            {photo.githubPath && canEdit && (
              <span
                className="flex h-6 items-center gap-1 bg-black/65 px-2 text-[10px] text-[#d2b48c] backdrop-blur-sm"
                title={`已同步至云端: ${photo.githubPath}`}
              >
                <Cloud className="h-3 w-3" aria-hidden="true" />
              </span>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo);
                }}
                aria-label={`淘汰作品：${photo.title}`}
                title="淘汰此片"
                className="card-secondary-action flex h-6 w-6 items-center justify-center bg-black/65 text-[#ece9e2]/80 backdrop-blur-sm transition-colors hover:bg-[#b43c2e] hover:text-white"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Pure Mode Hover Scrim */}
        {isPure && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3.5 pt-8 pb-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <p className="font-editorial truncate text-[13px] font-medium text-[#ece9e2]">{photo.title}</p>
            {(compactExif || summaryTags.length > 0) && (
              <p className="font-tabular mt-0.5 truncate text-[10px] text-[#ece9e2]/70">
                {[compactExif, summaryTags.join(' / ')].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stretched Primary Trigger Button covering the whole card */}
      <button
        type="button"
        onClick={() => onOpen(photo)}
        aria-label={`查看审美拆解：${photo.title}`}
        className="card-primary-trigger block w-full text-left focus:outline-none"
      >
        {!isPure && (
          <>
            {/* Hairline 5-color Pigment Bar */}
            <div className="flex h-[2px] w-full" aria-hidden="true">
              {photo.palette.map((hex, i) => (
                <div key={`${photo.id}-swatch-${i}`} className="flex-1" style={{ backgroundColor: hex }} />
              ))}
            </div>

            <div className="px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-editorial truncate text-[13.5px] font-medium tracking-wide text-[var(--ink-primary)]">
                  {photo.title}
                </h3>
                {compactExif && (
                  <span className="font-tabular shrink-0 text-[10px] text-[var(--ink-muted)]">
                    {compactExif}
                  </span>
                )}
              </div>

              {photo.note && (
                <p className="line-clamp-editorial mt-1 text-[11.5px] leading-relaxed text-[var(--ink-secondary)]">
                  {photo.note}
                </p>
              )}

              {summaryTags.length > 0 && (
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2 text-[10.5px] text-[var(--ink-muted)]">
                  <span className="truncate">{summaryTags.join(' · ')}</span>
                  <span className="font-tabular shrink-0">{photo.sizeKB} KB</span>
                </div>
              )}
            </div>
          </>
        )}
      </button>
    </article>
  );
};
