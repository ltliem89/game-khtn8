# JETBOT-SCI8 — SCIENCE RACING ADVENTURE
## Bộ đặc tả triển khai game 3D cho Google AI Studio

**Phiên bản bộ đặc tả:** 1.0.0  
**Dự án nền:** JETBOT-SCI8 — KHTN 8, bộ sách *Kết nối tri thức với cuộc sống*  
**Nền tảng mục tiêu:** React 19 + TypeScript + Three.js + Vite + Tailwind CSS v4  
**Phong cách:** Premium 3D arcade racing + immersive first-person science missions  
**Ngôn ngữ mặc định:** Tiếng Việt; thuật ngữ Anh ngữ có thể hiển thị phụ đề.

---

## 1. Bộ tài liệu này dùng để làm gì?

Đây là bộ đặc tả thiết kế và lệnh triển khai cho Google AI Studio hoặc AI lập trình tương đương. Mục đích là nâng cấp JETBOT-SCI8 từ mô hình “lái xe đến trạm rồi làm trắc nghiệm” thành một chiến dịch game khoa học 3D có nhịp độ, cốt truyện, nhiều thể loại gameplay, độ khó tăng dần và đánh giá học tập đáng tin cậy.

**Đây là đặc tả để tạo game có thể chơi được, không phải yêu cầu tạo ảnh minh họa, mockup hoặc một trang landing page.** AI triển khai phải tạo ra scene 3D tương tác, logic va chạm, vật lý, điều khiển, UI, trạng thái màn chơi, dữ liệu nhiệm vụ, lưu tiến độ và bài kiểm tra.

## 2. Cấu trúc chiến dịch

- **15 màn kiến thức:** mỗi màn có một file MD riêng, một gameplay loop riêng, bối cảnh và thử thách riêng.
- **03 màn Boss:** lần lượt sau màn 5, 10 và 15; kiểm tra khả năng phối hợp kiến thức.
- **05 thế giới 3D:** Material Factory, Pressure Canyon, Mechanical Frontier, Electric City, Thermal Valley.
- **01 MASTER:** điều khiển thứ tự đọc tài liệu, kiến trúc, quy tắc ưu tiên, tích hợp và nghiệm thu toàn dự án.

### Lộ trình 15 màn

| Mã | Thế giới | Nội dung | Gameplay chủ đạo |
|---|---|---|---|
| M01 | Material Factory | Khối lượng | Cargo Scan & Precision Weighing |
| M02 | Material Factory | Thể tích | Volumetric Maze & Displacement |
| M03 | Material Factory | Khối lượng riêng và đo khối lượng riêng | Density Hunt & Lab Assembly |
| M04 | Pressure Canyon | Áp suất trên một bề mặt | Grip Racing & Pressure Tuning |
| M05 | Pressure Canyon | Áp suất chất lỏng | Deep-Sea Route & Pressure Gates |
| B01 | Boss 01 | Tổng hợp M01–M05 | Cargo Catastrophe |
| M06 | Pressure Canyon | Áp suất khí quyển | JetDrone Flight & Airlock Challenge |
| M07 | Pressure Canyon | Lực đẩy Archimedes | Floating Rescue & Buoyancy Balancing |
| M08 | Mechanical Frontier | Moment lực | Torque Crane & Rotational Puzzle |
| M09 | Mechanical Frontier | Đòn bẩy | Lever Engineering Puzzle |
| M10 | Electric City | Cường độ dòng điện | Circuit Runner & Series Circuit |
| B02 | Boss 02 | Tổng hợp M06–M10 | Abyss Reactor Protocol |
| M11 | Electric City | Hiệu điện thế | Voltage Gate & Meter Calibration |
| M12 | Thermal Valley | Năng lượng nhiệt và nội năng | Thermal Survival Management |
| M13 | Thermal Valley | Đo năng lượng nhiệt bằng Joulemeter | Joulemeter Lab Challenge |
| M14 | Thermal Valley | Sự truyền nhiệt | Heat-Transfer Route Strategy |
| M15 | Thermal Valley | Sự nở vì nhiệt của chất rắn, lỏng, khí | Expansion Bridge Run |
| B03 | Boss 03 | Tổng hợp M11–M15 | Core Meltdown Grand Finale |

> **Quy ước:** M01–M15 là 15 màn học tập. B01–B03 là màn tổng hợp, không thay thế bài kiểm tra 10 câu của từng màn học tập.

## 3. Thứ tự đọc bắt buộc

Google AI Studio phải đọc toàn bộ tài liệu theo thứ tự:

