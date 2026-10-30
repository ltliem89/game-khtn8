import React, { useState, useEffect, useRef } from 'react';
import {
  FAMILIAR_ELEMENTS_AND_COMPOUNDS,
  ChemicalSubstanceItem,
  ScienceSubjectCategory,
  buildInternationalSpeechText,
} from '../../content/chemistryElementsCompounds';
import { soundEngine } from '../../game/audio/soundEngine';
import {
  Atom,
  Volume2,
  Repeat,
  CheckCircle2,
  Sparkles,
  Search,
  Square,
  Play,
  BookOpen,
  Globe,
  Zap,
  Dna,
  FlaskConical,
} from 'lucide-react';

interface ElementsCompoundsModalProps {
  initialCategory?: 'all' | ScienceSubjectCategory;
  onClose: () => void;
}

export const ElementsCompoundsModal: React.FC<ElementsCompoundsModalProps> = ({
  initialCategory = 'all',
  onClose,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | ScienceSubjectCategory>(
    initialCategory
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [repeatCountSetting, setRepeatCountSetting] = useState<number>(1);
  const [voiceLocale, setVoiceLocale] = useState<'en-US' | 'en-GB'>('en-US');
  const [speechRate, setSpeechRate] = useState<number>(0.94);
  const [autoSpeakOnInteract, setAutoSpeakOnInteract] = useState<boolean>(true);
  const [autoSpeakOnHover, setAutoSpeakOnHover] = useState<boolean>(false);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [currentRepeatStep, setCurrentRepeatStep] = useState<number>(0);
  const [totalRepeatTarget, setTotalRepeatTarget] = useState<number>(1);
  const [masteredIds, setMasteredIds] = useState<Record<string, number>>({});
  const [includeSentence, setIncludeSentence] = useState<boolean>(true);
  const [isAutoReadingAll, setIsAutoReadingAll] = useState<boolean>(false);

  const autoReadStopRef = useRef<boolean>(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  const filteredItems = FAMILIAR_ELEMENTS_AND_COMPOUNDS.filter((item) => {
    const matchCategory = filterCategory === 'all' || item.category === filterCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.englishName.toLowerCase().includes(q) ||
      item.vietnameseName.toLowerCase().includes(q) ||
      item.formula.toLowerCase().includes(q) ||
      item.subType.toLowerCase().includes(q) ||
      item.subjectLabel.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  useEffect(() => {
    // Pre-warm browser Web Speech API voices list
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      autoReadStopRef.current = true;
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      soundEngine.stopSpeech();
    };
  }, []);

  const triggerSpeakItem = (
    item: ChemicalSubstanceItem,
    count = repeatCountSetting
  ) => {
    autoReadStopRef.current = true;
    setIsAutoReadingAll(false);
    setSelectedCardId(item.id);
    setActiveSpeakingId(item.id);
    setCurrentRepeatStep(1);
    setTotalRepeatTarget(count);

    const textToSpeak = buildInternationalSpeechText(item, includeSentence);

    if (count <= 1) {
      soundEngine.speakEnglishAuto(textToSpeak, {
        lang: voiceLocale,
        rate: speechRate,
        onEnd: () => {
          setActiveSpeakingId(null);
          setCurrentRepeatStep(0);
          setMasteredIds((prev) => ({
            ...prev,
            [item.id]: (prev[item.id] || 0) + 1,
          }));
        },
      });
    } else {
      soundEngine.speakEnglishRepeated(
        textToSpeak,
        count,
        (current) => {
          setCurrentRepeatStep(current);
        },
        () => {
          setActiveSpeakingId(null);
          setCurrentRepeatStep(0);
          setMasteredIds((prev) => ({
            ...prev,
            [item.id]: (prev[item.id] || 0) + count,
          }));
        },
        speechRate,
        voiceLocale
      );
    }
  };

  const handleCardInteract = (item: ChemicalSubstanceItem) => {
    setSelectedCardId(item.id);
    if (autoSpeakOnInteract) {
      triggerSpeakItem(item, repeatCountSetting);
    } else {
      soundEngine.playStepClick();
    }
  };

  const handleCardMouseEnter = (item: ChemicalSubstanceItem) => {
    if (!autoSpeakOnHover || isAutoReadingAll) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => {
      triggerSpeakItem(item, 1);
    }, 220);
  };

  const handleStopSpeaking = () => {
    autoReadStopRef.current = true;
    setIsAutoReadingAll(false);
    setActiveSpeakingId(null);
    setCurrentRepeatStep(0);
    soundEngine.stopSpeech();
  };

  const handleStartAutoReadAll = () => {
    if (filteredItems.length === 0) return;
    autoReadStopRef.current = false;
    setIsAutoReadingAll(true);

    const readNextItem = (idx: number) => {
      if (autoReadStopRef.current || idx >= filteredItems.length) {
        setIsAutoReadingAll(false);
        setActiveSpeakingId(null);
        setCurrentRepeatStep(0);
        return;
      }
      const item = filteredItems[idx];
      const count = Math.max(1, repeatCountSetting);
      setSelectedCardId(item.id);
      setActiveSpeakingId(item.id);
      setCurrentRepeatStep(1);
      setTotalRepeatTarget(count);

      soundEngine.speakEnglishRepeated(
        buildInternationalSpeechText(item, includeSentence),
        count,
        (step) => {
          setCurrentRepeatStep(step);
        },
        () => {
          setMasteredIds((prev) => ({
            ...prev,
            [item.id]: (prev[item.id] || 0) + count,
          }));
          if (!autoReadStopRef.current) {
            readNextItem(idx + 1);
          }
        },
        speechRate,
        voiceLocale
      );
    };

    readNextItem(0);
  };

  const totalMasteredCount = Object.keys(masteredIds).length;
  const countByCat = {
    element: FAMILIAR_ELEMENTS_AND_COMPOUNDS.filter((i) => i.category === 'element').length,
    compound: FAMILIAR_ELEMENTS_AND_COMPOUNDS.filter((i) => i.category === 'compound').length,
    physics: FAMILIAR_ELEMENTS_AND_COMPOUNDS.filter((i) => i.category === 'physics').length,
    biology: FAMILIAR_ELEMENTS_AND_COMPOUNDS.filter((i) => i.category === 'biology').length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 md:p-5 overflow-y-auto pointer-events-auto">
      <div className="w-full max-w-6xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[93vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Atom className="w-6 h-6 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Web Speech API • Chuẩn Quốc Tế (IUPAC • SI • Biology)
                </span>
                <span className="text-xs font-semibold text-emerald-400">
                  Đã tương tác &amp; phát âm: {totalMasteredCount}/{FAMILIAR_ELEMENTS_AND_COMPOUNDS.length} mục
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Phát Âm Tiếng Anh Tự Động KHTN 8: Đơn Chất • Hợp Chất • Vật Lý • Sinh Học
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSpeakingId ? (
              <button
                onClick={handleStopSpeaking}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Dừng đọc ({currentRepeatStep}/{totalRepeatTarget})
              </button>
            ) : (
              <button
                onClick={handleStartAutoReadAll}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Đọc Tự Động Danh Sách Đang Lọc
              </button>
            )}

            <button
              onClick={() => {
                handleStopSpeaking();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Subject Category Tabs + Search */}
        <div className="px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                soundEngine.playStepClick();
                setFilterCategory('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Tất cả ({FAMILIAR_ELEMENTS_AND_COMPOUNDS.length})
            </button>
            <button
              onClick={() => {
                soundEngine.playStepClick();
                setFilterCategory('element');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'element'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Atom className="w-3.5 h-3.5" />
              Đơn chất - Elements ({countByCat.element})
            </button>
            <button
              onClick={() => {
                soundEngine.playStepClick();
                setFilterCategory('compound');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'compound'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Hợp chất - Compounds ({countByCat.compound})
            </button>
            <button
              onClick={() => {
                soundEngine.playStepClick();
                setFilterCategory('physics');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'physics'
                  ? 'bg-sky-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Vật lý - Physics SI ({countByCat.physics})
            </button>
            <button
              onClick={() => {
                soundEngine.playStepClick();
                setFilterCategory('biology');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'biology'
                  ? 'bg-pink-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Dna className="w-3.5 h-3.5" />
              Sinh học - Biology ({countByCat.biology})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm công thức, đại lượng, hệ cơ quan..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:border-cyan-400 focus:outline-none w-64"
            />
          </div>
        </div>

        {/* Web Speech API International Voice Settings Bar */}
        <div className="px-6 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-emerald-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={autoSpeakOnInteract}
                onChange={(e) => setAutoSpeakOnInteract(e.target.checked)}
                className="rounded accent-emerald-400"
              />
              Tự động phát âm tiếng Anh khi chạm/click vào thẻ
            </label>

            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSpeakOnHover}
                onChange={(e) => setAutoSpeakOnHover(e.target.checked)}
                className="rounded accent-cyan-400"
              />
              Tự động đọc khi di chuột qua (Hover)
            </label>

            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSentence}
                onChange={(e) => setIncludeSentence(e.target.checked)}
                className="rounded accent-cyan-400"
              />
              Đọc kèm định nghĩa chuẩn quốc tế
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Voice Accent Standard */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400">Giọng chuẩn:</span>
              {(['en-US', 'en-GB'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setVoiceLocale(loc)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold cursor-pointer ${
                    voiceLocale === loc
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {loc === 'en-US' ? 'US (Mỹ)' : 'UK (Anh - Cambridge)'}
                </button>
              ))}
            </div>

            {/* Speech Speed */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <span className="text-slate-400">Tốc độ:</span>
              {[
                { label: 'Chậm 0.85x', val: 0.85 },
                { label: 'Chuẩn 0.94x', val: 0.94 },
                { label: 'Nhanh 1.05x', val: 1.05 },
              ].map((sp) => (
                <button
                  key={sp.val}
                  onClick={() => setSpeechRate(sp.val)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold cursor-pointer ${
                    speechRate === sp.val
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>

            {/* Repeat count */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <Repeat className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Lặp:</span>
              {[1, 3, 5].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => setRepeatCountSetting(cnt)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold cursor-pointer ${
                    repeatCountSetting === cnt
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cnt}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid of Interactive Cards */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isSpeakingThis = activeSpeakingId === item.id;
            const isSelected = selectedCardId === item.id;
            const timesHeard = masteredIds[item.id] || 0;

            let badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            if (item.category === 'compound') {
              badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            } else if (item.category === 'physics') {
              badgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
            } else if (item.category === 'biology') {
              badgeClass = 'bg-pink-500/20 text-pink-300 border-pink-500/30';
            }

            return (
              <div
                key={item.id}
                onClick={() => handleCardInteract(item)}
                onMouseEnter={() => handleCardMouseEnter(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardInteract(item);
                  }
                }}
                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between cursor-pointer text-left ${
                  isSpeakingThis
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.28)] scale-[1.01]'
                    : isSelected
                    ? 'bg-slate-900 border-sky-500/60'
                    : 'bg-slate-950/75 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90'
                }`}
              >
                <div>
                  {/* Top Row: Formula/Symbol badge + Subject Category */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="min-w-14 h-14 px-2 rounded-2xl flex flex-col items-center justify-center font-black text-sm text-white shadow-inner border border-white/15 shrink-0 text-center"
                        style={{
                          background: `linear-gradient(135deg, ${item.accentColor}33, ${item.accentColor}11)`,
                          borderColor: `${item.accentColor}66`,
                        }}
                      >
                        <span className="leading-tight">{item.formula}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badgeClass}`}
                          >
                            {item.subjectLabel}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-white mt-1 flex flex-wrap items-center gap-1.5">
                          <span>{item.englishName}</span>
                          <span className="text-xs font-mono font-normal text-cyan-300">
                            {item.ipa}
                          </span>
                        </h3>
                        <p className="text-xs font-semibold text-slate-300 mt-0.5">
                          {item.vietnameseName}
                        </p>
                      </div>
                    </div>

                    {timesHeard > 0 && (
                      <span
                        title={`Đã phát âm ${timesHeard} lần`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shrink-0"
                      >
                        <CheckCircle2 className="w-3 h-3" /> {timesHeard}x
                      </span>
                    )}
                  </div>

                  {/* Scientific Details */}
                  <div className="space-y-1.5 text-xs bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 mb-3">
                    <div className="text-slate-300">
                      <span className="text-slate-400 font-semibold">Đặc điểm / Đo lường:</span>{' '}
                      {item.stateAtRoomTemp} •{' '}
                      <strong className="text-cyan-300">{item.molecularMass}</strong>
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400 font-semibold">Ứng dụng thực tế:</span>{' '}
                      {item.familiarUses}
                    </div>
                    <div className="text-amber-300/90 flex items-start gap-1.5 pt-1 border-t border-slate-800">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{item.funFact}</span>
                    </div>
                    <div className="text-cyan-200/95 italic flex items-start gap-1.5 pt-1 border-t border-slate-800">
                      <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
                      <span>&ldquo;{item.englishSentence}&rdquo;</span>
                    </div>
                  </div>
                </div>

                {/* Audio Action Buttons */}
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => triggerSpeakItem(item, 1)}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isSpeakingThis && totalRepeatTarget === 1
                        ? 'bg-emerald-400 text-slate-950 animate-pulse'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 shrink-0" />
                    <span>
                      {isSpeakingThis && totalRepeatTarget === 1
                        ? 'Đang phát âm chuẩn quốc tế...'
                        : 'Đọc ngay (1x)'}
                    </span>
                  </button>

                  <button
                    onClick={() => triggerSpeakItem(item, 3)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                      isSpeakingThis && totalRepeatTarget > 1
                        ? 'bg-amber-400 text-slate-950 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                    }`}
                    title="Luyện nghe lặp lại 3 lần liên tiếp"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>
                      {isSpeakingThis && totalRepeatTarget > 1
                        ? `${currentRepeatStep}/${totalRepeatTarget}`
                        : '3x'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
