import React from 'react';
import {
  CampaignLength,
  GameStatePhase,
  JetBotConfig,
  MapSetupConfig,
  QuestionRecord,
  StationProgressState,
  StationRecord,
} from '../../types/game';
import {
  CheckCircle2,
  Compass,
  Cpu,
  GraduationCap,
  Layers,
  MapPin,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Star,
  Volume2,
  Network,
  FileDown,
} from 'lucide-react';
import {
  buildInternationalSpeechText,
  getPronunciationByQuantityId,
} from '../../content/chemistryElementsCompounds';
import { soundEngine } from '../../game/audio/soundEngine';

interface SetupWizardOverlayProps {
  phase: GameStatePhase;
  mapConfig: MapSetupConfig;
  jetbotConfig: JetBotConfig;
  stations: StationRecord[];
  stationProgress: Record<string, StationProgressState>;
  questionsBank: QuestionRecord[];
  walletCoins?: number;
  onChangePhase: (phase: GameStatePhase) => void;
  onUpdateMapConfig: (partial: Partial<MapSetupConfig>) => void;
  onUpdateJetBotConfig: (partial: Partial<JetBotConfig>) => void;
  onSelectCampaignLength: (len: CampaignLength) => void;
  onStartMission: () => void;
  onOpenTeacherModal: () => void;
  onOpenPronunciationModal: () => void;
  onOpenKnowledgeMapModal?: () => void;
  onResetCampaign: () => void;
}

