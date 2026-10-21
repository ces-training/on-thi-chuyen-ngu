# Ôn thi chuyên ngữ

Học liệu ôn thi chuyên ngữ vào lớp 10 (Hà Nội) cho học sinh từ lớp 6 trở lên.
Trang web: https://ces-training.github.io/on-thi-chuyen-ngu/

## Các bộ học liệu

| Bộ | Trang web | Nguồn |
| --- | --- | --- |
| Chuyên Anh 14 Ngày (lớp 7) | `chuyen-anh-14-ngay/` | `src/chuyen-anh-14-ngay/` |

## Cách sửa nội dung

- Câu hỏi, đáp án, bài đọc của từng buổi nằm trong `src/chuyen-anh-14-ngay/content/dayNN.json`; bài kiểm tra đầu vào và cuối kỳ nằm trong `tests.json`.
- Giao diện và cách tính lộ trình nằm trong `src/chuyen-anh-14-ngay/template.html`.
- Sau khi sửa, chạy `python3 src/chuyen-anh-14-ngay/build.py` để dựng lại `chuyen-anh-14-ngay/index.html`, rồi commit và push.
- GitHub Pages tự cập nhật trang sau mỗi lần push lên nhánh `main` (thường mất 1–2 phút).
- `gen_doc.py` tạo bản markdown của tập bài in (thư mục `doc/`), không kèm đáp án.

## Lưu ý

- Kết quả của học sinh lưu trong trình duyệt (localStorage, khoá `chuyenAnh14_v1`); không có máy chủ thu dữ liệu. Học sinh gửi kết quả cho giáo viên bằng mã ở tab "Gửi cô".
- Không đổi khoá lưu trữ khi học sinh đang học dở, nếu không tiến độ của các em sẽ mất.
