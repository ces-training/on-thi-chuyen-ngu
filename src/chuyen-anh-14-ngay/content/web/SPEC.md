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

## Bản theo mức (bổ sung 22/10/2026)

Học sinh được xếp 1 trong 3 mức theo bài đầu vào: **Nền tảng** (dưới A2, A2), **Chuẩn** (A2+, B1), **Nâng cao** (B1+, B2 trở lên). Phần `exam` ở trên là bản **Chuẩn**. Thêm vào mỗi `dayNN.json` các khoá sau (giữ nguyên mọi khoá cũ):

```json
{
  "exam_easy": [ … cùng các dạng (format, kind) như "exam", mỗi dạng 5 câu, mức A2: câu ngắn, từ quen, phương án nhiễu khác hẳn nhau, giải thích kỹ hơn … ],
  "exam_plus": [ … cùng các dạng như "exam", mỗi dạng 5 câu, mức B1+–B2: từ khó hơn (B2), phương án nhiễu gần nghĩa, cấu trúc phức tạp hơn, gần độ khó đề chuyên thật … ],
  "paper_plus": {"title_vi": "H. Thử thách nâng cao", "instruction_vi": "…", "items": [
      {"id": "d3H1", "q": "… ______ … (CARE)", "answer": "carelessness", "accept": []},
      {"id": "d3H2", "q": "…", "options": ["…","…","…","…"], "answer": "B"}
  ]},
  "paper_easy": {"hints": {"d3C1": "danh từ", "d3C2": "tính từ"}, "reading_gloss": [["pollution", "sự ô nhiễm"]], "writing_starters": ["In my free time, I …", "…"]}
}
```

- `exam_easy` / `exam_plus`: cùng số phần tử, cùng `format` và `kind` theo đúng thứ tự như `exam` (buổi 7 và 14: một khối `mixed`, 10 câu). Nội dung MỚI, không trùng câu với `exam`, `paper`, `web_check`. `intro_vi` và `tip_vi` viết lại cho hợp mức (mức Nền tảng có thể nói rõ hơn, mức Nâng cao nói về câu phân loại trong đề thật). Listening: `exam_easy` nói chậm, câu ngắn, 100–140 từ; `exam_plus` 160–200 từ, có thông tin gây nhiễu.
- `paper_plus` (bài giấy, chỉ học sinh Nâng cao làm): 6 câu mức B1+–B2 nối tiếp chủ đề và ngữ pháp của buổi: 2 câu cấu tạo từ khó (đổi 2 lần, hoặc tiền tố + hậu tố), 2 câu viết lại câu (câu mới cho sẵn phần đầu trong `q`, ví dụ `"q": "It was such a hot day that we stayed inside. → The day was ______"`), 2 câu trắc nghiệm cụm động từ/collocation/thành ngữ (`options` 4, `answer` là chữ "A"–"D"). `id` dạng `dNH1`…`dNH6`. `answer` đầy đủ, `accept` liệt kê biến thể đúng.
- `paper_easy` (gợi ý in kèm cho học sinh Nền tảng): `hints` cho từng câu của phần C (cấu tạo từ; buổi ôn: phần R3) nói từ loại cần điền ("danh từ", "tính từ", "trạng từ", "động từ", "danh từ số nhiều"…); `reading_gloss`: 6–8 từ khó trong bài đọc E kèm nghĩa tiếng Việt; `writing_starters`: 3–4 câu mở đầu gợi ý cho bài viết F.

Kiểm tra: `python3 check_web.py dayNN.json` (đã kiểm cả các khoá mới).

## Luyện nghe mỗi buổi (bổ sung 22/10/2026)

Mỗi `dayNN.json` thêm khoá `listening` với 3 bản theo mức. Phần nghe của đề chuyên Anh Sở Hà Nội có 20 câu (hội thoại dài + trắc nghiệm, nối, độc thoại + điền/nối, mức B2–C1, có tiếng ồn nền). Đây là bản rút gọn 10 câu/buổi:

```json
"listening": {
  "nen":   {"part1": {…}, "part2": {…}},
  "chuan": {"part1": {…}, "part2": {…}},
  "nang":  {"part1": {…}, "part2": {…}}
}
```

`part1` — hội thoại hai người, 5 câu trắc nghiệm:
```json
{"title_vi": "Phần 1 · Hội thoại", "intro_vi": "…(≤ 30 từ: nghe gì, làm gì)",
 "speakers": [{"name": "Linh", "voice": "female"}, {"name": "Mark", "voice": "male"}],
 "script": [{"s": 0, "t": "Hi Mark, …"}, {"s": 1, "t": "…"}],
 "items": [{"q": "Why is Linh late?", "options": ["…", "…", "…", "…"], "answer": 0, "explain_vi": "…"}]}
```
`part2` — độc thoại (thông báo, lời hướng dẫn, bài nói ngắn), điền ghi chú 5 chỗ:
```json
{"title_vi": "Phần 2 · Độc thoại", "intro_vi": "…", "script": "…", "text": "SCIENCE MUSEUM TRIP\n• Meet at: the [1]\n• …", "items": [{"answer": "main gate", "accept": ["gate"], "explain_vi": "…"}]}
```

Quy định:
- Chủ đề bám chủ đề của buổi; dùng từ vựng và ngữ pháp của buổi một cách tự nhiên. Không trùng nội dung bài nghe sẵn có ở `exam` (buổi 4, 10).
- Máy đọc bằng giọng đọc của trình duyệt: viết câu rõ ràng, tránh viết tắt, ký hiệu, dấu gạch ngang lạ; số giờ viết bằng chữ ("half past eight"); con số trong đáp án viết bằng chữ số.
- Độ dài và độ khó:
  - `nen` (A2): hội thoại 8–10 lượt, tổng 120–160 từ; độc thoại 90–120 từ; câu ngắn, đáp án nói thẳng, ít gây nhiễu; câu hỏi trắc nghiệm hỏi chi tiết rõ ràng.
  - `chuan` (A2+–B1): hội thoại 10–12 lượt, 170–220 từ; độc thoại 130–170 từ; có 1–2 chỗ gây nhiễu (nói sai rồi sửa).
  - `nang` (B1+–B2): hội thoại 12–14 lượt, 230–290 từ; độc thoại 170–210 từ; nhiều chỗ gây nhiễu (đổi ý, so sánh hai lựa chọn, thông tin bị bác bỏ), câu hỏi về ý kiến, thái độ, suy luận; từ vựng B2.
- Trắc nghiệm: 4 phương án, chỉ một đáp án đúng; đáp án đúng không chỉ là từ lặp nguyên văn trong bài (nhất là `chuan`, `nang`). Vị trí đáp án đúng thay đổi giữa các câu.
- Điền ghi chú: mỗi chỗ 1–2 từ hoặc một con số; đáp án nghe được rõ trong bài; `accept` liệt kê biến thể đúng (số ít/số nhiều nếu cả hai hợp lý, có/không mạo từ).
- `explain_vi` ≤ 25 từ, chỉ ra câu nào trong bài cho đáp án.
