# Cài máy chủ chấm bài và trang theo dõi của cô

Máy chủ chạy trên Google Apps Script, gắn với một Google Sheet của trung tâm. Khi đã cài:

- Kết quả học trên web của học sinh tự gửi về trang của cô (`/co/`). Không cần mã chia sẻ.
- Học sinh chụp bài giấy rồi tải lên. Máy chấm bằng Claude và gửi nhận xét cho con, đồng thời gửi kết quả về cho cô.
- Con không đồng ý với câu nào thì bấm "Con chưa đồng ý" để nhắn cô. Cô sửa điểm hoặc trả lời ngay trên trang của cô.

Cả quá trình mất khoảng 20 phút. Chỉ cần làm một lần.

## 1. Tạo khoá Claude API (5 phút)

1. Vào https://console.anthropic.com và đăng nhập bằng email của trung tâm.
2. Vào **Billing** và nạp tiền trả trước. Mức tối thiểu đủ dùng cho vài trăm lượt chấm; ước tính chi phí ở cuối trang này.
3. Vào **API Keys**, bấm **Create Key** và đặt tên `chuyen-anh-14`.
4. Sao chép khoá (bắt đầu bằng `sk-ant-…`). Khoá chỉ hiện **một lần**, nên dán tạm vào ghi chú.
5. Nên đặt **giới hạn chi tiêu theo tháng** ở mục **Limits** (ví dụ 20 USD) để không bao giờ bị trừ quá tay.

## 2. Tạo Google Sheet và dán mã (5 phút)

1. Dùng tài khoản Google của trung tâm, tạo một Google Sheet mới tên `Chuyên Anh 14 Ngày – dữ liệu`.
2. Trong Sheet, vào **Tiện ích mở rộng → Apps Script**.
3. Xoá hết nội dung tệp `Mã.gs` có sẵn, rồi dán toàn bộ nội dung tệp [`Code.gs`](Code.gs).
4. Bấm dấu **+** cạnh "Tệp", chọn **Tập lệnh** và đặt tên `Keys`. Dán toàn bộ nội dung tệp [`Keys.gs`](Keys.gs) (đáp án 494 câu của 14 buổi).
5. Bấm biểu tượng 💾 để lưu.

## 3. Nhập khoá và mã PIN (2 phút)

1. Trong Apps Script, bấm biểu tượng ⚙️ **Cài đặt dự án**, kéo xuống **Thuộc tính tập lệnh**, rồi bấm **Thêm thuộc tính tập lệnh**.
2. Thêm hai dòng:

| Thuộc tính | Giá trị |
| --- | --- |
| `CLAUDE_API_KEY` | khoá `sk-ant-…` ở bước 1 |
| `TEACHER_PIN` | mã PIN cô tự đặt, **ít nhất 6 ký tự**, dùng để vào trang theo dõi |

3. Bấm **Lưu thuộc tính tập lệnh**.

Thuộc tính tuỳ chọn:

- `MODEL`: mô hình đọc ảnh bài làm (chấm trắc nghiệm, chép bài viết) và chấm bản trả phí. Mặc định `claude-sonnet-5-5`. Đọc chữ viết tay cần mô hình mạnh, nên giữ mặc định.
- `MODEL_FREE`: mô hình chấm bài viết bản thường sau khi con xác nhận bản chép. Mặc định `claude-haiku-5-5` (rẻ khoảng 20 lần); muốn nhận xét kỹ hơn thì ghi `claude-sonnet-5-5`.

## 4. Chạy cài đặt lần đầu (2 phút)

1. Quay lại tệp `Code.gs`. Ở thanh trên cùng, chọn hàm **setup** rồi bấm **▶ Chạy**.
2. Google sẽ hỏi quyền. Bấm **Xem lại quyền**, chọn tài khoản trung tâm, rồi **Nâng cao → Đi tới … (không an toàn)** và bấm **Cho phép**. Cảnh báo này xuất hiện với mọi tập lệnh tự viết chưa qua Google duyệt. Mã chỉ đọc và ghi trong Sheet này, một thư mục Drive riêng, và gọi Claude API.
3. Xem **Nhật ký thực thi**. Nếu thấy "Cài đặt xong" là được.
4. Sau bước này, Sheet có 3 trang tính `Học sinh`, `Bài giấy`, `Tin nhắn`. Drive có thư mục `Chuyên Anh 14 Ngày – bài làm của học sinh`. Máy cũng có một lịch chạy 5 phút một lần để chấm lại bài bị lỗi mạng.

