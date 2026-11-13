import { Env, jsonResponse, resolveRepoTarget, verifySessionCookie } from './_shared';

export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  if (!(await verifySessionCookie(env, request))) {
    return jsonResponse({ error: '策展登录已失效，请重新输入策展口令' }, 401);
  }

  const target = await resolveRepoTarget(env, request);
  if (!target || !env.GITHUB_TOKEN) {
    return jsonResponse({ error: '云端图床未配置完整' }, 503);
  }

  const body = (await request.json()) as { photoId?: string; base64Content?: string };
  const photoId = (body.photoId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const base64Content = body.base64Content || '';

  if (!photoId || !base64Content) {
    return jsonResponse({ error: '缺少图片内容或 ID' }, 400);
  }

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const githubPath = `photos/${ym}/${photoId}.webp`;

  const ghRes = await fetch(
    `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${githubPath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Silversalt-Curator',
      },
      body: JSON.stringify({
        message: `feat(aesthetic): upload ${photoId}.webp`,
        content: base64Content,
        branch: target.branch,
      }),
    }
  );

  if (!ghRes.ok) {
    const errText = await ghRes.text();
    return jsonResponse({ error: `GitHub 上传失败 (${ghRes.status}): ${errText.slice(0, 180)}` }, ghRes.status);
  }

  const data = (await ghRes.json()) as { content?: { sha?: string } };
  const githubSha = data.content?.sha || '';
  const remoteUrl = target.useJsDelivr
    ? `https://cdn.jsdelivr.net/gh/${target.owner}/${target.repo}@${target.branch}/${githubPath}`
    : `https://raw.githubusercontent.com/${target.owner}/${target.repo}/${target.branch}/${githubPath}`;

  return jsonResponse({ githubPath, githubSha, remoteUrl });
}