export const SetupWizardOverlay: React.FC<SetupWizardOverlayProps> = ({
  phase,
  mapConfig,
  jetbotConfig,
  stations,
  stationProgress,
  questionsBank,
  walletCoins = 60,
  onChangePhase,
  onUpdateMapConfig,
  onUpdateJetBotConfig,
  onSelectCampaignLength,
  onStartMission,
  onOpenTeacherModal,
  onOpenPronunciationModal,
  onOpenKnowledgeMapModal,
  onResetCampaign,
}) => {
  const learningStationsCount = stations.filter(
    (s) => s.station_type !== 'checkpoint'
  ).length;
  const checkpointCount = stations.filter(
    (s) => s.station_type === 'checkpoint'
  ).length;

  const totalStarsEarned = Object.values(stationProgress).reduce(
    (acc, s) => acc + (s.best_stars || 0),
    0
  );
  const completedCount = Object.values(stationProgress).filter(
    (s) => s.completed
  ).length;

  // Step indicator bar at top
  const renderStepPipelineBar = () => {
    const steps: { id: GameStatePhase; num: string; label: string; done: boolean }[] = [
      {
        id: 'map_setup',
        num: '01',
        label: 'Thiết lập Bản đồ 3D',
        done: mapConfig.mapConstructed,
      },
      {
        id: 'station_setup',
        num: '02',
        label: 'Tạo Trạm & Lộ trình',
        done: mapConfig.stationsPlaced,
      },
      {
        id: 'jetbot_setup',
        num: '03',
        label: 'Tạo JetBot AI & Nhiệm vụ',
        done: mapConfig.jetbotReady,
      },
    ];

    return (
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 bg-[#0b1322]/95 border-b border-slate-800 pointer-events-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onChangePhase('menu')}
            className="text-base font-bold tracking-tight text-white hover:text-sky-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            KHTN 8 · JetBot AI
          </button>
          <span className="text-slate-600">·</span>
          <span className="text-xs text-slate-400 hidden sm:inline whitespace-nowrap">
            Kết nối tri thức với cuộc sống (Bài 13–29)
          </span>
        </div>

        {/* 3-Step Workflow Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {steps.map((st) => {
            const active = phase === st.id;
            return (
              <button
                key={st.id}
                onClick={() => {
                  if (st.id === 'map_setup') {
                    onUpdateMapConfig({
                      mapConstructed: true,
                      stationsPlaced: false,
                      jetbotReady: false,
                    });
                  } else if (st.id === 'station_setup') {
                    onUpdateMapConfig({
                      mapConstructed: true,
                      stationsPlaced: true,
                      jetbotReady: false,
                    });
                  } else {
                    onUpdateMapConfig({
                      mapConstructed: true,
                      stationsPlaced: true,
                      jetbotReady: true,
                    });
                  }
                  onChangePhase(st.id);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="font-mono">{st.num}.</span>
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenKnowledgeMapModal && (
            <button
              onClick={() => {
                soundEngine.playStepClick();
                onOpenKnowledgeMapModal();
              }}
              className="px-3 py-1.5 text-xs font-bold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
              title="Mở Bản Đồ Tri Thức KHTN 8 & Xưởng Công Nghệ Đổi Quà"
            >
              <Network className="w-3.5 h-3.5 text-amber-400" />
              <span>Bản Đồ Tri Thức &amp; Quà ({walletCoins} Xu)</span>
            </button>
          )}
          <button
            onClick={() => {
              soundEngine.playPronounceChime();
              onOpenPronunciationModal();
            }}
            className="px-3 py-1.5 text-xs font-bold text-cyan-200 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            title="Mở danh sách Đơn chất, Hợp chất, Vật lý & Sinh học phát âm tiếng Anh tự động chuẩn quốc tế (Web Speech API)"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Phát Âm EN</span>
          </button>
          <a
            href="/baocao.md"
            download="baocao.md"
            className="px-3 py-1.5 text-xs font-semibold text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            title="Tải file báo cáo cấu trúc, ý nghĩa & tính năng dự án (baocao.md)"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tải baocao.md</span>
          </a>
          <button
            onClick={onOpenTeacherModal}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            <span>Giáo Viên</span>
          </button>
          <button
            onClick={() => {
              onUpdateMapConfig({
                mapConstructed: true,
                stationsPlaced: true,
                jetbotReady: true,
              });
              onStartMission();
            }}
            className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Chạy Nhiệm Vụ Ngay</span>
          </button>
        </div>
      </div>
    );
  };

  if (phase === 'menu') {
    return (
      <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none">
        {renderStepPipelineBar()}

        {/* Center Hero Lockup over Live 3D World */}
        <div className="flex-1 flex items-center justify-between px-6 md:px-14 max-w-7xl w-full mx-auto">
          <div className="max-w-xl bg-[#0b1322]/92 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl pointer-events-auto">
            {/* Bespoke Inline SVG Title Lockup & Official Competition Project Title */}
            <div className="mb-4 space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-500/15 border border-sky-400/30 text-[11px] font-mono text-sky-300">
                <span className="font-bold text-amber-300">ĐỀ TÀI KHTN 8</span>
                <span>·</span>
                <span>KẾT NỐI TRI THỨC VỚI CUỘC SỐNG</span>
              </div>

              <svg
                viewBox="0 0 460 56"
                className="w-full max-w-[420px] h-auto"
                role="img"
                aria-label="JETBOT-SCI8: Sa Bàn Trạm Lượng Hóa Tự Hành 3D"
              >
                <defs>
                  <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="55%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
                <rect
                  x="0"
                  y="4"
                  width="92"
                  height="22"
                  rx="5"
                  fill="#0284c7"
                />
                <text
                  x="46"
                  y="19"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="800"
                  fontFamily="JetBrains Mono, monospace"
                >
                  JETBOT-SCI8
                </text>
                <text
                  x="102"
                  y="19"
                  fill="#94a3b8"
                  fontSize="11.5"
                  fontWeight="600"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  VẬT LÝ (BÀI 13–29) · ĐƠN CHẤT & HỢP CHẤT · SINH HỌC
                </text>
                <text
                  x="0"
                  y="47"
                  fill="url(#titleGrad)"
                  fontSize="21.5"
                  fontWeight="800"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  SA BÀN TRẠM LƯỢNG HÓA TỰ HÀNH 3D
                </text>
              </svg>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-snug">
                <span className="text-amber-400 font-bold">Tên đề tài chính thức: </span>
                <span className="font-semibold text-white">
                  &ldquo;Thiết kế Sa bàn 3D và Xe Tự hành JetBot AI Vượt Trạm Đại lượng Vật lý KHTN 8 (Kết nối tri thức với cuộc sống) Tích hợp Chuẩn Danh pháp Quốc tế Web Speech API&rdquo;
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              Thực hành quy trình 3 bước: <strong>(1) Thiết lập bản đồ 3D</strong> →{' '}
              <strong>(2) Tạo lộ trình trạm đại lượng vật lý</strong> →{' '}
              <strong>(3) Khởi tạo JetBot AI</strong> vượt qua 10 câu hỏi (4 Biết · 3 Hiểu · 3 Vận dụng) tại mỗi trạm.
            </p>

            {/* Campaign Length Selector: 10 / 15 / 20 / 30 stations */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Chọn chiến dịch lộ trình học tập (Chương III → IV → V → VI):</span>
                <span className="font-mono text-sky-400 tabular-nums">
                  {learningStationsCount} trạm + {checkpointCount} checkpoint
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                {([10, 15, 20, 30] as CampaignLength[]).map((len) => {
                  const active = mapConfig.campaignLength === len;
                  return (
                    <button
                      key={len}
                      onClick={() => onSelectCampaignLength(len)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer tabular-nums ${
                        active
                          ? 'bg-sky-500 text-slate-950 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {len} Trạm
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress summary */}
            <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-2.5 mb-6 tabular-nums">
              <span>
                Đã vượt: <strong className="text-emerald-400">{completedCount}/{stations.length}</strong> điểm dừng
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <strong className="text-amber-300">{totalStarsEarned}</strong> sao tích lũy
              </span>
              <span>·</span>
              <button
                onClick={onResetCampaign}
                className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                title="Đặt lại tiến độ chiến dịch hiện tại"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            </div>

            {/* Primary CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => {
                  onUpdateMapConfig({
                    mapConstructed: true,
                    stationsPlaced: false,
                    jetbotReady: false,
                  });
                  onChangePhase('map_setup');
                }}
                className="flex-1 py-3 px-5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>Thiết Lập Từng Bước (Bản Đồ → Trạm → JetBot)</span>
              </button>

              <button
                onClick={() => {
                  onUpdateMapConfig({
                    mapConstructed: true,
                    stationsPlaced: true,
                    jetbotReady: true,
                  });
                  onStartMission();
                }}
                className="py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Chơi Ngay M01: Kho Lưu Trữ Khối Lượng</span>
              </button>
            </div>
          </div>
        </div>

        {/* Single Flat Control-Hint Line at Bottom */}
        <div className="px-6 py-3 bg-[#0b1322]/90 border-t border-slate-800/80 text-center text-xs text-slate-400 font-mono pointer-events-auto">
          WASD / Phím mũi tên: Lái JetBot · C: Đổi Camera (Chase / Cockpit / FPS Scanner) · F: Science Pulse · E: Nạp Kiện Hàng Cân · Space: Phanh
        </div>
      </div>
    );
  }

  // ======================== STEP 1: MAP SETUP ========================
  if (phase === 'map_setup') {
    return (
      <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none">
        {renderStepPipelineBar()}

        <div className="flex-1 flex items-end justify-center pb-6 px-4">
          <div className="w-full max-w-4xl bg-[#0b1322]/95 border border-slate-800 rounded-2xl p-6 shadow-2xl pointer-events-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-sky-400">
                  BƯỚC 1 / 3 · KHỞI TẠO ĐỊA HÌNH & LÀN ĐƯỜNG
                </div>
                <h2 className="text-lg font-bold text-white">
                  1. Thiết lập Bản đồ Khoa học 3D
                </h2>
              </div>
              <div className="text-xs text-slate-400">
                Bản đồ đã dựng đường spline, vạch phân làn và hàng rào an toàn (dung sai lệch làn 700 ms).
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {/* Campaign length */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Quy mô Chiến dịch (Số trạm học tập)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([10, 15, 20, 30] as CampaignLength[]).map((len) => (
                    <button
                      key={len}
                      onClick={() => onSelectCampaignLength(len)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer tabular-nums ${
                        mapConfig.campaignLength === len
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {len} Trạm học
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Tự động chèn thêm {checkpointCount} Checkpoint tổng hợp (sau mỗi 5 trạm).
                </p>
              </div>

              {/* Lane Width & Curve Complexity */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Độ rộng làn đường:</span>
                    <span className="font-mono text-sky-400 tabular-nums">
                      {(8.6 * mapConfig.laneWidthMultiplier).toFixed(1)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.35"
                    step="0.05"
                    value={mapConfig.laneWidthMultiplier}
                    onChange={(e) =>
                      onUpdateMapConfig({
                        laneWidthMultiplier: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Độ uốn cong tuyến đường:</span>
                    <span className="font-mono text-sky-400 tabular-nums">
                      {Math.round(mapConfig.curveScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.4"
                    step="0.1"
                    value={mapConfig.curveScale}
                    onChange={(e) =>
                      onUpdateMapConfig({
                        curveScale: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Obstacles & Lighting */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">
                    Mật độ chướng ngại vật trên đường:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['low', 'Ít (Dễ)'],
                        ['standard', 'Chuẩn'],
                        ['high', 'Nhiều'],
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => onUpdateMapConfig({ obstacleDensity: val })}
                        className={`py-1.5 px-2 rounded text-xs font-semibold cursor-pointer ${
                          mapConfig.obstacleDensity === val
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">
                    Ánh sáng khu thí nghiệm:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['daylight_lab', 'Ban ngày'],
                        ['golden_campus', 'Hoàng hôn'],
                        [' twilight_research', 'Đêm Sao'],
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => onUpdateMapConfig({ atmospherePreset: val })}
                        className={`py-1.5 px-2 rounded text-xs font-semibold cursor-pointer ${
                          mapConfig.atmospherePreset === val
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => onChangePhase('menu')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
              >
                ← Quay lại Màn hình chính
              </button>

              <button
                onClick={() => {
                  onUpdateMapConfig({
                    mapConstructed: true,
                    stationsPlaced: true,
                    jetbotReady: false,
                  });
                  onChangePhase('station_setup');
                }}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Tiếp theo: Tạo {stations.length} Trạm Vật Lý Trên Bản Đồ →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======================== STEP 2: STATION SETUP ========================
  if (phase === 'station_setup') {
    const approvedCount = questionsBank.filter(
      (q) => q.teacher_approved && q.source_status === 'approved'
    ).length;
    const reviewCount = questionsBank.filter(
      (q) => !q.teacher_approved || q.source_status === 'teacher_review'
    ).length;

    return (
      <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none">
        {renderStepPipelineBar()}

        <div className="flex-1 flex items-end justify-center pb-6 px-4">
          <div className="w-full max-w-5xl bg-[#0b1322]/95 border border-slate-800 rounded-2xl p-6 shadow-2xl pointer-events-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-4 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-emerald-400">
                  BƯỚC 2 / 3 · ĐẶT TRẠM ĐẠI LƯỢNG & MA TRẬN 10 CÂU (4 BIẾT · 3 HIỂU · 3 VẬN DỤNG)
                </div>
                <h2 className="text-lg font-bold text-white">
                  2. Danh sách {stations.length} Trạm trên Tuyến ({learningStationsCount} Trạm học + {checkpointCount} Checkpoint)
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs tabular-nums">
                <span className="text-emerald-400 font-semibold">
                  ✓ {approvedCount} câu đã duyệt (Approved)
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400">
                  {reviewCount} câu chờ duyệt (Loại khỏi bài thi)
                </span>
              </div>
            </div>

            {/* Scrollable Station Route Grid (Auto-speaks English SI nomenclature on click) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1 mb-5">
              {stations.map((st, idx) => {
                const prog = stationProgress[st.station_id];
                const isCheckpoint = st.station_type === 'checkpoint';
                const pronItem = getPronunciationByQuantityId(st.target_quantity_id);
                return (
                  <div
                    key={st.station_id}
                    onClick={() => {
                      if (pronItem) {
                        soundEngine.speakEnglishAuto(
                          buildInternationalSpeechText(pronItem, true)
                        );
                      } else {
                        soundEngine.speakEnglishAuto(
                          'Integrated Physics Checkpoint Station. Mass, Volume, Density, Pressure, Archimedes Force, Electric Current, Voltage, and Thermal Energy.'
                        );
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title="Nhấn vào trạm để nghe đọc phát âm tiếng Anh chuẩn quốc tế (Web Speech API)"
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      isCheckpoint
                        ? 'bg-emerald-950/40 border-emerald-700/60 hover:border-emerald-400'
                        : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono font-semibold text-sky-400">
                        #{idx + 1} · {st.type_label_vi}
                      </span>
                      <span className="font-mono">{st.lesson_refs.join(', ')}</span>
                    </div>
                    <div className="text-xs font-bold text-white truncate mb-1 flex items-center justify-between gap-1">
                      <span className="truncate">{st.title}</span>
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    </div>
                    {pronItem && (
                      <div className="text-[11px] font-mono text-cyan-300 truncate mb-1">
                        EN: {pronItem.englishName} {pronItem.ipa}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 line-clamp-1 mb-1.5">
                      {st.learning_objective}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 tabular-nums">
                      <span>10 câu (4B·3H·3VD) · Chạm để nghe EN</span>
                      <span className="text-amber-400 font-mono">
                        {prog?.completed ? `★ ${prog.best_stars}/3 (${prog.best_score}/10)` : 'Chưa vượt'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => onChangePhase('map_setup')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
              >
                ← Quay lại Bước 1 (Bản đồ)
              </button>

              <button
                onClick={() => {
                  onUpdateMapConfig({
                    mapConstructed: true,
                    stationsPlaced: true,
                    jetbotReady: true,
                  });
                  onChangePhase('jetbot_setup');
                }}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              >
                <Cpu className="w-4 h-4" />
                <span>Tiếp theo: Khởi tạo JetBot AI Thực hiện Nhiệm vụ →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======================== STEP 3: JETBOT AI SETUP ========================
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none">
      {renderStepPipelineBar()}

      <div className="flex-1 flex items-end justify-center pb-6 px-4">
        <div className="w-full max-w-4xl bg-[#0b1322]/95 border border-slate-800 rounded-2xl p-6 shadow-2xl pointer-events-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
            <div>
              <div className="text-xs font-mono text-amber-400">
                BƯỚC 3 / 3 · CẤU HÌNH ROBOT KHẢO SÁT JETBOT AI
              </div>
              <h2 className="text-lg font-bold text-white">
                3. Thiết lập JetBot AI & Chế độ Điều khiển Nhiệm vụ
              </h2>
            </div>
            <div className="text-xs text-slate-400">
              Khi chạm vùng kích hoạt trạm: tự động giảm tốc về 0, khóa lái và mở bài thi 10 câu.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {/* Drive Mode: Manual vs JetBot AI Autopilot */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <span className="block text-xs font-semibold text-slate-300 mb-2">
                Chế độ Vận hành JetBot:
              </span>
              <div className="space-y-2">
                <button
                  onClick={() => onUpdateJetBotConfig({ driveMode: 'ai_autopilot' })}
                  className={`w-full p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    jetbotConfig.driveMode === 'ai_autopilot'
                      ? 'bg-sky-950/80 border-sky-400 text-white'
                      : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>JetBot AI Tự hành (Autopilot)</span>
                    <Compass className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    AI tự bám làn đường đến từng trạm và dừng chính xác để bạn giải câu hỏi.
                  </div>
                </button>

                <button
                  onClick={() => onUpdateJetBotConfig({ driveMode: 'manual' })}
                  className={`w-full p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    jetbotConfig.driveMode === 'manual'
                      ? 'bg-sky-950/80 border-sky-400 text-white'
                      : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Tự lái Thủ công (WASD / Phím mũi tên)</span>
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Tự điều khiển ga, phanh và đánh lái theo vạch làn (hỗ trợ cả nút cảm ứng).
                  </div>
                </button>
              </div>
            </div>

            {/* Speed & Steering Sensitivity */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Tốc độ tối đa (Max Speed):</span>
                  <span className="font-mono text-sky-400 tabular-nums">
                    {jetbotConfig.maxSpeedSetting} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="20"
                  step="1"
                  value={jetbotConfig.maxSpeedSetting}
                  onChange={(e) =>
                    onUpdateJetBotConfig({
                      maxSpeedSetting: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Độ nhạy đánh lái (Turn Rate):</span>
                  <span className="font-mono text-sky-400 tabular-nums">
                    {jetbotConfig.turnSensitivitySetting.toFixed(1)} rad/s
                  </span>
                </div>
                <input
                  type="range"
                  min="1.4"
                  max="2.6"
                  step="0.1"
                  value={jetbotConfig.turnSensitivitySetting}
                  onChange={(e) =>
                    onUpdateJetBotConfig({
                      turnSensitivitySetting: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Chassis Finish & Optical Sensor Cone */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div>
                <span className="block text-xs font-medium text-slate-300 mb-2">
                  Màu sơn hợp kim vỏ JetBot:
                </span>
                <div className="flex items-center gap-2.5">
                  {[
                    ['#0284c7', 'Xanh Khoa Học'],
                    ['#10b981', 'Lục Sinh Thái'],
                    ['#f59e0b', 'Cam Công Nghiệp'],
                    ['#ec4899', 'Hồng Quang Học'],
                    ['#e2e8f0', 'Bạc Titan'],
                  ].map(([hex, name]) => (
                    <button
                      key={hex}
                      onClick={() => onUpdateJetBotConfig({ chassisColor: hex })}
                      title={name}
                      style={{ backgroundColor: hex }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        jetbotConfig.chassisColor === hex
                          ? 'border-white scale-110'
                          : 'border-slate-700 opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jetbotConfig.sensorOverlayVisible}
                    onChange={(e) =>
                      onUpdateJetBotConfig({
                        sensorOverlayVisible: e.target.checked,
                      })
                    }
                    className="rounded accent-sky-400"
                  />
                  <span>Hiển thị chùm tia Camera & LiDAR quét làn đường</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => onChangePhase('station_setup')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
            >
              ← Quay lại Bước 2 (Danh sách Trạm)
            </button>

            <button
              onClick={onStartMission}
              className="px-7 py-3 bg-sky-400 hover:bg-sky-300 text-slate-950 font-extrabold text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>KHỞI HÀNH NHIỆM VỤ VƯỢT TRẠM NGAY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
