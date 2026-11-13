import { Env, getGitHubFileSha, jsonResponse, resolveRepoTarget, verifySessionCookie } from './_shared';

export async function onRequestDelete(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  if (!(await verifySessionCookie(env, request))) {
    return jsonResponse({ error: '策展登录已失效，请重新输入策展口令' }, 401);
  }

  const target = await resolveRepoTarget(env, request);
  if (!target || !env.GITHUB_TOKEN) {
    return jsonResponse({ error: '云端图床未配置完整' }, 503);
  }

  const body = (await request.json()) as { githubPath?: string; githubSha?: string };
  const githubPath = (body.githubPath || '').trim();
  if (!githubPath || !githubPath.startsWith('photos/')) {
    return jsonResponse({ error: '非法文件路径' }, 400);
  }

  const sha = body.githubSha || (await getGitHubFileSha(env.GITHUB_TOKEN, target, githubPath));
  if (!sha) {
    return jsonResponse({ ok: true });
  }

  const res = await fetch(
    `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${githubPath}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Silversalt-Curator',
      },
      body: JSON.stringify({
        message: `chore(aesthetic): remove outdated photo ${githubPath}`,
        sha,
        branch: target.branch,
      }),
    }
  );

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    return jsonResponse({ error: `删除云端文件失败 (${res.status}): ${errText.slice(0, 180)}` }, res.status);
  }

  return jsonResponse({ ok: true });
}
