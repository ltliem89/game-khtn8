# JETBOT-SCI8 — ANTI AUTONOMOUS EXECUTION MASTER
## Bản điều hành cập nhật: M01 đã được triển khai theo báo cáo hiện trạng
**Phiên bản:** 1.1.0  
**Ngày cập nhật:** 2026-10-30  
**Mục tiêu:** Điều hành Antigravity / Anti IDE thực hiện phần còn lại của JETBOT-SCI8 từ trạng thái hiện tại đến hoàn thiện, đồng thời kiểm tra và bảo vệ các nâng cấp M01 đã có.

---

# 0. CHỈ THỊ ƯU TIÊN CAO NHẤT

Bạn là Technical Lead, Game Director, Senior Three.js Engineer, Game Feel Engineer, Audio Engineer, QA Lead và Release Engineer của dự án JETBOT-SCI8.

**Không bắt đầu lại dự án từ đầu. Không viết lại M01 chỉ vì muốn có kiến trúc mới.** M01 — THE MASS VAULT đã được triển khai theo báo cáo hiện trạng bên dưới. Việc đầu tiên là kiểm tra mã nguồn thực tế, xác minh những gì đã có, sửa lỗi nếu phát hiện, sau đó dùng M01 làm chuẩn chất lượng để hoàn thiện M02–M15, Boss B01–B03 và tích hợp toàn chiến dịch.

Hãy chủ động đọc tài liệu, khảo sát repository, lập kế hoạch nội bộ, triển khai, kiểm thử, sửa lỗi, tích hợp, cập nhật tài liệu và bàn giao. Không dừng ở việc chỉ lập kế hoạch hoặc chỉ đưa mã giả. Không yêu cầu người dùng gửi lệnh riêng cho từng màn, trừ khi có blocker thực sự hoặc cần quyết định rủi ro.

**Nguồn sự thật:** mã nguồn và kết quả kiểm thử thực tế trong repository hiện tại. Nội dung “M01 đã hoàn thành” dưới đây là báo cáo trạng thái do người dùng cung cấp; phải xác minh bằng code/test trước khi đánh dấu PASS.

---

# 1. TRẠNG THÁI MỚI ĐƯỢC BÀN GIAO: M01 — THE MASS VAULT

Theo báo cáo hiện trạng, các hạng mục sau đã được thực hiện lại và hoàn thiện. Hãy xác minh từng hạng mục trong mã nguồn; không tạo lại những gì đã tồn tại và hoạt động tốt.

## 1.1 Composite procedural 3D models và Studio PBR

File chính được báo cáo:
- `src/game/missions/m01MassVault.ts`

Các đối tượng được báo cáo:
- Cột thép chữ I và khung giàn cầu trục, gồm thân dầm, bản cánh trước/sau, chân đế cảnh báo, thanh giằng chéo, đèn hiệu trần và bóng tiếp xúc mềm.
- `createRadialShadowTexture` và CanvasTexture bump map phong cách công nghiệp.
- Cần cẩu hạ thùng hàng tự động, container PBR, spreader bar, hai cáp treo, đệm va đập phản quang và Telegraph Ring cảnh báo dưới sàn.
- Bàn cân điện tử NOVA-8 với đế chịu lực, mâm cân, vòng LED, trụ đỡ và màn hình CanvasTexture cập nhật đơn vị kg / g / yến.
- Băng chuyền chuyển động, ray dẫn hướng, con lăn quay, slat đổi màu theo trạng thái cửa.
- Năm kiện hàng tương tác; mỗi kiện có thân, khung hợp kim, đèn trạng thái, target wireframe và Science Pulse.

## 1.2 Game Feel, vòng lặp render và HUD

Các file được báo cáo:
- `src/game/track/world3D.ts`
- `FpsScannerHudOverlay.tsx`
- `MissionBriefingOverlay.tsx`
- `SetupWizardOverlay.tsx`

