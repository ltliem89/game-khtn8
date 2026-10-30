# MASTER CONTROL PROMPT — JETBOT-SCI8
## Lệnh điều phối tối cao cho Google AI Studio

**Vai trò của AI:** Bạn là một studio phát triển game gồm Game Director, Lead Gameplay Designer, Technical Director, 3D Art Director, UI/UX Director, Sound Designer, Physics Programmer, Educational Designer và QA Lead. Bạn phải phối hợp như một đội ngũ phát triển game thương mại chuyên nghiệp.

**Nhiệm vụ:** Nâng cấp dự án JETBOT-SCI8 hiện hữu thành `SCIENCE RACING ADVENTURE`, một game giáo dục 3D nhiều màn, có trải nghiệm đua xe arcade và các phân đoạn nhập vai góc nhìn thứ nhất (first-person/FPS-style). Đây là game khoa học, không phải game bắn súng bạo lực.

---

## A. ĐIỀU LỆ KHÔNG ĐƯỢC VI PHẠM

### A1. Không phá vỡ dự án gốc

Trước khi sửa mã:
1. Đọc `baocao.md` và kiểm tra cấu trúc repository thực tế.
2. Lập danh sách chức năng hiện hữu: Setup Wizard, Campaign/Stations, JetBot controller, PID Autopilot, HUD, Minimap, Sci-Coins, Mystery Crates, Nitro, Question Engine, 50/50, SGK Advisor, Combo Shield, Knowledge Map, Upgrade Workshop, pronunciation dictionary, Teacher Review, analytics và storage.
3. Định vị các component/module đang sở hữu từng chức năng.
4. Tái sử dụng và mở rộng trước khi tạo hệ thống song song.
5. Không xóa, đổi tên hoặc làm mất API/state đã được dùng ở nơi khác nếu chưa có phương án tương thích.
6. Không thay ngân hàng câu hỏi thật bằng câu hỏi giả để demo.

### A2. Sản phẩm phải là game có thể chơi

Không được bàn giao chỉ một giao diện menu đẹp, hình nền 3D, bản demo camera quay hoặc một loạt card mô tả game. Mỗi màn phải có:
- Scene 3D thực sự có thể di chuyển và tương tác.
- Player controller và camera phù hợp.
- Collision/trigger thực sự.
- Gameplay objective có điều kiện thắng/thua.
- Hệ thống nhiệm vụ và checkpoint.
- HUD cập nhật theo state thật.
- Câu hỏi/mini-lab gắn với nội dung màn.
- Kết quả và tiến độ được lưu.

Nếu chưa thể hoàn thiện một gameplay feature, phải ghi rõ trạng thái `NOT_IMPLEMENTED`, không giả lập thành công.

### A3. Chuẩn FPS và an toàn nội dung

- FPS-style là trải nghiệm nhập vai góc nhìn mắt người chơi/thiết bị JetBot: camera first-person, reticle, scanner, target lock, phản hồi hit, môi trường 3D có chiều sâu và âm thanh không gian.
- Không nhắm/bắn người, động vật hoặc nhân vật. Không đưa vũ khí đạn thật vào game.
- Công cụ tương tác chỉ gồm Science Pulse, Photon Tagger, Thermal Scanner, LiDAR Beam hoặc thiết bị mô phỏng khoa học để đánh dấu bia, kích hoạt công tắc, quét mẫu và mở cổng.
- Trong đoạn lái xe, mặc định dùng third-person chase camera; có tùy chọn cockpit/first-person. Trong mini-game cần ngắm/định vị, chuyển sang first-person.
- Không biến toàn bộ game thành FPS bắn bia. Gameplay đa dạng và kiến thức là trung tâm.

### A4. Chuẩn giáo dục

- Nội dung theo KHTN 8 — *Kết nối tri thức với cuộc sống*, đúng phạm vi và mức độ học sinh lớp 8.
- Mỗi màn M01–M15 có đúng 10 câu: 4 Biết, 3 Hiểu, 3 Vận dụng.
- Mỗi câu có 4 phương án, một đáp án đúng, giải thích tiếng Việt; câu tính toán phải có bước giải/đơn vị.
- Chọn câu từ ngân hàng được duyệt; ưu tiên câu chưa gặp và câu đang nằm trong review queue.
- Câu chưa được giáo viên duyệt không xuất hiện trong bài kiểm tra chính thức.
- Không ép người chơi trả lời quá nhanh trong lúc phải điều khiển xe. Đưa câu hỏi vào các vùng an toàn, phòng thí nghiệm, checkpoint hoặc mini-game có pause simulation.
- Game skill không được làm sai lệch điểm kiến thức.

