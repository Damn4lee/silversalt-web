import { Env, jsonResponse } from '../functions/api/_shared';
import { onRequestGet as handleStatusGet } from '../functions/api/status';
import { onRequestPost as handleLoginPost } from '../functions/api/login';
import { onRequestPost as handleLogoutPost } from '../functions/api/logout';
import { onRequestGet as handleGalleryGet } from '../functions/api/gallery';
import { onRequestPost as handleUploadPost } from '../functions/api/upload';
import { onRequestPut as handleIndexPut } from '../functions/api/index';
import { onRequestDelete as handlePhotoDelete } from '../functions/api/photo';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    try {
      if (path === '/api/status' && method === 'GET') {
        return await handleStatusGet({ env, request });
      }
      if (path === '/api/login' && method === 'POST') {
        return await handleLoginPost({ env, request });
      }
      if (path === '/api/logout' && method === 'POST') {
        return await handleLogoutPost({ request });
      }
      if (path === '/api/gallery' && method === 'GET') {
        return await handleGalleryGet({ env, request });
      }
      if (path === '/api/upload' && method === 'POST') {
        return await handleUploadPost({ env, request });
      }
      if (path === '/api/index' && method === 'PUT') {
        return await handleIndexPut({ env, request });
      }
      if (path === '/api/photo' && method === 'DELETE') {
        return await handlePhotoDelete({ env, request });
      }

      if (path.startsWith('/api/')) {
        return jsonResponse({ error: 'Not Found' }, 404);
      }

      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }
      return new Response('Not Found', { status: 404 });
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : 'Worker internal error' },
        500
      );
    }
  },
};
