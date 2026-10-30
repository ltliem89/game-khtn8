# BÁO CÁO KỸ THUẬT, CẤU TRÚC & TÍNH NĂNG TOÀN DIỆN DỰ ÁN
## Đề tài: KHTN 8 – JetBot AI Vượt Trạm Đại Lượng Vật Lý (JETBOT-SCI8)
**Bộ sách chuẩn:** Khoa học tự nhiên 8 – *Kết nối tri thức với cuộc sống* (Bài 13 đến Bài 29)  
**Nền tảng công nghệ:** React 19 + TypeScript + Three.js (WebGL 3D) + Tailwind CSS v4 + Web Audio API + Web Speech API + Express/Vite Full-Stack

---

## 1. Ý NGHĨA SƯ PHẠM & MỤC TIÊU CỦA DỰ ÁN

### 1.1. Bối cảnh và vấn đề thực tiễn
Trong chương trình Khoa học tự nhiên lớp 8 (phân môn Vật lí – *Kết nối tri thức với cuộc sống*, từ Bài 13 đến Bài 29), học sinh tiếp cận hàng loạt đại lượng vật lí nền tảng và mới:
- **Kiến thức nền (Foundation):** Khối lượng ($m$), Thể tích ($V$).
- **Khối lượng riêng & Áp suất (Bài 13–17):** Khối lượng riêng ($D = m/V$), Thực hành đo khối lượng riêng, Áp suất trên một bề mặt ($p = F/S$), Áp suất chất lỏng & Áp suất khí quyển, Lực đẩy Archimedes ($F_A = d \cdot V$).
- **Tác dụng làm quay của lực & Đòn bẩy (Bài 18–19):** Moment lực, Đòn bẩy và điểm tựa $O$.
- **Điện học (Bài 24–25):** Cường độ dòng điện ($I$, đơn vị $\text{A}, \text{mA}$, Ampe kế mắc nối tiếp), Hiệu điện thế ($U$, đơn vị $\text{V}, \text{mV}, \text{kV}$, Vôn kế mắc song song).
- **Nhiệt học (Bài 26–29):** Năng lượng nhiệt và nội năng, Thực hành đo năng lượng nhiệt bằng Joulemeter ($\text{J}$), Sự truyền nhiệt (Dẫn nhiệt, Đối lưu, Bức xạ nhiệt), Sự nở vì nhiệt của các chất rắn – lỏng – khí.

Học sinh lớp 8 rất dễ nhầm lẫn giữa **Ký hiệu đại lượng** và **Ký hiệu đơn vị** (ví dụ: nhầm chữ $V$ của thể tích với đơn vị vôn $\text{V}$ của hiệu điện thế $U$; nhầm ký hiệu $I$ và đơn vị $\text{A}$; nhầm khối lượng $m$ đo bằng $\text{kg}$ với trọng lượng $P$ đo bằng $\text{N}$).

### 1.2. Giải pháp "Học qua Trải nghiệm Mô phỏng 3D Tự hành & Trò chơi hóa (Gamification)"
Dự án **JETBOT-SCI8** kết hợp:
1. **Sa bàn 3D trực quan (Three.js):** Học sinh tự thiết lập bản đồ đường đua 3D, bố trí lộ trình các trạm thí nghiệm vật lí và điều khiển xe tự hành **JetBot AI** (bằng tay hoặc chế độ AI Autopilot bám làn) vượt qua từng trạm.
2. **Đánh giá chuẩn hóa theo ma trận nhận thức:** Mỗi trạm gồm đúng **10 câu hỏi trắc nghiệm** được rút tự động theo ma trận **4 Biết – 3 Hiểu – 3 Vận dụng**, kèm hình vẽ thiết bị trực quan (SVG), giải thích chuẩn SGK và các bước giải chi tiết.
3. **Tích hợp đa phương tiện & song ngữ quốc tế:** Phát âm tiếng Anh tự động chuẩn quốc tế (Web Speech API kèm phiên âm IPA) cho toàn bộ đại lượng Vật lí, Đơn chất – Hợp chất Hóa học và thuật ngữ Sinh học KHTN 8.
4. **Cơ chế Game hiện đại:** Thu thập **Đồng Xu Lượng Tử (Sci-Coins)**, mở **Hộp Quà Tri Thức Bí Ẩn (Mystery Holo-Crates)** trên đường đua, kích hoạt **Động cơ Phản lực Nitro (`Shift`)**, **Từ trường Nam châm hút quà**, **Bản đồ Tri thức 2D tương tác**, và **Trợ quyền Công nghệ (Radar 50/50, Cố vấn SGK, Khiên bảo toàn chuỗi Combo)**.

