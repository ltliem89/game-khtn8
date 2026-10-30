# CẤU TRÚC DỮ LIỆU VÀ QUY TẮC BIÊN SOẠN CÂU HỎI
## Nguồn kiến thức cho KHTN 8 – Robot vượt trạm đại lượng vật lý

## 1. Mô hình dữ liệu tối thiểu

Tách dữ liệu khoa học khỏi mã game. Không lưu toàn bộ câu hỏi như văn bản tự do trong component giao diện.

### 1.1. Bản ghi đại lượng/khái niệm

```json
{
  "id": "PHY_DENSITY",
  "domain": "physics_quantity",
  "name_vi": "Khối lượng riêng",
  "symbol": "D",
  "meaning_vi": "Khối lượng của một đơn vị thể tích chất.",
  "unit_si": "kg/m³",
  "common_units": ["kg/m³", "g/cm³"],
  "formula_as_taught": "D = m/V",
  "formula_status": "teacher_review",
  "variable_explanations": [
    {"symbol": "m", "meaning_vi": "khối lượng", "unit": "kg"},
    {"symbol": "V", "meaning_vi": "thể tích", "unit": "m³"}
  ],
  "lesson_refs": ["Bài 13", "Bài 14"],
  "grade_scope": "KHTN 8",
  "prerequisites": ["PHY_MASS", "PHY_VOLUME"],
  "common_misconceptions": [
    "Nhầm khối lượng riêng với khối lượng.",
    "So sánh khối lượng mà bỏ qua thể tích."
  ],
  "source_note": "Đối chiếu bản SGK đang dùng tại trường.",
  "verification_status": "teacher_review",
  "teacher_approved": false
}
```

Lưu ý: `D` là ký hiệu dùng trong cách trình bày của SGK cần được xác nhận trên bản sách cụ thể. Không tự chuẩn hóa thành `ρ` chỉ vì ký hiệu đó phổ biến trong tài liệu khác.

### 1.2. Bản ghi trạm

```json
{
  "station_id": "ST03_DENSITY",
  "order": 3,
  "station_type": "core",
  "title": "Trạm khối lượng riêng",
  "target_quantity_id": "PHY_DENSITY",
  "lesson_refs": ["Bài 13", "Bài 14"],
  "learning_objective": "Nhận biết ký hiệu, đơn vị và giải thích ý nghĩa khối lượng riêng.",
  "scene_id": "materials_lab",
  "minigame_id": "measure_and_compare",
  "difficulty_tier": 1,
  "question_count": 10,
  "question_blueprint": {"know": 4, "understand": 3, "apply": 3},
  "pass_score": 5,
  "retry_policy": "new_equivalent_set",
  "teacher_approved": false
}
```

### 1.3. Bản ghi câu hỏi

```json
{
  "question_id": "ST03_Q001",
  "station_id": "ST03_DENSITY",
  "target_quantity_id": "PHY_DENSITY",
  "lesson_refs": ["Bài 13"],
  "level": "know",
  "skill": "identify_symbol",
  "context": "Trong phòng thí nghiệm, học sinh so sánh hai khối vật liệu.",
  "prompt": "Đại lượng cho biết khối lượng của một đơn vị thể tích chất là gì?",
  "options": [
    {"id": "A", "text": "Khối lượng riêng"},
    {"id": "B", "text": "Thể tích"},
    {"id": "C", "text": "Áp suất"},
    {"id": "D", "text": "Lực đẩy"}
  ],
  "correct_option_id": "A",
  "explanation_vi": "Khối lượng riêng mô tả khối lượng chứa trong một đơn vị thể tích.",
  "expected_unit": null,
  "accepted_answers": [],
  "difficulty": 1,
  "source_status": "teacher_review",
  "teacher_approved": false
}
```

## 2. Quy tắc ký hiệu, công thức và đơn vị