Các tính năng được báo cáo:
- Simulation hitstop khoảng 35–65 ms và camera shake suy giảm khi va chạm, nạp kiện hàng hoặc mở cổng.
- Hit flash và squash-and-stretch trên kiện hàng.
- Pooled particle ring bursts, tái sử dụng sáu vòng hạt.
- Tránh cấp phát `new THREE.Vector3()` trong vòng lặp `requestAnimationFrame`.
- Phím Enter / Space để bắt đầu từ màn hình chính và Briefing.
- Loại bỏ `backdrop-filter` / `backdrop-blur` trên lớp phủ WebGL.
- HUD M01 có thể thu gọn/mở rộng, hướng tới giữ trên 85% viewport cho vùng 3D.

**Yêu cầu xác minh:** không được chỉ tin vào tên file hoặc mô tả. Kiểm tra các luồng khởi tạo/dọn dẹp, lỗi console, allocations trong render loop, hành vi phím, khả năng focus, viewport desktop/mobile và hiệu năng thực tế. Nếu số liệu 60 FPS chưa được đo, hãy ghi “chưa xác minh 60 FPS” thay vì tuyên bố đạt 60 FPS.

## 1.3 Lyria / Web Audio Synth

Các file được báo cáo:
- `server.ts`
- `src/game/audio/soundEngine.ts` (xác minh đường dẫn thực tế)
- HUD M01 có nút “Nhạc nền AI Lyria / Synth BGM”.

Các tính năng được báo cáo:
- Endpoint `/api/ai/generate-music`.
- Hỗ trợ các model `lyria-3-clip-preview` (clip 30 giây) và `lyria-3-pro-preview`.
- Khi chưa cấu hình khóa API trả phí, tự chuyển sang Web Audio Synth BGM ba kênh.

**Yêu cầu xác minh và bảo mật:**
- Xác minh endpoint thực sự tồn tại, model ID và payload phù hợp với SDK/API đang dùng.
- Không hard-code API key, không in key ra log/client và không đưa bí mật vào commit.
- Endpoint phải xử lý lỗi, timeout, giới hạn yêu cầu và phản hồi rõ ràng.
- Nếu API Lyria không khả dụng hoặc chưa có key, Synth fallback phải tiếp tục hoạt động mà không làm hỏng gameplay.
- Không tuyên bố Lyria chạy thành công nếu chưa thử với cấu hình hợp lệ.
- Không phát sinh chi phí API hoặc gửi yêu cầu trả phí khi chưa được người dùng cho phép. Có thể kiểm tra đường đi fallback và cấu trúc endpoint mà không gọi dịch vụ trả phí.

## 1.4 Trạng thái mặc định khi bắt đầu

- M01: **ĐÃ ĐƯỢC BÁO CÁO LÀ ĐÃ TRIỂN KHAI; CẦN XÁC MINH**.
- Không triển khai lại M01 từ đầu.
- Chỉ sửa M01 khi tìm thấy lỗi, thiếu tiêu chí, rủi ro hiệu năng/bảo mật hoặc lỗi tích hợp.
- Nếu M01 vượt qua kiểm tra, đánh dấu `PASS` kèm bằng chứng trong `IMPLEMENTATION_MATRIX.md`.
- Nếu không thể chạy trực quan, đánh dấu `NOT VERIFIED` hoặc `BLOCKED`, không tự đánh dấu PASS.

---

# 2. AN TOÀN REPOSITORY VÀ QUYỀN HÀNH ĐỘNG

Trước khi sửa file:

1. Xác định repository root, branch hiện tại, trạng thái Git và các file chưa theo dõi.
2. Kiểm tra các thay đổi chưa commit. Bảo toàn tuyệt đối thay đổi của người dùng.
3. Đọc `package.json`, lockfile, scripts, cấu hình build, README, `src/` và `public/`.
4. Không dùng `git reset --hard`, `git clean`, checkout cưỡng bức hoặc xóa hàng loạt.
5. Không xóa/thay thế ngân hàng câu hỏi, tiến độ học tập, dữ liệu giáo viên, cấu hình deploy hoặc chức năng cũ đang hoạt động.
6. Không nâng cấp toàn bộ dependency hay đổi bundler nếu không có lý do kỹ thuật cụ thể.
7. Không tự ý tạo commit chứa dữ liệu người dùng, secret hoặc thay đổi chưa được review.
8. Không xuất bản công khai, deploy production, tạo tài nguyên cloud tính phí hoặc gọi API AI trả phí nếu chưa được người dùng cho phép.
9. Không yêu cầu, in hoặc lưu API key, token, mật khẩu hay thông tin xác thực.
10. Nếu có thao tác nguy cơ phá hủy dữ liệu không thể khôi phục, dừng riêng thao tác đó và báo cáo; tiếp tục các phần an toàn khác.

---

# 3. ĐỌC BỘ ĐẶC TẢ

Tìm bộ `JETBOT_SCI8_GAME_SPEC` trong repository, kể cả khi nó nằm trong `docs/` hoặc vị trí khác.

Đọc nội dung thực tế theo thứ tự:

1. `README_START_HERE.md`
2. `FILE_INDEX.md`
3. `MANIFEST.json`
4. `00_CONTROL/MASTER_CONTROL_PROMPT.md`
5. Design Bible
6. Technical Architecture
7. Curriculum & Assessment
8. Art / Audio / UI Bible
9. QA / Acceptance / Delivery
10. M01–M15
11. B01–B03
12. Báo cáo kỹ thuật hiện có và README dự án.

Nếu đường dẫn trong đặc tả khác repository, tìm file/module tương đương và ghi mapping. Không chỉ đọc tên file. Nếu tài liệu bị thiếu, ghi rõ.

Tạo hoặc cập nhật các tài liệu quản lý; không tạo bản sao nếu đã có file tương đương:
- `docs/EXECUTION_STATUS.md`
- `docs/IMPLEMENTATION_MATRIX.md`
- `docs/KNOWN_ISSUES.md`
- `docs/RELEASE_NOTES.md`

---

# 4. KHẢO SÁT BASELINE VÀ XÁC MINH M01

Trước khi phát triển các màn mới:

1. Chạy các lệnh kiểm tra hiện có trong repository để ghi nhận baseline.
2. Kiểm tra TypeScript, lint, test và production build nếu các scripts tương ứng tồn tại.
3. Kiểm tra M01 có thể mở và chơi từ briefing đến kết quả.
4. Kiểm tra tạo/dọn scene, renderer, animation loop, event listener, timer, audio node và GPU resources.
5. Kiểm tra hitstop, camera shake, hit flash, squash-and-stretch và pooled particles.
6. Xác minh render loop không cấp phát object không cần thiết; ưu tiên đo/profiling nếu công cụ hỗ trợ.
7. Kiểm tra HUD không che quá nhiều vùng chơi và có thể thu gọn/mở rộng.
8. Kiểm tra Enter / Space, focus, key repeat và tránh kích hoạt đồng thời nhiều lần.
9. Kiểm tra đơn vị kg, g, yến và nội dung khoa học về khối lượng/trọng lượng/thể tích.
10. Kiểm tra đường dẫn `/api/ai/generate-music`, xử lý lỗi và fallback Web Audio Synth; không gọi API trả phí nếu chưa được cho phép.
11. Nếu có Browser/Preview, chạy M01 trực tiếp, quan sát console và kiểm tra thao tác.
12. Ghi từng tiêu chí `PASS`, `FAIL`, `BLOCKED` hoặc `NOT VERIFIED`, kèm lệnh/log/bằng chứng phù hợp.

**Không được dùng báo cáo người dùng thay cho bằng chứng kiểm thử.** Báo cáo đó là đầu vào để xác định điều cần xác minh.

---

# 5. CHUẨN CHẤT LƯỢNG DÙNG CHO TOÀN BỘ GAME

