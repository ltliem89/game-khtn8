# M01 — THE MASS VAULT — KHO LƯU TRỮ KHỐI LƯỢNG
## Mission Design Document (MDD) | Cargo Scan & Precision Weighing / Racing + FPS Scanner

**Mission ID:** `M01`  
**Campaign sequence:** 1/15  
**World:** WORLD 1 MATERIAL FACTORY  
**Kiến thức trọng tâm:** Khối lượng (m)  
**Loại màn:** Learning Mission  
**Thời lượng mục tiêu:** 4–8 phút gameplay + phần đánh giá riêng  
**Camera:** Chase/cockpit khi lái; first-person khi scan/lab/target.

---

## 1. Cinematic premise và cốt truyện

Một đoàn container tự động đang mắc kẹt trong kho NOVA-8. Hệ thống cân tải mất hiệu chuẩn; cửa kho chỉ mở khi J-08 xác định đúng kiện hàng cần di chuyển và tránh quá tải băng chuyền.

### Opening beat

1. Camera establishing shot giới thiệu landmark đặc trưng của màn.
2. JetBot J-08 xuất hiện trong khung hình; đèn trạng thái bật theo trình tự.
3. ORBIT báo mục tiêu nhiệm vụ trong 1–2 câu ngắn.
4. Người chơi nhận quyền điều khiển; bỏ qua cinematic được.

### Mid-mission narrative

Environmental storytelling phải thể hiện sự cố: thiết bị đang dở dang, đèn cảnh báo, robot bảo trì dừng hoạt động, bảng log holographic. Không kể chuyện bằng đoạn văn dài giữa lúc lái xe.

### Closing beat

Khi hoàn thành objective, cơ cấu/trạm hoạt động trở lại, một Science Node sáng lên trên campaign map. Dr. Linh hoặc ORBIT đưa phản hồi tích cực và gợi mở nhiệm vụ kế tiếp.

## 2. Mission objective

**Primary objective:** Quét đúng ba kiện hàng theo mã nhiệm vụ, đọc khối lượng trên cân điện tử mô phỏng, đưa kiện phù hợp lên băng chuyền và về cổng thoát trước khi chu kỳ kho đóng.

**Success conditions:**
- Hoàn thành tất cả objective bắt buộc.
- Kích hoạt mission exit/terminal.
- Kết quả được ghi vào `MissionRun` trước khi chuyển sang màn hình result.

**Optional objectives:**
- Optional objective: hoàn thành không va chạm; scan đủ tất cả nhãn phụ; tìm Holo-Crate ở gác bảo trì.
- Không va chạm nghiêm trọng.
- Thu thập tối thiểu một Holo-Crate hoặc Science Fragment.

## 3. Level layout và route design

Kho công nghiệp ba tầng: entry ramp → sorting lanes A/B/C → scanner bay → moving conveyor → weighing platform → exit gate. Có đường chính rộng và một lối tắt hẹp chỉ mở khi hoàn thành scan.

### Route readability

- Đường chính dùng lane markings/lighting dẫn mắt.
- Đường phụ phải có landmark, signage hoặc minimap hint.
- Ngã rẽ có telegraph trước tối thiểu một nhịp camera.
- Không đặt vật cản quan trọng ngay sau góc khuất không thể phản ứng.
- Collision mesh phải khớp gần với hình ảnh; không có collider vô hình chắn đường.

### Checkpoints

- CP0: ngay sau briefing/tutorial.
- CP1: sau mechanic đầu tiên.
- CP2: trước đoạn khó/mini-boss nếu có.
- Mỗi checkpoint ghi vị trí, objective flags, collected IDs và trạng thái puzzle cần giữ.

## 4. Core gameplay — mechanic signature

**Mechanic chính:** Người chơi lái xe qua kho, chuyển sang FPS scanner khi đứng trong vùng cân. Reticle quét barcode/nhãn của từng kiện; bảng cân hiển thị số đo. Chọn/đánh dấu đúng kiện theo yêu cầu nhiệm vụ; dùng E để móc/đẩy kiện lên băng chuyền. Kiện sai làm băng chuyền dừng và tạo đường vòng, không trừ knowledge score.

