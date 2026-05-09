const CORS = { 'Access-Control-Allow-Origin': '*' };

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  if (!env.ARTICLES_KV) return jsonRes({ error: 'KV chưa cấu hình.' }, 503);

  const raw = await env.ARTICLES_KV.get(`article:${id}`);
  if (!raw) return jsonRes({ error: 'Không tìm thấy bài viết.' }, 404);

  return jsonRes(JSON.parse(raw));
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}

function jsonRes(data, status = 200) {
  return Response.json(data, { status, headers: CORS });
}
