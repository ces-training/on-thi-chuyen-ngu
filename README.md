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

- Câu hỏi, đáp án, bài đọc của từng buổi nằm trong `src/chuyen-anh-14-ngay/content/dayNN.json`; bài kiểm tra đầu vào và cuối kỳ nằm trong `tests.json`.
- Giao diện và cách tính lộ trình nằm trong `src/chuyen-anh-14-ngay/template.html`.
- Tab "Sau 14 ngày" (chương trình lớp 6–9 theo giai đoạn, xếp theo lớp và thời gian còn lại đến kỳ thi) nằm trong `src/chuyen-anh-14-ngay/course.js`. Danh sách 41 chủ điểm ngữ pháp, dạng bài, chỉ tiêu từ vựng của từng giai đoạn ở đầu tệp này, lấy theo bản khung chương trình 22/10/2026; khi cô duyệt sửa khung thì sửa các mảng `GRAM`, `PHASES`, `EXAM_PHASE`, `GOALS`.
- Sau khi sửa, chạy `python3 src/chuyen-anh-14-ngay/build.py`. Lệnh này dựng lại `chuyen-anh-14-ngay/index.html`, `co/index.html` và `apps-script/Keys.gs`. Sau đó commit và push.
- GitHub Pages tự cập nhật trang sau mỗi lần push lên nhánh `main` (thường mất 1–2 phút).
- Màu, phông chữ và nút bấm dùng chung cho mọi trang nằm trong `src/brand/brand.css`. `build.py` chép tệp này vào trang học sinh, trang của cô, và vào khối giữa `/*BRAND*/ … /*/BRAND*/` của trang chủ và trang tuyển sinh.
- `gen_doc.py` tạo bản markdown của tập bài in (thư mục `doc/`), không kèm đáp án.

## Lưu ý

- Kết quả của học sinh luôn lưu trong trình duyệt (localStorage, khoá `chuyenAnh14_v1`). Khi đã cài máy chủ, kết quả còn được đồng bộ lên Google Sheet của trung tâm theo mã học sinh.
- Không đổi khoá lưu trữ khi học sinh đang học dở, nếu không tiến độ của các em sẽ mất.