## 5. Triển khai thành ứng dụng web (3 phút)

1. Bấm **Triển khai → Tùy chọn triển khai mới**.
2. Ở biểu tượng ⚙️ cạnh "Chọn loại", chọn **Ứng dụng web**.
3. Điền như sau:
   - **Thực thi với tư cách:** *Tôi*
   - **Người có quyền truy cập:** *Bất kỳ ai*
4. Bấm **Triển khai** và sao chép **URL ứng dụng web**. URL có dạng `https://script.google.com/macros/s/…/exec`.
5. Gửi URL này cho em, hoặc tự dán vào tệp `src/chuyen-anh-14-ngay/config.json`:

```json
{ "apiUrl": "https://script.google.com/macros/s/…/exec" }
```

Sau đó chạy `python3 src/chuyen-anh-14-ngay/build.py`, rồi commit và push. Trang học sinh và trang của cô sẽ tự nối với máy chủ.

> "Bất kỳ ai" chỉ có nghĩa là trang web gọi được máy chủ mà không cần đăng nhập Google. Không ai xem được dữ liệu nếu không có mã học sinh (với dữ liệu của con đó) hoặc mã PIN của cô (với toàn bộ).

## Luồng chấm bài giấy (từ 23/10/2026)

1. Con chụp ảnh bài làm. Máy chấm phần trắc nghiệm và điền từ, kèm giải thích câu sai, và **chép đoạn viết thành chữ** (chưa chấm bài viết).
2. Con đọc bản chép, sửa chỗ máy đọc nhầm cho giống bài trên giấy, rồi bấm xác nhận. Máy chấm bài viết **bản thường**: điểm /10, 2 điểm tốt, 2 điểm cần sửa. Trang của cô hiện cả bản máy chép và bản con xác nhận; con sửa nhiều thì có cờ đỏ để cô đối chiếu với ảnh.
3. **Bản trả phí**: nhận xét bài viết theo 4 tiêu chí đề chuyên (nội dung 3, bố cục và liên kết 2, từ vựng 2,5, ngữ pháp 2,5), từng lỗi kèm cách sửa, nâng câu. Con chưa trả phí thấy nút "Mình muốn mua bản trả phí": yêu cầu ghi vào trang tính `Yêu cầu mua` và nhắn cho cô. Gia đình thanh toán xong, cô mở hồ sơ con ở trang của cô và bấm **Bật bản trả phí**.

Khi cập nhật mã có thêm trang tính hoặc cột mới, chạy lại hàm `setup` một lần trước khi triển khai phiên bản mới.

## Bảng quản trị và phân quyền (từ 23/10/2026)

Trang: https://ces-training.github.io/on-thi-chuyen-ngu/quan-ly/

- **Admin** (chủ trang) đăng nhập bằng mã PIN gốc (`TEACHER_PIN`). Admin làm được mọi việc, tạo được tài khoản **quản lý**, xem toàn bộ Nhật ký thao tác (kể cả của quản lý) và tab Giao tiếp với học sinh (mọi tin nhắn nhân viên gửi học sinh, kèm tên người gửi).
- **Quản lý** dùng PIN Admin cấp. Tab: Tổng quan (doanh thu ước tính, phễu đăng ký, phễu học tập, số liệu từng giáo viên và sale), Học sinh (giao giáo viên phụ trách), Phụ huynh đăng ký, Nhân sự & phân quyền, Nhật ký thao tác (chỉ thấy giáo viên, sale và chính mình).
- Admin hoặc quản lý tạo tài khoản cho **giáo viên** và **sale** ở tab Nhân sự & phân quyền; chỉ Admin tạo, khoá, cấp PIN cho quản lý. Mỗi người có mã PIN 8 ký tự riêng, chỉ hiện một lần lúc tạo (máy chủ lưu bản băm). Khoá tài khoản hoặc cấp PIN mới ở cùng tab.
- Mọi thao tác của nhân viên đều vào sheet **Nhật ký truy cập**: ai, vai, lúc nào, loại dữ liệu, việc, đối tượng, chi tiết (ví dụ "cộng 14 lượt, còn 20", nội dung tin nhắn, trạng thái mới). Ghi cả việc chỉ xem, đăng nhập, PIN sai và thao tác bị từ chối.
- **Giáo viên** chỉ thấy học sinh được giao: tiến độ, bài làm, ảnh bài, chấm lại, nhắn tin (mở hồ sơ ở trang `/co/`). Không thấy liên hệ phụ huynh, yêu cầu mua, doanh thu.
- **Sale** thấy phụ huynh đăng ký, liên hệ, cấp mã, cộng lượt, bật gói học; mỗi học sinh chỉ một dòng tóm tắt học tập, không xem bài làm.
- Máy chủ kiểm tra quyền ở từng yêu cầu. Mọi lần mở hồ sơ, cấp mã, cộng lượt, sửa điểm… được ghi vào trang tính `Nhật ký truy cập`.