---

## 2. KIẾN TRÚC THƯ MỤC & CẤU TRÚC MÃ NGUỒN (FILE TREE)

```text
/
├── index.html                                  # Entry HTML, cấu hình font Plus Jakarta Sans & JetBrains Mono
├── metadata.json                               # Metadata dự án AI Studio
├── package.json                                # Danh sách thư viện (React 19, Three.js, Tailwind v4, Express, @google/genai)
├── server.ts                                   # Backend Express + Vite Middleware + API gợi ý câu hỏi nháp cho Giáo viên
├── tsconfig.json                               # Cấu hình TypeScript
├── vite.config.ts                              # Cấu hình bundler Vite
├── baocao.md                                   # File báo cáo toàn diện cấu trúc & tính năng dự án
├── public/
│   ├── baocao.md                               # Bản sao báo cáo tĩnh để tải trực tiếp từ trình duyệt
│   └── assets/aistudio/                        # Bộ tài liệu đặc tả sư phạm & quy tắc nghiệm thu gốc
│       ├── 00_START_HERE_AND_FILE_ORDER_64253d65.md
│       ├── 01_MASTER_CONTROL_PROMPT_078ffa0c.md
│       ├── 02_PEDAGOGY_AND_STATION_ROUTE_4daa63b0.md
│       ├── 03_DATA_AND_ASSESSMENT_RULES_a5cdc4e2.md
│       └── 04_WORLD_PHYSICS_AND_ACCEPTANCE_2c1a9974.md
└── src/
    ├── main.tsx                                # Điểm khởi chạy React DOM
    ├── App.tsx                                 # Bộ điều phối trung tâm (State Machine, 3D World Sync, Wallet, Quiz, Modals)
    ├── index.css                               # Cấu hình Tailwind CSS v4 & định dạng số tabular-nums
    ├── types/
    │   └── game.ts                             # Toàn bộ interface TypeScript: Station, Question, Quantity, Wallet, Progress
    ├── content/
    │   ├── quantities.ts                       # 15 bản ghi Đại lượng & Chủ đề chuẩn SGK KHTN 8 (Bài 13–29)
    │   ├── stations.ts                         # Xây dựng lộ trình chiến dịch 10 / 15 / 20 / 30 trạm + Checkpoint sau mỗi 5 trạm
    │   ├── questions.ts                        # Ngân hàng >250 câu hỏi chuẩn hóa + thuật toán trộn ngẫu nhiên đáp án A/B/C/D
    │   └── chemistryElementsCompounds.ts       # Từ điển phát âm tiếng Anh + IPA cho Hóa học (Đơn chất/Hợp chất), Vật lí, Sinh học
    ├── storage/
    │   └── progressStorage.ts                  # Lưu trữ và khôi phục an toàn (Safe LocalStorage) cho tiến độ, ví Xu, ngân hàng câu hỏi
    ├── game/
    │   ├── audio/
    │   │   └── soundEngine.ts                  # Bộ tổng hợp âm thanh Web Audio API (BGM 3 giai điệu, hiệu ứng Xu/Quà/Nitro) + TTS
    │   ├── input/
    │   │   └── inputManager.ts                 # Quản lý phím W/A/S/D, Phím mũi tên, Space (Phanh), Shift (Nitro), R, Esc & cảm ứng
    │   ├── vehicle/
    │   │   └── vehiclePhysics.ts               # Động lực học xe JetBot, AI PID Autopilot bám làn, kiểm tra lệch làn 700ms, Nitro
    │   └── track/
    │       ├── proceduralModels.ts             # Mô hình 3D thủ tục: Xe JetBot 10 bộ phận (LiDAR xoay, đèn, bánh lái) & Cổng trạm 3D
    │       └── world3D.ts                      # Engine Three.js: Đường đua Spline Catmull-Rom, InstancedMesh, Xu 3D, Hộp quà, Đệm tăng tốc
    └── ui/
        ├── setup/
        │   └── SetupWizardOverlay.tsx          # Giao diện Menu chính & Quy trình 3 bước thiết lập (Bản đồ -> Trạm -> JetBot AI)
        ├── hud/
        │   └── DrivingHudOverlay.tsx           # HUD lái xe: Tốc độ, Thanh Nitro, Bản đồ thu nhỏ (Minimap), Xu/Quà, Nút điều khiển
        ├── quiz/
        │   ├── PhysicsDiagramSvg.tsx           # Hình minh họa thiết bị thí nghiệm SVG cho từng đại lượng (Cân, Bình chia độ, Ampe kế...)
        │   ├── StationQuizModal.tsx            # Giao diện làm bài 10 câu: Thẻ Briefing SGK, Trợ quyền 50/50 & Cố vấn, Combo Streak
        │   └── StationResultModal.tsx          # Màn hình tổng kết trạm: Điểm 0–10, Sao (0–3★), Mục tiêu yếu cần ôn, Mở khóa trạm kế
        ├── knowledge/
        │   └── KnowledgeMapModal.tsx           # Bản đồ Tri thức KHTN 8 tương tác (Đồ thị 2D) & Xưởng Nâng cấp Công nghệ JetBot
        ├── chemistry/
        │   └── ElementsCompoundsModal.tsx      # Từ điển phát âm tiếng Anh chuẩn quốc tế (Đơn chất, Hợp chất, Vật lí SI, Sinh học)
        └── teacher-review/
            └── TeacherReviewModal.tsx          # Bảng Quản trị Giáo viên: Duyệt câu hỏi, Tạo câu nháp, 5 Chỉ số thống kê & 26 tiêu chí nghiệm thu
```

