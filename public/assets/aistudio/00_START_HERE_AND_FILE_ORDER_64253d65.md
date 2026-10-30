# KHTN 8 – ROBOT VƯỢT TRẠM ĐẠI LƯỢNG VẬT LÝ
## Bộ đặc tả Markdown điều khiển Google AI Studio

**Mục tiêu:** tạo một game giáo dục chạy được, giúp học sinh lớp 8 nhận biết, đọc, hiểu và vận dụng các đại lượng vật lý trong KHTN 8 – Kết nối tri thức với cuộc sống, qua việc điều khiển robot đến các trạm và hoàn thành 10 câu hỏi tại mỗi trạm.

## 1. Danh sách 5 tệp và thứ tự sử dụng

1. `00_START_HERE_AND_FILE_ORDER.md` — mục lục, thứ tự đọc, quy tắc ưu tiên.
2. `01_MASTER_CONTROL_PROMPT.md` — **lệnh tổng điều khiển**. Sao chép toàn bộ nội dung file này vào Google AI Studio sau khi tải lên cả 5 file.
3. `02_PEDAGOGY_AND_STATION_ROUTE.md` — mục tiêu giáo dục, lộ trình trạm, cấp độ, sao, checkpoint và giữ tiến độ.
4. `03_DATA_AND_ASSESSMENT_RULES.md` — cấu trúc dữ liệu đại lượng/câu hỏi, tiêu chuẩn đáp án, ma trận 10 câu và kiểm duyệt khoa học.
5. `04_WORLD_PHYSICS_AND_ACCEPTANCE.md` — điều khiển robot, bố trí không gian, vật lý chuyển động, giao diện, kiến trúc và kiểm thử nghiệm thu.

## 2. Cách dùng trong Google AI Studio

1. Tải lên cả 5 tệp Markdown làm tài liệu nguồn.
2. Dán `01_MASTER_CONTROL_PROMPT.md` vào yêu cầu tạo ứng dụng.
3. Yêu cầu mô hình đọc đủ 5 file trước khi viết code; không chỉ trả lời bằng kế hoạch.
4. Xây bản chạy mẫu với 3 trạm đầu, kiểm tra điều khiển, 10 câu/trạm, sao, quay lại checkpoint và lưu tiến độ.
5. Sau khi mẫu chạy đúng, nạp các trạm còn lại theo dữ liệu và quy tắc ở file 02–04.
6. Trước khi dùng chính thức, giáo viên đối chiếu công thức/ký hiệu với đúng ấn bản SGK đang sử dụng và bật `teacher_approved: true` cho các câu đã duyệt.

## 3. Thứ tự ưu tiên nếu các file có vẻ mâu thuẫn

1. **Độ chính xác chương trình và quy tắc học thuật** trong file 02–03.
2. **Luật đánh giá và lưu tiến độ** trong file 02–03.
3. **Luật điều khiển, không gian và vật lý game** trong file 04.
4. Chi tiết giao diện và hiệu ứng.

Không được vì đồ họa hoặc kỹ thuật mà thay công thức, đơn vị, đáp án hay mục tiêu học tập.

## 4. Phạm vi khoa học cần nhớ

Phần Vật lí chính của SGK KHTN 8 – Kết nối tri thức tập trung ở:
- Chương III: Khối lượng riêng và áp suất — Bài 13–17.
- Chương IV: Tác dụng làm quay của lực — Bài 18–19.
- Chương V: Điện — Bài 20–25.
- Chương VI: Nhiệt — Bài 26–29.

Khối lượng và thể tích được dùng làm **kiến thức nền** để học khối lượng riêng; không trình bày chúng như hai bài học mới độc lập của lớp 8. Nếu mở chiến dịch 20 hoặc 30 trạm, phải dùng các nhiệm vụ luyện tập/vận dụng theo bối cảnh mới của kiến thức trong chương trình, không bịa ra 20–30 đại lượng mới ngoài sách chỉ để đủ số trạm.

## 5. Nguồn đối chiếu chương trình

- Mục lục KHTN 8 – Kết nối tri thức: https://www.sachgiaokhoa247.com/sach-giao-khoa/lop-8-11/ket-noi-tri-thuc-voi-cuoc-song-3/khoa-hoc-tu-nhien-8-937.html
- Danh mục bài KHTN 8 – Kết nối tri thức: https://hoctot.nam.name.vn/sbt-khtn-lop-8-ket-noi-tri-thuc-c1583.html

Các liên kết trên dùng để đối chiếu thứ tự/chủ đề bài học. Khi chốt công thức, ký hiệu hoặc cách viết, ưu tiên bản SGK giáo viên đang sử dụng.