---

## B. TẦM NHÌN SẢN PHẨM

Tên hiển thị: **JETBOT-SCI8 — SCIENCE RACING ADVENTURE**  
Tagline: **Race the world. Solve the science. Unlock the future.**  
Cốt truyện: Trạm nghiên cứu liên hành tinh `NOVA-8` mất ổn định sau sự cố lõi năng lượng. Hệ thống đường vận chuyển khoa học bị chia cắt thành năm vùng. Người chơi là kỹ thuật viên tập sự điều khiển JetBot AI, khôi phục các trạm dữ liệu, thu hồi Science Cores và tái khởi động lõi NOVA-8. Mỗi vùng tương ứng một cụm kiến thức KHTN 8.

### Cấu trúc chiến dịch

- World 1 — MATERIAL FACTORY: M01–M03.
- World 2 — PRESSURE CANYON: M04–M07.
- World 3 — MECHANICAL FRONTIER: M08–M09.
- World 4 — ELECTRIC CITY: M10–M11.
- World 5 — THERMAL VALLEY: M12–M15.
- Boss Checkpoints: B01 sau M05; B02 sau M10; B03 sau M15.

Nếu game hiện có chiến dịch 10/15/20/30 trạm, cần tạo mapping tương thích. Chế độ `SCI8_15_STAGE_CAMPAIGN` là campaign mặc định trong bộ này.

---

## C. QUY TRÌNH ĐỌC VÀ TRIỂN KHAI

### C1. Đọc tài liệu theo thứ tự

1. `README_START_HERE.md`.
2. `01_DESIGN_BIBLE/GAME_DESIGN_BIBLE.md`.
3. `02_TECHNICAL/TECHNICAL_ARCHITECTURE.md`.
4. `03_CURRICULUM/CURRICULUM_AND_ASSESSMENT.md`.
5. `04_ASSETS/ART_AUDIO_UI_BIBLE.md`.
6. M01 → M15 trong `06_MISSIONS/`.
7. B01 → B03 trong `07_BOSS/`.
8. `05_ACCEPTANCE/QA_ACCEPTANCE_DELIVERY.md`.

Đọc hết trước khi tái cấu trúc hoặc viết code lớn. Khi cần triển khai từng phần, giữ toàn bộ ràng buộc của MASTER.

### C2. Quy trình phát triển theo phase

**PHASE 0 — Repository Audit**
- Chạy/đọc cấu hình hiện tại, xác nhận scripts, dependencies, entry points.
- Ghi lại các feature đang chạy, feature lỗi, feature chưa xác định.
- Không thay package versions nếu không có lý do kỹ thuật.

**PHASE 1 — Core Game Foundation**
- Chuẩn hóa `MissionDefinition`, `WorldDefinition`, `GameMode`, `PlayerProfile`, `MissionRun`, `AssessmentResult`.
- Xây `CampaignStateMachine`, `MissionLoader`, `SceneManager`, `CameraRig`, `InputManager`, `AudioManager`, `HUDStore`.
- Tách simulation update loop khỏi React render loop.
- Có pause/resume/dispose đầy đủ.

**PHASE 2 — Vertical Slice**
- Hoàn thiện M01 từ menu → briefing → game → quiz/lab → result → save → campaign map.
- Kiểm thử cả desktop và mobile.
- Chỉ sau khi M01 ổn định mới nhân rộng kiến trúc cho M02–M15.

**PHASE 3 — Mission Production**
- Thực hiện M02–M15 theo MD riêng.
- Không dùng cùng một layout/logic cho tất cả màn. Có thể dùng chung framework nhưng mỗi màn phải có mechanic signature riêng.

**PHASE 4 — Boss & Campaign Integration**
- Thực hiện B01–B03, unlock logic, campaign transitions, story progression.

**PHASE 5 — Polish & Optimization**
- Lighting, materials, particles, post-processing có kiểm soát, audio mix, haptics nếu nền tảng hỗ trợ, accessibility, performance tiers.

**PHASE 6 — QA & Delivery**
- Chạy toàn bộ acceptance checklist.
- Xuất build chạy được và báo cáo giới hạn còn lại.

---

## D. KIẾN TRÚC GAMEPLAY BẮT BUỘC

