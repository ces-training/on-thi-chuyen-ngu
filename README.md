# Ôn thi chuyên ngữ

Học liệu ôn thi chuyên ngữ vào lớp 10 (Hà Nội) cho học sinh từ lớp 6 trở lên.
Trang web: https://ces-training.github.io/on-thi-chuyen-ngu/

## Các bộ học liệu

| Bộ | Trang web | Nguồn |
| --- | --- | --- |
| Chuyên Anh 14 Ngày (lớp 7) | `chuyen-anh-14-ngay/` | `src/chuyen-anh-14-ngay/` |
| Số liệu tuyển sinh chuyên ngữ Hà Nội | `tuyen-sinh/` | sửa trực tiếp `tuyen-sinh/index.html` |
| Trang theo dõi của cô | `co/` | `src/co/template.html` |

## Học theo mức của con

- Bài đầu vào xếp con vào 1 trong 3 mức: **Nền tảng** (dưới A2, A2), **Chuẩn** (A2+, B1), **Nâng cao** (B1+ trở lên). Con hoặc cô có thể đổi mức ở đầu mỗi buổi.
- Theo mức sẽ đổi: độ khó và tốc độ game, bài dạng đề thi (`exam_easy` / `exam` / `exam_plus` trong `content/web/dayNN.json`), video mặc định (Nền tảng xem video tiếng Việt trước), bản PDF bài giấy (`pdf/buoi-NN-nen.pdf`, `buoi-NN.pdf`, `buoi-NN-nang.pdf`) và đáp án máy chấm (phần H chỉ chấm cho mức Nâng cao).
- Tạo lại PDF sau khi sửa nội dung: `python3 src/chuyen-anh-14-ngay/pdf/gen_pdf.py` (cần Node + Playwright).
- Game vận động (buổi 3, 5, 7, 9, 11, 13) dùng camera và MediaPipe chạy ngay trong trình duyệt; không có camera thì chơi bằng nút bấm.

## Máy chủ chấm bài (tuỳ chọn)

Thư mục `apps-script/` chứa máy chủ chạy trên Google Apps Script. Khi bật, kết quả học tự gửi về trang của cô, học sinh chụp bài giấy để máy chấm bằng Claude, và con có thể nhắn cô khi chưa đồng ý với điểm.
Cách cài từng bước, kèm ước tính chi phí: [apps-script/HUONG-DAN-CAI-DAT.md](apps-script/HUONG-DAN-CAI-DAT.md).

Khi `src/chuyen-anh-14-ngay/config.json` chưa có `apiUrl`, trang học sinh vẫn chạy hoàn toàn trong trình duyệt như cũ và gửi kết quả bằng mã ở tab "Gửi cô".

## Cách sửa nội dung

- Bản đồ 14 ngày ở trang chủ (`src/chuyen-anh-14-ngay/map.js`): con đường uốn từ gần ra xa với 14 biển buổi học; nền là phong cảnh vẽ chì tô màu nước của 8 nơi (Paris, London, Phú Sĩ, Hạ Long, Giza, New York, Sydney, Taj Mahal), mỗi lần mở trang chọn ngẫu nhiên một cảnh khác lần trước. Thêm cảnh mới: thêm một mục vào `SCENES` (mỗi cảnh có `style` là một trong 8 kiểu vẽ ở `STYLES` và `tone` nóng / lạnh / trung tính).
- Nhịp học, độ chắc của bài đầu vào và báo cáo thử 14 buổi (`src/chuyen-anh-14-ngay/report.js`):
  - 14 buổi học liền hoặc 1–2 ngày một buổi, khoảng 3 tuần; nhịp tính theo khoảng cách trung bình giữa các buổi (≤ 2,2 ngày và không nghỉ quá 5 ngày là đều), chuỗi giữ lửa không đứt khi nghỉ 1 ngày.
  - Bài đầu vào/đầu ra ghi thời gian làm và số câu bỏ trống; độ chắc (cao/vừa/thấp) tính bằng cách dịch điểm mỗi mức ±1 câu, kèm cờ khi làm quá nhanh hoặc câu khó đúng nhiều hơn câu dễ.
  - Sau 3 buổi, nếu độ đúng web 3 buổi gần nhất ≥ 85% hoặc < 50%, Hùng gợi ý đổi mức (Nền tảng / Chuẩn / Nâng cao).
  - Báo cáo thử 14 buổi (tab Tiến bộ, Trao đổi với cô): nền tảng, khả năng học, khả năng đỗ (có Toán, Văn), lộ trình nếu theo và tóm tắt để cô tư vấn. Cô xem được từ mã kết quả, hoặc từ trang theo dõi (mở `xem-truoc.html#bc=<mã>`).
