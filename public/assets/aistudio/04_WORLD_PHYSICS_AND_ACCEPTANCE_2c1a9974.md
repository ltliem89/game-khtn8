# THIẾT KẾ THẾ GIỚI, ĐIỀU KHIỂN VÀ NGHIỆM THU
## KHTN 8 – Robot vượt trạm đại lượng vật lý

## 1. Trải nghiệm tổng thể

Thiết kế một không gian có bản sắc riêng nhưng không rối: **khu thí nghiệm mở rộng thành một tuyến phiêu lưu khoa học**. Robot là xe khảo sát nhỏ, đi qua những khu vực gắn với đại lượng đang học. Phong cách đề xuất: 3D nhẹ hoặc 2.5D/isometric, màu rõ, biển báo lớn, vạch làn nhìn thấy được, camera bám theo xe và mini-map. Chỉ chọn một phong cách nhất quán; không trộn hoạt hình, ảnh thật và giao diện công nghiệp thiếu thống nhất.

Không cần photorealism. Ưu tiên:
- Đường và checkpoint dễ đọc.
- Robot có khối lượng/động lượng cảm nhận được qua chuyển động nhưng không quá khó điều khiển.
- Bố cục có chiều sâu và mốc định hướng.
- Mỗi khu vực có hình dạng, vật liệu, âm thanh và màu nhấn riêng.
- Chữ ít khi lái, chữ rõ khi làm câu hỏi.
- Không hiện câu hỏi dài trong khi robot đang di chuyển.

## 2. Gợi ý không gian theo trạm

| Khu vực | Ý tưởng không gian | Điểm nhấn trực quan | Mục tiêu học tập |
|---|---|---|---|
| Garage/đường khởi động | Sân tập có đường rộng, bảng chỉ dẫn | Các biển W/A/S/D, mũi tên tuyến | Học điều khiển trước khi thi |
| Trạm khối lượng | Kho vật liệu và cân điện tử mô phỏng | Thùng/bao có nhãn khối lượng | Đọc số đo, so sánh khối lượng |
| Trạm thể tích | Phòng đo có bình chia độ lớn, bể mẫu | Vạch chia và mức chất lỏng | Chọn dụng cụ, đọc thể tích |
| Trạm khối lượng riêng | Xưởng vật liệu cạnh bể thử nổi/chìm | Khối mẫu cùng/khác thể tích | Liên hệ khối lượng và thể tích |
| Trạm áp suất | Đường thử lốp, bề mặt mềm/cứng, mô hình nước | Bề mặt tiếp xúc, độ sâu và vạch mốc | Quan hệ lực–diện tích hoặc áp suất theo độ sâu |
| Trạm Archimedes | Bến thử nổi/chìm và bể nước trong suốt | Mực nước thay đổi theo vật chiếm chỗ | Lực đẩy chất lỏng, không tạo “chống trọng lực” phi thực tế |
| Trạm moment/đòn bẩy | Xưởng máy có trục xoay, cờ lê, bập bênh | Khoảng cách đến điểm tựa | Tác dụng làm quay của lực |
| Trạm điện | Phòng thí nghiệm điện áp thấp | Pin, dây, bóng đèn, ampe kế, vôn kế | Mạch hợp lý, đọc I/A và U/V |
| Trạm nhiệt | Nhà kính, khu ống dẫn, cầu có khe giãn nở | Nguồn nóng mô phỏng an toàn, thanh kim loại giãn nở | Truyền nhiệt, năng lượng nhiệt, nở vì nhiệt |
| Checkpoint tổng hợp | Quảng trường điều phối hoặc trạm chỉ huy | Bản đồ các tuyến đã hoàn thành | Kết nối kiến thức đã học |

Không dùng phong cảnh chỉ để trang trí. Mỗi khu vực phải gợi được hiện tượng vật lí đúng và hỗ trợ câu hỏi của trạm.

## 3. Điều khiển robot

### Phím và thao tác

- `W` hoặc `↑`: tăng tốc tiến.
- `S` hoặc `↓`: phanh/lùi tùy trạng thái xe; giữ `S` lâu không khiến xe lập tức chạy lùi ở tốc độ tối đa.
- `A` hoặc `←`: đánh lái trái.
- `D` hoặc `→`: đánh lái phải.
- `Space`: phanh nhanh có giới hạn, nếu hỗ trợ.
- `Esc`: tạm dừng/đóng màn hình tạm dừng.
- `R`: trở lại checkpoint gần nhất sau xác nhận hoặc khi xe bị kẹt.
- Thiết bị cảm ứng: nút tiến, lùi/phanh, trái, phải; không yêu cầu hover.

Phím tắt không được kích hoạt khi con trỏ đang gõ câu trả lời. Khi quiz mở, khóa đầu vào xe; không giữ lại trạng thái phím để làm xe tự chạy khi đóng quiz.

### Đặc tính chuyển động

