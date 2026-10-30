# ART, AUDIO & UI BIBLE
## Premium 3D direction and visual quality specification

## 1. Art direction

**Visual target:** premium stylized-realistic sci-fi game, crisp silhouette, cinematic lighting and readable gameplay. Không đi theo phong cách hoạt hình trẻ nhỏ, không dùng asset low-poly đơn giản làm điểm nhấn chính. Có thể stylize màu sắc để thân thiện với học sinh lớp 8 nhưng vật liệu, ánh sáng và môi trường phải có chiều sâu.

### Visual language

- NOVA-8: graphite, ceramic white, brushed metal, cyan energy accents, controlled amber warnings.
- Mỗi world có palette riêng nhưng cùng một thương hiệu: MATERIAL (warm steel/amber), PRESSURE (deep teal/blue), MECHANICAL (copper/industrial green), ELECTRIC (midnight navy/electric cyan), THERMAL (volcanic orange/ice blue).
- Màu không phải cách duy nhất để mã hóa. Mục tiêu phải có shape, icon, label và animation.
- Các vật thể tương tác cần silhouette nổi bật và outline khi focus.

## 2. Geometry and material detail

Hero objects (JetBot, gate, crane, instruments, puzzle components) phải có:
- silhouette đọc được ở khoảng cách xa;
- bevel/chamfer cạnh để bắt sáng;
- nhiều lớp vật liệu: chassis, glass, rubber, metal, emissive panels;
- bolts, panel seams, vents, grills, sensor lenses, cables hoặc decal có chủ đích;
- animation riêng: wheel spin, LiDAR rotation, indicator lights, hinges, hydraulic pistons.

Không dùng một hộp primitive đơn sắc làm xe JetBot cuối cùng. Có thể dùng procedural geometry để tạo mesh nếu chưa có model file. Ưu tiên modular geometry có naming và material slots rõ.

## 3. Texture and sharpness

- UI icon/vector cần sắc nét ở DPR cao.
- Texture hero object khuyến nghị 1K–2K tùy kích thước và budget; texture môi trường dùng atlas/tiling có kiểm soát.
- Không upscale texture mờ rồi coi như HD.
- Texture phải có mipmaps và filtering phù hợp để tránh shimmering.
- Hạn chế normal map quá mạnh gây bề mặt nhiễu.
- Dùng decal/vertex color cho vạch đường, warning stripes, serial numbers, panel markings.
- Không sử dụng logo/thương hiệu game thương mại khác.

## 4. Lighting and atmosphere

- Key light định hướng rõ; fill/ambient đủ để đọc vật thể trong bóng.
- Contact shadow/AO nhẹ giúp vật thể bám mặt đất.
- Fog theo world để tạo chiều sâu, không che objective/biển báo.
- Emissive chỉ dành cho năng lượng, màn hình, mục tiêu, đèn cảnh báo.
- Bloom nhẹ và có ngưỡng; không để toàn bộ cảnh bị cháy sáng.
- Water dùng surface shader/transparent layering có kiểm soát; tránh transparency overdraw quá nặng.
- Heat shimmer dùng distortion nhẹ, chỉ ở vùng nhiệt.

## 5. World environment detail

Mỗi world cần 3 lớp:
1. **Foreground:** đường đua, thiết bị, công tắc, vật cản, props tương tác.
2. **Midground:** nhà xưởng, cột, bể chứa, ống dẫn, cần cẩu, đường ống, cầu.
3. **Background:** skyline, núi, hẻm vực, tháp nghiên cứu, bầu trời/hành tinh; tạo scale nhưng chi phí thấp.

Environmental storytelling: dấu bánh, biển cảnh báo, đèn khẩn cấp, thùng hàng, đường ống vỡ, màn hình holographic, robot bảo trì dừng giữa thao tác. Những chi tiết này phải kể câu chuyện mà không gây nhiễu gameplay.

## 6. JetBot hero model

JetBot J-08 tối thiểu có:
- chassis chính với mặt trước nhận diện rõ;
- 4 bánh với lốp cao su và hub;
- cụm cảm biến/LiDAR xoay;
- camera/scanner lens;
- đèn trạng thái trước/sau;
- module pin/năng lượng;
- vỏ panel và khớp nối;
- hiệu ứng Nitro phía sau;
- animation bánh xe và hệ thống treo nhẹ.

