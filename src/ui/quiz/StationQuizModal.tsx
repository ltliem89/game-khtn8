import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Calculator,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  Award,
  Volume2,
  Atom,
  Sparkles,
  Coins,
  Shield,
  Flame,
} from 'lucide-react';
import {
  CognitiveLevel,
  QuantityRecord,
  QuestionRecord,
  RewardWallet,
  StationRecord,
} from '../../types/game';
import { INITIAL_QUANTITIES } from '../../content/quantities';
import {
  buildInternationalSpeechText,
  getPronunciationByQuantityId,
} from '../../content/chemistryElementsCompounds';
import { soundEngine } from '../../game/audio/soundEngine';
import { PhysicsDiagramSvg } from './PhysicsDiagramSvg';

interface StationQuizModalProps {
  station: StationRecord;
  quantity?: QuantityRecord;
  questions: QuestionRecord[];
  wallet?: RewardWallet;
  onUseQuizPowerUp?: (type: 'hint5050' | 'aiHint' | 'streakShield') => boolean;
  onAwardQuizCoins?: (coinsDelta: number) => void;
  onOpenPronunciationModal?: () => void;
  onCompleteQuiz: (
    score: number,
    wrongQuestionIds: string[],
    weakObjectives: string[],
    durationSeconds: number,
    firstTryByLevel: Record<
      CognitiveLevel,
      { correct: number; total: number }
    >,
    firstTryByQuantity: Record<string, { correct: number; total: number }>,
    confusedUnitsDelta: Record<string, number>
  ) => void;
}

const LEVEL_BADGE: Record<
  CognitiveLevel,
  { label: string; colorClass: string; desc: string }
> = {
  know: {
    label: 'Mức Biết (4 câu)',
    colorClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    desc: 'Nhận biết ký hiệu, đơn vị chuẩn SI, dụng cụ đo và định nghĩa SGK',
  },
  understand: {
    label: 'Mức Hiểu (3 câu)',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'Giải thích mối quan hệ giữa các đại lượng và hiện tượng thực tế',
  },
  apply: {
    label: 'Mức Vận dụng (3 câu)',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: 'Tính toán định lượng 1–2 bước hoặc giải quyết bài toán thực nghiệm',
  },
};

interface LocalAnswerEntry {
  question_id: string;
  selected_option_id: 'A' | 'B' | 'C' | 'D';
  is_correct: boolean;
  level: CognitiveLevel;
  skill: string;
  target_quantity_id: string;
  expected_unit: string | null;
}

