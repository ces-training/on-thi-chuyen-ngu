# Ôn thi chuyên ngữ

Học liệu ôn thi chuyên ngữ vào lớp 10 (Hà Nội) cho học sinh từ lớp 6 trở lên.
Trang web: https://ces-training.github.io/on-thi-chuyen-ngu/

## Các bộ học liệu

| Bộ | Trang web | Nguồn |
| --- | --- | --- |
| Chuyên Anh 14 Ngày (lớp 7) | `chuyen-anh-14-ngay/` | `src/chuyen-anh-14-ngay/` |
| Số liệu tuyển sinh chuyên ngữ Hà Nội | `tuyen-sinh/` | sửa trực tiếp `tuyen-sinh/index.html` |
| Trang theo dõi của cô | `co/` | `src/co/template.html` |

## Máy chủ chấm bài (tuỳ chọn)

Thư mục `apps-script/` chứa máy chủ chạy trên Google Apps Script. Khi bật, kết quả học tự gửi về trang của cô, học sinh chụp bài giấy để máy chấm bằng Claude, và con có thể nhắn cô khi chưa đồng ý với điểm.
Cách cài từng bước, kèm ước tính chi phí: [apps-script/HUONG-DAN-CAI-DAT.md](apps-script/HUONG-DAN-CAI-DAT.md).

Khi `src/chuyen-anh-14-ngay/config.json` chưa có `apiUrl`, trang học sinh vẫn chạy hoàn toàn trong trình duyệt như cũ và gửi kết quả bằng mã ở tab "Gửi cô".

## Cách sửa nội dung

- Câu hỏi, đáp án, bài đọc của từng buổi nằm trong `src/chuyen-anh-14-ngay/content/dayNN.json`; bài kiểm tra đầu vào và cuối kỳ nằm trong `tests.json`.
- Giao diện và cách tính lộ trình nằm trong `src/chuyen-anh-14-ngay/template.html`.
- Sau khi sửa, chạy `python3 src/chuyen-anh-14-ngay/build.py`. Lệnh này dựng lại `chuyen-anh-14-ngay/index.html`, `co/index.html` và `apps-script/Keys.gs`. Sau đó commit và push.
- GitHub Pages tự cập nhật trang sau mỗi lần push lên nhánh `main` (thường mất 1–2 phút).
- Màu, phông chữ và nút bấm dùng chung cho mọi trang nằm trong `src/brand/brand.css`. `build.py` chép tệp này vào trang học sinh, trang của cô, và vào khối giữa `/*BRAND*/ … /*/BRAND*/` của trang chủ và trang tuyển sinh.
- `gen_doc.py` tạo bản markdown của tập bài in (thư mục `doc/`), không kèm đáp án.

## Lưu ý

- Kết quả của học sinh luôn lưu trong trình duyệt (localStorage, khoá `chuyenAnh14_v1`). Khi đã cài máy chủ, kết quả còn được đồng bộ lên Google Sheet của trung tâm theo mã học sinh.
- Không đổi khoá lưu trữ khi học sinh đang học dở, nếu không tiến độ của các em sẽ mất.
