# Tính năng Tóm tắt AI

Khi upload file PDF hoặc PPTX lên trang `/upload`, nút **✨ Tóm tắt AI** sẽ gửi nội dung file cho Claude, nhận lại bản tóm tắt dạng văn xuôi tiếng Việt, rồi đọc to bằng TTS.

---

## Cách hoạt động

```
Trình duyệt                  Cloudflare Pages          Anthropic API
    │                               │                        │
    │── upload PDF/PPTX ──▶ extract text (client-side)      │
    │── POST /api/summarize ────────▶                        │
    │                               │── gọi Claude API ─────▶
    │                               │◀── bản tóm tắt ────────
    │◀── { summary: "..." } ────────│                        │
    │── hiển thị + TTS đọc ──────────────────────────────────
```

Toàn bộ nội dung file **không rời khỏi trình duyệt** (extract client-side).  
Chỉ có **văn bản đã extract** được gửi lên API để tóm tắt.

---

## Bật tính năng

Tính năng cần biến môi trường `ANTHROPIC_API_KEY` được cấu hình trên Cloudflare Pages.

### Bước 1 — Lấy API key

1. Đăng nhập [console.anthropic.com](https://console.anthropic.com)
2. Vào **API Keys** → **Create Key**
3. Copy key (dạng `sk-ant-api03-...`)

### Bước 2 — Thêm vào Cloudflare Pages

1. Vào [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages** → chọn project `lazy-naviplus-work`
3. **Settings** → **Environment variables** → **Add variable**

| Variable name | Value | Environment |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Production |

4. **Save** → vào **Deployments** → **Retry deployment** (hoặc push code mới để trigger build lại)

### Bước 3 — Kiểm tra

Mở `https://lazy.naviplus.work/upload/`, upload một file PPTX, bấm **✨ Tóm tắt AI**.  
Nếu thấy spinner rồi nội dung thay đổi là thành công.

---

## Khi gặp lỗi

| Lỗi hiển thị | Nguyên nhân | Cách xử lý |
|---|---|---|
| `ANTHROPIC_API_KEY chưa được cấu hình` | Chưa thêm env var | Làm Bước 2 |
| `Anthropic API trả về lỗi 401` | API key sai hoặc hết hạn | Tạo key mới |
| `Anthropic API trả về lỗi 429` | Vượt rate limit | Chờ ít phút rồi thử lại |
| `Không kết nối được Anthropic API` | Cloudflare Worker không ra được internet | Kiểm tra Workers route |

---

## Giới hạn

- File quá lớn: text được cắt ở **80.000 ký tự** (~20k token) trước khi gửi Claude
- Mỗi lần bấm "Tóm tắt AI" = 1 lần gọi API (tính phí theo token của Anthropic)
- Model đang dùng: `claude-sonnet-4-6`

Để đổi model, sửa dòng này trong `functions/api/summarize.js`:

```js
model: 'claude-sonnet-4-6',
```

---

## Test local

```bash
# 1. Copy file env mẫu
cp .dev.vars.example .dev.vars

# 2. Điền API key vào .dev.vars
ANTHROPIC_API_KEY=sk-ant-...

# 3. Build Jekyll
bundle exec jekyll build

# 4. Chạy với Wrangler (kết hợp Pages Functions + static files)
npx wrangler pages dev _site --compatibility-date=2024-09-23
```

Mở `http://localhost:8788/upload/` để test.