---

## 3. CHI TIẾT CÁC TÍNH NĂNG CỤ THỂ CỦA TOÀN DỰ ÁN

### 3.1. Quy trình Thiết lập 3 Bước (3-Step Setup Pipeline)
Học sinh không bị đưa vào màn hình trống mà đi qua quy trình kiến tạo trực quan trên nền 3D thời gian thực:
1. **Bước 01 – Thiết lập Bản đồ 3D (`map_setup`):**
   - Chọn độ dài chiến dịch: **10, 15, 20 hoặc 30 trạm học tập** (tự động chèn 1 trạm **Checkpoint Tổng hợp** sau mỗi 5 trạm học).
   - Tùy chỉnh độ rộng làn đường (`laneWidthMultiplier`), độ uốn lượn khúc cua (`curveScale`), mật độ chướng ngại vật an toàn (`low` / `standard` / `high`), và bầu không khí ánh sáng (`daylight_lab`, `golden_campus`, `twilight_research`).
2. **Bước 02 – Tạo Trạm & Lộ trình (`station_setup`):**
   - Quan sát danh sách toàn bộ các trạm trên tuyến đường, phân loại rõ: *Kiến thức nền (m, V)*, *Trạm chính*, *Nhiệm vụ vận dụng*, và *Checkpoint tổng hợp*.
3. **Bước 03 – Cấu hình JetBot AI (`jetbot_setup`):**
   - Tùy chỉnh màu sơn khung gầm xe JetBot, tốc độ tối đa (`maxSpeedSetting`), độ nhạy đánh lái (`turnSensitivitySetting`), bật/tắt nón cảm biến LiDAR 3D, và chọn chế độ lái (**Lái thủ công W/A/S/D** hoặc **AI Autopilot tự hành bám làn**).

### 3.2. Thế giới 3D, Vật lý Lái xe & Vật phẩm Trên Đường Đua (`world3D.ts` & `vehiclePhysics.ts`)
- **Đường đua Spline 3D & Môi trường InstancedMesh:**
  - Đường đua được nội suy mượt bằng đường cong `THREE.CatmullRomCurve3`, có vạch kẻ làn, lưới tọa độ phòng thí nghiệm và hàng trăm cây xanh/cọc tiêu hai bên đường tối ưu hiệu năng bằng `THREE.InstancedMesh`.
  - Tự động phát hiện WebGL phần mềm (SwiftShader/llvmpipe) để điều chỉnh đổ bóng và độ phân giải mượt mà trên mọi máy tính trường học.
