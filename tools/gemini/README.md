# Công cụ Gemini: thu âm bài nghe và tạo nhân vật

Chạy từ thư mục gốc của repo. Khoá API chỉ đặt trong biến môi trường, **không ghi vào file nào**:

```bash
export GEMINI_API_KEY=...        # dán khoá của cô
```

Mọi lệnh chạy lại được: file đã có thì bỏ qua; lô Batch đang chờ thì lệnh chạy lại sẽ tiếp tục chờ đúng lô đó (không gửi lại, không tốn thêm). Batch API rẻ một nửa nhưng có thể mất tới 24 giờ; thêm `--no-wait` để gửi rồi thoát, lúc khác chạy lại đúng lệnh đó để lấy kết quả. Batch cần khoá đã bật thanh toán.

Giá dưới đây tính theo bảng giá Google đến 31/12/2026.

## 1. Bài nghe (84 file mp3)

| Bước | Lệnh | Chi phí ước tính |
|---|---|---|
| Xem trước | `python3 tools/gemini/gen_audio.py --dry-run` | 0 |
| Thử 1 bài | `python3 tools/gemini/gen_audio.py --direct --only day05:chuan:part1` | ~$0.01 |
| Cả khoá | `python3 tools/gemini/gen_audio.py --batch` | ~$0.65 (~95 phút audio) |
| Dựng lại trang | `python3 src/chuyen-anh-14-ngay/build.py` | 0 |

- Kết quả: `chuyen-anh-14-ngay/audio/dNN-<mức>-p1.mp3`, `-p2.mp3` và `chuyen-anh-14-ngay/audio/manifest.json`. Sau khi dựng lại, trang phát file mp3 thay cho giọng máy của trình duyệt. Bài nào chưa có file thì trang vẫn dùng giọng máy như cũ.
- Nghe thử file của bước "Thử 1 bài" trước khi chạy cả khoá. Nếu báo lỗi 400 nhắc tới `voice`, thêm `--voice-shape legacy` vào mọi lệnh.
- Đổi giọng hoặc lời nhắc về tốc độ đọc: sửa `tools/gemini/voices.json`. Muốn giọng Anh-Anh rõ hơn: chạy `python3 tools/gemini/gen_audio.py --list-voices` (miễn phí) rồi dán id giọng vào `voices.json`.
- Làm lại một bài: xoá file mp3 đó và file `.wav` cùng tên trong `tools/gemini/work/audio/wav/`, rồi chạy lại lệnh.
- Khoá miễn phí (chưa bật thanh toán) không dùng được Batch. Khi đó dùng `--direct` cho cả khoá: không mất tiền nhưng bị giới hạn số lần gọi mỗi ngày, hôm sau chạy lại để làm tiếp.

## 2. Nhân vật (8 bạn, 96 sticker + 8 avatar)

| Bước | Lệnh | Chi phí ước tính |
|---|---|---|
| Xem trước | `python3 tools/gemini/gen_cast.py portraits --dry-run` | 0 |
| Thử 1 nhân vật | `python3 tools/gemini/gen_cast.py portraits --direct --only linh` | ~$0.08 |
| A. Chân dung (8 × 2 ảnh 1K) | `python3 tools/gemini/gen_cast.py portraits --batch` | ~$0.33 |
| Chọn ảnh | mở `tools/gemini/work/cast/portraits-chon.jpg`, ghi `"pick": 1` hoặc `2` cho từng bạn trong `tools/gemini/cast.json` | 0 |
| B. Bảng 6 tư thế (8 × 2 ảnh 2K) | `python3 tools/gemini/gen_cast.py sheets --batch` | ~$0.48 |
| C. Tách nền, làm sticker | `python3 tools/gemini/gen_cast.py process` | 0 (chạy trên máy) |

- Mô tả 8 nhân vật, trang phục và 6 tư thế nằm trong `tools/gemini/cast.json`; cô sửa trực tiếp ở đó.
- Kết quả cuối: `assets/cast/<id>-<tư thế>-<uniform|casual>.webp` (nền trong suốt, viền trắng, cao tối đa 600px) và `assets/cast/avatar-<id>.webp` (tròn 128px).
- Ảnh gốc từ Gemini nằm trong `tools/gemini/work/cast/` (không đưa lên git). Muốn làm lại ảnh nào thì xoá ảnh đó rồi chạy lại bước tương ứng: mỗi bảng 2K làm lại mất khoảng $0.03. Sau đó chạy `process --force`.
- Nếu avatar cắt lệch mặt: thêm `"avatar_box": [tâm_x, tâm_y, cạnh]` (tỉ lệ 0–1 so với ảnh chân dung) cho nhân vật đó trong `cast.json`, rồi chạy `process --force --only <id>`.