Dùng mô hình xe đơn giản, ổn định và nhất quán:
- Tốc độ tăng/giảm dần; có giới hạn tốc độ.
- Bán kính cua phụ thuộc tốc độ hoặc tốc độ đánh lái bị giới hạn.
- Xe không xoay hướng tức thời như một quân cờ, không dịch ngang vô lý, không xuyên vật cản.
- Có ma sát/giảm tốc khi nhả ga; phanh có quãng dừng phù hợp với tốc độ.
- Va chạm với rào chắn làm giảm tốc hoặc dừng xe; không gây hiệu ứng bạo lực.
- Đường dốc chỉ tác động vừa phải nếu game có mô phỏng dốc; không cần mô phỏng động lực học phức tạp ngoài mục tiêu học tập.
- Không thêm cơ chế nhảy/tăng tốc phi thực tế nếu không có lý do game rõ ràng.

Mục đích không phải mô phỏng kỹ thuật ô tô chính xác tuyệt đối mà là giữ hành vi trực quan, nhất quán và không dạy sai trực giác vật lí cơ bản.

## 4. Làn đường và hình phạt

- Vạch làn, mép đường và vùng checkpoint phải dễ nhận ra.
- Chỉ tính ra khỏi làn khi tâm xe nằm ngoài vùng đường vượt quá thời gian dung sai mặc định `700 ms`.
- Khi xe quay lại làn, dừng phạt ngay.
- Hình phạt lái gợi ý: `driving_score -= 1` mỗi giây lệch làn sau dung sai; cổng sai `-15`; reset về checkpoint gần nhất.
- Các hình phạt này **không trừ điểm kiến thức 0–10, không làm giảm sao và không khóa lại các trạm đã hoàn thành**.
- Tránh đặt đường hẹp ở lần đầu lái; tăng độ khó từ từ. Không làm học sinh thất bại kiến thức vì điều khiển quá khó.

## 5. Cấu trúc bản đồ và tăng độ khó

Tăng theo từng biến, không tăng tất cả cùng lúc:
1. Đường rộng, ít cua, không có vật cản di động.
2. Thêm cua nhẹ và biển chỉ dẫn.
3. Đường có vòng cong, hẹp hơn vừa phải hoặc một vật cản đứng yên.
4. Kết hợp cua/nhánh rẽ và yêu cầu chọn tuyến; biển chỉ đường phải đủ sớm.
5. Tuyến tổng hợp có nhiều đoạn, nhưng có checkpoint rõ ràng và không trừng phạt việc thử nghiệm.

Mỗi trạm cần cấu hình: `lane_width`, `curve_complexity`, `obstacle_count`, `max_speed`, `turn_sensitivity`, `checkpoint_id`, `station_trigger_radius`. Phải có giới hạn hợp lý và kiểm thử từng giá trị.

### Lựa chọn tuyến 10/15/20/30

Độ dài chiến dịch là số **trạm học tập**, không nhất thiết bằng số lần rẽ hoặc số cổng. Tuyến ngắn phải giữ thứ tự Chương III → IV → V → VI và lấy đại diện cả áp suất/khối lượng riêng, moment/đòn bẩy, điện và nhiệt. Các trạm bổ sung trong chiến dịch dài là nhiệm vụ vận dụng kiến thức trong bối cảnh mới, không phải đại lượng mới ngoài SGK.

## 6. Dừng tại trạm và nhịp giao diện

State machine tối thiểu:
`menu → briefing → driving → station_brake → quiz → feedback → station_result → driving/checkpoint → campaign_result`.

Khi robot vào `station_trigger_radius`:
1. Tắt ga/đầu vào chuyển động.
2. Giảm vận tốc về 0.
3. Khóa input lái.
4. Hiện tiêu đề, bài học, mục tiêu và câu 1/10.
5. Sau khi trả lời, hiện phản hồi ngắn; không tự mở câu mới quá nhanh.
6. Hoàn tất 10 câu thì chốt điểm, sao, lưu kết quả; nếu đạt mới mở trạm tiếp.
7. Nút tiếp tục phải chủ động được nhấn hoặc có tín hiệu dễ nhận biết; không cho xe tự chạy khi hộp thoại biến mất.

## 7. Bố cục UI

### Màn hình lái
- Góc trên: trạm hiện tại/tổng trạm, tên mục tiêu, điểm lái riêng.
- Chính giữa: đường, xe, vạch làn và điểm đến.
- Góc phải: mini-map và hướng đi kế tiếp.
- Dưới: điều khiển/nhắc phím, tốc độ nhẹ nếu cần.
- Không đặt câu hỏi dài, bảng điểm lớn hoặc cửa sổ chiếm phần lớn tầm nhìn khi lái.

### Màn hình câu hỏi
- Một câu mỗi lần; chữ dễ đọc; công thức/đơn vị hiển thị nổi bật.
- Trắc nghiệm tối đa 4 phương án.
- Nút trả lời rõ ràng, trạng thái chọn và phản hồi có thể truy cập bằng bàn phím.
- Không chấm khi chưa xác nhận đáp án.
- Phản hồi: đáp án chuẩn + giải thích 1–2 câu + nút “Tiếp tục”.

### Màn hình kết quả
- Điểm kiến thức `/10`, số sao, trạng thái đạt/chưa đạt.
- Điểm lái hiển thị tách biệt nếu có.
- 2–3 lỗi kiến thức nổi bật và nút luyện lại.
- Biểu diễn tiến độ bản đồ, checkpoint tiếp theo và trạm đã mở khóa.

