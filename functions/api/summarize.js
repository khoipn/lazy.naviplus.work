const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MAX_INPUT_CHARS = 80000; // ~20k tokens, plenty for any presentation

export async function onRequestPost(context) {
  // CORS preflight handled by Pages; just handle POST
  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError('ANTHROPIC_API_KEY chưa được cấu hình.', 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonError('Request body không hợp lệ (cần JSON).', 400);
  }

  const { text, filename = 'tài liệu' } = body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return jsonError('Trường "text" bị thiếu hoặc rỗng.', 400);
  }

  const input = text.length > MAX_INPUT_CHARS
    ? text.slice(0, MAX_INPUT_CHARS) + '\n\n[... nội dung còn lại đã được cắt bớt]'
    : text;

  const prompt = `Bạn nhận được nội dung từ file "${filename}". Hãy tóm tắt thành văn bản tiếng Việt mạch lạc, phù hợp để đọc to (không dùng bullet points, không dùng ký tự đặc biệt, viết thành đoạn văn hoàn chỉnh). Nắm bắt đầy đủ ý chính, trình bày rõ ràng theo từng phần nếu tài liệu có nhiều chủ đề.

Nội dung tài liệu:
${input}`;

  let claudeRes;
  try {
    claudeRes = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    return jsonError(`Không kết nối được Anthropic API: ${err.message}`, 502);
  }

  if (!claudeRes.ok) {
    const errText = await claudeRes.text().catch(() => '');
    return jsonError(`Anthropic API trả về lỗi ${claudeRes.status}: ${errText}`, 502);
  }

  const data = await claudeRes.json();
  const summary = data?.content?.[0]?.text ?? '';
  if (!summary) {
    return jsonError('Không nhận được nội dung tóm tắt từ Claude.', 502);
  }

  return Response.json({ summary }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function jsonError(message, status) {
  return Response.json({ error: message }, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
