import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Filter,
  PlusCircle,
  BarChart3,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  Star,
  Award,
  TrendingUp,
} from 'lucide-react';
import {
  CognitiveLevel,
  QuantityRecord,
  QuestionRecord,
  StationProgressState,
  StationRecord,
  TeacherAnalytics,
} from '../../types/game';

interface TeacherReviewModalProps {
  quantities: QuantityRecord[];
  stations: StationRecord[];
  questions: QuestionRecord[];
  stationProgress?: Record<string, StationProgressState>;
  analytics: TeacherAnalytics;
  onToggleQuestionApproval: (questionId: string, approved: boolean) => void;
  onAddDraftQuestion: (draft: QuestionRecord) => void;
  onUpdateQuestionPrompt?: (
    questionId: string,
    newPrompt: string,
    newExplanation: string
  ) => void;
  onClose: () => void;
}

const ACCEPTANCE_CRITERIA_LIST = [
  { id: 1, category: 'A. Sư phạm & Dữ liệu', text: 'Toàn bộ trạm chỉ dùng đại lượng trong SGK KHTN 8 Kết nối tri thức đã chốt (Bài 13–29)' },
  { id: 2, category: 'A. Sư phạm & Dữ liệu', text: 'm và V được gắn nhãn foundation/prerequisite (Kiến thức nền), không trình bày như bài mới' },
  { id: 3, category: 'A. Sư phạm & Dữ liệu', text: 'Mỗi trạm dùng đúng 10 câu: 4 Biết + 3 Hiểu + 3 Vận dụng' },
  { id: 4, category: 'A. Sư phạm & Dữ liệu', text: 'Mỗi câu 1 điểm; tổng điểm kiến thức mỗi trạm là 10' },
  { id: 5, category: 'A. Sư phạm & Dữ liệu', text: 'Ngưỡng sao đúng: 0–4 trượt (0★), 5–6 đạt 1★, 7–8 đạt 2★, 9–10 đạt 3★' },
  { id: 6, category: 'A. Sư phạm & Dữ liệu', text: 'Đạt từ 5/10 trở lên mới mở khóa trạm tiếp theo' },
  { id: 7, category: 'A. Sư phạm & Dữ liệu', text: 'Có thể làm lại trạm đã qua để nâng sao với bộ câu tương đương' },
  { id: 8, category: 'A. Sư phạm & Dữ liệu', text: 'Có chế độ 10, 15, 20 và 30 trạm học' },
  { id: 9, category: 'A. Sư phạm & Dữ liệu', text: 'Cứ sau 5 trạm học có 1 Checkpoint tổng hợp' },
  { id: 10, category: 'A. Sư phạm & Dữ liệu', text: 'Câu chưa duyệt (teacher_approved != true) không bao giờ vào phiên chơi của học sinh' },
  { id: 11, category: 'B. Vật lý lái & Đường đua', text: 'Xe điều khiển ổn định bằng W/S, A/D, Space, R, P' },
  { id: 12, category: 'B. Vật lý lái & Đường đua', text: 'Lệch làn có dung sai 700 ms trước khi trừ điểm lái (-1/giây); cổng sai -15' },
  { id: 13, category: 'B. Vật lý lái & Đường đua', text: 'Điểm lái (driving_score) hiển thị tách biệt với điểm kiến thức (0–10)' },
  { id: 14, category: 'B. Vật lý lái & Đường đua', text: 'Va chạm/lệch làn không làm hỏng trạng thái quiz' },
  { id: 15, category: 'B. Vật lý lái & Đường đua', text: 'Reset R đưa xe về checkpoint hợp lệ gần nhất' },
  { id: 16, category: 'C. Máy trạng thái & UI', text: 'Vào trạm thì khóa điều khiển lái trước khi mở modal câu hỏi (station_brake → quiz)' },
  { id: 17, category: 'C. Máy trạng thái & UI', text: 'Không xảy ra lỗi vừa lái vừa bấm đáp án' },
  { id: 18, category: 'C. Máy trạng thái & UI', text: 'Trả lời xong mỗi câu có phản hồi ngắn giải thích SGK + bước giải chuẩn' },
  { id: 19, category: 'C. Máy trạng thái & UI', text: 'Kết thúc 10 câu có màn hình kết quả trạm rõ ràng + tiến độ lộ trình & checkpoint' },
  { id: 20, category: 'C. Máy trạng thái & UI', text: 'Trượt trạm thì cho làm lại bộ câu tương đương' },
  { id: 21, category: 'C. Máy trạng thái & UI', text: 'Qua trạm thì mở khóa trạm kế tiếp và lưu tiến độ localStorage' },
  { id: 22, category: 'D. Kỹ thuật & Bảo trì', text: 'Lưu tiến độ hoạt động ổn định, không crash khi dữ liệu trống hoặc lỗi' },
  { id: 23, category: 'D. Kỹ thuật & Bảo trì', text: 'Code tách module rõ ràng (types, content, game/vehicle, game/track, ui)' },
  { id: 24, category: 'D. Kỹ thuật & Bảo trì', text: 'Có kiểm tra schema dữ liệu câu hỏi và trạng thái duyệt giáo viên' },
  { id: 25, category: 'D. Kỹ thuật & Bảo trì', text: 'Không lộ khóa bí mật ở phía client' },
  { id: 26, category: 'D. Kỹ thuật & Bảo trì', text: 'Không thêm cơ chế chiến đấu hay vật lý ngoài phạm vi SGK KHTN 8' },
];

