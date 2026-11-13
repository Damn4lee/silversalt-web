import React, { useEffect, useState } from 'react';
import { CloudDownload, FolderGit2, RefreshCw, X } from 'lucide-react';
import { GitHubConfig, PublicArchiveConfig } from '../types';
import { closeTopLayerDialog, useDialogController } from '../utils/webPlatform';

interface GitHubSyncDialogProps {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  config: GitHubConfig;
  publicArchive: PublicArchiveConfig | null;
  onSaveConfig: (next: GitHubConfig) => void;
  onPullFromGitHub: (config: GitHubConfig) => Promise<void>;
  onPushIndexToGitHub: (config: GitHubConfig) => Promise<void>;
}

export const GitHubSyncDialog: React.FC<GitHubSyncDialogProps> = ({
  dialogRef,
  config,
  publicArchive,
  onSaveConfig,
  onPullFromGitHub,
  onPushIndexToGitHub,
}) => {
  const [draft, setDraft] = useState<GitHubConfig>(config);
  const [busyAction, setBusyAction] = useState<'pull' | 'push' | null>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useDialogController(dialogRef, () => {
    setDraft(config);
  });

  const isValid = Boolean(draft.owner && draft.repo && draft.token);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...draft,
      owner: draft.owner.trim(),
      repo: draft.repo.trim(),
      branch: draft.branch.trim() || 'main',
      token: draft.token.trim(),
    });
    void closeTopLayerDialog(dialogRef.current);
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="github-dialog-title"
      className="m-auto w-[92vw] max-w-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-6 text-[var(--ink-primary)] shadow-2xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 id="github-dialog-title" className="font-editorial text-base font-medium">
              GitHub 私有图床与跨端索引同步
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void closeTopLayerDialog(dialogRef.current)}
            aria-label="关闭同步配置"
            className="flex h-7 w-7 items-center justify-center border border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
          {publicArchive && !config.token ? (
            <>
              当前站点处于<strong>公开只读展览模式</strong>（数据源：<code className="font-tabular">{publicArchive.owner}/{publicArchive.repo}</code>）。
              填入你自己的 GitHub Token（仅存于本机浏览器 <code className="font-tabular">localStorage</code>）即可解锁「收录 / 修订 / 淘汰」策展写入权限。
            </>
          ) : (
            <>
              凭证仅存储在当前浏览器的 <code className="font-tabular">localStorage</code>。配置后，上传切片将转为 WebP 直传仓库
              <code className="font-tabular"> photos/YYYY-MM/</code> 并维护 <code className="font-tabular">gallery-index.json</code>；淘汰照片也会同步删除云端源文件。
            </>
          )}
        </p>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="gh-owner" className="block text-[11px] text-[var(--ink-muted)]">
                GitHub Owner
              </label>
              <input
                id="gh-owner"
                type="text"
                placeholder="例如: username"
                value={draft.owner}
                onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                className="mt-1 w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="gh-repo" className="block text-[11px] text-[var(--ink-muted)]">
                仓库名 (Repository)
              </label>
              <input
                id="gh-repo"
                type="text"
                placeholder="例如: photo-archive"
                value={draft.repo}
                onChange={(e) => setDraft({ ...draft, repo: e.target.value })}
                className="mt-1 w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="gh-branch" className="block text-[11px] text-[var(--ink-muted)]">
                分支 (Branch)
              </label>
              <input
                id="gh-branch"
                type="text"
                placeholder="main"
                value={draft.branch}
                onChange={(e) => setDraft({ ...draft, branch: e.target.value })}
                className="mt-1 w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-[var(--ink-secondary)]">
                <input
                  type="checkbox"
                  checked={draft.useJsDelivr}
                  onChange={(e) => setDraft({ ...draft, useJsDelivr: e.target.checked })}
                  className="h-3.5 w-3.5"
                />
                <span>启用 jsDelivr CDN 加速</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="gh-token" className="block text-[11px] text-[var(--ink-muted)]">
              Personal Access Token (Contents: Read & Write)
            </label>
            <input
              id="gh-token"
              type="password"
              placeholder="ghp_... 或 github_pat_..."
              value={draft.token}
              onChange={(e) => setDraft({ ...draft, token: e.target.value })}
              className="font-tabular mt-1 w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isValid || busyAction !== null}
              onClick={async () => {
                setBusyAction('pull');
                try {
                  onSaveConfig(draft);
                  await onPullFromGitHub(draft);
                } finally {
                  setBusyAction(null);
                }
              }}
              className="flex items-center gap-1.5 border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] disabled:opacity-40"
            >
              <CloudDownload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{busyAction === 'pull' ? '拉取中...' : '从云端恢复'}</span>
            </button>

            <button
              type="button"
              disabled={!isValid || busyAction !== null}
              onClick={async () => {
                setBusyAction('push');
                try {
                  onSaveConfig(draft);
                  await onPushIndexToGitHub(draft);
                } finally {
                  setBusyAction(null);
                }
              }}
              className="flex items-center gap-1.5 border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{busyAction === 'push' ? '同步中...' : '推送索引'}</span>
            </button>
          </div>

          <button
            type="submit"
            className="bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-[var(--accent-ink)] transition hover:opacity-90"
          >
            保存配置
          </button>
        </div>
      </form>
    </dialog>
  );
};
