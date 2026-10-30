# B01 — CARGO CATASTROPHE — THẢM HỌA KHO VẬN CHẤT LIỆU
## Boss Mission Design Document

**Boss ID:** `B01`  
**Vị trí campaign:** Sau M05  
**Kiến thức tổng hợp:** M01–M05: khối lượng, thể tích, khối lượng riêng, áp suất bề mặt, áp suất chất lỏng  
**Thời lượng:** 5–9 phút  
**Vai trò:** kiểm tra khả năng phối hợp gameplay và kiến thức; không thay thế bài kiểm tra 10 câu ở mỗi màn M01–M15.

---

## 1. Boss narrative

Glitch chiếm quyền điều phối kho vận và làm trượt một đoàn cargo xuống khu vực Pressure Canyon. J-08 phải giải cứu dữ liệu, kiểm soát tải và mở cổng áp suất trước khi tuyến vận chuyển bị ngập.

Boss không phải một nhân vật để bắn hạ. Đối thủ chính là sự cố kỹ thuật và môi trường biến động. Người chơi thắng bằng cách quan sát, đo, bố trí thiết bị, điều khiển phương tiện và khôi phục hệ thống.

## 2. Boss structure

### 1. PHASE 1 — Rescue the Cargo

**Mục tiêu:** Đua qua khu kho sụp, nhận dạng các kiện hàng cần cứu và chọn kiện theo thông tin khối lượng/ thể tích.

**Cơ chế:** Arcade racing + scanner; lane collapse báo trước; scan và móc cargo.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.

### 2. PHASE 2 — Density Sorting

**Mục tiêu:** Tại trạm phân loại, dùng dữ liệu khối lượng và thể tích để đặt mẫu đúng khoang.

**Cơ chế:** Interactive density puzzle; tính/so sánh D bằng dữ kiện được giáo viên duyệt.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.

### 3. PHASE 3 — Pressure Gate

**Mục tiêu:** Đi vào tunnel áp suất, điều khiển các cửa theo độ sâu và đưa cargo tới platform an toàn.

**Cơ chế:** Underwater maze + pressure valve sequence; first-person console.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.


## 3. Final objective

Đưa cargo lõi vào bệ cứu hộ, xác nhận hệ thống cân bằng tải và khởi động lại tuyến vận chuyển. Đây là synthesis objective chứ không phải câu hỏi công thức ngoài phạm vi.

## 4. Boss combat language (non-violent)

- Không dùng súng đạn, máu, sát thương nhân vật hoặc hành vi bạo lực.
- “Attack window” được thay bằng `System Vulnerability Window`: khoảng thời gian cơ cấu có thể được scan/tag/activate.
- “Boss health” nếu có chỉ là `System Stability` hoặc `Subsystem Recovery`, thể hiện mức tiến triển khôi phục.
- Hit feedback là ánh sáng, hologram ổn định, cơ cấu chuyển sang trạng thái online.
- Không cho phép người chơi spam pulse để bỏ qua puzzle.

## 5. Boss difficulty

- ROOKIE: mỗi phase có sơ đồ gợi ý và telegraph dài.
- PRO: giảm marker dẫn đường, thêm obstacle nhẹ.
- ELITE: objective liên hoàn, route choice và giới hạn tài nguyên phụ.
- SCIENCE MASTER: môi trường đổi trạng thái theo chu kỳ, phải phối hợp nhiều mechanic đã học.

Tất cả cấp độ vẫn giữ kiến thức đúng, objective khả thi và checkpoint công bằng.

## 6. Camera and encounter pacing

- Opening establish shot 3–5 giây, có Skip.
- Gameplay phase dùng camera phù hợp: chase, first-person, drone, puzzle close-up.
- Chuyển phase có camera move ngắn, không cắt quyền điều khiển quá lâu.
- Khi người chơi thất bại, camera không rung liên tục; hiển thị nguyên nhân và recovery option.

## 7. HUD

- Boss title và phase number.
- Overall recovery progress.
- Current phase objectives.
- System stability / energy resource nếu cần.
- Checkpoint marker.
- Không hiển thị quá nhiều thanh tiến độ cạnh tranh.

## 8. Scoring

- `bossPerformance`: phase completion, retry count, time, optional objectives.
- `drivingScore`: chỉ áp dụng cho phần lái xe.
- `knowledgeScore`: không sửa lại điểm các màn đã làm.
- Coins/rewards chỉ cấp một lần khi Boss complete; idempotent.

## 9. Visual / audio direction

Catastrophic industrial convoy, collapsing cargo gantries, flood gates, stormy canyon reservoir, emergency amber lights, huge pressure doors, dramatic but readable set pieces.

- Boss music là lớp cao trào của motif NOVA-8.
- Mỗi phase có cue âm thanh riêng.
- Cảnh báo quan trọng có captions và visual indicator.
- Dùng hiệu ứng lớn ở opening/phase complete/finale; hạn chế VFX trong vùng puzzle để giữ khả năng đọc.

## 10. Failure and recovery

Ba lần mất cargo, sai trình tự pressure gate hoặc hết mission timer. Có checkpoint đầu mỗi phase; retry phase hiện tại.

## 11. Rewards and story unlock

- Mở world/Science Node kế tiếp theo campaign graph.
- Cấp một cosmetic/blueprint hoặc badge tương ứng.
- Mở story log mới và debrief.
- Không dùng reward để tăng knowledge score.

## 12. Acceptance tests

- [ ] Mỗi phase có gameplay thực sự, không chỉ cinematic.
- [ ] Chuyển phase lưu state chính xác.
- [ ] Boss có thể hoàn thành từ đầu đến cuối.
- [ ] Retry phase không reset những phase đã hoàn thành.
- [ ] Không có bạo lực hoặc bắn sinh vật/người.
- [ ] Điểm boss độc lập điểm quiz/điểm lái.
- [ ] Có ending sequence và campaign unlock.
- [ ] Performance tier vẫn chơi được.
