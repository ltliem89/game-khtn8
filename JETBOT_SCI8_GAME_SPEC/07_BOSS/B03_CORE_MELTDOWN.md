# B03 — CORE MELTDOWN — TRẬN CUỐI KHÔI PHỤC NOVA-8
## Boss Mission Design Document

**Boss ID:** `B03`  
**Vị trí campaign:** Sau M15  
**Kiến thức tổng hợp:** M11–M15: hiệu điện thế, năng lượng nhiệt/nội năng, Joulemeter, truyền nhiệt, sự nở vì nhiệt  
**Thời lượng:** 5–9 phút  
**Vai trò:** kiểm tra khả năng phối hợp gameplay và kiến thức; không thay thế bài kiểm tra 10 câu ở mỗi màn M01–M15.

---

## 1. Boss narrative

Lõi NOVA-8 đã được mở nhưng mất cân bằng điện và nhiệt. Glitch tạo ra một vòng quá tải, khiến thành phố và Thermal Valley cùng mất ổn định. J-08 phải đo, phân phối và kiểm soát năng lượng để khởi động lõi.

Boss không phải một nhân vật để bắn hạ. Đối thủ chính là sự cố kỹ thuật và môi trường biến động. Người chơi thắng bằng cách quan sát, đo, bố trí thiết bị, điều khiển phương tiện và khôi phục hệ thống.

## 2. Boss structure

### 1. PHASE 1 — Voltage Calibration

**Mục tiêu:** Đo điện thế ở đúng hai đầu, mắc vôn kế song song và kích hoạt ba energy gates.

**Cơ chế:** FPS precision meter puzzle + science pulse.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.

### 2. PHASE 2 — Joule Measurement

**Mục tiêu:** Hiệu chuẩn Joulemeter, lắp probe và hoàn thành phép đo trong lab.

**Cơ chế:** Interactive first-person experiment.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.

### 3. PHASE 3 — Thermal Routing

**Mục tiêu:** Chọn đường dẫn nhiệt, đối lưu hoặc bức xạ phù hợp để đưa ba heat cores về lõi.

**Cơ chế:** Heat-transfer maze + target tagging.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.

### 4. PHASE 4 — Expansion Bridge

**Mục tiêu:** Ổn định khe giãn nở của rắn/lỏng/khí rồi vượt cầu cuối.

**Cơ chế:** Precision racing + physics puzzle.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.

### 5. FINAL — NOVA-8 Core Restart

**Mục tiêu:** Tổng hợp lựa chọn và thao tác; nhấn xác nhận khởi động chỉ khi tất cả subsystem đã stable.

**Cơ chế:** Multi-system finale; cinematic restore sequence.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.


## 3. Final objective

NOVA-8 khôi phục ánh sáng; campaign map hiện đủ 15 Science Nodes. Hiển thị tổng kết kiến thức theo từng trạm, driving skill và boss performance riêng.

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

Huge central energy core, concentric containment rings, electrical conduits, thermal chambers, moving expansion joints, volumetric light shafts, cinematic sunrise reveal.

- Boss music là lớp cao trào của motif NOVA-8.
- Mỗi phase có cue âm thanh riêng.
- Cảnh báo quan trọng có captions và visual indicator.
- Dùng hiệu ứng lớn ở opening/phase complete/finale; hạn chế VFX trong vùng puzzle để giữ khả năng đọc.

## 10. Failure and recovery

Các phase có checkpoint. Không reset toàn bộ campaign. Nếu đo sai/lắp sai, chỉ reset module hiện tại và hiển thị hint phù hợp.

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
