import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CloudDownload,
  Eye,
  EyeOff,
  FolderGit2,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { GitHubConfig, PublicArchiveConfig } from '../types';
import { EdgeStatus, testGitHubConnection } from '../utils/storage';
import { closeTopLayerDialog, useDialogController } from '../utils/webPlatform';

interface GitHubSyncDialogProps {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  config: GitHubConfig;
  publicArchive: PublicArchiveConfig | null;
  edgeStatus: EdgeStatus;
  onEdgeLogin: (passcode: string) => Promise<void>;
  onEdgeLogout: () => Promise<void>;
  onRefreshGallery: () => Promise<void>;
  onSaveConfig: (next: GitHubConfig) => void;
  onPullFromGitHub: (config: GitHubConfig) => Promise<void>;
  onPushIndexToGitHub: (config: GitHubConfig) => Promise<void>;
}

export const GitHubSyncDialog: React.FC<GitHubSyncDialogProps> = ({
  dialogRef,
  config,
  publicArchive,
  edgeStatus,
  onEdgeLogin,
  onEdgeLogout,
  onRefreshGallery,
  onSaveConfig,
  onPullFromGitHub,
  onPushIndexToGitHub,
}) => {
  const [draft, setDraft] = useState<GitHubConfig>(config);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [busyAction, setBusyAction] = useState<'login' | 'logout' | 'refresh' | 'test' | 'pull' | 'push' | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useDialogController(dialogRef, () => {
    setDraft(config);
    setPasscode('');
    setShowPasscode(false);
    setFeedback(null);
  });

  const isValidTokenForm = Boolean(draft.owner.trim() && draft.repo.trim() && draft.token.trim());

  const handleEdgeLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || busyAction) return;
    setBusyAction('login');
    setFeedback(null);
    try {
      await onEdgeLogin(passcode.trim());
      setPasscode('');
      void closeTopLayerDialog(dialogRef.current);
    } catch (err) {
      setFeedback({ ok: false, text: err instanceof Error ? err.message : '口令验证失败' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleTokenSave = (e: React.FormEvent) => {
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

  const handleTestToken = async () => {
    setBusyAction('test');
    setFeedback(null);
    try {
      const res = await testGitHubConnection(draft);
      setFeedback({ ok: res.ok, text: res.message });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="github-dialog-title"
      className="m-auto w-[92vw] max-w-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-6 text-[var(--ink-primary)] shadow-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            {edgeStatus.edgeMode ? (
              <KeyRound className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            ) : (
              <FolderGit2 className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            )}
            <h2 id="github-dialog-title" className="font-editorial text-base font-medium">
              {edgeStatus.edgeMode ? '策展人安全认证' : 'GitHub 私有图床与策展权限'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void closeTopLayerDialog(dialogRef.current)}
            aria-label="关闭认证弹窗"
            className="flex h-7 w-7 items-center justify-center border border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {feedback && (
          <div
            role="alert"
            className={`flex items-start gap-2 border px-3 py-2.5 text-xs ${
              feedback.ok
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-[var(--danger)] bg-red-500/10 text-[var(--danger)]'
            }`}
          >
            {feedback.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Edge Passcode Auth Mode (Cloudflare Pages Functions enabled) */}
        {edgeStatus.edgeMode && (
          <div className="space-y-4">
            {edgeStatus.authenticated ? (
              <div className="space-y-4 text-xs">
                <div className="border border-emerald-500/35 bg-emerald-500/10 p-3.5 text-[var(--ink-primary)]">
                  <div className="font-medium text-emerald-300">已开启多端策展模式（30 天免重复登录）</div>
                  <p className="mt-1 leading-relaxed text-[var(--ink-secondary)]">
                    GitHub Token 由 Cloudflare 边缘节点安全托管，你在手机拍照或电脑拖图时都会自动压缩为 WebP 并写入{' '}
                    <code className="font-tabular">
                      {edgeStatus.target?.owner}/{edgeStatus.target?.repo}
                    </code>
                    。
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={async () => {
                      setBusyAction('refresh');
                      try {
                        await onRefreshGallery();
                        setFeedback({ ok: true, text: '已从云端刷新最新作品集' });
                      } finally {
                        setBusyAction(null);
                      }
                    }}
                    className="flex items-center gap-1.5 border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{busyAction === 'refresh' ? '刷新中...' : '同步最新作品'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={async () => {
                      setBusyAction('logout');
                      try {
                        await onEdgeLogout();
                        void closeTopLayerDialog(dialogRef.current);
                      } finally {
                        setBusyAction(null);
                      }
                    }}
                    className="flex items-center gap-1.5 border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>退出策展登录</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEdgeLoginSubmit} className="space-y-3.5 text-xs">
                <p className="leading-relaxed text-[var(--ink-secondary)]">
                  输入你设定的<strong>策展口令</strong>即可解锁手机/电脑多端直传（支持浏览器或 Face ID 自动填充，一次登录 30 天有效，无需再贴 GitHub Token）。
                </p>

                <input
                  type="text"
                  name="username"
                  value={edgeStatus.target?.owner || 'curator'}
                  autoComplete="username"
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                />

                <div>
                  <label htmlFor="curator-passcode" className="block text-[11px] text-[var(--ink-muted)]">
                    策展口令
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="curator-passcode"
                      name="password"
                      type={showPasscode ? 'text' : 'password'}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      autoComplete="current-password"
                      enterKeyHint="done"
                      required
                      placeholder="输入你配置的 CURATOR_PASSCODE"
                      className="w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2 pr-10 pl-3 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode((v) => !v)}
                      aria-label={showPasscode ? '隐藏口令' : '显示口令'}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                    >
                      {showPasscode ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={busyAction !== null}
                    className="bg-[var(--accent)] px-5 py-2 text-xs font-medium text-[var(--accent-ink)] transition hover:opacity-90 disabled:opacity-50"
                  >
                    {busyAction === 'login' ? '验证中...' : '解锁策展'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Fallback Manual Token Configuration (Always shown if !edgeMode, or inside <details> when edgeMode is active) */}
        {edgeStatus.edgeMode ? (
          <details className="border-t border-[var(--border-subtle)] pt-3 text-xs">
            <summary className="cursor-pointer text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
              高级选项：手动管理 GitHub Token（备用直连）
            </summary>
            <div className="mt-3">
              <ManualTokenForm
                draft={draft}
                setDraft={setDraft}
                isValid={isValidTokenForm}
                busyAction={busyAction}
                setBusyAction={setBusyAction}
                setFeedback={setFeedback}
                onTest={handleTestToken}
                onSave={handleTokenSave}
                onSaveConfig={onSaveConfig}
                onPullFromGitHub={onPullFromGitHub}
                onPushIndexToGitHub={onPushIndexToGitHub}
              />
            </div>
          </details>
        ) : (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
              {publicArchive && !config.token ? (
                <>
                  当前为<strong>访客只读模式</strong>（数据源：<code className="font-tabular">{publicArchive.owner}/{publicArchive.repo}</code>）。
                  在 Cloudflare Pages 环境变量配置 <code className="font-tabular">GITHUB_TOKEN</code> 和 <code className="font-tabular">CURATOR_PASSCODE</code> 后，即可用短口令多端登录；在此之前也可先贴入 Token 使用。
                </>
              ) : (
                <>
                  凭证保存在当前浏览器 <code className="font-tabular">localStorage</code>。如果在 Cloudflare Pages 后台配置了{' '}
                  <code className="font-tabular">GITHUB_TOKEN</code> 与 <code className="font-tabular">CURATOR_PASSCODE</code>，手机端将无需输入 Token，只需短口令即可上传。
                </>
              )}
            </p>
            <ManualTokenForm
              draft={draft}
              setDraft={setDraft}
              isValid={isValidTokenForm}
              busyAction={busyAction}
              setBusyAction={setBusyAction}
              setFeedback={setFeedback}
              onTest={handleTestToken}
              onSave={handleTokenSave}
              onSaveConfig={onSaveConfig}
              onPullFromGitHub={onPullFromGitHub}
              onPushIndexToGitHub={onPushIndexToGitHub}
            />
          </div>
        )}
      </div>
    </dialog>
  );
};

function ManualTokenForm({
  draft,
  setDraft,
  isValid,
  busyAction,
  setBusyAction,
  setFeedback,
  onTest,
  onSave,
  onSaveConfig,
  onPullFromGitHub,
  onPushIndexToGitHub,
}: {
  draft: GitHubConfig;
  setDraft: React.Dispatch<React.SetStateAction<GitHubConfig>>;
  isValid: boolean;
  busyAction: string | null;
  setBusyAction: React.Dispatch<React.SetStateAction<'login' | 'logout' | 'refresh' | 'test' | 'pull' | 'push' | null>>;
  setFeedback: React.Dispatch<React.SetStateAction<{ ok: boolean; text: string } | null>>;
  onTest: () => Promise<void>;
  onSave: (e: React.FormEvent) => void;
  onSaveConfig: (next: GitHubConfig) => void;
  onPullFromGitHub: (config: GitHubConfig) => Promise<void>;
  onPushIndexToGitHub: (config: GitHubConfig) => Promise<void>;
}) {
  return (
    <form onSubmit={onSave} className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="gh-owner" className="block text-[11px] text-[var(--ink-muted)]">
            GitHub Owner
          </label>
          <input
            id="gh-owner"
            type="text"
            placeholder="例如: Damn4lee"
            value={draft.owner}
            onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
            className="mt-1 w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="gh-repo" className="block text-[11px] text-[var(--ink-muted)]">
            图床仓库名 (Repository)
          </label>
          <input
            id="gh-repo"
            type="text"
            placeholder="例如: myphotos"
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={!isValid || busyAction !== null}
            onClick={() => void onTest()}
            className="flex items-center gap-1.5 border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] disabled:opacity-40"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{busyAction === 'test' ? '测试中...' : '测试权限'}</span>
          </button>

          <button
            type="button"
            disabled={!isValid || busyAction !== null}
            onClick={async () => {
              setBusyAction('pull');
              setFeedback(null);
              try {
                onSaveConfig(draft);
                await onPullFromGitHub(draft);
              } catch (err) {
                setFeedback({ ok: false, text: err instanceof Error ? err.message : '拉取失败' });
              } finally {
                setBusyAction(null);
              }
            }}
            className="flex items-center gap-1.5 border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] disabled:opacity-40"
          >
            <CloudDownload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{busyAction === 'pull' ? '拉取中...' : '拉取云端'}</span>
          </button>

          <button
            type="button"
            disabled={!isValid || busyAction !== null}
            onClick={async () => {
              setBusyAction('push');
              setFeedback(null);
              try {
                onSaveConfig(draft);
                await onPushIndexToGitHub(draft);
                setFeedback({ ok: true, text: '已将当前图库索引推送到 GitHub！' });
              } catch (err) {
                setFeedback({ ok: false, text: err instanceof Error ? err.message : '推送失败' });
              } finally {
                setBusyAction(null);
              }
            }}
            className="flex items-center gap-1.5 border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] disabled:opacity-40"
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
  );
}
