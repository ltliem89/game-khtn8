# B02 — ABYSS REACTOR PROTOCOL — LÕI PHẢN ỨNG HẺM SÂU
## Boss Mission Design Document

**Boss ID:** `B02`  
**Vị trí campaign:** Sau M10  
**Kiến thức tổng hợp:** M06–M10: áp suất khí quyển, Archimedes, moment lực, đòn bẩy, cường độ dòng điện  
**Thời lượng:** 5–9 phút  
**Vai trò:** kiểm tra khả năng phối hợp gameplay và kiến thức; không thay thế bài kiểm tra 10 câu ở mỗi màn M01–M15.

---

## 1. Boss narrative

Một reactor nghiên cứu sâu dưới canyon bị tách khỏi trạm điều khiển. J-08 phải bay lên tháp khí quyển lấy mã, cứu bè thiết bị, vận hành cơ cấu quay/đòn bẩy và nối lại mạch điều khiển.

Boss không phải một nhân vật để bắn hạ. Đối thủ chính là sự cố kỹ thuật và môi trường biến động. Người chơi thắng bằng cách quan sát, đo, bố trí thiết bị, điều khiển phương tiện và khôi phục hệ thống.

## 2. Boss structure

### 1. PHASE 1 — Skylock Retrieval

**Mục tiêu:** JetDrone bay lên tháp, đi qua vòng dẫn đường và đọc hệ thống airlock.

**Cơ chế:** Flight challenge + first-person scan.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.

### 2. PHASE 2 — Floating Recovery

**Mục tiêu:** Cân bằng tải bè cứu hộ và kéo module reactor về bến.

**Cơ chế:** Buoyancy balancing puzzle + tug route.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.

### 3. PHASE 3 — Mechanical Release

**Mục tiêu:** Dùng crane moment và lever mechanism để nâng khóa reactor.

**Cơ chế:** Rotational puzzle; bố trí điểm tựa và điểm đặt lực.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.

### 4. PHASE 4 — Current Restart

**Mục tiêu:** Lắp mạch nối tiếp và đặt ammeter để khởi động hệ điều khiển.

**Cơ chế:** First-person circuit assembly; animated current path.

**Checkpoint:** lưu phase start, objective flags và collected IDs trước khi chuyển phase.


## 3. Final objective

Kích hoạt reactor khi tất cả bốn hệ thống ở trạng thái stable. ORBIT xác nhận Electric City đã có thể tiếp nhận năng lượng.

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

Abyssal reactor chamber beneath a cliff, transparent water shafts, hanging crane arms, lever platforms, electric core rings and massive circular blast doors.

- Boss music là lớp cao trào của motif NOVA-8.
- Mỗi phase có cue âm thanh riêng.
- Cảnh báo quan trọng có captions và visual indicator.
- Dùng hiệu ứng lớn ở opening/phase complete/finale; hạn chế VFX trong vùng puzzle để giữ khả năng đọc.

## 10. Failure and recovery

Mỗi phase có một checkpoint riêng. Reactor stability chỉ là trạng thái game, không dùng thay cho kiến thức khoa học; quá tải phase chỉ reset phase đó.

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