### Gameplay phases

1. **Approach:** người chơi nhận diện landmark và mục tiêu.
2. **Learn-by-doing:** hướng dẫn đúng một lần bằng highlight/prompt ngắn.
3. **Challenge:** rút gợi ý, thêm biến thể hoặc obstacle.
4. **Mastery check:** thực hiện lại mechanic trong một tình huống mới.
5. **Exit:** mở đường ra và lưu trạng thái.

### Độ khó

Một kiện có nhãn nhiễu với số lớn nhưng không phải đại lượng khối lượng; người chơi phải nhận ra đơn vị/nhãn đúng. Băng chuyền di chuyển theo chu kỳ, buộc canh thời gian. Có thùng hàng rơi chậm được báo đèn trước.

Difficulty tuning:
- ROOKIE: vùng tương tác rộng hơn, thời gian reaction dài hơn, hint có thể hiện tự động.
- PRO: ít highlight hơn, thêm một biến thể obstacle.
- ELITE: kết hợp mechanic với route choice hoặc thời gian.
- SCIENCE MASTER: thêm distractor/hazard nhưng vẫn có telegraph và không thay đổi sự thật khoa học.

## 5. Nội dung KHTN và learning design

**Learning intent:** Củng cố ký hiệu m, đơn vị đo khối lượng và đọc dụng cụ đo theo ngân hàng câu hỏi đã duyệt. Tình huống phân biệt khối lượng với các đại lượng khác chỉ dùng khi có câu hỏi chuẩn được giáo viên duyệt.

### Learning outcomes

Sau màn, học sinh có thể:
1. Nhận diện đại lượng/khái niệm trọng tâm của màn.
2. Liên kết thông tin hiển thị với thiết bị, hiện tượng hoặc tình huống thực tiễn.
3. Vận dụng kiến thức để chọn thao tác/lộ trình phù hợp.

### In-game feedback

- Phản hồi ngay sau hành động thao tác: đúng/sai, vì sao, cần quan sát dấu hiệu nào.
- Không đưa lời giải đầy đủ trước khi học sinh thử lần đầu, trừ accessibility/teacher override.
- Cho phép mở lại knowledge card sau khi hoàn thành.
- Nội dung công thức, đơn vị và dữ liệu số phải lấy từ tài liệu/nguồn đã được duyệt.

## 6. Assessment integration

Sau gameplay, mở `StationQuizModal` hoặc màn đánh giá tương thích với UI hiện có.

- Đúng 10 câu: 4 Biết + 3 Hiểu + 3 Vận dụng.
- Chỉ chọn câu `teacher_approved === true`.
- Mỗi câu 4 phương án; trộn đáp án bằng Fisher–Yates.
- Knowledge score 0–10; không phụ thuộc thời gian lái.
- Câu sai được đưa vào `review_queue` theo logic chung.
- Nếu ngân hàng không đủ câu duyệt, hiển thị chế độ luyện tập/thiếu dữ liệu; không tự sinh câu thay thế.

### Interaction evidence bổ sung

Ghi lại dữ liệu thao tác đặc thù của màn, ví dụ: số lần scan, cấu hình puzzle, tuyến đã chọn, lỗi lắp ráp, checkpoint retries. Không tự cộng dữ liệu này vào knowledge score.

## 7. Player controls

WASD/arrow lái; Space phanh; Shift Nitro; C cockpit/chase; khi vào scanner: mouse look, click/trigger để scan, E để xác nhận kiện.

Tất cả hành động có UI prompt tương ứng và phải hỗ trợ bàn phím, chuột, touch. Trong mobile, không yêu cầu nhấn nhiều nút nhỏ cùng lúc. Có aim assist phù hợp cho touch.

## 8. Art direction và asset list

