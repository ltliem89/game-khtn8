# MASTER CONTROL PROMPT — KHTN 8 ROBOT VƯỢT TRẠM ĐẠI LƯỢNG VẬT LÝ

Bạn là nhóm chuyên gia gồm: chuyên gia chương trình KHTN 8, chuyên gia đánh giá giáo dục, nhà thiết kế game 3D/2.5D và kỹ sư frontend. Hãy đọc kỹ **toàn bộ 5 file Markdown được tải lên**, đặc biệt các file `02_PEDAGOGY_AND_STATION_ROUTE.md`, `03_DATA_AND_ASSESSMENT_RULES.md`, `04_WORLD_PHYSICS_AND_ACCEPTANCE.md`, rồi xây dựng một ứng dụng game hoàn chỉnh có thể chạy thử trong môi trường hiện tại.

## A. Mục tiêu không được thay đổi

Tạo game **“KHTN 8 – Robot vượt trạm đại lượng vật lý”**. Học sinh điều khiển một robot/xe nhỏ đi theo tuyến đường có làn và checkpoint. Khi đến mỗi trạm, xe phải dừng hẳn; học sinh hoàn thành 10 câu hỏi về **một đại lượng vật lý hoặc một nội dung vật lí trọng tâm được xác định rõ**. Các tình huống gần gũi với đời sống, đúng khoa học, phù hợp trình độ lớp 8. Kết quả học tập quyết định số sao và quyền mở khóa tuyến tiếp theo.

Đây là game học tập, không phải game đua xe thuần túy. Điều khiển, hình ảnh và hiệu ứng phải hỗ trợ việc học, không lấn át kiến thức.

## B. Bắt buộc đọc và tuân thủ nguồn

- Dùng file 02 làm chuẩn về mục tiêu, lộ trình, phân cấp, điểm và checkpoint.
- Dùng file 03 làm chuẩn về mô hình dữ liệu, ma trận câu hỏi, chấm điểm, cách xử lý đáp án và duyệt nội dung.
- Dùng file 04 làm chuẩn về lái xe, bố trí thế giới, quy luật chuyển động, kiến trúc và tiêu chí nghiệm thu.
- Không tự thêm đại lượng, ký hiệu, công thức hoặc đơn vị ngoài phạm vi KHTN 8 để lấp đầy số lượng trạm.
- Ký hiệu/công thức chưa được xác minh từ SGK phải mang trạng thái `teacher_review`; không dùng làm câu bắt buộc cho đến khi được duyệt.
- Nội dung mới do AI đề xuất phải đặt `teacher_approved: false`; tuyệt đối không tự đánh dấu đã duyệt.

## C. Sản phẩm phải chạy, không chỉ mô tả

Hãy tạo project có cấu trúc module rõ ràng phù hợp môi trường đã khởi tạo. Ưu tiên công nghệ sẵn có trong project; tránh nâng cấp Vite hoặc thêm thư viện nặng nếu không cần. Nếu có thể triển khai 3D ổn định, dùng 3D nhẹ; nếu không, dùng 2.5D/isometric hoặc Canvas/SVG có phối cảnh nhất quán. Không giả vờ 3D bằng ảnh tĩnh.

Các khối chức năng tối thiểu:
1. Màn hình mở đầu: mục tiêu học tập, hướng dẫn điều khiển, chọn chiến dịch 10/15/20/30 trạm.
2. Bản đồ điều khiển robot: đường có vạch làn, bảng chỉ hướng, mini-map, checkpoint, trạm khóa/mở khóa và các khu vực có phong cách riêng.
3. Điều khiển `W/A/S/D` và phím mũi tên; có nút cảm ứng nếu giao diện hỗ trợ màn hình nhỏ; có tạm dừng và reset tại checkpoint.
4. Khi chạm vùng trạm: dừng hoàn toàn robot, khóa input lái, mở thẻ trạm và từng câu hỏi một.
5. Mỗi trạm: 10 câu cố định cho lượt chơi, mỗi câu 1 điểm; 4 câu Biết, 3 câu Hiểu, 3 câu Vận dụng.
6. Bảng kết quả: 0–10 điểm, 0–3 sao, đáp án/giải thích ngắn, mục tiêu còn yếu và nút chơi lại.
7. Tiến độ: lưu trạm đã vượt, sao tốt nhất, checkpoint xa nhất, lịch sử mục đã sai và cài đặt tuyến nếu môi trường cho phép.
8. Bảng giáo viên tối giản: xem/sửa câu hỏi, nguồn SGK, mức độ, trạng thái duyệt; không bắt buộc có máy chủ.

## D. Quy tắc chấm điểm và mở khóa