## 6. Dùng hằng ngày

- **Cấp mã cho học sinh:** vào `…/on-thi-chuyen-ngu/co/`, nhập PIN, gõ tên con ở ô **Thêm học sinh** rồi bấm **Cấp mã**. Máy tạo mã 6 ký tự (ví dụ `K7M2QX`) để cô gửi cho phụ huynh.
- **Học sinh:** vào trang Chuyên Anh 14 Ngày, nhập mã ở màn hình đầu. Từ đó tiến độ tự đồng bộ. Học trên máy khác chỉ cần nhập lại mã.
- **Bài giấy:** con mở buổi học, kéo xuống mục **Chụp bài giấy để được chấm**, chọn 1–6 ảnh rồi gửi. Khoảng 30–60 giây sau sẽ có điểm và nhận xét từng câu.
- **Cô:** danh sách học sinh xếp các con có tin nhắn chưa đọc hoặc bài chưa chấm được lên đầu (cột **Cần xem**). Bấm vào tên một con để xem ảnh bài, sửa đúng/sai từng câu, chấm lại bài viết và trả lời tin nhắn.

## Khi cập nhật nội dung

Nếu sửa câu hỏi hoặc đáp án trong `src/chuyen-anh-14-ngay/content/`, chạy lại `build.py`. Sau đó dán lại tệp `apps-script/Keys.gs` mới vào Apps Script và bấm **Triển khai → Quản lý triển khai → ✏️ → Phiên bản mới**. Bước này giữ nguyên URL, không phải sửa `config.json`.

## Ước tính chi phí Claude API

Giá tại thời điểm viết (tháng 10/2026), theo bảng giá chính thức: Sonnet 5.5 tính 2 USD cho mỗi triệu token đầu vào và 10 USD cho mỗi triệu token đầu ra; Haiku 5.5 tính 0,10 và 0,50 USD.

Mỗi lượt chấm gồm khoảng 3 ảnh đã nén, đáp án và hướng dẫn chấm, tổng cộng chừng 10–12 nghìn token đầu vào và 1,5–2 nghìn token đầu ra.

| | Sonnet 5.5 (mặc định) | Haiku 5.5 |
| --- | --- | --- |
| Một lượt chấm | khoảng 0,045 USD (≈ 1.150 đ) | khoảng 0,002 USD (≈ 60 đ) |
| Một học sinh × 14 buổi (tính cả chấm lại) | khoảng 0,8 USD (≈ 20.000 đ) | khoảng 0,04 USD (≈ 1.000 đ) |
| Lớp 30 học sinh × 14 buổi | khoảng 24 USD (≈ 610.000 đ) | khoảng 1,2 USD (≈ 30.000 đ) |

Đây là ước tính; số thực tế phụ thuộc số ảnh và độ dài bài viết. Xem mức đã dùng ở console.anthropic.com → **Usage**.

Google Apps Script, Sheets và Drive đều miễn phí trong hạn mức của tài khoản Google thường. Mỗi ảnh nén khoảng 300 KB, nên 30 học sinh × 14 buổi × 3 ảnh chỉ chiếm chừng 400 MB.
