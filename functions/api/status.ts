import { Env, jsonResponse, resolveRepoTarget, verifySessionCookie } from './_shared';

export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  const target = await resolveRepoTarget(env, request);
  const edgeConfigured = Boolean(env.GITHUB_TOKEN && env.CURATOR_PASSCODE && target);
  const authenticated = edgeConfigured ? await verifySessionCookie(env, request) : false;

  return jsonResponse({
    edgeMode: edgeConfigured,
    authenticated,
    target,
  });
}
