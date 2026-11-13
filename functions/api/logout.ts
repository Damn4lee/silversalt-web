import { clearSessionCookie, jsonResponse } from './_shared';

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  return jsonResponse(
    { ok: true },
    200,
    { 'Set-Cookie': clearSessionCookie(context.request) }
  );
}
