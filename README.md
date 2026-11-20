# Claude Cert VN

Trang tự học 4 chứng chỉ Claude cho người Việt: câu hỏi tiếng Anh như đề thật, giải thích và kiến thức bằng tiếng Việt. Trang tĩnh, không cần build, chạy trên GitHub Pages.

## Chạy thử trên máy

```bash
python -m http.server 8765
```

Mở http://127.0.0.1:8765. Trang cần chạy qua HTTP (mở thẳng file `index.html` thì `fetch` dữ liệu sẽ không chạy).

## Cấu trúc

| Đường dẫn | Nội dung |
| --- | --- |
| `index.html`, `assets/` | Giao diện: `app.js` (router + các màn), `store.js` (tiến độ trong localStorage), `app.css`, `lesson.css` |
| `data/<cert>.json` | Câu hỏi, domain, cheat sheet, ghi chú — sinh từ repo MIT bằng `scripts/build_data.py` |
| `data/vi/<cert>.json` | Bản tiếng Việt cho từng câu, viết tay (xem bên dưới) |
| `data/vi/md/<cert>-cheat-sheet.md`, `-notes.md` | Cheat sheet và ghi chú tiếng Việt; khối ```mermaid được vẽ thành sơ đồ |
| `content/<cert>/` | Bài kiến thức tiếng Việt + `index.json` — sinh bằng `scripts/extract_lessons.py` |
| `tests/` | `node --test tests/*.test.mjs` |

Mã chứng chỉ: `ccao-f` (Associate), `ccdv-f` (Developer), `ccar-f` (Architect F.), `ccar-p` (Architect P.).

## Thêm giải thích tiếng Việt cho một câu

Thêm vào `data/vi/<cert>.json`, khoá là id câu (`ccar-p-p12` cho câu luyện tập 12, `ccar-p-m2-5` cho đề thi thử 2 câu 5). Trường nào cũng có thể bỏ trống; câu chưa có bản dịch sẽ hiện giải thích gốc tiếng Anh. Hỗ trợ `**đậm**` và `` `code` ``.

```json
{
  "ccar-p-p12": {
    "q": "Bản dịch câu hỏi",
    "opts": { "A": "Vì sao A đúng/sai", "B": "…", "C": "…", "D": "…" },
    "tip": { "title": "Dấu hiệu trong đề → chọn gì", "body": ["Đoạn 1", "Đoạn 2"] },
    "ask": { "title": "Đề hỏi gì (1 dòng)", "body": "Tóm tắt tình huống" },
    "lesson": "1-2-kien-truc-dau-cuoi"
  }
}
```

Kiểm tra và gộp bản dịch:

```bash
python scripts/vi_tools.py check                      # báo số câu đã dịch và lỗi (thiếu đáp án, bài học không tồn tại…)
python scripts/vi_tools.py dump ccar-p 1 10           # in câu hỏi để dịch
python scripts/vi_tools.py merge ccar-p batch.json    # kiểm tra rồi gộp một lô vào data/vi/ccar-p.json
```

## Dựng lại dữ liệu

```bash
git clone --depth 1 https://github.com/Amey-Thakur/CLAUDE-CERTIFICATIONS.git content/raw/source
python scripts/build_data.py
python scripts/extract_lessons.py ccao-f ccdv-f ccar-f ccar-p   # cần trang đã tải vào content/raw/<cert>/
```

## Tiến độ người học

Mọi đáp án, bài đang làm và bài đã đọc được lưu trong `localStorage` của từng trình duyệt (khoá `ccvn:v1`), không gửi đi đâu. Người học tự xoá được ở trang **Tiến độ** (theo từng chứng chỉ hoặc toàn bộ), ở trang chứng chỉ, hoặc từng câu bằng nút "Làm lại câu này".

## Nguồn

- Câu hỏi, đề thi thử, cheat sheet, ghi chú: [Amey Thakur — CLAUDE-CERTIFICATIONS](https://github.com/Amey-Thakur/CLAUDE-CERTIFICATIONS) (MIT, xem `LICENSE-CLAUDE-CERTIFICATIONS`).
- Bài kiến thức tiếng Việt: [anthropic.cloudexam.pro](https://anthropic.cloudexam.pro/kien-thuc).

Tài liệu học không chính thức, không liên kết với Anthropic.
