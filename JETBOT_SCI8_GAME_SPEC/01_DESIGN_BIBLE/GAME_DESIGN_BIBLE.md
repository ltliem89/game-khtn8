# GAME DESIGN BIBLE — JETBOT-SCI8
## Creative direction, game feel, campaign narrative and player experience

## 1. High concept

`JETBOT-SCI8: SCIENCE RACING ADVENTURE` là game trải nghiệm khoa học 3D. Người chơi điều khiển JetBot AI đi qua 5 vùng nghiên cứu của NOVA-8, giải quyết sự cố bằng kiến thức KHTN 8. Game có nhịp đua xe arcade, các đoạn khám phá góc nhìn thứ nhất, mini-game vật lý và những bài kiểm tra tại trạm.

**Fantasy:** “Mình không đang làm bài kiểm tra trên máy tính; mình là kỹ thuật viên điều khiển một robot nghiên cứu, phải quan sát, suy luận, thao tác và lái xe để cứu trung tâm khoa học.”

**Pillars:**
1. **Skillful driving:** cảm giác lái có trọng lượng, tăng tốc, phanh, drift nhẹ, nhảy và né vật cản.
2. **Science is the key:** kiến thức mở khóa cơ cấu, lộ trình, thiết bị và cổng năng lượng.
3. **Every stage has a signature:** mỗi màn có một mechanic chính không trùng lặp.
4. **Premium readable 3D:** hình ảnh rõ, có phân lớp chiều sâu và không làm rối nhiệm vụ.
5. **Fair learning assessment:** điểm lái và điểm kiến thức độc lập.

## 2. Narrative universe

### NOVA-8 Research Network

NOVA-8 là mạng lưới phòng thí nghiệm và giao thông khoa học gồm năm khu vực. Một sự cố tại lõi điều phối khiến hệ thống phân phối vật liệu, áp suất, máy móc, điện và nhiệt mất đồng bộ. AI điều phối `ORBIT` phát thông báo khẩn, nhưng nhiều cảm biến bị nhiễu. Người chơi là kỹ thuật viên mới được giao JetBot `J-08` để khôi phục 15 Science Nodes.

### Nhân vật/giọng dẫn

- **J-08 / JetBot:** phương tiện chính; có LiDAR, scanner, module năng lượng và hệ thống nâng cấp.
- **ORBIT:** AI hướng dẫn, giọng bình tĩnh, ngắn gọn, không làm thay học sinh.
- **Dr. Linh:** nhà khoa học phụ trách hồ sơ nghiên cứu; xuất hiện trong briefings/mission debriefs.
- **The Glitch:** hiện tượng lỗi môi trường/robot bảo trì bị nhiễu. Đây là đối thủ môi trường, không phải kẻ thù con người. Không sử dụng bạo lực.

### Story arc 5 worlds

1. **Material Factory:** khôi phục chuỗi cân, đo, phân loại vật liệu.
2. **Pressure Canyon:** sửa các cổng áp suất và hệ thống cứu hộ dưới nước.
3. **Mechanical Frontier:** khởi động cần cẩu, cơ cấu quay và hệ thống đòn bẩy.
4. **Electric City:** xây lại mạng điện và ổn định các dòng điện/nguồn điện.
5. **Thermal Valley:** xử lý quá nhiệt, đo năng lượng, khôi phục truyền nhiệt và khe giãn nở.

### Story delivery

- Story chủ yếu qua in-engine dialogue, radio chatter, environmental storytelling, holographic logs.
- Briefing không dài quá 20–30 giây khi người chơi đã quen.
- Không buộc người chơi xem cinematic dài; có Skip/Replay.
- Mỗi world có opening establishing shot ngắn và ending reveal.
- Lời thoại phải có phụ đề, nút tắt voice và không chặn input sau khi đã đọc xong.

## 3. Camera direction — Racing + first-person

### Chase camera (mặc định lái xe)

- Góc sau xe, cao hơn mui xe, nhìn được đường phía trước.
- Camera lag/damping có kiểm soát; tăng FOV nhẹ khi Nitro.
- Camera tránh xuyên vách, tránh rung mạnh gây khó chịu.
- Xe chiếm khoảng 18–25% chiều cao màn hình; đường đi/điểm cua rõ.

### Cockpit camera

- Góc nhìn từ cảm biến/khung quan sát JetBot.
- Có reticle LiDAR nhẹ, tốc độ, cảnh báo va chạm, hướng mục tiêu.
- Không che quá nhiều màn hình bởi nội thất giả.

### First-person mission camera

- Dùng trong scanner, target challenge, lab, underwater/airlock interaction.
- Camera đặt tại sensor head của JetBot hoặc thiết bị điều khiển.
- Có crosshair/reticle với độ nhạy cấu hình được.
- Mouse look có clamp; touch look có vùng riêng.
- Khi quét: hiển thị scan cone/beam, target outline, distance, confidence indicator.
- Khi bắn Science Pulse: hit effect là vòng năng lượng/đốm sáng, không có máu, sát thương hoặc nhân vật bị bắn.

### Camera transition

- Chuyển camera trong 0.25–0.45 giây, ease-in/ease-out.
- Không snap gây chóng mặt trừ khi game mode yêu cầu reset.
- Có tùy chọn giảm camera shake, motion blur và FOV effect.

## 4. Core driving feel