- **Động lực học Xe JetBot 10 bộ phận:**
  - Xe có bánh trước xoay góc lái thực tế, 4 bánh lăn theo vận tốc, tháp LiDAR quay quét 360°, nón cảm biến quang học phía trước.
  - **AI Autopilot (PID Controller):** Khi bật chế độ Tự hành, JetBot tự động tính toán góc hướng tới điểm nhìn trước (`lookaheadPoint`) trên đường cong, tự động né chướng ngại vật và giảm tốc êm ái khi vào trạm.
- **Tích lũy Quà, Đồng Xu Lượng Tử & Đệm Tăng Tốc trên đường đua:**
  - **Đồng Xu Lượng Tử (`Sci-Coins`):** Xoay tròn phát sáng dọc theo đường cong giữa các trạm. Khi xe chạy qua (hoặc hút bằng Từ trường Nam châm) sẽ cộng **+15 Xu** và nạp **+10% năng lượng Nitro**, kèm hiệu ứng sóng xung kích 3D (`PickupBurstEffect`).
  - **Hộp Quà Tri Thức Bí Ẩn (`Mystery Gift Boxes`):** Khối hộp 3D màu tím có vòng hào quang xoay lơ lửng trên đường. Khi nhặt nhận ngay **+40 Xu** và mở ngẫu nhiên 1 trong 4 phần thưởng:
    1. Mở khóa tự động **1 Thẻ Tri Thức KHTN 8** mới trong Bản đồ Tri thức.
    2. Nhận **+1 Thẻ Radar Loại Trừ 50/50**.
    3. Nhận **+1 Thẻ Cố Vấn Công Thức SGK**.
    4. Nhận **+1 Khiên Bảo Toàn Chuỗi Combo**.
  - **Đệm Tăng Tốc Năng Lượng (`Turbo Boost Pads`) & Động cơ Nitro (`Phím Shift`):**
    - Khi đi qua đệm tăng tốc màu xanh cyan dưới mặt đường hoặc giữ phím `Shift` (hoặc nút **NITRO** trên màn hình), xe tăng tốc bứt phá (+48% tốc độ tối đa), đồng thời góc nhìn Camera 3D tự động mở rộng động (Dynamic Speed FOV từ $56^\circ$ lên $65^\circ$).
- **Quy tắc Điểm kỹ năng lái độc lập (`driving_score`):**
  - Điểm lái khởi đầu là `100`, hoàn toàn **tách biệt** với điểm kiến thức (0–10) và số Sao học tập.
  - Khi xe chớm ra ngoài mép làn đường, hệ thống cho **700 ms dung sai (grace period)** kèm cảnh báo. Quá 700 ms mới trừ `-1 điểm lái/giây`. Đi nhầm vào cổng trạm chưa mở khóa phía trước sẽ trừ `-15 điểm lái` và đưa xe về Checkpoint gần nhất.

### 3.3. Hệ thống Câu hỏi Trắc nghiệm, Trộn Đáp án Ngẫu nhiên & Trợ quyền Công nghệ (`questions.ts` & `StationQuizModal.tsx`)
- **Ngân hàng câu hỏi chuẩn SGK KHTN 8 (>250 câu):**
  - Bao phủ toàn bộ 14 đại lượng/chủ đề và 3 trạm Checkpoint tổng hợp.
  - Mỗi câu hỏi có đầy đủ: `level` (`know` / `understand` / `apply`), `skill`, `context` (tình huống thực tiễn), `prompt`, 4 lựa chọn `A, B, C, D`, `explanation_vi` (giải thích chuẩn SGK), `expected_unit`, và `solution_steps` (3 bước giải chi tiết cho câu Vận dụng).