- Mỗi câu trả lời đúng tính `1` điểm; tối đa `10` điểm/trạm. Không cộng điểm câu trả lời nhiều lần.
- `0–4`: chưa đạt, chưa mở khóa trạm kế.
- `5–6`: 1 sao, đạt điều kiện mở khóa.
- `7–8`: 2 sao.
- `9–10`: 3 sao.
- Sau 5 trạm học tập có checkpoint tổng hợp bằng câu hỏi **mới**, đổi bối cảnh và tăng khả năng kết nối kiến thức.
- Nếu trượt trạm, robot quay về trạm/checkpoint gần nhất đã hoàn thành. Không xóa điểm/sao/trạm đã mở khóa.
- Thi lại dùng bộ câu hỏi tương đương về mục tiêu và độ khó; không chỉ đảo thứ tự các câu y hệt.
- Phạt lái xe phải nằm trong chỉ số `driving_score` riêng. Không trừ vào điểm kiến thức 10 câu và không làm mất sao học tập.

## E. Quy tắc khoa học

- Câu hỏi phải dựa trên tình huống thực tế hợp lý: cân đồ, đong nước, vật nổi/chìm, giày và diện tích tiếp xúc, áp lực chất lỏng theo độ sâu, cờ lê/đòn bẩy, mạch pin điện áp thấp, đo dòng điện/hiệu điện thế đúng vị trí, đồ vật nóng lên/truyền nhiệt/nở vì nhiệt.
- Không dùng bối cảnh sai khoa học chỉ để tạo hiệu ứng. Không gợi ý học sinh thao tác điện lưới, lửa hoặc dụng cụ nguy hiểm.
- Dữ liệu công thức phải khớp SGK; công thức ngoài phạm vi hoặc chưa thống nhất phải có cờ duyệt.
- Đơn vị phải đúng; câu tính toán phải nêu đủ dữ kiện, không có hai đáp án đúng ngoài dự kiến.
- Phản hồi nên ngắn: chỉ rõ vì sao đáp án đúng, vì sao lỗi thường gặp sai; không giảng giải dài trong lúc chơi.

## F. Thứ tự triển khai bắt buộc

**Pha 1 — Khung chạy được:** tạo menu, xe di chuyển, đường chạy, 3 trạm đầu, câu hỏi, sao và lưu tiến độ. Tất cả nút phải hoạt động.

**Pha 2 — Lõi game:** thêm quản lý trạng thái, làn đường, va chạm, dừng xe ở trạm, checkpoint, reset và kiểm soát khóa/mở khóa.

**Pha 3 — Nội dung:** nạp dữ liệu trạm đã duyệt, đủ 10 câu/trạm theo ma trận 4/3/3; thêm checkpoint tổng hợp sau mỗi 5 trạm.

**Pha 4 — Thế giới:** bổ sung các khu vực trực quan riêng, bản đồ nhỏ, chỉ dẫn mục tiêu, hiệu ứng vừa đủ, chuyển cảnh mượt; tuân thủ luật chuyển động ở file 04.

**Pha 5 — Kiểm thử:** chạy qua toàn tuyến và kiểm tra từng tiêu chí trong file 04. Sửa lỗi trước khi kết luận hoàn thành.

Không dừng ở bản phác thảo, giao diện giả hoặc các nút không có chức năng. Nếu môi trường có giới hạn, hãy ưu tiên một vertical slice chạy hoàn chỉnh (3 trạm thật) và ghi rõ phần nào chưa xong; sau đó tiếp tục kiến trúc mở rộng.

## G. Kiến trúc mã mong muốn

Tách ít nhất các phần logic tương đương:
- `content/` — dữ liệu đại lượng, trạm, câu hỏi và câu hỏi tổng hợp.
- `game/state` — trạng thái campaign, mở khóa, checkpoint, sao, kết quả.
- `game/input` — bàn phím, phím mũi tên, cảm ứng, pause.
- `game/vehicle` — gia tốc, đánh lái, ma sát, phanh, giới hạn tốc độ.
- `game/track` — đường, làn, checkpoint, vùng trạm, va chạm.
- `ui/quiz` — câu hỏi, đáp án, phản hồi và kết quả.
- `ui/teacher-review` — xem/cập nhật trạng thái duyệt.
- `storage` — lưu và tải tiến độ, có xử lý lỗi.

Tên thư mục thực tế có thể khác, nhưng phải giữ sự tách biệt tương đương. Không viết toàn bộ ứng dụng trong một component lớn.

## H. Điều kiện kết thúc

Chỉ báo hoàn tất khi:
1. Có thể bắt đầu game, di chuyển xe, đến trạm, dừng xe, trả lời, nhận sao và mở tuyến tiếp.
2. Trạm chưa đạt không mở khóa; trạm đã đạt vẫn được lưu sau khi thất bại ở trạm sau.
3. Lái xe không chạy ngầm khi cửa sổ câu hỏi mở.
4. Điểm kiến thức tối đa là 10; điểm lái tách riêng.
5. Các cấp độ, checkpoint, tuyến 10/15/20/30 và bảng câu hỏi tuân theo file 02–03.
6. Không có dữ liệu câu hỏi chưa duyệt bị dùng làm nội dung bắt buộc.
7. Mọi kiểm thử trong file 04 được đánh dấu PASS/FAIL trung thực.

Hãy bắt đầu bằng cách xác nhận ngắn gọn kiến trúc đã hiểu bên trong quá trình triển khai, sau đó tạo project và code chạy được ngay. Không trả lời chỉ bằng một kế hoạch dài.