Các thành phần có naming để nâng cấp/đổi skin. Màu sơn có thể tùy chỉnh, nhưng không thay silhouette/độ rõ.

## 7. FPS/first-person target feedback

- Reticle mảnh, tương phản tốt, phản hồi khi target hợp lệ.
- Scan beam có độ dày/opacity hợp lý; hiệu ứng vòng quét lan trên vật thể.
- Khi khóa mục tiêu: viền target, nhãn ngắn, khoảng cách và loại tương tác.
- Hit feedback: pulse ring, sparks, light ripple hoặc hologram activation.
- Không dùng hit marker đỏ kiểu bạo lực, máu, đạn hoặc biểu tượng sát thương lên sinh vật.
- Motion blur/tremor tắt hoặc giảm được.

## 8. UI style

- UI dạng sci-fi mission control: dark glass panels, subtle blur/transparency, thin borders, restrained glow.
- Pop-up dùng nền mờ trong suốt có đủ độ tương phản; blur không được làm mất khả năng đọc.
- Layer order rõ: 3D world < world HUD < mission modal < pause/result modal.
- Không để glassmorphism phủ toàn bộ màn hình liên tục.
- Button states: idle, hover, pressed, disabled, loading, success, error.
- Responsive: desktop, tablet, mobile; không co mọi thứ thành phiên bản nhỏ khó bấm.
- Typography: sans-serif hiện đại, hỗ trợ dấu tiếng Việt đầy đủ; heading/display và body có cấp bậc rõ; số liệu tabular.

## 9. Animation quality

- Mọi UI transition có easing và duration thống nhất.
- Vehicle animation có inertia, không teleport khi cua.
- World props chuyển động theo cơ cấu (piston, valve, door, bridge) có anticipation, motion, settle.
- Pickups có idle animation vừa phải, không rung liên tục gây khó chịu.
- Camera transition mượt; tránh đột ngột đổi hướng.
- Hạn chế screen shake; chỉ dùng ngắn khi impact/boss event và có tùy chọn tắt.

## 10. Audio bible

### Music
- Mỗi world có theme riêng; mỗi theme có layer exploration / action / boss.
- Adaptive music chuyển lớp theo objective, không cắt nhạc đột ngột.
- Boss có motif NOVA-8 biến thể.

### SFX
- JetBot motor, tire, drift, boost, collision, landing.
- LiDAR ping, scan sweep, target lock, science pulse.
- Machine, valve, water pressure, crane, electrical hum, thermal vent, glass/metal mechanisms.
- UI confirm/cancel/correct/incorrect/reward/checkpoint/boss reveal.

### Mix
- Dialogue ducking music.
- Master/music/SFX/voice sliders.
- Captions cho cảnh báo âm thanh quan trọng.
- Không phát âm thanh liên tục khi pause.
- Không tự phát âm thanh lớn khi trang vừa tải; cần tương tác người dùng nếu browser yêu cầu.

## 11. Asset production rules

- Ưu tiên procedural assets trong Three.js nếu AI Studio không có file model.
- Tạo asset registry thống nhất, không tạo model riêng trùng lặp cho từng màn.
- Dùng GLTF/GLB nếu có asset có bản quyền/nguồn hợp lệ; load bằng relative path local.
- Mỗi asset có fallback low-cost.
- Không tham chiếu URL ảnh/model không ổn định hoặc không có quyền sử dụng.
- Dự án phải chạy khi offline sau khi tải dependencies/asset local.

## 12. Visual QA checklist

- Chữ/biển báo không bị blur ở độ phân giải mục tiêu.
- Không có z-fighting rõ rệt, mesh xuyên nhau hoặc texture bị giãn.
- Player/obstacle/route đọc được ở tốc độ cao.
- Silhouette mục tiêu không lẫn với nền.
- Không có bloom làm cháy vùng trắng.
- Không bị aliasing/shimmering quá mức trên đường/vạch.
- Performance tier chuyển cảnh không làm vỡ bố cục.