- **Thuật toán Cân bằng & Trộn ngẫu nhiên vị trí đáp án đúng (`A, B, C, D`):**
  - **Tầng 1 (Ngân hàng tĩnh):** Khi khởi tạo `INITIAL_QUESTIONS_BANK`, thuật toán băm định sẵn phân bổ đều vị trí đáp án đúng vào cả 4 chữ cái `A, B, C, D` (~25% mỗi chữ cái) thay vì tập trung ở đáp án A.
  - **Tầng 2 (Mỗi lần vào trạm hoặc làm lại):** Hàm `selectQuestionsForStationAttempt` chọn đúng **4 câu Biết + 3 câu Hiểu + 3 câu Vận dụng** (ưu tiên các câu chưa gặp ở lần thử trước và các câu trong hàng đợi ôn tập `review_queue`), sau đó tạo một bộ bài cân bằng 10 vị trí (`A, B, C, D`) trộn bằng thuật toán **Fisher-Yates** và hoán vị ngẫu nhiên cả đáp án đúng lẫn 3 phương án nhiễu thông qua `shuffleQuestionOptions`.
- **Trợ quyền Công nghệ trong khi làm bài:**
  - **Chuỗi Combo (`Combo Streak 🔥`):** Trả lời đúng liên tiếp từ 2 câu trở lên sẽ kích hoạt hiệu ứng Combo và thưởng thêm Xu Công Nghệ (`+10` đến `+30 Xu/câu` tùy cấp độ Bộ Nhân Thưởng).
  - **Radar Loại Trừ 50/50:** Dùng 1 thẻ (hoặc 35 Xu) để gạch bỏ ngay 2 phương án sai.
  - **Cố Vấn Công Thức SGK:** Dùng 1 thẻ (hoặc 25 Xu) để mở gợi ý công thức & đơn vị chuẩn ngay trước khi chốt đáp án.
  - **Khiên Bảo Toàn Chuỗi Combo:** Tự động kích hoạt khi học sinh chọn sai để giữ nguyên chuỗi Combo hiện tại.

### 3.4. Bản Đồ Tri Thức KHTN 8 Tương Tác & Xưởng Công Nghệ (`KnowledgeMapModal.tsx`)
- **Tab 1 – Bản Đồ Tri Thức 2D (Interactive Knowledge Graph):**
  - Biểu diễn trực quan mạng lưới 15 nút tri thức chia thành 5 cụm màu: *Kiến thức nền (m, V)* → *Cơ học & Áp suất (Bài 13–19)* → *Điện học (Bài 24–25)* → *Nhiệt học (Bài 26–29)* → *Checkpoint Tổng hợp*.
  - Hiển thị các mũi tên liên kết kiến thức (ví dụ: từ $m$ và $V$ dẫn tới $D = m/V$, từ $D$ dẫn tới Áp suất chất lỏng và Lực đẩy Archimedes $F_A = d \cdot V$).
  - Khi bấm vào một nút đại lượng: Xem ngay trạng thái sở hữu Thẻ Tri Thức, tổng số Sao đạt được, tỷ lệ trả lời đúng thực tế (%), công thức chuẩn SGK, giải thích từng biến số, các sai lầm thường gặp, nút đọc phát âm tiếng Anh chuẩn SI và nút **"Đưa xe tới Trạm"** để dịch chuyển tức thời tới trạm tương ứng.
- **Tab 2 – Xưởng Nâng Cấp Phần Cứng JetBot & Đổi Vật Phẩm:**
  - Dùng Xu tích lũy trên đường đua để nâng cấp vĩnh viễn 3 hệ thống của xe JetBot (từ Cấp 1 lên Cấp 3):
    1. **Từ Trường Hút Quà & Xu (`magnetLevel`):** Tăng bán kính tự động hút Xu và Hộp quà từ $2.8\text{ m}$ lên $6.0\text{ m}$.
    2. **Động Cơ Phản Lực Nitro (`nitroLevel`):** Tăng hiệu suất bứt tốc và nạp năng lượng.
    3. **Bộ Nhân Thưởng Chuỗi Học Tập (`scannerLevel`):** Tăng lượng Xu thưởng mỗi khi trả lời đúng câu hỏi tại trạm.