- `symbol` phải phân biệt chữ hoa/chữ thường; `I`, `U`, `p`, `F`, `S` không được viết thường/hoa tùy tiện.
- Đại lượng và đơn vị là hai trường khác nhau. Ví dụ: `I` là cường độ dòng điện; `A` là ampe. `U` là hiệu điện thế; `V` là vôn. `F` có thể là ký hiệu lực trong ngữ cảnh vật lí nhưng cũng là ký hiệu nguyên tố fluorine trong hóa học; game này phải hiển thị ngữ cảnh vật lí.
- Nếu dùng ký hiệu lực, ghi rõ nghĩa `F` theo bài đang học và tránh để câu hỏi rời ngữ cảnh.
- Lưu nguyên công thức hiển thị và bản văn thuần để so khớp nếu cần. Các dạng `m³`, `m^3` có thể được quy về cùng hình thức khi kiểm tra nhập liệu, nhưng không thay đổi ý nghĩa.
- Không tự thêm công thức về nhiệt, ký hiệu `Q`, `T` hoặc đơn vị nếu chưa xác nhận chúng xuất hiện/phù hợp trong bản SGK đang dùng. Mục chưa rõ phải có `teacher_review`.
- Đối với câu tính toán, luôn chỉ rõ đơn vị của dữ kiện và đáp án; kiểm tra chuyển đổi đơn vị.

## 3. Bộ trường cần có ở mọi câu hỏi

Bắt buộc:
- `question_id`, `station_id`, `target_quantity_id`.
- `level`: `know`, `understand` hoặc `apply`.
- `skill`: kỹ năng đang kiểm tra.
- `context`, `prompt`, các `options` nếu là trắc nghiệm.
- `correct_option_id` hoặc `accepted_answers`.
- `explanation_vi` ngắn gọn.
- `lesson_refs`, `source_status`, `teacher_approved`.

Nếu có số liệu: `given_values`, `expected_unit`, `solution_steps`, `numeric_tolerance`. Nếu câu hỏi có nhiều đáp án diễn đạt tương đương: `accepted_answers` phải liệt kê hoặc có hàm chuẩn hóa rõ ràng; không dùng AI quyết định đúng/sai tùy hứng khi học sinh đang làm bài.

## 4. Luật tạo 10 câu/trạm

Mỗi trạm có đúng 10 câu trong một lượt:
- 4 câu `know`.
- 3 câu `understand`.
- 3 câu `apply`.

Không tạo 10 câu chỉ thay số hoặc đảo thứ tự từ. Phải đa dạng kỹ năng, ví dụ:
- Nhận diện tên/ký hiệu.
- Chọn đúng đơn vị.
- Đọc dụng cụ đo.
- Phân biệt hai khái niệm dễ nhầm.
- Giải thích hiện tượng đời sống.
- Một phép tính đơn giản khi bài học cho phép.

Câu vận dụng phải có bối cảnh cụ thể, dữ kiện đầy đủ, một đáp án đúng rõ ràng hoặc quy tắc chấp nhận đáp án đã khai báo. Hạn chế văn bản dài; ưu tiên hình minh họa, sơ đồ, dụng cụ đo hoặc mô hình hiện tượng.

## 5. Checkpoint tổng hợp

Checkpoint sau mỗi 5 trạm phải là một bộ riêng:
- 10 câu mới, không sao chép nguyên câu ở trạm trước.
- Vẫn nằm trong phạm vi kiến thức đã mở khóa.
- Bối cảnh và kiểu yêu cầu khác (chẳng hạn giải thích/chọn phương án thay vì chỉ nhận diện).
- Kết nối tối thiểu 2 nội dung đã học nhưng không ghép một cách gượng ép.
- Dùng cùng ngưỡng sao 0–3 và lưu kết quả như một checkpoint riêng.

## 6. Quy trình tạo và duyệt dữ liệu