## 8. Tính ổn định và khả năng tiếp cận

- Chạy được ở màn hình laptop phổ thông; thiết kế responsive.
- Tương phản cao, chữ tối thiểu dễ đọc, công thức không bị cắt.
- Tất cả chức năng quan trọng dùng được bằng bàn phím.
- Không dùng màu sắc đơn lẻ để báo đúng/sai; kèm chữ và biểu tượng.
- Âm thanh có nút tắt; không tự phát âm thanh lớn.
- Có thông báo trạng thái pause, đang lái, đang thi, đã qua trạm.
- Khi reload, tải lại tiến độ an toàn; nếu dữ liệu lưu bị lỗi, báo rõ và không làm treo ứng dụng.

## 9. Kiến trúc triển khai

Tách thành các module tương đương:
- `content`: đại lượng, trạm, câu hỏi và cấu hình cảnh.
- `input`: keyboard, touch, pause.
- `vehicle`: chuyển động, gia tốc, đánh lái, phanh.
- `track`: đường, làn, checkpoint, trigger, va chạm.
- `quiz`: trình bày câu hỏi, chấm, phản hồi.
- `progress`: sao, mở khóa, checkpoint, lượt chơi.
- `storage`: lưu/tải tiến độ.
- `teacher_review`: trạng thái duyệt và sửa nội dung.

Nếu 3D không chạy ổn định trong preview, dùng 2.5D/isometric rõ ràng; không kéo thêm thư viện nặng chỉ để tạo hiệu ứng. Tách data khỏi code để giáo viên sửa câu hỏi mà không sửa engine.

## 10. Acceptance tests — tiêu chí nghiệm thu

### Gameplay
- [ ] Game khởi chạy và có menu chọn tuyến 10/15/20/30.
- [ ] `WASD` và phím mũi tên hoạt động tương đương.
- [ ] Có phanh/tạm dừng/reset checkpoint; không bị kẹt phím sau khi đóng quiz.
- [ ] Xe có gia tốc, phanh, giới hạn tốc độ và đánh lái hợp lý; không đi ngang/teleport bất thường.
- [ ] Có vạch làn, vùng trạm và mini-map/chỉ dẫn dễ thấy.
- [ ] Ra khỏi làn phải chờ 700 ms mới bắt đầu phạt; về làn thì ngừng phạt.
- [ ] Va chạm hoặc thất bại điều khiển không xóa các trạm học tập đã hoàn thành.

### Đánh giá
- [ ] Mỗi trạm có đúng 10 câu trong lượt đánh giá.
- [ ] Ma trận đúng 4 Biết + 3 Hiểu + 3 Vận dụng.
- [ ] Mỗi câu đúng tối đa 1 điểm; điểm kiến thức 0–10.
- [ ] 0–4 chưa đạt; 5–6 một sao; 7–8 hai sao; 9–10 ba sao.
- [ ] Điểm lái không thay đổi điểm kiến thức và số sao.
- [ ] Sau mỗi 5 trạm có checkpoint câu hỏi mới; không sao chép nguyên câu hỏi cũ.
- [ ] Thi lại dùng bộ câu tương đương về mục tiêu/mức độ; vẫn lưu best score/best stars.

### Khoa học và dữ liệu
- [ ] Mọi câu có ID, mục tiêu, mức độ, đáp án, giải thích và nguồn.
- [ ] Chỉ câu `teacher_approved: true` được dùng trong kiểm tra chính thức.
- [ ] Mục có `teacher_review` được loại khỏi assessment mặc định.
- [ ] Không tự gán công thức/ký hiệu nhiệt chưa được xác minh theo bản SGK.
- [ ] I/A và U/V được phân biệt đúng; đơn vị và ký hiệu không lẫn nhau.
- [ ] Câu thực tế có đủ dữ kiện, đơn vị và một đáp án được định nghĩa rõ.
- [ ] Câu hỏi tổng hợp dùng kiến thức đã mở khóa, bối cảnh mới, không vượt chương trình.

### UI và lưu tiến độ
- [ ] Xe dừng hoàn toàn và khóa điều khiển khi mở câu hỏi.
- [ ] Không bị chồng lấn giữa câu hỏi, điều khiển và bản đồ trên laptop/màn hình nhỏ.
- [ ] Trạng thái trạm đã qua, sao tốt nhất, checkpoint và tuyến đã chọn được lưu nếu môi trường hỗ trợ.
- [ ] Kết quả sau thi chỉ ra kiến thức cần ôn và có nút chơi lại.
- [ ] Các nút pause, continue, reset, retry, next station đều có hành động thực.

## 11. Điều kiện báo cáo sau khi AI hoàn tất

Yêu cầu AI trả lại một bảng nghiệm thu gồm: tiêu chí, trạng thái PASS/FAIL, ghi chú, tệp/module liên quan. Không được đánh dấu PASS nếu chưa kiểm tra chức năng. Nêu rõ nếu preview không hỗ trợ một tính năng thay vì giả định tính năng đó đã hoạt động.
