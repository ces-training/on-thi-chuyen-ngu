# Giải thích đáp án — quy ước (22/10/2026)

Mọi câu hỏi trên web phải có giải thích ngắn bằng tiếng Việt, hiện ra sau khi học sinh làm. Giải thích dùng 3 kiểu đánh dấu, web tự hiển thị:

| Viết trong JSON | Hiện trên web | Dùng cho |
|---|---|---|
| `==...==` | nền vàng (highlight) | **dấu hiệu / bằng chứng**: từ tín hiệu trong câu (since, yet, last year, too…to), câu trong bài đọc/bài nghe chứa đáp án |
| `**...**` | in đậm | **đáp án, quy tắc, kết luận**: dạng đúng, công thức, từ loại cần điền |
| `__...__` | gạch chân | **mẹo làm bài / đề xuất cho học sinh**: cách loại trừ, lỗi hay gặp, nên làm gì |

Mẫu:
- `"Có ==since 2020== → dùng **hiện tại hoàn thành: have lived**. __Mẹo: thấy since/for + mốc thời gian, nghĩ ngay tới HTHT.__"`
- `"Bài nghe: ==\"Actually, it's on Tuesday, not Monday\"== → đáp án **Tuesday**. __Cẩn thận chỗ người nói sửa lại thông tin.__"`
- `"Sau tính từ sở hữu **their** cần **danh từ** → **arrival**. __Xem từ đứng trước/sau chỗ trống để đoán từ loại.__"`

Quy tắc:
- Ngắn: 1–3 câu, tối đa khoảng 40 từ tiếng Việt (không tính phần trích tiếng Anh).
- Mỗi giải thích có **ít nhất 2 kiểu đánh dấu**, trong đó bắt buộc có `**` (đáp án/quy tắc); có `==` khi câu có dấu hiệu hoặc bằng chứng; có `__` khi có mẹo hữu ích (khoảng một nửa số câu trở lên nên có mẹo).
- Viết cho học sinh lớp 7: xưng "em", câu tự nhiên, không lý thuyết dài. Trích tiếng Anh nguyên văn trong dấu nháy hoặc trong `==…==`.
- Không đánh dấu lồng nhau, không để dấu `*`, `=`, `_` lẻ (ví dụ chỗ trống viết là "chỗ trống", không viết `____` trong giải thích).
- Trắc nghiệm: nói vì sao đáp án đúng; nếu có phương án nhiễu dễ chọn nhầm thì nói ngắn vì sao sai.
- Đúng nội dung: giải thích phải khớp với đáp án trong JSON.

## Những chỗ cần có giải thích

Trong `content/dayNN.json`:
- `web_check[].explain_vi` — viết lại theo quy ước (giữ nội dung đúng, thêm đánh dấu và mẹo).
- Mọi câu trong `paper` (các phần A_vocab, B_grammar, C_wordform, D_exam, E_reading, G_review; buổi ôn R1_vocab, R2_grammar, R3_wordform, R4_exam, E_reading): thêm `explain_vi` cho từng câu. Bài đọc E: trích câu chứa đáp án bằng `==…==`.

Trong `content/web/dayNN.json`:
- `exam`, `exam_easy`, `exam_plus`: mọi `items[].explain_vi` (và `explain_vi` của cả khối với dạng matching/order) viết lại theo quy ước; khối gap_text/listening nào thiếu `explain_vi` thì thêm.
- `listening.{nen,chuan,nang}.part1.items[].explain_vi`, `part2.items[].explain_vi`: viết lại, trích câu trong bài nghe bằng `==…==`.
- `paper_plus.items[]`: thêm `explain_vi`.
- `grammar_games.sort.groups[]`: thêm `rule_vi` (1–2 câu: vì sao các thẻ thuộc nhóm này, dấu hiệu nhận biết).
- `grammar_games.unjumble[]`: thêm `why_vi` (trật tự từ/cấu trúc của câu).
- `grammar_games.truefalse[].why_vi`: viết lại theo quy ước.

Trong `content/tests.json`: `diagnostic.items[].explain_vi`, `final.items[].explain_vi` viết lại theo quy ước.

Kiểm tra: `python3 check_explain.py ../dayNN.json dayNN.json` (hoặc `../tests.json`).
