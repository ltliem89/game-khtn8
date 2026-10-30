# QA, ACCEPTANCE & DELIVERY SPEC
## Điều kiện kiểm thử và bàn giao JETBOT-SCI8

## 1. Test layers

1. **Unit tests:** state transitions, question selection, scoring, reward idempotency, upgrade rules, formula utilities nếu có.
2. **Integration tests:** mission loader, scene lifecycle, input mapping, progress storage, quiz adapter, checkpoint unlock.
3. **Gameplay tests:** đường đi, collision, interaction, puzzle solution, success/failure, retry.
4. **Educational tests:** 4–3–3, 10 câu, teacher approval filter, answer randomization, explanation and review queue.
5. **Visual tests:** HUD layering, camera, readability, texture/lighting, responsive modes.
6. **Performance tests:** low/medium/high settings, long session, scene transitions, mobile viewport.
7. **Regression tests:** các chức năng dự án gốc không bị mất.

## 2. Global acceptance checklist

### App integrity
- [ ] App khởi động không lỗi.
- [ ] Menu/setup/campaign map truy cập được.
- [ ] Existing teacher review and question data remain intact.
- [ ] Progress from old save either migrates or is safely retained.

### Runtime
- [ ] WebGL capability checked.
- [ ] Scene load/unload không rò rỉ renderer/listeners.
- [ ] Pause dừng physics, timer, hazards và input.
- [ ] Retry reset đúng toàn bộ state của màn.
- [ ] Refresh khôi phục checkpoint/progress hợp lệ.

### Gameplay
- [ ] Mỗi màn có mechanic signature riêng.
- [ ] Objective có thể hoàn thành bằng hành động người chơi.
- [ ] Failure state rõ và retry công bằng.
- [ ] Collision/trigger không xuyên vật thể trong tình huống chuẩn.
- [ ] First-person controls không khóa người chơi ở trạng thái lỗi.
- [ ] Không có bắn người/sinh vật hoặc hình ảnh bạo lực.

### Education
- [ ] M01–M15 mỗi màn 10 câu, tỷ lệ 4–3–3.
- [ ] Tất cả câu chính thức đã teacher approved.
- [ ] Không lặp câu trong cùng lượt.
- [ ] Không lộ đáp án trước khi chốt.
- [ ] KnowledgeScore độc lập DrivingScore.
- [ ] Explanation và review queue hoạt động.

### Visual/audio
- [ ] Mô hình JetBot không phải khối primitive placeholder.
- [ ] Mỗi world có palette, environment storytelling và landmark riêng.
- [ ] Hero props có chi tiết vật liệu/animation.
- [ ] HUD đọc được trên desktop/mobile.
- [ ] Audio controls hoạt động; pause không còn tiếng engine/hazard loop.

## 3. Mission-specific acceptance format

Mỗi MD nhiệm vụ định nghĩa checklist riêng. QA phải chạy từng checklist và ghi kết quả `PASS`, `FAIL`, `BLOCKED`.

## 4. Performance budgets (initial targets)

Các con số dưới đây là mục tiêu ban đầu cần đo trên phần cứng thực tế, không phải cam kết mọi thiết bị:
- Performance tier: duy trì 30 FPS trở lên trong gameplay bình thường trên máy mục tiêu; không để frame spike kéo dài.
- High tier: hướng tới 50–60 FPS.
- Ultra: hướng tới 60 FPS.
- Scene startup: hiển thị tiến trình và không treo UI.
- Tránh quá nhiều real-time shadow casters, lights và particles.
- Không tạo rác bộ nhớ liên tục trong frame loop.

## 5. Browser/device matrix

Kiểm thử ít nhất:
- Windows desktop Chrome/Edge, chuột + bàn phím.
- Laptop cấu hình phổ thông, Performance tier.
- Tablet/mobile Chrome, touch input, landscape.
- Kích thước cửa sổ hẹp và rộng.
- WebGL unavailable/context lost behavior (nếu mô phỏng được).

## 6. Learning fairness

- Không phạt kiến thức vì xe đâm vật cản.
- Không thưởng đáp án đúng chỉ vì dùng Nitro hoặc lái nhanh.
- Không bắt buộc tốc độ cao ở câu vận dụng tính toán.
- Có chế độ hỗ trợ điều khiển nhưng giữ nguyên nội dung bài kiểm tra.
- Học sinh có thể tiếp cận objective ngay cả khi chưa giỏi game đua xe.

## 7. Required handoff report

Sau mỗi phase, báo cáo:
- Phase / date / code revision (nếu có).
- Files created/modified.
- Features reused from legacy app.
- Tests run and results.
- Mission status table: Not started / In progress / Playable / Accepted.
- Known issues and blockers.
- Performance observations and tested device profile.
- How to run/build.

## 8. Final delivery definition

Chỉ gọi là `DELIVERED` khi:
- 15 mission modules và 3 boss modules có thể khởi chạy theo campaign graph.
- Có thể hoàn thành ít nhất một lượt đầy đủ từ M01 đến checkpoint/boss tương ứng.
- Save/resume, quiz, scoring, unlock, audio controls và mobile input hoạt động.
- Không có placeholder che giấu chức năng chưa làm.
- Có hướng dẫn chạy và báo cáo kiểm thử.