### 3.5. Từ điển Phát âm Tiếng Anh Tự động Hóa – Lý – Sinh (`ElementsCompoundsModal.tsx`)
- Tích hợp công nghệ tổng hợp giọng nói **Web Speech API (`en-US` / `en-GB`)** kết hợp chuông báo âm thanh nhẹ nhàng.
- Bao gồm các bảng tra cứu tương tác 1-click:
  - **Bảng Nguyên tố & Đơn chất Hóa học KHTN 8** (Hydrogen, Oxygen, Nitrogen, Carbon, Iron, Copper, Aluminium, Silver, Sodium, Calcium...).
  - **Bảng Hợp chất & Phân tử thông dụng** (Water $\text{H}_2\text{O}$, Carbon dioxide $\text{CO}_2$, Sodium chloride $\text{NaCl}$, Sulfuric acid $\text{H}_2\text{SO}_4$, Calcium carbonate $\text{CaCO}_3$...).
  - **Thuật ngữ Đại lượng & Đơn vị Vật lí SI** (Mass, Volume, Density, Pressure, Fluid Pressure, Archimedes Buoyancy, Moment of Force, Lever, Electric Current, Voltage, Thermal Energy...).
  - **Thuật ngữ Sinh học & Cơ thể người KHTN 8**.

### 3.6. Bảng Quản trị Giáo viên, Kiểm duyệt & Thống kê Học tập (`TeacherReviewModal.tsx`)
- **Quản lý & Kiểm duyệt Ngân hàng Câu hỏi:**
  - Lọc câu hỏi theo Đại lượng, Mức độ nhận thức (`Biết` / `Hiểu` / `Vận dụng`), và Trạng thái duyệt (`Đã duyệt` / `Chờ duyệt`).
  - Quy tắc an toàn tuyệt đối: Mọi câu hỏi có `teacher_approved === false` (ví dụ câu hỏi dùng công thức mở rộng ngoài SGK hoặc câu hỏi nháp mới tạo) **không bao giờ** xuất hiện trong bài thi của học sinh cho tới khi giáo viên bấm Duyệt.
- **Tạo Bản nháp Câu hỏi mới (6 bước kiểm tra kỹ thuật tự động):**
  - Giáo viên có thể nhập câu hỏi mới, hệ thống tự động kiểm tra 6 tiêu chuẩn (đại lượng hợp lệ, đủ 4 phương án không trùng lặp, có giải thích SGK...) trước khi lưu vào bộ nhớ.
- **5 Chỉ số Phân tích Học tập (Teacher Analytics):**
  1. Tỷ lệ trả lời đúng ngay lần đầu theo từng đại lượng (`first_try_by_quantity`).
  2. Tỷ lệ đúng theo 3 mức độ nhận thức Biết / Hiểu / Vận dụng (`first_try_by_level`).
  3. Thống kê các đơn vị & ký hiệu học sinh hay nhầm lẫn nhất (`confused_units_count`).
  4. Biểu đồ tiến bộ điểm số sau các lần làm lại (`retry_improvements`).
  5. Tổng thời gian học tập và quy đổi **Sao chuyên cần** (`total_quiz_time_seconds`).

---

## 4. GỢI Ý CÁC HƯỚNG MỞ RỘNG TIẾP THEO (DÀNH CHO AI / LẬP TRÌNH VIÊN TIẾP THEO)

Nếu bạn đưa file `baocao.md` này cho một AI khác để viết lệnh nâng cấp tiếp theo, có thể yêu cầu các tính năng mở rộng sau:
1. **Chế độ Thí nghiệm Tương tác Ảo tại Trạm (Interactive Mini-Lab Simulation):** Trước khi làm 10 câu trắc nghiệm, cho phép học sinh kéo-thả quả nặng lên cân, thả vật vào bình chia độ để đọc mực nước dâng $V_2 - V_1$, hoặc kéo con chạy biến trở để quan sát kim Ampe kế/Vôn kế thay đổi trực tiếp.
2. **Chế độ Đua Ghost Car / Bảng xếp hạng Lớp học (Leaderboard & Ghost Replay):** Lưu lại quỹ đạo chạy tốt nhất của học sinh thành một xe bóng mờ (Ghost JetBot) để các lượt chơi sau đua tốc độ và so tài điểm kiến thức.
3. **Xuất Phiếu Điểm PDF / CSV cho Giáo viên:** Cho phép xuất toàn bộ lịch sử làm bài (`attempt_history`) và thống kê lỗi sai của học sinh ra file báo cáo Excel/CSV hoặc phiếu chứng nhận hoàn thành chiến dịch KHTN 8.
