# CURRICULUM & ASSESSMENT SPEC
## KHTN 8 — Kết nối tri thức với cuộc sống

## 1. Curriculum scope

Bộ game lấy chủ đề vật lí KHTN 8 trong báo cáo JETBOT-SCI8 làm nguồn nội dung. Phạm vi gồm:
- Khối lượng (m), thể tích (V).
- Khối lượng riêng `D = m/V` và thực hành đo.
- Áp suất trên một bề mặt `p = F/S`.
- Áp suất chất lỏng và áp suất khí quyển.
- Lực đẩy Archimedes `F_A = d·V` theo cách ký hiệu đang dùng trong báo cáo dự án; phải kiểm tra đúng quy ước SGK/giáo viên trước khi đưa vào câu hỏi.
- Moment lực, đòn bẩy và điểm tựa O.
- Cường độ dòng điện I, đơn vị A/mA; Ampe kế mắc nối tiếp.
- Hiệu điện thế U, đơn vị V/mV/kV; Vôn kế mắc song song.
- Năng lượng nhiệt/nội năng; đo năng lượng nhiệt bằng Joulemeter (J).
- Dẫn nhiệt, đối lưu, bức xạ nhiệt.
- Sự nở vì nhiệt của chất rắn, lỏng và khí.

**Quan trọng:** Đây là danh mục phạm vi được lấy từ báo cáo dự án. Khi viết câu hỏi, kiểm tra công thức, ký hiệu, điều kiện áp dụng và thuật ngữ theo SGK/tài liệu giáo viên đã duyệt. Không tự sửa quy ước bằng kiến thức ngoài nguồn mà không thông báo.

## 2. Mapping 15 màn

| Mã | Học tập trọng tâm | Bằng chứng học tập |
|---|---|---|
| M01 | Khối lượng, kí hiệu m, đơn vị và dụng cụ đo | Chọn đúng vật/đơn vị, đọc cân, phân biệt khối lượng với trọng lượng nếu có trong ngân hàng đã duyệt |
| M02 | Thể tích V, đơn vị và cách xác định | Đọc thang đo, so sánh thể tích, thao tác bình chia độ/chiếm chỗ |
| M03 | Khối lượng riêng và phép đo | Tính D, giải thích m/V, xác định thể tích qua V2−V1 khi câu hỏi đã được duyệt |
| M04 | Áp suất trên bề mặt | Liên hệ lực ép/diện tích tiếp xúc, sử dụng p=F/S theo nội dung đã duyệt |
| M05 | Áp suất chất lỏng | Nhận biết quan hệ áp suất và độ sâu trong ngữ cảnh, phân tích cổng áp suất |
| M06 | Áp suất khí quyển | Nhận biết tác dụng/hiện tượng của áp suất khí quyển; phân tích buồng khí/airlock |
| M07 | Lực đẩy Archimedes | Phân tích nổi/chìm và thể tích chất lỏng bị chiếm chỗ theo nội dung đã duyệt |
| M08 | Moment lực | Xác định tác dụng làm quay, lực và cánh tay đòn |
| M09 | Đòn bẩy, điểm tựa O | Bố trí điểm tựa, lực tác dụng và vật cần nâng |
| M10 | Cường độ dòng điện | Đọc I, đơn vị A/mA, lắp Ampe kế nối tiếp |
| M11 | Hiệu điện thế | Đọc U, đơn vị V/mV/kV, mắc Vôn kế song song |
| M12 | Năng lượng nhiệt và nội năng | Nhận biết/giải thích sự thay đổi nhiệt năng/nội năng theo nội dung SGK |
| M13 | Đo năng lượng nhiệt bằng Joulemeter | Đọc dụng cụ, đơn vị J, thao tác phép đo |
| M14 | Sự truyền nhiệt | Phân biệt dẫn nhiệt, đối lưu, bức xạ nhiệt trong tình huống |
| M15 | Sự nở vì nhiệt của rắn, lỏng, khí | Nhận diện/giải thích biến đổi kích thước/thể tích, xử lý khe giãn nở |

## 3. Assessment policy

### 3.1. Mỗi màn M01–M15

Đúng 10 câu hỏi:
- 4 câu Biết.
- 3 câu Hiểu.
- 3 câu Vận dụng.

