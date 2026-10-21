# Nội dung web mỗi buổi — đặc tả tệp `content/web/dayNN.json`

Mỗi buổi trên web có: video ngữ pháp → 2–3 game (từ vựng, ngữ pháp) → bài theo dạng đề thi thật (1–2 dạng, số câu rút gọn) → học thêm trên iSLCollective → làm bài giấy (PDF) → kiểm tra nhanh cuối buổi → chữa/chụp bài giấy.

Game từ vựng được máy tự sinh từ `vocab`, `phrasal`, `wordform` sẵn có trong `dayNN.json`, nên tệp web chỉ cần dữ liệu cho **game ngữ pháp** và **bài dạng đề thi**. Video và iSLCollective nằm riêng trong `media.json`.

Đối tượng: học sinh lớp 7, trình độ A2–B1, ôn thi chuyên Anh Hà Nội. Câu hỏi phải đúng ngữ pháp, tự nhiên, gần gũi tuổi teen Việt Nam, chỉ một đáp án đúng. Giải thích (`explain_vi`, `why_vi`) viết tiếng Việt, ngắn (≤ 30 từ), nói vì sao đúng. Không dùng lại nguyên câu đã có trong `paper` hay `web_check` của buổi đó.

## Khung tệp

```json
{
  "day": 3,
  "grammar_games": {
    "sort": {"title_vi": "Xếp mỗi câu vào đúng thì", "groups": [{"name": "Present perfect", "items": ["…", "…"]}, {"name": "Past simple", "items": ["…"]}]},
    "unjumble": [{"sentence": "I have never seen such a beautiful beach.", "hint_vi": "Hiện tại hoàn thành với never"}],
    "truefalse": [{"s": "She has visited Hue last year.", "ok": false, "fix": "She visited Hue last year.", "why_vi": "Có mốc thời gian quá khứ (last year) thì dùng quá khứ đơn."}]
  },
  "exam": [ {…dạng 1…}, {…dạng 2…} ]
}
```

- `sort`: 2–3 nhóm, tổng 8–10 mục (mỗi mục là câu ngắn hoặc cụm từ ≤ 10 từ), nhóm phản ánh đúng chủ điểm ngữ pháp của buổi.
- `unjumble`: 5 câu, mỗi câu 6–11 từ, dùng chủ điểm ngữ pháp và (nếu được) từ vựng của buổi. Viết câu hoàn chỉnh có dấu câu cuối; máy tự xáo trộn theo từ.
- `truefalse`: 8 câu, khoảng một nửa đúng, một nửa sai; câu sai mắc đúng lỗi điển hình của chủ điểm; `fix` là câu đã sửa (với câu đúng thì `fix` = chính câu đó).

## Dạng bài thi (`exam`)

Mỗi phần tử:

```json
{"format": "synonym", "title_vi": "Từ đồng nghĩa", "intro_vi": "Trong đề chuyên, dạng này …", "tip_vi": "Mẹo: …", "kind": "mcq", …}
```

`intro_vi` (≤ 40 từ): dạng này trông thế nào trong đề thi thật (đề Sở, Chuyên Ngoại ngữ hoặc đề chung vào 10) và có mấy câu. `tip_vi` (≤ 30 từ): một mẹo làm bài. Mỗi dạng **5 câu** (buổi ôn 7 và 14: 1 phần `mixed` 10 câu, xem dưới). Nội dung bám chủ đề và ngữ pháp của buổi, ưu tiên từ vựng của buổi và các buổi trước.

### `kind` và khung câu

