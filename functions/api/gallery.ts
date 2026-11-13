import { Env, jsonResponse, resolveRepoTarget } from './_shared';

export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  const target = await resolveRepoTarget(env, request);
  if (!target) {
    return jsonResponse({ items: [] });
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.raw+json',
    'User-Agent': 'Silversalt-Archive',
  };
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  try {
    const url = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/gallery-index.json?ref=${encodeURIComponent(
      target.branch
    )}`;
    const res = await fetch(url, { headers });
    if (res.status === 404) {
      return jsonResponse({ items: [] });
    }
    if (res.ok) {
      const parsed = (await res.json()) as { items?: unknown[] };
      return jsonResponse({ items: Array.isArray(parsed.items) ? parsed.items : [] });
    }
  } catch {
    // fallback below
  }

  try {
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${target.owner}/${target.repo}@${target.branch}/gallery-index.json`;
    const res = await fetch(cdnUrl);
    if (res.ok) {
      const parsed = (await res.json()) as { items?: unknown[] };
      return jsonResponse({ items: Array.isArray(parsed.items) ? parsed.items : [] });
    }
  } catch {
    // ignore
  }

  return jsonResponse({ items: [] });
}