- Bản xem trước cho giáo viên: `chuyen-anh-14-ngay/xem-truoc.html` (build.py dựng từ cùng template, mã ở `src/chuyen-anh-14-ngay/preview.js`). Thanh dưới đáy chọn tình huống học sinh giả lập (mới vào, bản phác, tuyến nhanh, giữ nhịp, chậm mà chắc, xong 14 buổi), chọn lớp, mở mọi buổi; tab "Nội dung (cô)" liệt kê mọi câu hỏi, bài giấy, game, bài nghe của 14 buổi và 2 bài kiểm tra kèm đáp án. Dữ liệu lưu ở khoá riêng `chuyenAnh14_preview`, không đồng bộ lên máy chủ. Trang theo dõi của cô có nút dẫn tới.
- Học theo thứ tự: buổi n mở khi đã có bài đầu vào và đã xong Kiểm tra cuối buổi của buổi n-1 (`dayOpen` trong `template.html`). Chưa làm bài đầu vào thì mỗi lần mở trang hiện popup, thu nhỏ được thành nút ở góc, chỉ mất khi làm xong bài đầu vào.

- Văn phong của trang (Hùng xưng "tớ", gọi "cậu", giọng báo teen, không bao giờ nói "không làm được", lời lẽ đổi theo dữ liệu từng bạn): [src/VAN-PHONG.md](src/VAN-PHONG.md). Lộ trình chỉ hiện chi tiết sau khi có bài đầu vào; hồ sơ học (`learnerProfile` trong `course.js`) chỉnh lộ trình theo độ đúng, độ nhớ, độ đều.

- Câu hỏi, đáp án, bài đọc của từng buổi nằm trong `src/chuyen-anh-14-ngay/content/dayNN.json`; bài kiểm tra đầu vào và cuối kỳ nằm trong `tests.json`.
- Giao diện và cách tính lộ trình nằm trong `src/chuyen-anh-14-ngay/template.html`.
- Tab "Sau 14 ngày" (chương trình lớp 6–9 theo giai đoạn, xếp theo lớp và thời gian còn lại đến kỳ thi) nằm trong `src/chuyen-anh-14-ngay/course.js`. Danh sách 41 chủ điểm ngữ pháp, dạng bài, chỉ tiêu từ vựng của từng giai đoạn ở đầu tệp này, lấy theo bản khung chương trình 22/10/2026; mốc chốt trình độ và trường là 1/2 năm lớp 9 (hằng số `CHOT_MONTHS` = 4 tháng trước thi) hoặc 1 tuần trước Tết nếu Tết sớm hơn; bảng ngày Tết `TET` trong `template.html` có đến năm 2032; khi cô duyệt sửa khung thì sửa các mảng `GRAM`, `PHASES`, `EXAM_PHASE`, `GOALS`.
- Sau khi sửa, chạy `python3 src/chuyen-anh-14-ngay/build.py`. Lệnh này dựng lại `chuyen-anh-14-ngay/index.html`, `co/index.html` và `apps-script/Keys.gs`. Sau đó commit và push.
- GitHub Pages tự cập nhật trang sau mỗi lần push lên nhánh `main` (thường mất 1–2 phút).
- Màu, phông chữ và nút bấm dùng chung cho mọi trang nằm trong `src/brand/brand.css`. `build.py` chép tệp này vào trang học sinh, trang của cô, và vào khối giữa `/*BRAND*/ … /*/BRAND*/` của trang chủ và trang tuyển sinh.
- `gen_doc.py` tạo bản markdown của tập bài in (thư mục `doc/`), không kèm đáp án.

## Lưu ý

- Kết quả của học sinh luôn lưu trong trình duyệt (localStorage, khoá `chuyenAnh14_v1`). Khi đã cài máy chủ, kết quả còn được đồng bộ lên Google Sheet của trung tâm theo mã học sinh.
- Không đổi khoá lưu trữ khi học sinh đang học dở, nếu không tiến độ của các em sẽ mất.