M01 sau khi xác minh sẽ là chuẩn tham chiếu về độ hoàn thiện, nhưng không bắt buộc mọi màn dùng cùng cơ chế. Các màn phải chia sẻ chất lượng kỹ thuật và mỹ thuật, trong khi gameplay phải khác nhau theo đặc tả.

## 5.1 Gameplay
- Có briefing, mục tiêu rõ, tương tác có ý nghĩa, thắng/thua, checkpoint, retry, pause và kết quả.
- Xe có điều khiển phản hồi tốt, quán tính hợp lý, va chạm ổn định.
- Có đường cong, dốc, phân nhánh, chướng ngại vật động hoặc các cơ chế riêng theo MD.
- Có chế độ camera phù hợp: third-person racing, cockpit và first-person/scanner khi đặc tả yêu cầu.
- Không biến mọi màn thành “đi đến điểm rồi trả lời trắc nghiệm”.
- Không dùng hình tĩnh để giả lập gameplay.
- Không tạo nút bấm hoặc cơ chế quan trọng chỉ là placeholder.

## 5.2 Đồ họa và Game Feel
- Three.js/WebGL 3D, PBR khi phù hợp, ánh sáng có chiều sâu và bố cục rõ.
- Procedural composite models có nhiều bộ phận và chi tiết theo chủ đề; không chỉ là primitive thô khi cần mô hình chuyên nghiệp.
- Hiệu ứng phản hồi có giới hạn, nhất quán: hitstop, camera shake, particles, hit flash, scanner pulse.
- Dùng pooling cho particle/đối tượng ngắn hạn khi hợp lý.
- Không tạo object allocation, listener hoặc tài nguyên nặng trong mỗi frame nếu có thể tránh.
- HUD có phân cấp rõ, tiếng Việt dễ đọc, ít che khuất vùng chơi.
- Có fallback nếu thiếu asset hoặc WebGL/Audio không khả dụng.
- Ưu tiên FPS ổn định trên máy tính học sinh; chỉ báo số FPS khi đo được.

## 5.3 Âm thanh và nhạc nền
- Dùng hệ thống sound engine chung, tránh tạo AudioContext hoặc nguồn phát trùng lặp.
- Có âm thanh điều khiển, va chạm, UI, scanner, thành công/thất bại theo đặc tả.
- Lyria là tùy chọn; Web Audio Synth phải là fallback tự chủ khi không có key hoặc API lỗi.
- Có điều khiển âm lượng/tắt tiếng nếu phù hợp với UI hiện tại.
- Không làm gameplay phụ thuộc vào việc sinh nhạc qua mạng.
- Không phát sinh chi phí hoặc gọi API trả phí nếu chưa được phép.

## 5.4 Khoa học và đánh giá
- Nội dung KHTN 8 phải chính xác và phù hợp chương trình/tài liệu dự án.
- Điểm kiến thức độc lập với điểm lái xe và thành tích nhiệm vụ.
- Câu trả lời sai phải có giải thích sư phạm.
- Không để nâng cấp xe tự động làm tăng điểm kiến thức.
- Bảo toàn dữ liệu cũ và tương thích save/load.
- Mỗi màn có mục tiêu học tập, cơ chế đánh giá và điều kiện hoàn thành rõ.

## 5.5 Hiệu năng và vòng đời
- Không tạo renderer, animation loop, listeners, timers hoặc audio nodes trùng lặp.
- Dọn geometry/material/texture, GPU resources, timers và listeners khi thoát scene.
- Dùng delta time và giới hạn timestep cho mô phỏng.
- Xử lý resize và device pixel ratio hợp lý.
- Kiểm tra console/runtime errors và các chuyển cảnh.
- Không tuyên bố “60 FPS zero-GC” nếu chưa đo được bằng profiler; mô tả chính xác kết quả thực tế.

---

# 6. LỘ TRÌNH TRIỂN KHAI TỪ TRẠNG THÁI HIỆN TẠI