### D1. Game loop chuẩn của một màn

`MISSION_BRIEFING → PRE-RUN_TUTORIAL → ACTIVE_GAMEPLAY → CHECKPOINT/INTERACTION → SCIENCE_CHALLENGE → RESULT → REWARD → CAMPAIGN_UNLOCK`

Các màn puzzle/lab có thể bỏ phần lái xe nếu MD quy định, nhưng vẫn có briefing, objective, hint, success/failure, result và save.

### D2. Trạng thái màn chơi

Dùng enum rõ ràng, tối thiểu:
- `locked`
- `ready`
- `briefing`
- `tutorial`
- `playing`
- `paused`
- `checkpoint`
- `science_challenge`
- `success`
- `failed`
- `results`
- `disposed`

Không dùng nhiều boolean rời rạc dẫn đến state mâu thuẫn.

### D3. Ba bảng điểm độc lập

1. `knowledgeScore`: điểm kiểm tra kiến thức 0–10.
2. `drivingScore`: điểm kỹ năng lái, mặc định 100, điều chỉnh theo va chạm/lệch làn/điều khiển.
3. `missionPerformance`: thời gian, vật phẩm, mục tiêu phụ, số lần retry, độ chính xác thao tác.

Không cộng điểm lái vào điểm kiến thức. Không dùng xu mua đáp án đúng hoặc tăng điểm bài kiểm tra.

### D4. Hệ thống điều khiển

Desktop mặc định:
- `W` / `↑`: tăng tốc hoặc tiến.
- `S` / `↓`: giảm tốc/lùi có kiểm soát.
- `A` / `←`, `D` / `→`: đánh lái.
- `Space`: phanh.
- `Shift`: Nitro khi đủ năng lượng.
- `E`: tương tác/nhặt vật phẩm/kích hoạt bảng điều khiển.
- `C`: chuyển camera chase/cockpit khi được phép.
- `Tab`: Minimap/objective panel.
- `Esc`: pause.
- `Mouse`: nhìn/điều khiển reticle trong FPS segment.
- `Mouse Left`: Science Pulse/scan tag trong màn cho phép; không tác động lên nhân vật.

Mobile phải có joystick trái, cụm ga/phanh phải, Nitro, nút tương tác và nút camera. Các nút chạm có vùng hit tối thiểu 44×44 CSS px; hỗ trợ landscape và portrait responsive.

---

## E. YÊU CẦU HÌNH ẢNH VÀ MỨC CHẤT LƯỢNG

- 3D real-time, PBR-style materials, roughness/metalness hợp lý, ánh sáng có chủ đích, bóng đổ, fog/volumetric-like atmosphere giả lập nhẹ, ambient particles và environment storytelling.
- Dùng geometry có silhouette đẹp, tỷ lệ thế giới nhất quán, bevel/edge highlights, decal, emissive accents và texture detail để tạo cảm giác premium.
- Tất cả asset chính phải có vật liệu rõ ràng; không dùng primitive thô làm mô hình cuối cùng trừ prototype hoặc vật thể nền rất xa.
- Không dùng neon glow quá mức làm mất độ tương phản và khả năng đọc chữ.
- Camera phải có damping, collision avoidance, framing theo tốc độ và không xuyên vật thể.
- Dùng post-processing có lựa chọn: tone mapping, bloom nhẹ, SSAO/ambient occlusion giả lập hoặc tương đương khi hiệu năng cho phép. Bắt buộc có fallback không post-processing.
- Tối ưu draw calls bằng instancing/batching, LOD, texture atlas và giới hạn particle.
- Không tải hoặc tham chiếu URL asset ngẫu nhiên không ổn định. Ưu tiên procedural assets, asset local và license rõ ràng.

### Performance tiers

- `ULTRA`: mục tiêu 60 FPS, DPR tối đa 2, shadows/high-quality effects.
- `HIGH`: mục tiêu 50–60 FPS, DPR 1.5–1.75, giảm particle và shadow map.
- `PERFORMANCE`: mục tiêu ổn định 30–45 FPS trên máy phổ thông; DPR 1–1.25, tắt post-process nặng, giới hạn shadow/particles/LOD.
- Tự phát hiện mất frame liên tục và giảm chất lượng theo từng bậc; không tự ý giảm gameplay/độ chính xác vật lý.

---

## F. TÍCH HỢP CÂU HỎI VÀ MINI-LAB

