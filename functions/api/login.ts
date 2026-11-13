import {
  createSessionCookie,
  Env,
  jsonResponse,
  resolveRepoTarget,
  verifyPasscode,
} from './_shared';

export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  const target = await resolveRepoTarget(env, request);

  if (!env.GITHUB_TOKEN || !env.CURATOR_PASSCODE || !target) {
    return jsonResponse(
      { ok: false, error: '尚未在 Cloudflare Pages 配置 GITHUB_TOKEN 与 CURATOR_PASSCODE 环境变量。' },
      503
    );
  }

  let passcode = '';
  try {
    const body = (await request.json()) as { passcode?: string };
    passcode = (body.passcode || '').trim();
  } catch {
    return jsonResponse({ ok: false, error: '请求格式无效' }, 400);
  }

  if (!passcode || !(await verifyPasscode(passcode, env.CURATOR_PASSCODE.trim()))) {
    return jsonResponse({ ok: false, error: '策展口令不正确' }, 401);
  }

  const cookie = await createSessionCookie(env, request);
  return jsonResponse(
    { ok: true, target },
    200,
    { 'Set-Cookie': cookie }
  );
}