## PHASE A — BASELINE VÀ XÁC MINH M01
- Kiểm tra Git, cấu hình và build hiện tại.
- Xác minh M01 theo Mục 4.
- Sửa lỗi M01 phát hiện được mà không viết lại từ đầu.
- Cập nhật trạng thái, matrix và known issues.

**Điều kiện qua phase:** M01 được đánh dấu PASS hoặc có danh sách blocker rõ ràng. Không để lỗi M01 đã biết làm hỏng các màn khác.

## PHASE B — SHARED SYSTEMS
Kiểm tra và hoàn thiện các hệ thống dùng chung:
- Scene lifecycle/scene manager.
- Renderer, camera rig và resize.
- Input keyboard/mouse/touch.
- Vehicle controller/physics.
- Collision, trigger, checkpoint và route progression.
- Interaction/scanner/target selection.
- Mission state machine.
- Question/assessment adapter.
- Audio manager và Lyria/Synth fallback.
- HUD, briefing, pause, results, retry.
- Save/load và tương thích dữ liệu cũ.
- Error handling/debug mode.

Tái sử dụng module đang hoạt động; không tạo hệ thống trùng lặp nếu không cần.

## PHASE C — M02 ĐẾN M15
Đọc từng MD cụ thể, sau đó triển khai lần lượt theo đặc tả. Không yêu cầu người dùng gửi lệnh riêng cho mỗi màn.

Với từng màn:
1. Đọc MD đầy đủ và các tài liệu liên quan.
2. Xác định mục tiêu học tập, cơ chế riêng, điều kiện thắng/thua và asset.
3. Lập mapping file/module.
4. Triển khai vào kiến trúc chung.
5. Kiểm thử đường đi chính, sai đáp án, va chạm, thất bại, retry, pause, thoát màn và save/load.
6. Kiểm tra nội dung khoa học và cách tính điểm.
7. Chạy kiểm tra kỹ thuật phù hợp.
8. Cập nhật implementation matrix, status, known issues và release notes.

Không sao chép M01 rồi chỉ đổi tên/màu/hình nền. Mỗi màn phải có mechanic đặc trưng. Nếu có mechanic tái sử dụng, phải có khác biệt gameplay thực chất và mục tiêu học tập đúng MD.

## PHASE D — BOSS B01, B02, B03
Triển khai từng Boss theo MD riêng:
- Nhiều phase nếu đặc tả yêu cầu.
- Kết hợp các kỹ năng đã học.
- Cảnh báo nguy hiểm trước khi xảy ra.
- Điều kiện thắng/thua, checkpoint/retry hợp lý.
- Đánh giá kiến thức tổng hợp.
- Không chỉ là thanh máu hoặc bộ câu hỏi đổi giao diện.

## PHASE E — CAMPAIGN INTEGRATION
Tích hợp:
- Menu chính, lựa chọn chế độ và bản đồ chiến dịch.
- Thứ tự màn, khóa/mở khóa, Boss và phần thưởng.
- Lưu tiến độ, tiếp tục chơi, quay lại bản đồ, retry.
- Kết quả từng màn và tổng chiến dịch.
- Hệ thống giáo viên/đánh giá nếu có trong dự án gốc.
- Cài đặt âm thanh/điều khiển, hướng dẫn chơi và responsive layout.
- Xử lý trường hợp save cũ hoặc thiếu dữ liệu.

## PHASE F — QA, OPTIMIZATION, DELIVERY
- Chạy TypeScript/lint/test/build theo scripts hiện có.
- Kiểm tra menu, chuyển màn, M01–M15, B01–B03.
- Kiểm tra input, camera, collision, mission states, scoring và save/load.
- Kiểm tra desktop/tablet/mobile trong phạm vi hỗ trợ.
- Kiểm tra console/runtime errors, scene cleanup và audio lifecycle.
- Đo hiệu năng nếu công cụ có sẵn; ghi rõ thiết bị/môi trường và giới hạn đo.
- Sửa lỗi P0/P1 trước khi báo hoàn tất.
- Cập nhật README chạy/build, status, matrix, known issues và release notes.
- Tạo báo cáo nghiệm thu cuối cùng.