1. `00_CONTROL/MASTER_CONTROL_PROMPT.md` — nguồn lệnh có thẩm quyền cao nhất.
2. `01_DESIGN_BIBLE/GAME_DESIGN_BIBLE.md` — tầm nhìn game, cốt truyện, camera, HUD, điều khiển, game feel.
3. `02_TECHNICAL/TECHNICAL_ARCHITECTURE.md` — kiến trúc kỹ thuật, state machine, dữ liệu, hiệu năng.
4. `03_CURRICULUM/CURRICULUM_AND_ASSESSMENT.md` — chuẩn nội dung, ma trận đánh giá, nguyên tắc sư phạm.
5. `04_ASSETS/ART_AUDIO_UI_BIBLE.md` — quy chuẩn đồ họa, chất lượng hình ảnh, âm thanh và giao diện.
6. Đọc **tất cả** file trong `06_MISSIONS/` theo thứ tự M01 → M15.
7. Đọc B01 → B03 trong `07_BOSS/`.
8. `05_ACCEPTANCE/QA_ACCEPTANCE_DELIVERY.md` — kiểm thử và điều kiện bàn giao.

Không được chỉ đọc MASTER rồi tự suy diễn nội dung các màn. Mỗi MD nhiệm vụ là một hợp đồng triển khai độc lập nhưng phải tuân thủ kiến trúc chung.

## 4. Thứ bậc ưu tiên khi có mâu thuẫn

1. Bảo toàn chức năng, dữ liệu và tiến độ hiện hữu của JETBOT-SCI8.
2. Tuân thủ MASTER và các quy tắc dữ liệu/đánh giá trong bộ tài liệu này.
3. Tuân thủ nội dung kiến thức KHTN 8 đã được giáo viên duyệt và ngân hàng câu hỏi hiện có.
4. Tuân thủ gameplay đặc thù trong MD của từng màn.
5. Tối ưu thẩm mỹ và hiệu ứng, không làm giảm tính đúng đắn, hiệu năng hoặc khả năng tiếp cận.

Nếu kiến thức/câu hỏi trong dự án hiện tại không đủ để xác nhận một đáp án, **không tự tạo đáp án khoa học có vẻ hợp lý**. Hãy đánh dấu `TEACHER_REVIEW_REQUIRED` và không đưa nội dung đó vào bài kiểm tra chính thức.

## 5. Quy tắc quan trọng

- Giữ điểm kiến thức, điểm kỹ năng lái và điểm nhiệm vụ thành các chỉ số riêng.
- Mỗi màn học tập có đúng 10 câu hỏi: 4 Biết + 3 Hiểu + 3 Vận dụng.
- Gameplay phải hoạt động; không tạo nút bấm giả, không dựng hình nền tĩnh thay cho game.
- Không tạo bạo lực hoặc bắn người. Chế độ FPS sử dụng **Science Pulse / Scanner / Energy Tagger** để bắn bia, khóa mục tiêu khoa học hoặc kích hoạt cơ cấu.
- Đồ họa ưu tiên sắc nét, có chiều sâu điện ảnh, nhưng phải có cấu hình Performance cho máy tính phổ thông của trường học.
- Mỗi màn có tutorial ngắn, pause, restart, checkpoint, success/failure state, result screen và cách chơi lại.
- Không xóa hoặc ghi đè ngân hàng câu hỏi, analytics, local storage hay chức năng quản trị giáo viên hiện hữu.

## 6. Gói kết quả mong muốn từ Google AI Studio

- Game React/TypeScript chạy được trong môi trường dự án hiện tại.
- Các màn chơi được tách module theo `missionId` và có thể mở/khóa qua campaign map.
- Dùng chung player controller, camera rig, HUD, audio manager, question engine, progress service và asset registry.
- Có cơ chế chuyển màn không tải lại toàn bộ ứng dụng.
- Có báo cáo cuối triển khai: file đã tạo/sửa, chức năng hoàn thành, phần còn thiếu, lỗi đã biết và hướng dẫn chạy.

## 7. Nguồn nội dung nền

Bộ đặc tả được xây dựng dựa trên báo cáo kỹ thuật JETBOT-SCI8 do người dùng cung cấp: React 19, TypeScript, Three.js, chiến dịch 10/15/20/30 trạm, checkpoint mỗi 5 trạm, xe JetBot, PID Autopilot, vật phẩm Sci-Coins/Nitro/Mystery Crates, ngân hàng hơn 250 câu hỏi, ma trận 4–3–3, Knowledge Map và Teacher Review. Các kịch bản nhiệm vụ, cốt truyện, level design và gameplay mới trong bộ MD này là đề xuất mở rộng thiết kế.
