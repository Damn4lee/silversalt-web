import {
  encodeUtf8ToBase64,
  Env,
  getGitHubFileSha,
  jsonResponse,
  resolveRepoTarget,
  verifySessionCookie,
} from './_shared';

export async function onRequestPut(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  if (!(await verifySessionCookie(env, request))) {
    return jsonResponse({ error: '策展登录已失效，请重新输入策展口令' }, 401);
  }

  const target = await resolveRepoTarget(env, request);
  if (!target || !env.GITHUB_TOKEN) {
    return jsonResponse({ error: '云端图床未配置完整' }, 503);
  }

  const body = (await request.json()) as { items?: unknown[] };
  if (!Array.isArray(body.items)) {
    return jsonResponse({ error: '索引格式无效' }, 400);
  }

  const indexPath = 'gallery-index.json';
  const jsonString = JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      totalCount: body.items.length,
      items: body.items,
    },
    null,
    2
  );

  const url = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${indexPath}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const existingSha = await getGitHubFileSha(env.GITHUB_TOKEN, target, indexPath);
    const payload: Record<string, string> = {
      message: `chore(index): sync gallery-index.json (${body.items.length} items)`,
      content: encodeUtf8ToBase64(jsonString),
      branch: target.branch,
    };
    if (existingSha) {
      payload.sha = existingSha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Silversalt-Curator',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return jsonResponse({ ok: true });
    }
    if (res.status === 409 && attempt === 0) {
      continue;
    }
    const errText = await res.text();
    return jsonResponse({ error: `同步索引失败 (${res.status}): ${errText.slice(0, 180)}` }, res.status);
  }

  return jsonResponse({ error: '索引同步冲突，请重试' }, 409);
}