1. Sinh nháp theo schema.
2. Kiểm tra kỹ thuật: thiếu trường, ID trùng, không có đáp án, có hơn một đáp án đúng, đơn vị sai định dạng.
3. Kiểm tra khoa học: công thức, ký hiệu, đơn vị, dữ kiện và lời giải.
4. Kiểm tra sư phạm: phù hợp lớp 8, một mục tiêu/câu, tình huống gần gũi, không dùng từ đánh đố.
5. Giáo viên duyệt từng câu hoặc nhóm câu.
6. Chỉ khi được duyệt mới đổi `teacher_approved: true` và `source_status: approved`.

AI không được tự chuyển trạng thái sang approved. Những mục bị gắn `teacher_review` vẫn hiển thị ở màn hình quản trị nhưng bị loại khỏi lượt thi chính thức.

## 7. Lịch sử, làm lại và tính điểm

Dùng các trường logic tương đương:
- `attempt_id`, `station_id`, `question_set_id`, `score_0_10`, `stars`, `completed_at`.
- `best_score`, `best_stars`, `attempt_count`.
- `wrong_question_ids`, `review_queue`.
- `unlocked_station_ids`, `last_cleared_checkpoint`.

Điểm kiến thức chỉ nhận 0 hoặc 1 điểm cho từng câu. Không cộng lần thứ hai nếu học sinh đổi đáp án sau khi đã chốt. Nếu có chế độ luyện tập không tính điểm, phải hiển thị rõ là `Practice`, tách khỏi `Assessment`.

Điểm lái xe (nếu có) dùng trường khác như `driving_score`; không được làm thay đổi điểm 10 câu hoặc số sao học tập.

## 8. Ví dụ câu hỏi đời sống mẫu

Các ví dụ sau là định hướng định dạng; phải đối chiếu ký hiệu/công thức với bản SGK và được duyệt trước khi đưa vào thi.

### Khối lượng
- **Biết:** Đại lượng nào cho biết lượng vật chất của một vật theo cách học ở lớp? Chọn “khối lượng”.
- **Hiểu:** Hai túi gạo có số chỉ cân lần lượt 2 kg và 5 kg. Túi nào có khối lượng lớn hơn? Giải thích bằng số đo.
- **Vận dụng:** Cần vận chuyển một thùng đồ qua cầu giới hạn tải trọng; dữ liệu cho biết khối lượng từng thùng. Chọn phương án không vượt giới hạn đã nêu.

### Thể tích
- **Biết:** Dụng cụ nào phù hợp để đọc thể tích chất lỏng trong thí nghiệm? Dựa vào hình dụng cụ.
- **Hiểu:** Vì sao phải đọc vạch chia và vị trí mặt chất lỏng đúng hướng dẫn thay vì ước lượng bằng mắt?
- **Vận dụng:** Một bình chứa 350 mL nước, thêm 100 mL nước nữa. Hỏi thể tích nước cuối cùng, nếu không có tràn hay mất nước?

### Khối lượng riêng
- **Biết:** Đại lượng nào liên hệ khối lượng với thể tích của chất?
- **Hiểu:** Hai khối có thể tích bằng nhau nhưng số chỉ cân khác nhau. Điều đó cho biết điều gì về khối lượng riêng của chúng, nếu cả hai là vật đồng nhất?
- **Vận dụng:** Cho khối lượng và thể tích theo đơn vị tương thích; yêu cầu tính khối lượng riêng và ghi đúng đơn vị đã học.

### Áp suất trên bề mặt
- **Biết:** Đại lượng nào biểu thị độ lớn áp lực trên một đơn vị diện tích?
- **Hiểu:** Vì sao giày có diện tích tiếp xúc lớn hơn có thể làm giảm áp suất lên mặt tuyết khi lực ép không đổi?
- **Vận dụng:** Hai phương án đặt vật tạo cùng lực ép nhưng diện tích tiếp xúc khác nhau; chọn phương án tạo áp suất lớn hơn và nêu lý do.

Câu ví dụ không thay cho ngân hàng kiểm duyệt; cần lưu thành dữ liệu, gán bài học, kiểm tra đơn vị và trạng thái duyệt trước khi phát hành.