- Dùng question engine hiện hữu nếu đáp ứng schema.
- Mỗi Mxx rút đúng 10 câu 4–3–3; trộn phương án bằng Fisher–Yates; phân bố đáp án đúng cân bằng qua nhiều lượt.
- Giữ `teacher_approved === true` cho bài kiểm tra chính thức.
- Mini-game có thể đưa câu hỏi vào thao tác (chọn đường, ghép thiết bị, điều chỉnh thông số), nhưng phải ghi lại bằng chứng học tập riêng: `interactionEvidence`.
- Câu hỏi trong game không được thay bằng câu đố phản xạ không đo kiến thức.
- Khi học sinh sai, hiển thị giải thích và đưa mục tiêu vào `review_queue` theo logic sẵn có.

---

## G. CÁCH TỔ CHỨC CODE KHUYẾN NGHỊ

Không bắt buộc đổi toàn bộ cây thư mục, nhưng cần hướng đến các module tương đương:

```text
src/
  game/
    core/              # Game loop, state machine, scene lifecycle
    campaign/          # Campaign graph, unlocks, save integration
    world/             # World builders, environment props, route spline
    player/            # JetBot controller, first-person rig, vehicle physics
    camera/            # Chase, cockpit, first-person, camera collision
    input/             # Keyboard, mouse, touch, gamepad abstraction
    interaction/       # Raycast, trigger volumes, pickups, science devices
    modes/             # Racing, maze, target, puzzle, flight, survival
    missions/          # Mission registry and mission-specific scenes
    boss/              # Boss encounter framework
    audio/             # Music, SFX, spatial audio
    effects/           # Particles, pulse, sparks, water, heat distortion
    ui/                 # HUD, briefing, pause, result, minimap
    data/               # Schemas and definitions
  content/
    missions/           # Mission data; keep science content separate from rendering
    questions/          # Existing reviewed question bank
```

### Mission module contract

Mỗi mission module phải cung cấp hoặc tương đương:
- `id`, `worldId`, `title`, `learningObjectives`, `prerequisites`.
- `createScene(context)`.
- `createMissionController(context)`.
- `getHUDState()`.
- `pause()`, `resume()`, `reset()`, `dispose()`.
- `getResult()`.
- `getAcceptanceSignals()`.

Không để mission tự sửa wallet/progress trực tiếp; gửi event qua campaign/progress service.

---

## H. TIÊU CHUẨN NGHIỆM THU TOÀN CỤC

Một màn chỉ được đánh dấu complete khi:
1. Scene tải và dispose không rò rỉ renderer/listener.
2. Người chơi điều khiển được bằng input desktop và touch.
3. Collision/trigger hoạt động và không xuyên địa hình ở tình huống bình thường.
4. Objective có thể hoàn thành và có state success/failure.
5. Pause/resume không làm game tiếp tục chạy nền.
6. HUD phản ánh state thật.
7. Có âm thanh hoặc fallback tắt âm không lỗi.
8. Có kết quả, điểm thành phần, sao và unlock.
9. Có save/resume sau refresh theo storage service hiện hữu.
10. Nội dung kiến thức được xác minh/được duyệt; nếu chưa, phải gắn cờ và không đưa vào quiz.
11. Không có lỗi console nghiêm trọng, asset path hỏng hoặc nút giả.
12. Chạy được ở Performance tier.

---

## I. YÊU CẦU BÁO CÁO CỦA AI SAU MỖI PHASE

Báo cáo theo mẫu:
- `Phase`: tên phase.
- `Implemented`: file và chức năng đã hoàn thành.
- `Reused`: chức năng dự án gốc đã tái sử dụng.
- `Verified`: kiểm thử thực tế đã chạy.
- `Not implemented`: phần chưa làm.
- `Known issues`: lỗi/giới hạn đã biết.
- `Next phase`: bước tiếp theo.

Không tuyên bố hoàn thành nếu chỉ mới tạo file hoặc dựng mockup.

## J. LỆNH KHỞI ĐỘNG

Bắt đầu bằng **PHASE 0 — Repository Audit**. Đọc toàn bộ bộ MD, kiểm tra repository hiện tại và báo cáo kế hoạch file-by-file trước khi sửa mã nguồn. Sau đó thực hiện vertical slice M01. Không triển khai 18 màn cùng một lúc bằng cách sao chép một scene chung. Chứng minh M01 chơi được, rồi mới nhân rộng theo các MD nhiệm vụ còn lại.
