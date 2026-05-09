const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.ARTICLES_KV) return jsonRes({ error: 'KV chưa cấu hình.' }, 503);
  const raw = await env.ARTICLES_KV.get(`article:${params.id}`);
  if (!raw) return jsonRes({ error: 'Không tìm thấy bài viết.' }, 404);
  return jsonRes(JSON.parse(raw));
}

export async function onRequestDelete(context) {
  const { env, params, request } = context;
  if (!checkAuth(request, env)) return jsonRes({ error: 'Unauthorized.' }, 401);
  if (!env.ARTICLES_KV) return jsonRes({ error: 'KV chưa cấu hình.' }, 503);

  const id = params.id;
  const raw = await env.ARTICLES_KV.get(`article:${id}`);
  if (!raw) return jsonRes({ error: 'Không tìm thấy bài viết.' }, 404);

  await env.ARTICLES_KV.delete(`article:${id}`);

  // remove from index
  const rawIndex = await env.ARTICLES_KV.get('index');
  if (rawIndex) {
    const index = JSON.parse(rawIndex).filter(a => a.id !== id);
    await env.ARTICLES_KV.put('index', JSON.stringify(index));
  }

  return jsonRes({ deleted: id });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

function checkAuth(request, env) {
  if (!env.API_KEY) return false;
  return request.headers.get('Authorization') === `Bearer ${env.API_KEY}`;
}

function jsonRes(data, status = 200) {
  return Response.json(data, { status, headers: CORS });
}
