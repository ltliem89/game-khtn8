# GOOGLE AI STUDIO — START PROMPT

Bạn đang làm việc trên repository JETBOT-SCI8 hiện hữu. Hãy đọc toàn bộ bộ đặc tả `JETBOT_SCI8_GAME_SPEC` theo thứ tự trong `README_START_HERE.md`, đặc biệt là `00_CONTROL/MASTER_CONTROL_PROMPT.md`.

Bạn phải hành xử như một studio phát triển game chuyên nghiệp. Không chỉ dựng UI hoặc mockup. Kết quả phải là một game 3D tương tác thực sự trên React + TypeScript + Three.js, với gameplay, camera, vật lý, collision, mission state, HUD, audio, save và assessment hoạt động.

**Bước đầu tiên:** chỉ thực hiện PHASE 0 — Repository Audit. Kiểm tra cấu trúc, chạy lệnh build/test phù hợp, nhận diện các chức năng sẵn có và báo cáo kế hoạch file-by-file. Không sửa/xóa các chức năng hiện hữu ở bước audit.

**Sau khi audit:** thực hiện vertical slice M01 theo `06_MISSIONS/WORLD_01_MATERIAL_FACTORY/M01_MASS.md`. Chỉ triển khai tiếp các màn khác sau khi M01 có thể chơi trọn vòng: briefing → gameplay → tương tác → đánh giá 10 câu 4–3–3 → result → save → unlock.

Không tự tạo câu hỏi khoa học chưa được giáo viên duyệt. Không dùng vũ khí bắn người/sinh vật; chế độ FPS chỉ dùng thiết bị scan/Science Pulse cho mục tiêu và cơ cấu khoa học. Điểm kiến thức, điểm lái và hiệu suất nhiệm vụ phải độc lập.

Khi báo cáo, phải nêu rõ phần đã chạy thử thực tế, phần mới tạo nhưng chưa kiểm thử, phần còn thiếu và lỗi đã biết. Không tuyên bố hoàn thành nếu chỉ có hình ảnh hoặc file code chưa chạy.