**Visual identity:** Warehouse megastructure, steel beams, gantry cranes, conveyor belts, stacked containers, barcode holograms, dust shafts from skylights, amber safety lights, detailed JetBot chassis and wheel motion.

### Hero assets

- JetBot J-08 với bánh, LiDAR, sensor lens, chassis panels và module tương ứng.
- Landmark đặc trưng của màn.
- Hai đến bốn prop tương tác chính.
- Một loại collectible/energy core có animation.
- Một bộ decal/signage đồng bộ world.

### Environment layers

- Foreground: road/platform, interactables, obstacles.
- Midground: structures/machines/pipes/containers.
- Background: skyline/canyon/towers/industrial silhouettes.

### VFX

- Scan/pulse effect.
- Objective activation.
- Pickup burst.
- Checkpoint activation.
- Success/exit reveal.

Các hiệu ứng phải dùng pooling, không tạo material/geometry mới liên tục trong frame loop.

## 9. Audio design

- World ambience phù hợp bối cảnh.
- Mission stinger khi briefing/mission success.
- Interaction SFX khác nhau theo vật liệu/cơ cấu.
- ORBIT voice line ngắn ở objective start, error hint và completion.
- Cảnh báo nguy hiểm có caption/icon song song với âm thanh.

## 10. HUD và UI đặc thù

- Primary objective + progress counter.
- Minimap/route map nếu màn có di chuyển.
- Tool state/scan state khi vào FPS.
- Timer chỉ bật nếu nhiệm vụ cần time pressure; luôn cho pause ở safe zone.
- Không hiển thị quá nhiều chỉ số mô phỏng không có ý nghĩa học tập.

## 11. Failure, recovery và fairness

**Failure policy:** Hết thời gian nhiệm vụ hoặc ba lần đưa sai kiện vào line khóa. Cho phép restart checkpoint ngay trước sorting bay. Không xóa tiến độ campaign.

- Không có permadeath.
- Retry không làm mất điểm kiến thức của các màn đã hoàn tất.
- Lỗi lái xe không được ghi thành lỗi trả lời kiến thức.
- Khi học sinh gặp lỗi lặp lại, đưa hint theo tầng.
- Có tùy chọn giảm độ khó điều khiển mà không thay đổi câu hỏi.

## 12. Data contract

Mission controller cần ghi tối thiểu:

```ts
interface M01RunEvidence {
  checkpointsReached: string[];
  objectiveFlags: Record<string, boolean>;
  interactionCount: number;
  retries: number;
  collectedIds: string[];
  routeChoices: string[];
  missionTimeMs: number;
  drivingScore: number;
  interactionEvidence: Record<string, unknown>;
}
```

Dữ liệu trên hợp nhất vào `MissionRun`, không tạo một progress store tách rời.

## 13. Acceptance tests đặc thù

- [ ] Màn có bối cảnh/cốt truyện đúng với tài liệu.
- [ ] Mechanic signature hoạt động, không phải animation giả.
- [ ] Có ít nhất một tình huống học sinh phải tự thao tác để tiến triển.
- [ ] Có success/failure/retry/checkpoint.
- [ ] Camera chase và first-person chuyển đổi đúng nơi cần thiết.
- [ ] Điều khiển desktop và mobile hoạt động.
- [ ] HUD phản ánh trạng thái thật.
- [ ] 10 câu 4–3–3 được gọi từ question engine đã duyệt.
- [ ] Điểm kiến thức tách khỏi driving score.
- [ ] Scene dispose sạch và chạy được ở Performance tier.

## 14. Anti-patterns — không được làm

- Không biến màn này thành một đường thẳng với vài coin.
- Không thay mechanic signature bằng 10 câu hỏi pop-up.
- Không dùng hình ảnh placeholder cho hero assets trong bản được nghiệm thu.
- Không tạo đáp án/giá trị vật lí tự suy diễn.
- Không phạt điểm kiến thức vì người chơi lái xe chưa tốt.
- Không buộc người chơi bấm chuột chính xác pixel-perfect trên điện thoại.