export const StationQuizModal: React.FC<StationQuizModalProps> = ({
  station,
  quantity: stationQuantity,
  questions,
  wallet,
  onUseQuizPowerUp,
  onAwardQuizCoins,
  onOpenPronunciationModal,
  onCompleteQuiz,
}) => {
  const [showBriefingCard, setShowBriefingCard] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<
    'A' | 'B' | 'C' | 'D' | null
  >(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<LocalAnswerEntry[]>([]);
  const [startTimeMs, setStartTimeMs] = useState<number>(() => Date.now());
  const [streakCount, setStreakCount] = useState(0);
  const [eliminatedOptions, setEliminatedOptions] = useState<
    ('A' | 'B' | 'C' | 'D')[]
  >([]);
  const [aiHintRevealed, setAiHintRevealed] = useState(false);
  const [powerUpMessage, setPowerUpMessage] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex];
  const quantity =
    INITIAL_QUANTITIES.find(
      (q) => q.id === (currentQuestion?.target_quantity_id || station.target_quantity_id)
    ) || stationQuantity;
  const pronItem = getPronunciationByQuantityId(
    currentQuestion?.target_quantity_id || station.target_quantity_id
  );

  // Keyboard shortcuts 1/2/3/4 or A/B/C/D and Enter
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showBriefingCard) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          soundEngine.playStepClick();
          setShowBriefingCard(false);
          setStartTimeMs(Date.now());
        }
        return;
      }

      if (!confirmed) {
        if (
          (e.key === '1' || e.key.toUpperCase() === 'A') &&
          !eliminatedOptions.includes('A')
        ) {
          setSelectedOption('A');
          soundEngine.playStepClick();
        } else if (
          (e.key === '2' || e.key.toUpperCase() === 'B') &&
          !eliminatedOptions.includes('B')
        ) {
          setSelectedOption('B');
          soundEngine.playStepClick();
        } else if (
          (e.key === '3' || e.key.toUpperCase() === 'C') &&
          !eliminatedOptions.includes('C')
        ) {
          setSelectedOption('C');
          soundEngine.playStepClick();
        } else if (
          (e.key === '4' || e.key.toUpperCase() === 'D') &&
          !eliminatedOptions.includes('D')
        ) {
          setSelectedOption('D');
          soundEngine.playStepClick();
        } else if (e.code === 'Enter' && selectedOption) {
          e.preventDefault();
          handleConfirmAnswer();
        }
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (!currentQuestion) return null;

  const handleActivate5050 = () => {
    if (confirmed || eliminatedOptions.length > 0) return;
    if (onUseQuizPowerUp && !onUseQuizPowerUp('hint5050')) {
      soundEngine.playOffLaneWarning();
      setPowerUpMessage(
        'Bạn đã hết Thẻ Radar 50/50 và không đủ 35 Xu để kích hoạt!'
      );
      return;
    }
    soundEngine.playRewardUnlock();
    const wrongOpts = currentQuestion.options
      .map((o) => o.id)
      .filter((id) => id !== currentQuestion.correct_option_id);
    // Shuffle wrong options and eliminate 2 of them
    const shuffledWrong = [...wrongOpts].sort(() => Math.random() - 0.5);
    const toEliminate = shuffledWrong.slice(0, 2);
    setEliminatedOptions(toEliminate);
    if (selectedOption && toEliminate.includes(selectedOption)) {
      setSelectedOption(null);
    }
    setPowerUpMessage(
      `Radar 50/50 đã quét và loại bỏ 2 phương án nhiễu (${toEliminate.join(', ')})!`
    );
  };

  const handleActivateAiHint = () => {
    if (confirmed || aiHintRevealed) return;
    if (onUseQuizPowerUp && !onUseQuizPowerUp('aiHint')) {
      soundEngine.playOffLaneWarning();
      setPowerUpMessage(
        'Bạn đã hết Thẻ Cố Vấn SGK và không đủ 25 Xu để kích hoạt!'
      );
      return;
    }
    soundEngine.playRewardUnlock();
    setAiHintRevealed(true);
    setPowerUpMessage('Đã mở Cố Vấn Công Thức SGK cho câu hỏi này!');
  };

  const handleConfirmAnswer = () => {
    if (!selectedOption || confirmed) return;
    const isCorrect = selectedOption === currentQuestion.correct_option_id;
    if (isCorrect) {
      soundEngine.playCorrectAnswer();
      const nextStreak = streakCount + 1;
      setStreakCount(nextStreak);
      const scannerLvl = wallet?.upgrades.scannerLevel || 1;
      const baseCoins = 10 + (scannerLvl - 1) * 5;
      const streakBonus = nextStreak >= 3 ? 10 : nextStreak === 2 ? 5 : 0;
      const totalEarned = baseCoins + streakBonus;
      onAwardQuizCoins?.(totalEarned);
      setPowerUpMessage(
        `Chính xác! +${totalEarned} Xu Công Nghệ ${
          nextStreak >= 2 ? `(Combo x${nextStreak} 🔥)` : ''
        }`
      );
    } else {
      soundEngine.playWrongAnswer();
      if (streakCount >= 2 && onUseQuizPowerUp && onUseQuizPowerUp('streakShield')) {
        setPowerUpMessage(
          `Khiên Bảo Toàn đã kích hoạt! Giữ nguyên chuỗi Combo x${streakCount}!`
        );
      } else {
        setStreakCount(0);
      }
    }

    const record: LocalAnswerEntry = {
      question_id: currentQuestion.question_id,
      selected_option_id: selectedOption,
      is_correct: isCorrect,
      level: currentQuestion.level,
      skill: currentQuestion.skill,
      target_quantity_id: currentQuestion.target_quantity_id,
      expected_unit: currentQuestion.expected_unit,
    };

    setAnswers((prev) => [...prev, record]);
    setConfirmed(true);
  };

  const handleNextQuestion = () => {
    soundEngine.playStepClick();
    setEliminatedOptions([]);
    setAiHintRevealed(false);
    setPowerUpMessage(null);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setConfirmed(false);
    } else {
      const elapsedSeconds = Math.max(
        1,
        Math.round((Date.now() - startTimeMs) / 1000)
      );
      const score = answers.filter((a) => a.is_correct).length;
      const wrongIds = answers
        .filter((a) => !a.is_correct)
        .map((a) => a.question_id);

      // Build 2-3 specific weak objectives / mistakes to review
      const weakSet = new Set<string>();
      answers
        .filter((a) => !a.is_correct)
        .forEach((ans) => {
          const qObj = questions.find((q) => q.question_id === ans.question_id);
          if (qObj) {
            weakSet.add(
              `[${qObj.level.toUpperCase()} • ${qObj.skill}] ${qObj.explanation_vi}`
            );
          }
        });
      const weakObjectives = Array.from(weakSet).slice(0, 3);

      const firstTryByLevel: Record<
        CognitiveLevel,
        { correct: number; total: number }
      > = {
        know: { correct: 0, total: 0 },
        understand: { correct: 0, total: 0 },
        apply: { correct: 0, total: 0 },
      };

      const firstTryByQuantity: Record<
        string,
        { correct: number; total: number }
      > = {};
      const confusedUnitsDelta: Record<string, number> = {};

      answers.forEach((ans) => {
        firstTryByLevel[ans.level].total += 1;
        if (ans.is_correct) {
          firstTryByLevel[ans.level].correct += 1;
        }

        if (!firstTryByQuantity[ans.target_quantity_id]) {
          firstTryByQuantity[ans.target_quantity_id] = { correct: 0, total: 0 };
        }
        firstTryByQuantity[ans.target_quantity_id].total += 1;
        if (ans.is_correct) {
          firstTryByQuantity[ans.target_quantity_id].correct += 1;
        } else {
          const qMeta = INITIAL_QUANTITIES.find(
            (item) => item.id === ans.target_quantity_id
          );
          const unitOrSymbolKey = ans.expected_unit
            ? `Đơn vị ${ans.expected_unit} (${qMeta?.symbol || ans.target_quantity_id})`
            : `Ký hiệu ${qMeta?.symbol || ans.target_quantity_id} (${ans.skill})`;
          confusedUnitsDelta[unitOrSymbolKey] =
            (confusedUnitsDelta[unitOrSymbolKey] || 0) + 1;
        }
      });

      onCompleteQuiz(
        score,
        wrongIds,
        weakObjectives,
        elapsedSeconds,
        firstTryByLevel,
        firstTryByQuantity,
        confusedUnitsDelta
      );
    }
  };

  // Phase 1: Concise Pre-Station SGK Briefing Card (04_WORLD_PHYSICS_AND_ACCEPTANCE.md Section 6: briefing -> quiz)
  if (showBriefingCard) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="w-full max-w-2xl rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100">
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-mono font-bold text-lg text-slate-950 shadow-md"
                style={{ backgroundColor: station.accent_color || '#38bdf8' }}
              >
                #{station.order}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
                    {station.chapter_label} • {station.lesson_refs.join(', ')}
                  </span>
                  {station.station_type === 'foundation' && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Kiến thức nền (Foundation)
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  {station.title}
                </h2>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-[11px] text-slate-400">LOẠI TRẠM</div>
              <div className="text-xs font-bold text-sky-300">
                {station.type_label_vi}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Visual Instrument / Phenomenon SVG */}
            <PhysicsDiagramSvg quantityId={station.target_quantity_id} />

            {/* Core Quantity Summary (Interactive: Click to auto-pronounce in International English) */}
            {quantity && (
              <div
                onClick={() => {
                  if (pronItem) {
                    soundEngine.speakEnglishAuto(
                      buildInternationalSpeechText(pronItem, true)
                    );
                  }
                }}
                role="button"
                tabIndex={0}
                title="Chạm để nghe phát âm tiếng Anh chuẩn quốc tế (Web Speech API)"
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 hover:bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer"
              >
                <div>
                  <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1">
                    <span>Đại lượng &amp; Ký hiệu</span>
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-base font-bold text-white mt-1">
                    {quantity.name_vi}{' '}
                    <span className="font-mono text-sky-400">
                      ({quantity.symbol})
                    </span>
                  </div>
                  {pronItem && (
                    <div className="text-xs font-mono text-cyan-300 mt-0.5">
                      EN: {pronItem.englishName} {pronItem.ipa}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase text-slate-400">
                    Đơn vị SI &amp; Quy đổi
                  </div>
                  <div className="text-base font-mono font-bold text-emerald-400 mt-1">
                    {quantity.unit_si}
                  </div>
                  {quantity.common_units.length > 0 && (
                    <div className="text-xs text-slate-400 font-mono">
                      Thường gặp: {quantity.common_units.join(', ')}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase text-slate-400">
                    Công thức / Quy tắc SGK
                  </div>
                  <div className="text-sm font-mono font-bold text-amber-300 mt-1">
                    {quantity.formula_as_taught}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 mt-1">
                    🔊 Nhấn vào thẻ để nghe đọc tiếng Anh chuẩn SI
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-300">
                <BookOpen className="w-4 h-4" />
                Mục tiêu học tập &amp; Bối cảnh thực tế (Briefing)
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                <strong>Mục tiêu:</strong> {station.learning_objective}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Bối cảnh:</strong> {station.real_life_context}
              </p>
              {quantity && quantity.common_misconceptions.length > 0 && (
                <div className="pt-2 border-t border-sky-500/20">
                  <div className="text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Lưu ý tránh nhầm lẫn:
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {quantity.common_misconceptions.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Assessment Rules Summary */}
            <div className="grid grid-cols-3 gap-2.5 text-center font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60">
                <div className="text-sky-400 font-bold">10 Câu hỏi</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  4 Biết • 3 Hiểu • 3 Vận dụng
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60">
                <div className="text-emerald-400 font-bold">Mở khóa: ≥ 5/10</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  5–6đ: 1★ | 7–8đ: 2★ | 9–10đ: 3★
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60">
                <div className="text-amber-300 font-bold">Độc lập điểm lái</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Điểm kiến thức không cộng điểm lái
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Enter</kbd> để bắt đầu làm bài
            </span>
            <button
              onClick={() => {
                soundEngine.playStepClick();
                setShowBriefingCard(false);
                setStartTimeMs(Date.now());
              }}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer"
            >
              Bắt đầu 10 câu hỏi trạm này
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const levelInfo = LEVEL_BADGE[currentQuestion.level];
  const isCorrect =
    confirmed && selectedOption === currentQuestion.correct_option_id;
  const correctCountSoFar = answers.filter((a) => a.is_correct).length;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-5 bg-slate-950/82 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100 my-auto">
        {/* Top Station & Progress Header */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className="px-2.5 py-1 rounded-md text-xs font-mono font-bold text-slate-950"
              style={{ backgroundColor: station.accent_color || '#38bdf8' }}
            >
              Trạm #{station.order}
            </span>
            <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">
              {station.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {wallet && (
              <div className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{wallet.coins} Xu</span>
              </div>
            )}
            {streakCount >= 2 && (
              <div className="px-2.5 py-1 rounded-md bg-orange-500/20 border border-orange-400/40 text-orange-300 font-bold flex items-center gap-1 animate-pulse">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Combo x{streakCount}</span>
              </div>
            )}
            <div className="px-2.5 py-1 rounded-md bg-slate-800 text-emerald-400 font-semibold">
              Đúng: {correctCountSoFar}/{answers.length}
            </div>
            <div className="px-2.5 py-1 rounded-md bg-slate-800 text-sky-300 font-bold">
              Câu {currentIndex + 1} / {questions.length}
            </div>
          </div>
        </div>

        {/* 10-step Segmented Progress Bar */}
        <div className="grid grid-cols-10 gap-1 px-5 pt-3 bg-slate-900">
          {questions.map((q, idx) => {
            const ans = answers[idx];
            let barColor = 'bg-slate-800';
            if (ans) {
              barColor = ans.is_correct ? 'bg-emerald-500' : 'bg-rose-500';
            } else if (idx === currentIndex) {
              barColor = 'bg-sky-400 animate-pulse';
            }
            return (
              <div
                key={q.question_id}
                className={`h-1.5 rounded-full transition-all ${barColor}`}
                title={`Câu ${idx + 1} (${q.level})`}
              />
            );
          })}
        </div>

        {/* Question Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Cognitive Level & SGK Tag Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold border ${levelInfo.colorClass}`}
              >
                {levelInfo.label}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {levelInfo.desc}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded">
              SGK: {currentQuestion.lesson_refs.join(', ')}
            </span>
          </div>

          {/* Visual Diagram Illustration + Quick Formula Reference */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-7">
              <PhysicsDiagramSvg
                quantityId={currentQuestion.target_quantity_id}
              />
            </div>
            <div
              onClick={() => {
                if (pronItem) {
                  soundEngine.speakEnglishAuto(
                    buildInternationalSpeechText(pronItem, true)
                  );
                }
              }}
              role="button"
              tabIndex={0}
              title="Chạm để nghe đọc thuật ngữ tiếng Anh chuẩn quốc tế của đại lượng này"
              className="md:col-span-5 flex flex-col justify-between h-full p-3 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800/90 hover:border-cyan-500/50 space-y-1.5 text-xs transition cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1.5 text-slate-300 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Tra cứu đại lượng SGK:</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  Đọc EN
                </span>
              </div>
              {quantity && (
                <div className="font-mono text-slate-300 space-y-1">
                  <div>
                    • Tên:{' '}
                    <strong className="text-white">{quantity.name_vi}</strong> (
                    <span className="text-sky-400">{quantity.symbol}</span>)
                  </div>
                  {pronItem && (
                    <div className="text-cyan-300 text-[11px]">
                      • EN: <strong>{pronItem.englishName}</strong>{' '}
                      <span className="text-slate-400">{pronItem.ipa}</span>
                    </div>
                  )}
                  <div>
                    • Đơn vị SI:{' '}
                    <span className="text-emerald-400">{quantity.unit_si}</span>
                  </div>
                  <div>
                    • Công thức:{' '}
                    <span className="text-amber-300 font-bold">
                      {quantity.formula_as_taught}
                    </span>
                  </div>
                </div>
              )}
              {onOpenPronunciationModal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playPronounceChime();
                    onOpenPronunciationModal();
                  }}
                  className="mt-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-cyan-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Atom className="w-3 h-3 text-cyan-400" />
                  <span>Từ điển Phát âm Hóa · Lý · Sinh</span>
                </button>
              )}
              {currentQuestion.expected_unit && (
                <div className="font-mono text-[11px] text-sky-300 pt-1 border-t border-slate-800">
                  Đơn vị kết quả kỳ vọng:{' '}
                  <strong>{currentQuestion.expected_unit}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Context & Question Prompt */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            {currentQuestion.context && (
              <div className="text-xs text-sky-300/90 font-medium flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Tình huống: {currentQuestion.context}</span>
              </div>
            )}
            <p className="text-base sm:text-lg font-bold text-white leading-snug">
              {currentQuestion.prompt}
            </p>
          </div>

          {/* Tech Power-Ups Bar (50/50 Radar & AI Formula Hint) */}
          {!confirmed && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-mono text-sky-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Trợ quyền Công nghệ:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={eliminatedOptions.length > 0}
                  onClick={handleActivate5050}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    eliminatedOptions.length > 0
                      ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-sky-950/90 hover:bg-sky-900 border-sky-500/40 text-sky-200'
                  }`}
                >
                  <span>🎯 Radar 50/50</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                    {wallet && wallet.hint5050Charges > 0
                      ? `${wallet.hint5050Charges} thẻ`
                      : '35 Xu'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={aiHintRevealed}
                  onClick={handleActivateAiHint}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    aiHintRevealed
                      ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cố vấn SGK</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                    {wallet && wallet.aiHintCharges > 0
                      ? `${wallet.aiHintCharges} thẻ`
                      : '25 Xu'}
                  </span>
                </button>

                {wallet && wallet.streakShieldCharges > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-[11px] font-mono text-purple-200 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-400" />
                    <span>Khiên Combo: {wallet.streakShieldCharges}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {powerUpMessage && (
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-mono flex items-center justify-between">
              <span>{powerUpMessage}</span>
            </div>
          )}

          {aiHintRevealed && !confirmed && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-100 space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                <span>Gợi ý từ Cố Vấn Công Thức SGK:</span>
              </div>
              <p className="leading-relaxed">{currentQuestion.explanation_vi}</p>
            </div>
          )}

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((opt, idx) => {
              const isEliminated = eliminatedOptions.includes(opt.id);
              const isSelected = selectedOption === opt.id;
              const isRightOption =
                opt.id === currentQuestion.correct_option_id;

              let cardStyle =
                'bg-slate-800/60 border-slate-700/80 hover:border-sky-400/60 hover:bg-slate-800 text-slate-100';
              if (isEliminated && !confirmed) {
                cardStyle =
                  'bg-slate-950/40 border-slate-800/50 text-slate-600 opacity-40 line-through cursor-not-allowed';
              } else if (!confirmed && isSelected) {
                cardStyle =
                  'bg-sky-500/20 border-sky-400 text-white ring-2 ring-sky-400/30';
              } else if (confirmed) {
                if (isRightOption) {
                  cardStyle =
                    'bg-emerald-500/20 border-emerald-400 text-emerald-100 ring-2 ring-emerald-400/30';
                } else if (isSelected && !isRightOption) {
                  cardStyle =
                    'bg-rose-500/20 border-rose-400 text-rose-100 ring-2 ring-rose-400/30';
                } else {
                  cardStyle =
                    'bg-slate-900/50 border-slate-800 text-slate-500 opacity-65';
                }
              }

              return (
                <button
                  key={opt.id}
                  disabled={confirmed || isEliminated}
                  onClick={() => {
                    if (!confirmed && !isEliminated) {
                      soundEngine.playStepClick();
                      setSelectedOption(opt.id);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${cardStyle}`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                      !confirmed && isSelected
                        ? 'bg-sky-400 text-slate-950'
                        : confirmed && isRightOption
                        ? 'bg-emerald-400 text-slate-950'
                        : confirmed && isSelected
                        ? 'bg-rose-400 text-slate-950'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug break-words">
                      {opt.text}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      {isEliminated
                        ? 'Đã loại bởi Radar 50/50'
                        : `Phím tắt: ${idx + 1} hoặc ${opt.id}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Immediate Deterministic Feedback Panel (01_MASTER_CONTROL_PROMPT.md Section E) */}
          {confirmed && (
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                isCorrect
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">
                        Chính xác! (+1 điểm kiến thức trạm)
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span className="text-rose-300">
                        Chưa chính xác! Đáp án đúng là{' '}
                        {currentQuestion.correct_option_id}.
                      </span>
                    </>
                  )}
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900/70 text-slate-300">
                  Kỹ năng: {currentQuestion.skill}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                <strong className="text-white">Giải thích SGK:</strong>{' '}
                {currentQuestion.explanation_vi}
              </p>

              {/* Step-by-step calculation guide for apply questions */}
              {currentQuestion.solution_steps &&
                currentQuestion.solution_steps.length > 0 && (
                  <div className="pt-2 border-t border-slate-700/50 text-xs text-slate-300 space-y-1">
                    <div className="font-semibold text-sky-300 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Các bước giải chuẩn:
                    </div>
                    <ol className="list-decimal list-inside space-y-0.5 font-mono text-[11px]">
                      {currentQuestion.solution_steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

              {/* Common Misconception Warning when wrong */}
              {!isCorrect &&
                quantity &&
                quantity.common_misconceptions.length > 0 && (
                  <div className="pt-2 border-t border-rose-500/30 text-xs text-amber-200 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Cảnh báo lỗi thường gặp:</strong>{' '}
                      {quantity.common_misconceptions[0]}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Mốc đạt trạm: ≥ 5/10 câu đúng (tối thiểu 1 sao)</span>
          </div>

          {!confirmed ? (
            <button
              disabled={!selectedOption}
              onClick={handleConfirmAnswer}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
                selectedOption
                  ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Chốt đáp án (Enter)
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              {currentIndex + 1 < questions.length
                ? 'Câu tiếp theo (Enter)'
                : 'Xem kết quả trạm'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