- Xe có khối lượng cảm nhận được; gia tốc và phanh không tức thời.
- Steering phụ thuộc vận tốc: tốc độ cao giảm góc lái tối đa.
- Có lateral grip, drift threshold và recovery.
- Khi rời mặt đường, lực cản/tốc độ thay đổi hợp lý.
- Nitro tăng tốc có giới hạn; không được phá collision hoặc bỏ qua puzzle.
- Đường đua dùng spline có banking nhẹ tại cua, elevation changes, road shoulders, barriers và clear lane markings.
- Tất cả chướng ngại vật phải có telegraph (ánh sáng/âm thanh/chuyển động báo trước), tránh gây chết bất ngờ thiếu công bằng.

## 5. Game modes và cách dùng

| Mode | Dùng ở đâu | Loop |
|---|---|---|
| Arcade Racing | M01, M04, M15 và chuyển cảnh giữa các trạm | Tăng tốc, đánh lái, phanh, drift, tránh vật cản |
| First-person Scanner | M01, M03, M06, M10–M13 | Ngắm/quét, đọc kết quả, tương tác |
| Maze / Pathfinding | M02, M05, M06 | Chọn nhánh và đọc dấu hiệu khoa học |
| Collect & Sort | M01, M03, M07, M14 | Thu thập đúng đối tượng, phân loại |
| Physics Puzzle | M02, M07–M09, M13–M15 | Kéo/thả, bố trí, điều chỉnh tham số |
| Science Target | M06, M10, M11, M14 | Bắn pulse vào mục tiêu/công tắc khoa học |
| Flight / Drone | M06 | Bay/điều khiển drone né vật cản, quản lý lực nâng mô phỏng |
| Survival Management | M12, M14, M15 | Quản lý nhiệt/nguồn lực, chọn đường và thời điểm |
| Boss Mission | B01–B03 | Nhiệm vụ nhiều pha, kết hợp nhiều cơ chế đã học |

## 6. HUD system

### Driving HUD

- Top left: objective chính + progress.
- Top center: checkpoint/time/phase.
- Top right: Sci-Coins, energy/Nitro, collectible count.
- Bottom left: minimap/route indicator.
- Bottom center: speedometer + gear-like state nếu cần; không giả lập hộp số phức tạp khi không có.
- Bottom right: touch controls trên mobile.
- Contextual: interact prompt, damage/impact warning, drift meter, target reticle.

### FPS / Lab HUD

- Crosshair trung tâm.
- Target label và distance khi có đối tượng hợp lệ.
- Scan progress/charge.
- Objective checklist ngắn.
- Tool cooldown/energy.
- Hint button theo chính sách giáo viên.

### Readability rules

- Không hiển thị quá 3 thông tin nhấp nháy cùng lúc.
- Mỗi trạng thái cảnh báo có màu + icon + chữ, không chỉ dựa vào màu.
- Font sans-serif hỗ trợ tiếng Việt; số liệu dùng tabular numerals.
- Công thức dùng typography rõ và có đơn vị.
- HUD không được che vùng va chạm hoặc vật thể cần ngắm.

## 7. Difficulty and accessibility

### Difficulty layers

- `ROOKIE`: tutorial nhiều hơn, đường rộng, telegraph dài, tốc độ thấp.
- `PRO`: đường hẹp hơn, vài obstacle chuyển động, hạn chế gợi ý.
- `ELITE`: nhiều pha phối hợp, lối đi phân nhánh, timing chính xác.
- `SCIENCE MASTER`: thay đổi trạng thái môi trường, nhiệm vụ liên hoàn, hỗ trợ ít hơn.

Difficulty phải thay đổi:
- khoảng cách/thời điểm obstacle;
- tốc độ/chuyển động obstacle;
- độ rộng làn, thời gian phản ứng;
- số bước puzzle và độ phức tạp distractor;
- thời gian giới hạn nếu phù hợp.

Difficulty không được làm thay đổi đáp án đúng, công thức khoa học, số câu hoặc ma trận 4–3–3.

### Accessibility

- Remappable/simple controls where possible.
- Reduced motion, reduced camera shake, toggle motion blur.
- Audio volume sliders, captions, subtitle size.
- Colorblind-safe indicators and shape/icon redundancy.
- Optional auto-accelerate/steering assist for accessibility mode.
- Touch controls with large targets.
- Pause available at safe points and during assessment explanation.

## 8. Reward economy

- Sci-Coins là phần thưởng trải nghiệm và nâng cấp cosmetic/handling assist, không mua đáp án.
- Mystery Holo-Crates có thể trao thẻ trợ giúp, cosmetic, blueprint hoặc coin; không trao câu trả lời bài kiểm tra.
- Upgrade levels chỉ tác động nhẹ tới tiện ích lái: magnet radius, Nitro efficiency, scanner range. Không làm thay đổi knowledge score.
- Streak/Combo thưởng thêm coins, không nhân điểm bài thi.
- Ghost Car dùng kỷ lục lái/route time, không so sánh năng lực kiến thức bằng ghost.

## 9. Sound identity

- World theme riêng, tiết chế, có motif NOVA-8.
- Engine loop phản ứng theo tốc độ; tire/gravel/water/metal surfaces có SFX khác nhau.
- UI click, confirm, wrong answer, correct answer, reward, checkpoint, boss reveal rõ nhưng không chói.
- Spatial audio nhẹ cho máy móc, cảnh báo vật cản và mục tiêu.
- Dialog có ducking nhạc; cho phép tắt nhạc/voice/SFX riêng.

## 10. Session structure

- Một màn chuẩn: 3–7 phút gameplay + 2–4 phút assessment tùy người chơi.
- Một boss: 5–9 phút.
- Cho phép quit/resume từ checkpoint; không mất toàn bộ chiến dịch nếu refresh.
- Mọi màn có recap cuối gồm kiến thức, kỹ năng thao tác, lỗi sai và gợi ý ôn tập.