Tổng điểm kiến thức `0–10`, quy đổi mỗi câu đúng 1 điểm (giữ nguyên quy tắc hệ thống hiện có nếu dự án đang dùng thang khác; nếu khác phải báo cáo và xin quyết định thay đổi, không âm thầm đổi).

### 3.2. Chất lượng câu hỏi

Mỗi question record nên có:
- `id`, `missionId`/`quantityId`.
- `level`: `know | understand | apply`.
- `skill`.
- `context`.
- `prompt`.
- `options`: 4 phương án duy nhất.
- `correctOptionId`.
- `explanation_vi`.
- `expected_unit` khi liên quan.
- `solution_steps` cho câu tính toán/vận dụng.
- `misconceptionTags`.
- `teacher_approved`.
- `sourceReference` (bài/ trang/ tài liệu nếu có).

Không hiển thị `correctOptionId` trước khi học sinh chốt đáp án. Không đưa câu chưa duyệt vào đề chính thức.

### 3.3. Cân bằng và trộn

- Lấy đúng tỷ lệ 4–3–3.
- Ưu tiên câu chưa xuất hiện trong lần thử trước; ưu tiên review queue khi phù hợp.
- Shuffle toàn bộ vị trí đáp án bằng Fisher–Yates sau khi chọn câu.
- Không để đáp án đúng tập trung vào một chữ cái.
- Không lặp cùng một question ID trong một lượt.
- Nếu không đủ 4/3/3 câu đã duyệt, không tự bù bằng câu AI tạo. Hiển thị `QUESTION_BANK_INCOMPLETE` cho giáo viên và cho phép chế độ luyện tập không chấm điểm nếu phù hợp.

## 4. Learning mechanics vs test mechanics

- Gameplay dạy/ôn kiến thức bằng thao tác và phản hồi.
- Assessment đo kiến thức bằng câu hỏi riêng, không chỉ đo tốc độ hoặc phản xạ.
- Mini-lab là bằng chứng thao tác bổ sung, không thay 10 câu trắc nghiệm bắt buộc.
- Nếu sai, giải thích vì sao; tránh chỉ báo “Sai!” rồi trừ điểm.
- Có thể gợi ý theo cấp độ: nhắc lại định nghĩa → gợi ý công thức/đơn vị → ví dụ tương tự. Dùng trợ quyền của dự án nếu có.

## 5. Misconception handling

Ưu tiên kiểm tra các nhầm lẫn đã nêu trong báo cáo:
- `V` là ký hiệu thể tích trong ngữ cảnh này nhưng `V` cũng có thể là đơn vị volt; phân biệt đại lượng V (thể tích) và đơn vị V (volt) qua bối cảnh.
- `I` là ký hiệu cường độ dòng điện, đơn vị là A/mA.
- `m` là khối lượng, đơn vị kg/g; không nhầm với trọng lượng `P` và đơn vị N khi nội dung này đã được dạy.
- Ampe kế nối tiếp; Vôn kế song song.
- Phân biệt ký hiệu đại lượng và ký hiệu đơn vị SI.

Các misconception khác chỉ thêm khi có nguồn SGK hoặc giáo viên duyệt.

## 6. Boss assessment

Boss là đánh giá tổng hợp dạng nhiệm vụ đa pha. Boss có:
- 3–5 objective sub-challenges.
- 1 final synthesis challenge.
- Có thể có 5 câu tổng hợp không cộng vào điểm 10 của các màn học tập, hoặc câu hỏi tổng hợp không chấm điểm riêng; quy định thống nhất trong app.
- Không làm mất kết quả 10 câu của các màn trước.
- Report boss skill là `missionPerformance` riêng, không gộp vào `knowledgeScore` từng trạm.

## 7. Teacher analytics

Giữ hoặc mở rộng 5 chỉ số hiện hữu:
1. Tỷ lệ đúng ngay lần đầu theo đại lượng.
2. Tỷ lệ đúng theo Biết/Hiểu/Vận dụng.
3. Các đơn vị/ký hiệu hay nhầm.
4. Cải thiện qua retry.
5. Tổng thời gian học và sao chuyên cần.

Bổ sung tùy chọn:
- lỗi thao tác mini-lab;
- nhánh mê cung chọn sai;
- số lần dùng hint;
- driving skill (tách biệt);
- performance tier/device error để chẩn đoán kỹ thuật.

Không dùng analytics để xếp hạng công khai học sinh theo lỗi sai hoặc tạo cảm giác bêu tên.