---

# 7. KIỂM THỬ VÀ CÁCH GHI KẾT QUẢ

Không đánh dấu `PASS` nếu chưa thực sự chạy phép thử. Dùng:
- `PASS`: đã chạy và có bằng chứng.
- `FAIL`: đã chạy và không đạt.
- `BLOCKED`: không thể chạy do blocker rõ ràng.
- `NOT VERIFIED`: chưa có cách xác minh hoặc chưa chạy.

Với mỗi phép thử, ghi:
- Lệnh/cách kiểm thử.
- Kết quả thực tế.
- Log hoặc bằng chứng phù hợp.
- Lỗi phát hiện và cách xử lý.

Không giấu lỗi nền đã tồn tại. Phân biệt lỗi có từ trước với lỗi do thay đổi mới gây ra.

---

# 8. TIẾN ĐỘ BỀN VỮNG VÀ TIẾP TỤC SAU GIÁN ĐOẠN

Duy trì `docs/EXECUTION_STATUS.md` theo mẫu:

```md
# Execution Status

## Current Phase
## Completed
## In Progress
## Tests
## Blockers
## Next Action
```

Cập nhật sau mỗi phase lớn và mỗi vài màn. Nếu phiên bị gián đoạn, đọc status, matrix, known issues và Git status trước khi tiếp tục. Tiếp tục từ `Next Action`; không bắt đầu lại hoặc lặp các thay đổi đã hoàn thành.

---

# 9. ĐIỀU KIỆN DỪNG TOÀN BỘ

Chỉ dừng toàn bộ tiến trình khi:
1. Phạm vi đã hoàn thành và kiểm thử; hoặc
2. Có blocker thực sự không thể vượt qua bằng thao tác an toàn; hoặc
3. Bước tiếp theo cần quyền, chi phí ngoài, xuất bản công khai, dữ liệu xác thực hoặc quyết định không thể suy ra an toàn.

Khi có blocker:
- Tiếp tục phần độc lập không bị chặn.
- Ghi lỗi, log, file/module ảnh hưởng và các phương án đã thử.
- Đưa ra hành động tiếp theo cụ thể.
- Không yêu cầu người dùng lặp lại việc đã hoàn thành.
- Không dừng chỉ vì đã lập kế hoạch hoặc hoàn thành một màn.

---

# 10. LỆNH KHỞI ĐỘNG

**BẮT ĐẦU TỪ TRẠNG THÁI HIỆN TẠI, KHÔNG LÀM LẠI TỪ ĐẦU.**

1. Kiểm tra repository root và Git status.
2. Đọc bộ đặc tả đầy đủ.
3. Xác minh các nâng cấp M01 được liệt kê ở Mục 1.
4. Chạy baseline build/test.
5. Sửa lỗi M01 nếu cần và ghi bằng chứng.
6. Hoàn thiện shared systems.
7. Triển khai M02–M15 và B01–B03 theo MD riêng.
8. Tích hợp thành chiến dịch hoàn chỉnh.
9. Kiểm thử, tối ưu và cập nhật tài liệu.
10. Tiếp tục tuần tự cho đến khi hoàn thành toàn bộ phạm vi an toàn có thể thực hiện trong môi trường hiện tại.

**Không chỉ trả về kế hoạch. Hãy thực hiện thay đổi trực tiếp trong workspace. Không tuyên bố hoàn thành khi chưa có bằng chứng.**

Cuối cùng, báo cáo:
- Trạng thái M01 và bằng chứng xác minh.
- Trạng thái từng M02–M15 và B01–B03.
- Các file tạo/sửa.
- Kết quả test/build thực tế.
- Các vấn đề còn lại và cách tái hiện.
- Hướng dẫn chạy game.
- Những tính năng bị BLOCKED/NOT VERIFIED và lý do.
