import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Endpoint 1: Teacher Draft Question Generator (Always sets teacher_approved: false, source_status: 'teacher_review')
  app.post('/api/ai/generate-draft-question', async (req, res) => {
    try {
      const { stationId, stationTitle, targetQuantityId, quantityName, symbol, unitSi, lessonRefs, level } = req.body;
      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Bạn vẫn có thể tạo câu hỏi thủ công trong Bảng Giáo Viên.',
        });
      }

      const prompt = `Bạn là chuyên gia biên soạn câu hỏi Vật lí KHTN 8 (sách Kết nối tri thức với cuộc sống).
Hãy tạo 1 câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D) cho trạm "${stationTitle}" (${stationId}), đại lượng trọng tâm "${quantityName}" (${targetQuantityId}), ký hiệu "${symbol}", đơn vị "${unitSi}", thuộc ${Array.isArray(lessonRefs) ? lessonRefs.join(', ') : lessonRefs}.
Mức độ nhận thức yêu cầu: "${level}" (know = Nhận biết tên/ký hiệu/đơn vị/dụng cụ; understand = Thông hiểu mối quan hệ/giải thích hiện tượng; apply = Vận dụng tình huống thực tế hoặc tính toán 1-2 bước).
Quy tắc bắt buộc:
1. Tình huống đời sống an toàn, gần gũi với học sinh lớp 8 (không dùng điện lưới nguy hiểm, lửa hay áp suất nổ).
2. Phân biệt rõ đại lượng (ví dụ I, U) và đơn vị (A, V). Không tự thêm ký hiệu Q, T cho phần nhiệt nếu ngoài SGK.
3. Đủ dữ kiện, chỉ có duy nhất 1 đáp án đúng.
4. Phản hồi (explanation_vi) ngắn gọn 1-2 câu, chỉ rõ vì sao đúng và nêu đơn vị nếu là câu tính toán.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              skill: { type: Type.STRING, description: 'Kỹ năng kiểm tra, ví dụ: identify_symbol, read_instrument, explain_phenomenon, calculate_value' },
              context: { type: Type.STRING, description: 'Bối cảnh thực tế ngắn gọn 1 câu' },
              prompt: { type: Type.STRING, description: 'Nội dung câu hỏi rõ ràng' },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: 'A, B, C hoặc D' },
                    text: { type: Type.STRING, description: 'Nội dung phương án' },
                  },
                  required: ['id', 'text'],
                },
              },
              correct_option_id: { type: Type.STRING, description: 'A, B, C hoặc D' },
              explanation_vi: { type: Type.STRING, description: 'Giải thích ngắn gọn 1-2 câu' },
              expected_unit: { type: Type.STRING, description: 'Đơn vị kỳ vọng nếu có tính toán, hoặc chuỗi rỗng' },
            },
            required: ['skill', 'context', 'prompt', 'options', 'correct_option_id', 'explanation_vi'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      // Enforce mandatory rule from 01_MASTER_CONTROL_PROMPT.md & 03_DATA_AND_ASSESSMENT_RULES.md:
      // AI-generated content MUST have teacher_approved: false and source_status: 'teacher_review'
      const draftQuestion = {
        question_id: `${stationId}_AI_${Date.now().toString().slice(-4)}`,
        station_id: stationId,
        target_quantity_id: targetQuantityId,
        lesson_refs: Array.isArray(lessonRefs) ? lessonRefs : [lessonRefs || 'KHTN 8'],
        level: level || 'know',
        skill: parsed.skill || 'identify_concept',
        context: parsed.context || 'Tình huống thực hành KHTN 8.',
        prompt: parsed.prompt || 'Câu hỏi đề xuất bởi AI.',
        options: Array.isArray(parsed.options) && parsed.options.length === 4 ? parsed.options : [
          { id: 'A', text: 'Phương án A' },
          { id: 'B', text: 'Phương án B' },
          { id: 'C', text: 'Phương án C' },
          { id: 'D', text: 'Phương án D' },
        ],
        correct_option_id: parsed.correct_option_id || 'A',
        explanation_vi: parsed.explanation_vi || 'Giải thích ngắn gọn theo SGK KHTN 8.',
        expected_unit: parsed.expected_unit || null,
        accepted_answers: [],
        difficulty: level === 'apply' ? 3 : level === 'understand' ? 2 : 1,
        source_status: 'teacher_review',
        teacher_approved: false,
      };

      return res.json({ question: draftQuestion });
    } catch (error: any) {
      console.error('AI Draft Question Error:', error);
      return res.status(500).json({
        error: error?.message || 'Không thể sinh câu hỏi nháp từ AI.',
      });
    }
  });

  // Endpoint 2: Deep Thinking Physics Explanation for Post-Question / Post-Station Review
  app.post('/api/ai/explain-concept', async (req, res) => {
    try {
      const { questionPrompt, chosenOption, correctOption, explanationVi, quantityName, lessonRefs } = req.body;
      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'Chưa cấu hình GEMINI_API_KEY. Hãy xem phần giải thích chuẩn của giáo viên bên trên.',
        });
      }

      const prompt = `Học sinh lớp 8 vừa trả lời xong câu hỏi môn KHTN 8 (${lessonRefs || 'Kết nối tri thức'}) về chủ đề "${quantityName}":
- Câu hỏi: "${questionPrompt}"
- Học sinh chọn: "${chosenOption}"
- Đáp án đúng: "${correctOption}"
- Giải thích chuẩn: "${explanationVi}"

Hãy đóng vai trợ lý robot khảo sát JetBot AI trong phòng thí nghiệm KHTN 8, giải thích ngắn gọn (tối đa 3 câu, dễ hiểu, đúng phạm vi SGK KHTN 8, không dùng công thức vượt cấp) giúp học sinh hiểu bản chất vật lý và tránh nhầm lẫn đơn vị/ký hiệu.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      return res.json({ explanation: response.text || explanationVi });
    } catch (error: any) {
      console.error('AI Explain Error:', error);
      return res.status(500).json({
        error: error?.message || 'Không thể kết nối mô hình suy luận.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