| kind | Dùng cho format | Khung |
|---|---|---|
| `mcq` | sentence_completion, synonym, antonym, dialogue_completion, pronunciation, stress, error_id, sentence_combining, closest_meaning, reading_mcq | `"passage"` (tuỳ chọn, cho reading_mcq: 180–260 từ) + `"items": [{"q", "options": [4 chuỗi], "answer": 0-3, "explain_vi"}]` |
| `cloze_mcq` | cloze (điền từ đoạn văn có 4 lựa chọn) | `"text"`: đoạn 120–180 từ có chỗ trống đánh dấu `[1]`, `[2]`… + `"items": [{"options": [4], "answer": 0-3, "explain_vi"}]` |
| `gap_text` | open_cloze, word_formation, listening | `"text"` có `[1]`…; với listening thêm `"script"` (bài nói 120–180 từ, máy đọc bằng giọng đọc của trình duyệt) và `"text"` là phần ghi chú có chỗ trống; `"items": [{"answer", "accept": [], "base": "CARE" (chỉ word_formation), "explain_vi"}]`. Đáp án điền là 1 từ (listening tối đa 2 từ, số viết bằng chữ số) |
| `transform` | transformation (viết lại câu bắt đầu bằng từ cho sẵn), key_word (dùng từ cho sẵn, 2–5 từ) | `"items": [{"q": câu gốc, "start": phần đầu câu mới, "end": phần cuối (tuỳ chọn, key_word), "word": "TỪ CHO SẴN" (chỉ key_word), "answer": phần học sinh phải viết, "accept": [biến thể đúng khác], "explain_vi"}]` |
| `matching` | matching_headings (nối tiêu đề với đoạn) | `"paragraphs": [4 đoạn, mỗi đoạn 40–60 từ], "headings": [6 tiêu đề, 2 thừa], "answer": [chỉ số tiêu đề cho từng đoạn], "explain_vi"` |
| `order` | dialogue_order (sắp xếp lượt hội thoại, đề chung CNN) | `"lines": [6 lượt lời theo ĐÚNG thứ tự, dạng "A: …" / "B: …"], "explain_vi"` (máy tự xáo; lượt đầu giữ cố định) |

Quy ước riêng:
- `pronunciation`: `q` = "Chọn từ có phần gạch chân phát âm khác các từ còn lại."; mỗi option đánh dấu phần gạch chân bằng `[[ ]]`, ví dụ `"watch[[es]]"`.
- `stress`: `q` = "Chọn từ có trọng âm khác các từ còn lại."; options là 4 từ, cùng số âm tiết.
- `synonym` / `antonym`: `q` là câu có từ/cụm cần xét VIẾT HOA, như đề CNN.
- `error_id`: `q` là câu có lỗi; `options` là 4 đoạn (mỗi đoạn 1–3 từ) xuất hiện nguyên văn trong `q`, theo thứ tự từ trái sang phải; `answer` = đoạn sai.
- `dialogue_completion`: `q` dạng `"A: … \nB: ______"` hoặc ngược lại.
- `closest_meaning` / `sentence_combining`: options là 4 câu.
- Buổi ôn: `{"format": "mixed", "title_vi": "Đề thi thu nhỏ", "intro_vi", "tip_vi", "kind": "mcq", "items": [10 câu, mỗi câu có thêm "format": "<format>" và q bắt đầu bằng nhãn ngắn như "[Đồng nghĩa] …"]}` trộn các dạng của các buổi trước, dùng từ và ngữ pháp các buổi trước.

## Kế hoạch dạng bài theo buổi

| Buổi | Dạng 1 (giống phần D trên giấy) | Dạng 2 (mới) |
|---|---|---|
| 1 | sentence_completion (mcq) | pronunciation (mcq; đuôi -s/-es) |
| 2 | synonym (mcq) | stress (mcq; từ 2 âm tiết) |
| 3 | antonym (mcq) | word_formation (gap_text; đuôi -al, -ous và đuôi đã học) |
| 4 | dialogue_completion (mcq) | listening (gap_text; điền ghi chú) |
| 5 | closest_meaning (mcq) | transformation (transform; so sánh, too/enough, so/such) |
| 6 | cloze (cloze_mcq) | matching_headings (matching) |
| 7 | mixed (mcq, 10 câu; các dạng buổi 1–6) | – |
| 8 | sentence_completion (mcq) | error_id (mcq) |
| 9 | synonym (mcq) | open_cloze (gap_text; mạo từ, lượng từ, giới từ) |
| 10 | dialogue_completion (mcq) | listening (gap_text) |
| 11 | antonym (mcq) | sentence_combining (mcq; mệnh đề quan hệ) |
| 12 | transformation (transform; câu tường thuật) | reading_mcq (mcq có passage) |
| 13 | cloze (cloze_mcq) | dialogue_order (order) |
| 14 | mixed (mcq, 10 câu; các dạng buổi 1–13) | – |

Buổi 7 và 14 vẫn có `grammar_games` nhưng ôn lại ngữ pháp của các buổi trước (sort trộn nhiều chủ điểm, unjumble và truefalse lấy từ các buổi trước).

Tệp phải là JSON hợp lệ (UTF-8, không chú thích). Kiểm tra bằng `python3 -c "import json;json.load(open('dayNN.json'))"` và chạy `python3 check_web.py dayNN.json` (nếu có) trước khi báo xong.