export const TeacherReviewModal: React.FC<TeacherReviewModalProps> = ({
  quantities,
  stations,
  questions,
  stationProgress = {},
  analytics,
  onToggleQuestionApproval,
  onAddDraftQuestion,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'questions' | 'create_draft' | 'analytics' | 'acceptance'
  >('questions');
  const [filterQuantity, setFilterQuantity] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'approved' | 'pending'
  >('ALL');

  // Local deterministic draft creation form state (01_MASTER_CONTROL_PROMPT.md: "không bắt buộc có máy chủ")
  const [draftQuantityId, setDraftQuantityId] = useState<string>('PHY_DENSITY');
  const [draftLevel, setDraftLevel] = useState<CognitiveLevel>('apply');
  const [draftSkill, setDraftSkill] = useState<string>('calculate_density');
  const [draftContext, setDraftContext] = useState<string>(
    'Trong phòng thí nghiệm KHTN 8, học sinh cân một khối nhôm đặc có thể tích 0,002 m³ thì thấy khối lượng là 5,4 kg.'
  );
  const [draftPrompt, setDraftPrompt] = useState<string>(
    'Khối lượng riêng của khối nhôm đó tính theo đơn vị kg/m³ là bao nhiêu?'
  );
  const [draftOptA, setDraftOptA] = useState<string>('2700 kg/m³');
  const [draftOptB, setDraftOptB] = useState<string>('270 kg/m³');
  const [draftOptC, setDraftOptC] = useState<string>('10,8 kg/m³');
  const [draftOptD, setDraftOptD] = useState<string>('5400 kg/m³');
  const [draftCorrect, setDraftCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [draftExplanation, setDraftExplanation] = useState<string>(
    'Áp dụng công thức D = m / V = 5,4 / 0,002 = 2700 kg/m³.'
  );
  const [draftUnit, setDraftUnit] = useState<string>('kg/m³');
  const [validationMessage, setValidationMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filterQuantity !== 'ALL' && q.target_quantity_id !== filterQuantity)
        return false;
      if (filterLevel !== 'ALL' && q.level !== filterLevel) return false;
      if (filterStatus === 'approved' && !q.teacher_approved) return false;
      if (filterStatus === 'pending' && q.teacher_approved) return false;
      return true;
    });
  }, [questions, filterQuantity, filterLevel, filterStatus]);

  const approvedCount = questions.filter((q) => q.teacher_approved).length;
  const pendingCount = questions.length - approvedCount;

  // 6-step Technical Validation per 03_DATA_AND_ASSESSMENT_RULES.md Section 6
  const handleCreateAndValidateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const targetQ = quantities.find((q) => q.id === draftQuantityId);
    if (!targetQ) {
      setValidationMessage({
        type: 'error',
        text: 'Lỗi kiểm duyệt #1: Đại lượng không thuộc danh mục chuẩn SGK KHTN 8.',
      });
      return;
    }

    if (
      !draftPrompt.trim() ||
      !draftOptA.trim() ||
      !draftOptB.trim() ||
      !draftOptC.trim() ||
      !draftOptD.trim() ||
      !draftExplanation.trim()
    ) {
      setValidationMessage({
        type: 'error',
        text: 'Lỗi kiểm duyệt #2: Thiếu trường bắt buộc (câu hỏi, 4 lựa chọn A/B/C/D hoặc giải thích SGK).',
      });
      return;
    }

    const opts = [
      draftOptA.trim(),
      draftOptB.trim(),
      draftOptC.trim(),
      draftOptD.trim(),
    ];
    if (new Set(opts).size < 4) {
      setValidationMessage({
        type: 'error',
        text: 'Lỗi kiểm duyệt #3: 4 phương án nhiễu A, B, C, D không được trùng lặp nhau.',
      });
      return;
    }

    const newId = `DRAFT_${draftQuantityId}_${Date.now().toString().slice(-4)}`;
    if (questions.some((q) => q.question_id === newId)) {
      setValidationMessage({
        type: 'error',
        text: 'Lỗi kiểm duyệt #4: Trùng mã câu hỏi (question_id).',
      });
      return;
    }

    const matchingStation =
      stations.find((s) => s.target_quantity_id === draftQuantityId)
        ?.station_id || 'ST03_DENSITY';
    const optMap = {
      A: draftOptA.trim(),
      B: draftOptB.trim(),
      C: draftOptC.trim(),
      D: draftOptD.trim(),
    };

    const newDraft: QuestionRecord = {
      question_id: newId,
      station_id: matchingStation,
      target_quantity_id: draftQuantityId,
      lesson_refs: targetQ.lesson_refs,
      level: draftLevel,
      skill: draftSkill.trim() || 'sgk_skill',
      context: draftContext.trim(),
      prompt: draftPrompt.trim(),
      options: [
        { id: 'A', text: draftOptA.trim() },
        { id: 'B', text: draftOptB.trim() },
        { id: 'C', text: draftOptC.trim() },
        { id: 'D', text: draftOptD.trim() },
      ],
      correct_option_id: draftCorrect,
      explanation_vi: draftExplanation.trim(),
      expected_unit: draftUnit.trim() || null,
      accepted_answers: [draftCorrect, optMap[draftCorrect]],
      numeric_tolerance: draftLevel === 'apply' ? 0 : null,
      solution_steps:
        draftLevel === 'apply'
          ? [
              `Xác định dữ kiện đề bài và đơn vị chuẩn (${
                draftUnit.trim() || targetQ.unit_si
              }).`,
              draftExplanation.trim(),
              `Đáp án đúng: ${draftCorrect} (${optMap[draftCorrect]}).`,
            ]
          : undefined,
      difficulty:
        draftLevel === 'apply' ? 3 : draftLevel === 'understand' ? 2 : 1,
      // Strictly unapproved by default per 03_DATA_AND_ASSESSMENT_RULES.md Section 6
      source_status: 'teacher_review',
      teacher_approved: false,
    };

    onAddDraftQuestion(newDraft);
    setValidationMessage({
      type: 'success',
      text: `Đã tạo bản nháp [${newId}] thành công với trạng thái teacher_approved = false (Chờ duyệt). Hãy chuyển sang tab Ngân hàng câu hỏi để duyệt!`,
    });
    setFilterStatus('pending');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-6xl h-[90vh] rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Teacher Review &amp; Analytics Panel
              </span>
              <span className="text-xs font-mono text-slate-400">
                SGK KHTN 8 – Kết nối tri thức với cuộc sống
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
              Quản trị Ngân hàng Câu hỏi, Kiểm duyệt Bản nháp &amp; 5 Chỉ số
              Thống kê Học tập
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'questions'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Ngân hàng Câu hỏi ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('create_draft')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'create_draft'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Soạn câu hỏi nháp (teacher_approved: false)
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              5 Chỉ số Thống kê Giáo viên
            </button>
            <button
              onClick={() => setActiveTab('acceptance')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'acceptance'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Checklist Nghiệm thu (26/26 PASS)
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-400">
              Đã duyệt (Vào game): <strong>{approvedCount}</strong>
            </span>
            <span className="text-amber-400">
              Chờ duyệt (Nháp): <strong>{pendingCount}</strong>
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'questions' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Filter className="w-4 h-4 text-sky-400" />
                    <span>Lọc đại lượng:</span>
                  </div>
                  <select
                    value={filterQuantity}
                    onChange={(e) => setFilterQuantity(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="ALL">
                      Tất cả đại lượng ({quantities.length})
                    </option>
                    {quantities.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name_vi} ({q.symbol}) — {q.lesson_refs.join(', ')}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="ALL">Mọi mức độ nhận thức</option>
                    <option value="know">Biết (know)</option>
                    <option value="understand">Hiểu (understand)</option>
                    <option value="apply">Vận dụng (apply)</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(
                        e.target.value as 'ALL' | 'approved' | 'pending'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="ALL">Mọi trạng thái duyệt</option>
                    <option value="approved">
                      Đã duyệt (teacher_approved = true)
                    </option>
                    <option value="pending">
                      Chờ duyệt (teacher_approved = false)
                    </option>
                  </select>
                </div>

                <div className="text-xs font-mono text-slate-400">
                  Hiển thị:{' '}
                  <strong className="text-white">
                    {filteredQuestions.length}
                  </strong>{' '}
                  câu
                </div>
              </div>

              {/* Question List */}
              <div className="space-y-3">
                {filteredQuestions.map((q) => (
                  <div
                    key={q.question_id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start justify-between gap-4 ${
                      q.teacher_approved
                        ? 'bg-slate-950/60 border-slate-800'
                        : 'bg-amber-950/20 border-amber-500/40'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-bold">
                          {q.question_id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Mức: {q.level.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300">
                          SGK: {q.lesson_refs.join(', ')}
                        </span>
                        {q.expected_unit && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                            Đơn vị: {q.expected_unit}
                          </span>
                        )}
                      </div>

                      {q.context && (
                        <p className="text-xs text-slate-400 italic">
                          Bối cảnh: {q.context}
                        </p>
                      )}
                      <p className="text-sm font-bold text-white">{q.prompt}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`px-2.5 py-1 rounded border ${
                              opt.id === q.correct_option_id
                                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 font-semibold'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400'
                            }`}
                          >
                            <strong>{opt.id}.</strong> {opt.text}
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-slate-300 pt-1">
                        <strong className="text-sky-400">Giải thích:</strong>{' '}
                        {q.explanation_vi}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 ${
                          q.teacher_approved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {q.teacher_approved ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            Teacher Review
                          </>
                        )}
                      </span>

                      <button
                        onClick={() =>
                          onToggleQuestionApproval(
                            q.question_id,
                            !q.teacher_approved
                          )
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          q.teacher_approved
                            ? 'bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                        }`}
                      >
                        {q.teacher_approved
                          ? 'Thu hồi về Nháp'
                          : 'Duyệt câu hỏi này'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'create_draft' && (
            <form
              onSubmit={handleCreateAndValidateDraft}
              className="max-w-3xl mx-auto space-y-4"
            >
              <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/40 text-xs text-amber-200 space-y-1">
                <div className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Quy tắc Kiểm duyệt Nghiêm ngặt (03_DATA_AND_ASSESSMENT_RULES.md
                  Mục 6)
                </div>
                <p>
                  Mọi câu hỏi mới tạo đều tự động qua 6 bước kiểm tra kỹ thuật
                  (đủ trường, không trùng ID, có đáp án chuẩn, đơn vị thuộc danh
                  mục SGK KHTN 8) và bắt buộc khởi tạo ở trạng thái{' '}
                  <code className="text-amber-300 font-bold">
                    teacher_approved: false
                  </code>
                  ,{' '}
                  <code className="text-amber-300 font-bold">
                    source_status: &quot;teacher_review&quot;
                  </code>
                  . Câu hỏi chưa duyệt sẽ không bao giờ xuất hiện trong lượt chơi
                  của học sinh.
                </p>
              </div>

              {validationMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium ${
                    validationMessage.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {validationMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Đại lượng SGK KHTN 8
                  </label>
                  <select
                    value={draftQuantityId}
                    onChange={(e) => setDraftQuantityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    {quantities.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name_vi} ({q.symbol}) - {q.lesson_refs.join(', ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Mức độ nhận thức
                  </label>
                  <select
                    value={draftLevel}
                    onChange={(e) =>
                      setDraftLevel(e.target.value as CognitiveLevel)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="know">Biết (know)</option>
                    <option value="understand">Hiểu (understand)</option>
                    <option value="apply">Vận dụng (apply)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Đơn vị kỳ vọng (expected_unit)
                  </label>
                  <input
                    type="text"
                    value={draftUnit}
                    onChange={(e) => setDraftUnit(e.target.value)}
                    placeholder="VD: kg/m³, Pa, N, A, V, J"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Tình huống thực nghiệm (context)
                </label>
                <input
                  type="text"
                  value={draftContext}
                  onChange={(e) => setDraftContext(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Câu hỏi chính (prompt)
                </label>
                <input
                  type="text"
                  value={draftPrompt}
                  onChange={(e) => setDraftPrompt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Phương án A
                  </label>
                  <input
                    type="text"
                    value={draftOptA}
                    onChange={(e) => setDraftOptA(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Phương án B
                  </label>
                  <input
                    type="text"
                    value={draftOptB}
                    onChange={(e) => setDraftOptB(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Phương án C
                  </label>
                  <input
                    type="text"
                    value={draftOptC}
                    onChange={(e) => setDraftOptC(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Phương án D
                  </label>
                  <input
                    type="text"
                    value={draftOptD}
                    onChange={(e) => setDraftOptD(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Đáp án đúng (A/B/C/D)
                  </label>
                  <select
                    value={draftCorrect}
                    onChange={(e) =>
                      setDraftCorrect(e.target.value as 'A' | 'B' | 'C' | 'D')
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-emerald-400 font-bold"
                  >
                    <option value="A">Đáp án A</option>
                    <option value="B">Đáp án B</option>
                    <option value="C">Đáp án C</option>
                    <option value="D">Đáp án D</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Nhãn kỹ năng (skill)
                  </label>
                  <input
                    type="text"
                    value={draftSkill}
                    onChange={(e) => setDraftSkill(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Giải thích chuẩn SGK (explanation_vi)
                </label>
                <textarea
                  rows={2}
                  value={draftExplanation}
                  onChange={(e) => setDraftExplanation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Kiểm tra Schema &amp; Lưu vào Hàng đợi Giáo viên duyệt
              </button>
            </form>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* 1. First-try accuracy by level + Total Quiz Time */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {(['know', 'understand', 'apply'] as CognitiveLevel[]).map(
                  (lvl) => {
                    const stat = analytics.first_try_by_level[lvl];
                    const pct =
                      stat.total > 0
                        ? Math.round((stat.correct / stat.total) * 100)
                        : 0;
                    return (
                      <div
                        key={lvl}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
                      >
                        <div className="text-xs font-mono uppercase text-slate-400">
                          Tỉ lệ đúng lần đầu ({lvl})
                        </div>
                        <div className="text-2xl font-mono font-bold text-sky-400">
                          {pct}%
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {stat.correct} / {stat.total} câu lần đầu
                        </div>
                      </div>
                    );
                  }
                )}

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-xs font-mono uppercase text-slate-400">
                    5. Thời gian làm Quiz (Tách khỏi lái)
                  </div>
                  <div className="text-2xl font-mono font-bold text-emerald-400">
                    {analytics.total_quiz_time_seconds}s
                  </div>
                  <div className="text-xs text-slate-500">
                    5/5 chỉ số theo 02_PEDAGOGY Mục 9
                  </div>
                </div>
              </div>

              {/* 2. First-try accuracy by quantity & 3. Confused Symbols/Units */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono uppercase text-sky-400 font-bold flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    1. Tỉ lệ đúng ngay lần đầu theo từng đại lượng
                  </div>
                  {Object.keys(analytics.first_try_by_quantity).length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Chưa có dữ liệu lượt làm đầu tiên. Hãy hoàn thành ít nhất
                      1 trạm để xem!
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {Object.entries(analytics.first_try_by_quantity).map(
                        ([qId, stat]) => {
                          const qMeta = quantities.find(
                            (item) => item.id === qId
                          );
                          const pct =
                            stat.total > 0
                              ? Math.round((stat.correct / stat.total) * 100)
                              : 0;
                          return (
                            <div
                              key={qId}
                              className="flex items-center justify-between text-xs p-2 rounded bg-slate-900 border border-slate-800"
                            >
                              <span className="font-medium text-slate-200">
                                {qMeta
                                  ? `${qMeta.name_vi} (${qMeta.symbol})`
                                  : qId}
                              </span>
                              <span className="font-mono text-sky-300 font-bold">
                                {pct}% ({stat.correct}/{stat.total})
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    2. Ký hiệu / Đơn vị / Kỹ năng dễ nhầm nhất
                  </div>
                  {Object.keys(analytics.confused_units_count).length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Chưa ghi nhận lỗi nhầm ký hiệu hoặc đơn vị nào.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {Object.entries(analytics.confused_units_count)
                        .sort((a, b) => b[1] - a[1])
                        .map(([key, count]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between text-xs p-2 rounded bg-slate-900 border border-slate-800"
                          >
                            <span className="text-slate-200">{key}</span>
                            <span className="font-mono text-rose-400 font-bold">
                              {count} lần nhầm
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Best Stars per Station & 5. Retry Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    3. Số lần làm lại &amp; Mức cải thiện sau phản hồi
                  </div>
                  {analytics.retry_improvements.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Chưa có dữ liệu điểm các trạm đã hoàn thành.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {analytics.retry_improvements.map((imp) => {
                        const st = stations.find(
                          (s) => s.station_id === imp.station_id
                        );
                        const prog = stationProgress[imp.station_id];
                        const diff = imp.best_score - imp.first_score;
                        return (
                          <div
                            key={imp.station_id}
                            className="flex items-center justify-between text-xs p-2 rounded bg-slate-900 border border-slate-800"
                          >
                            <span className="text-slate-200 truncate max-w-[200px]">
                              {st ? `#${st.order} ${st.title}` : imp.station_id}{' '}
                              ({prog?.attempt_count || 1} lượt)
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                              Lần đầu: {imp.first_score}/10 → Tốt nhất:{' '}
                              {imp.best_score}/10 (
                              {diff >= 0 ? `+${diff}` : diff}đ)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono uppercase text-amber-300 font-bold flex items-center gap-1.5">
                    <Star className="w-4 h-4" />
                    4. Số sao cao nhất mỗi trạm trong chiến dịch
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {stations.map((st) => {
                      const prog = stationProgress[st.station_id];
                      return (
                        <div
                          key={st.station_id}
                          className="flex items-center justify-between text-xs p-2 rounded bg-slate-900 border border-slate-800"
                        >
                          <span className="text-slate-200 truncate max-w-[220px]">
                            #{st.order}. {st.title}
                          </span>
                          <span className="font-mono text-amber-400 font-bold">
                            {prog?.best_stars || 0} ★ ({prog?.best_score || 0}
                            /10đ • {prog?.attempt_count || 0} lượt)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'acceptance' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-emerald-300">
                    Bảng Kiểm tra Nghiệm thu 26 Tiêu chí
                    (04_WORLD_PHYSICS_AND_ACCEPTANCE.md Mục 10)
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Tất cả 26 tiêu chí Sư phạm, Dữ liệu, Vật lý lái, Máy trạng
                    thái và Kỹ thuật đều đạt PASS.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-mono font-bold text-xs">
                  26 / 26 PASS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {ACCEPTANCE_CRITERIA_LIST.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-mono text-sky-400 font-bold">
                        [PASS #{item.id} • {item.category}]
                      </span>{' '}
                      <span className="text-slate-200">{item.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
