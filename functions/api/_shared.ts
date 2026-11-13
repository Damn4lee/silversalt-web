export interface Env {
  GITHUB_TOKEN?: string;
  CURATOR_PASSCODE?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
  VITE_ARCHIVE_OWNER?: string;
  VITE_ARCHIVE_REPO?: string;
  VITE_ARCHIVE_BRANCH?: string;
  ASSETS?: { fetch: (req: Request | URL | string) => Promise<Response> };
}

export interface RepoTarget {
  owner: string;
  repo: string;
  branch: string;
  useJsDelivr: boolean;
}

const COOKIE_NAME = 'silversalt_curator';
const SESSION_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

export function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export async function resolveRepoTarget(env: Env, request: Request): Promise<RepoTarget | null> {
  const envOwner = (env.GITHUB_OWNER || env.VITE_ARCHIVE_OWNER || '').trim();
  const envRepo = (env.GITHUB_REPO || env.VITE_ARCHIVE_REPO || '').trim();
  const envBranch = (env.GITHUB_BRANCH || env.VITE_ARCHIVE_BRANCH || 'main').trim();

  if (envOwner && envRepo) {
    return { owner: envOwner, repo: envRepo, branch: envBranch, useJsDelivr: true };
  }

  if (env.ASSETS) {
    try {
      const cfgRes = await env.ASSETS.fetch(new URL('/site.config.json', request.url).toString());
      if (cfgRes.ok) {
        const cfg = (await cfgRes.json()) as Partial<RepoTarget>;
        if (cfg.owner?.trim() && cfg.repo?.trim()) {
          return {
            owner: cfg.owner.trim(),
            repo: cfg.repo.trim(),
            branch: (cfg.branch || 'main').trim(),
            useJsDelivr: cfg.useJsDelivr !== false,
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function deriveHmacKey(env: Env): Promise<CryptoKey> {
  const material = `${env.CURATOR_PASSCODE || ''}::${env.GITHUB_TOKEN || ''}::silversalt-v1`;
  const raw = new TextEncoder().encode(material);
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function createSessionCookie(env: Env, request: Request): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = String(exp);
  const key = await deriveHmacKey(env);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const token = `${payload}.${toBase64Url(new Uint8Array(sig))}`;
  const isHttps = new URL(request.url).protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SEC}${secureFlag}`;
}

export function clearSessionCookie(request: Request): string {
  const isHttps = new URL(request.url).protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
}

export async function verifySessionCookie(env: Env, request: Request): Promise<boolean> {
  if (!env.GITHUB_TOKEN || !env.CURATOR_PASSCODE) return false;
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;

  const parts = match[1].split('.');
  if (parts.length !== 2) return false;
  const [payload, sigB64] = parts;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  try {
    const key = await deriveHmacKey(env);
    const sigBytes = fromBase64Url(sigB64);
    return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

export async function verifyPasscode(input: string, expected: string): Promise<boolean> {
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)));
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function encodeUtf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function getGitHubFileSha(
  token: string,
  target: RepoTarget,
  path: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${path}?ref=${encodeURIComponent(
    target.branch
  )}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Silversalt-Curator',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`查询 GitHub 文件失败 (${res.status})`);
  }
  const data = (await res.json()) as { sha?: string };
  return data.sha || null;
}
