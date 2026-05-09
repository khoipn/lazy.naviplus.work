const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (request.method === 'GET') return handleGet(env);
  if (request.method === 'POST') return handlePost(request, env);

  return jsonRes({ error: 'Method not allowed' }, 405);
}

// ── GET /api/articles ─────────────────────────────────────────────
async function handleGet(env) {
  if (!env.ARTICLES_KV) {
    return jsonRes({ articles: [] });
  }
  const raw = await env.ARTICLES_KV.get('index');
  const articles = raw ? JSON.parse(raw) : [];
  return jsonRes({ articles });
}

// ── POST /api/articles ────────────────────────────────────────────
async function handlePost(request, env) {
  // auth
  const apiKey = env.API_KEY;
  if (!apiKey) return jsonRes({ error: 'API_KEY chưa được cấu hình trên server.' }, 503);

  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${apiKey}`) {
    return jsonRes({ error: 'Unauthorized — thiếu hoặc sai Bearer token.' }, 401);
  }

  if (!env.ARTICLES_KV) {
    return jsonRes({ error: 'ARTICLES_KV binding chưa được cấu hình.' }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonRes({ error: 'Body không phải JSON hợp lệ.' }, 400); }

  const { title, content, category = '' } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return jsonRes({ error: 'Trường "title" là bắt buộc.' }, 400);
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return jsonRes({ error: 'Trường "content" là bắt buộc.' }, 400);
  }
  if (title.trim().length > 200) {
    return jsonRes({ error: '"title" tối đa 200 ký tự.' }, 400);
  }
  if (content.trim().length > 50000) {
    return jsonRes({ error: '"content" tối đa 50.000 ký tự.' }, 400);
  }

  const id         = `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const created_at = new Date().toISOString();

  const article = {
    id,
    title:      title.trim(),
    category:   category.trim().slice(0, 50),
    content:    content.trim(),
    created_at,
  };

  // save full article
  await env.ARTICLES_KV.put(`article:${id}`, JSON.stringify(article), {
    expirationTtl: 60 * 60 * 24 * 365, // 1 năm
  });

  // update index (prepend, newest first, keep max 500)
  const rawIndex   = await env.ARTICLES_KV.get('index');
  const index      = rawIndex ? JSON.parse(rawIndex) : [];
  const { content: _c, ...meta } = article; // exclude content from index
  index.unshift(meta);
  if (index.length > 500) index.splice(500);
  await env.ARTICLES_KV.put('index', JSON.stringify(index));

  return jsonRes({ id, title: article.title, created_at }, 201);
}

function jsonRes(data, status = 200) {
  return Response.json(data, { status, headers: CORS });
}
