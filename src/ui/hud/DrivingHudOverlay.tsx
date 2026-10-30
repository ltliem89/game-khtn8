import React, { useState } from 'react';
import {
  JetBotConfig,
  QuantityRecord,
  RewardWallet,
  StationProgressState,
  StationRecord,
} from '../../types/game';
import { VehicleTelemetry } from '../../game/vehicle/vehiclePhysics';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Compass,
  GraduationCap,
  Map,
  Pause,
  RotateCcw,
  Star,
  Volume2,
  VolumeX,
  Atom,
  Coins,
  Gift,
  Network,
  Zap,
} from 'lucide-react';
import {
  buildInternationalSpeechText,
  getPronunciationByQuantityId,
} from '../../content/chemistryElementsCompounds';
import { soundEngine } from '../../game/audio/soundEngine';

interface DrivingHudOverlayProps {
  activeStation: StationRecord;
  activeStationIndex: number;
  totalStations: number;
  targetQuantity?: QuantityRecord;
  drivingScore: number;
  wallet: RewardWallet;
  pickupToast: string | null;
  telemetry: VehicleTelemetry;
  minimapPath: { x: number; z: number }[];
  stationCoords: { id: string; x: number; z: number; title: string }[];
  stationProgress: Record<string, StationProgressState>;
  jetbotConfig: JetBotConfig;
  isMuted: boolean;
  isBrakingAtStation: boolean;
  onToggleAutopilot: () => void;
  onPause: () => void;
  onResetCheckpoint: () => void;
  onToggleMute: () => void;
  onOpenTeacherModal: () => void;
  onOpenPronunciationModal: () => void;
  onOpenKnowledgeMapModal: () => void;
  onOpenSetupWizard: () => void;
  onTouchControl: (
    dir: 'forward' | 'backward' | 'left' | 'right' | 'brake' | 'nitro',
    active: boolean
  ) => void;
}

export const DrivingHudOverlay: React.FC<DrivingHudOverlayProps> = ({
  activeStation,
  activeStationIndex,
  totalStations,
  targetQuantity,
  drivingScore,
  wallet,
  pickupToast,
  telemetry,
  minimapPath,
  stationCoords,
  stationProgress,
  jetbotConfig,
  isMuted,
  isBrakingAtStation,
  onToggleAutopilot,
  onPause,
  onResetCheckpoint,
  onToggleMute,
  onOpenTeacherModal,
  onOpenPronunciationModal,
  onOpenKnowledgeMapModal,
  onOpenSetupWizard,
  onTouchControl,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const activePronItem = getPronunciationByQuantityId(
    activeStation.target_quantity_id
  );

  // Calculate minimap bounds
  const renderMinimap = () => {
    if (minimapPath.length === 0) return null;
    let minX = -45;
    let maxX = 45;
    let minZ = -30;
    let maxZ = 480;
    for (const p of minimapPath) {
      if (p.x < minX) minX = p.x - 15;
      if (p.x > maxX) maxX = p.x + 15;
      if (p.z < minZ) minZ = p.z - 15;
      if (p.z > maxZ) maxZ = p.z + 20;
    }
    const spanX = Math.max(80, maxX - minX);
    const spanZ = Math.max(120, maxZ - minZ);

    const toSvgX = (wx: number) => ((wx - minX) / spanX) * 120 + 10;
    const toSvgY = (wz: number) => 150 - ((wz - minZ) / spanZ) * 135;

    const polyPoints = minimapPath
      .map((p) => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.z).toFixed(1)}`)
      .join(' ');

    const rx = toSvgX(telemetry.x);
    const ry = toSvgY(telemetry.z);

    return (
      <svg viewBox="0 0 140 160" className="w-32 h-36 bg-[#080e1a] rounded-xl border border-slate-800">
        {/* Spline track path */}
        <polyline
          fill="none"
          stroke="#334155"
          strokeWidth="5"
          strokeLinecap="round"
          points={polyPoints}
        />
        <polyline
          fill="none"
          stroke="#0284c7"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          points={polyPoints}
        />

        {/* Station markers */}
        {stationCoords.map((sc, idx) => {
          const sx = toSvgX(sc.x);
          const sy = toSvgY(sc.z);
          const isDone = stationProgress[sc.id]?.completed;
          const isCurrent = idx === activeStationIndex;
          return (
            <circle
              key={sc.id}
              cx={sx}
              cy={sy}
              r={isCurrent ? 4.5 : 3}
              fill={isDone ? '#10b981' : isCurrent ? '#38bdf8' : '#64748b'}
              stroke="#090d16"
              strokeWidth="1"
            />
          );
        })}

        {/* JetBot position triangle */}
        <circle
          cx={rx}
          cy={ry}
          r="4.2"
          fill="#fbbf24"
          stroke="#090d16"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  const totalStars = Object.values(stationProgress).reduce(
    (sum, s) => sum + (s.best_stars || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      {/* Top Status Cluster + Right Mini-Map */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Active Station Objective & Separate Driving Score */}
        <div className="bg-[#0b1322]/92 border border-slate-800 rounded-xl px-4 py-2.5 shadow-lg pointer-events-auto max-w-xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mb-1">
            <span className="text-sky-400 font-bold">
              ĐIỂM DỪNG {activeStationIndex + 1}/{totalStations}
            </span>
            <span>·</span>
            <span>{activeStation.type_label_vi}</span>
            <span>·</span>
            <span>{activeStation.lesson_refs.join(', ')}</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{totalStars} sao</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{wallet.coins} Xu</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-purple-300 font-bold">
              <Gift className="w-3.5 h-3.5 text-purple-400" />
              <span>{wallet.giftsOpened} Quà</span>
            </span>
          </div>

          <div className="text-sm sm:text-base font-bold text-white truncate">
            {activeStation.title}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1 tabular-nums">
            <span>
              Đại lượng:{' '}
              <strong className="text-sky-300">
                {targetQuantity?.name_vi || activeStation.target_quantity_id}
              </strong>{' '}
              {targetQuantity?.symbol && targetQuantity.symbol !== '—'
                ? `(${targetQuantity.symbol}, đơn vị ${targetQuantity.unit_si})`
                : ''}
            </span>
            <span className="text-slate-600">·</span>
            <span>
              Điểm lái riêng:{' '}
              <strong
                className={`font-mono ${
                  telemetry.isPenalizingOffLane ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {drivingScore}
              </strong>
            </span>
            {activePronItem && (
              <>
                <span className="text-slate-600">·</span>
                <button
                  onClick={() =>
                    soundEngine.speakEnglishAuto(
                      buildInternationalSpeechText(activePronItem, true)
                    )
                  }
                  className="px-2 py-0.5 rounded bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Nghe đọc tiếng Anh chuẩn quốc tế của đại lượng trạm này"
                >
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  <span>EN: {activePronItem.englishName}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Top-Right: Mini-Map & Next Station Distance */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="bg-[#0b1322]/92 border border-slate-800 rounded-2xl p-2.5 shadow-lg flex flex-col items-center">
            <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 mb-1.5 px-1 tabular-nums">
              <span className="flex items-center gap-1">
                <Map className="w-3 h-3 text-sky-400" />
                <span>BẢN ĐỒ</span>
              </span>
              <span className="text-sky-300 font-bold">
                Cách {telemetry.distanceToTargetMeters} m
              </span>
            </div>
            {renderMinimap()}
          </div>
        </div>
      </div>

      {/* Off-lane, Pickup Reward Toast, or Station Braking Banner in Upper-Center */}
      <div className="flex flex-col items-center gap-2 pointer-events-none">
        {pickupToast && (
          <div className="bg-amber-950/95 border border-amber-400 text-amber-100 px-4 py-2 rounded-xl shadow-xl text-xs font-mono font-bold flex items-center gap-2 animate-bounce">
            <Gift className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{pickupToast}</span>
          </div>
        )}

        {isBrakingAtStation && (
          <div className="bg-sky-950/95 border border-sky-400 text-sky-100 px-5 py-2.5 rounded-xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2">
            <span>Đã vào vùng kích hoạt trạm — JetBot đang phanh dừng hẳn (v = 0) để mở 10 câu hỏi...</span>
          </div>
        )}

        {!isBrakingAtStation && telemetry.isOffLane && (
          <div
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-lg tabular-nums ${
              telemetry.isPenalizingOffLane
                ? 'bg-rose-950/95 border-rose-500 text-rose-200'
                : 'bg-amber-950/95 border-amber-500 text-amber-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {telemetry.isPenalizingOffLane
                ? `Xe lệch khỏi làn đường quá 700 ms! Đang trừ điểm lái riêng (-1 điểm/giây) — không ảnh hưởng điểm kiến thức & sao.`
                : `Cảnh báo chớm mép làn (${Math.round(
                    telemetry.offLaneDurationMs
                  )} / 700 ms dung sai) — hãy đánh lái về giữa làn!`}
            </span>
          </div>
        )}
      </div>

      {/* Unified Collapsible Bottom Control Dock (Zero Central Viewport Occlusion) */}
      <div className="flex flex-col items-center w-full">
        {/* Touch Controls for small screens / tablets */}
        <div className="flex sm:hidden items-center justify-between w-full px-2 mb-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              onPointerDown={() => onTouchControl('left', true)}
              onPointerUp={() => onTouchControl('left', false)}
              onPointerLeave={() => onTouchControl('left', false)}
              className="w-12 h-12 rounded-xl bg-[#0b1322]/95 border border-slate-700 text-white font-bold text-sm active:bg-sky-500"
            >
              ←
            </button>
            <button
              onPointerDown={() => onTouchControl('right', true)}
              onPointerUp={() => onTouchControl('right', false)}
              onPointerLeave={() => onTouchControl('right', false)}
              className="w-12 h-12 rounded-xl bg-[#0b1322]/95 border border-slate-700 text-white font-bold text-sm active:bg-sky-500"
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onPointerDown={() => onTouchControl('backward', true)}
              onPointerUp={() => onTouchControl('backward', false)}
              onPointerLeave={() => onTouchControl('backward', false)}
              className="px-4 h-12 rounded-xl bg-[#0b1322]/95 border border-slate-700 text-amber-300 font-bold text-xs active:bg-amber-500 active:text-slate-950"
            >
              Phanh / Lùi
            </button>
            <button
              onPointerDown={() => onTouchControl('forward', true)}
              onPointerUp={() => onTouchControl('forward', false)}
              onPointerLeave={() => onTouchControl('forward', false)}
              className="px-5 h-12 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs active:bg-sky-400"
            >
              Tiến (Ga)
            </button>
          </div>
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="px-3 py-1 bg-[#0b1322]/95 border border-b-0 border-slate-800 rounded-t-lg text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1 pointer-events-auto cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hiện thanh điều khiển</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Thu gọn HUD</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full max-w-[1040px] bg-[#0b1322]/95 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-2xl pointer-events-auto flex flex-wrap items-center justify-between gap-3">
            {/* Speedometer, Nitro Energy Bar & Key Hints */}
            <div className="flex items-center gap-2.5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-center min-w-[82px] tabular-nums">
                <div className="text-[10px] font-mono text-slate-400">VẬN TỐC</div>
                <div className="text-sm font-extrabold font-mono text-sky-400">
                  {Math.abs(telemetry.speed).toFixed(1)} m/s
                </div>
              </div>

              <button
                onPointerDown={() => onTouchControl('nitro', true)}
                onPointerUp={() => onTouchControl('nitro', false)}
                onPointerLeave={() => onTouchControl('nitro', false)}
                className={`px-3 py-1.5 rounded-xl border text-left min-w-[115px] transition cursor-pointer ${
                  telemetry.nitroActive
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-amber-500/50'
                }`}
                title="Giữ phím Shift hoặc nhấn giữ nút này để kích hoạt Nitro tăng tốc!"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Zap className="w-3 h-3" />
                    <span>NITRO (Shift)</span>
                  </span>
                  <span>{telemetry.nitroEnergy ?? 100}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-cyan-400 transition-all"
                    style={{ width: `${telemetry.nitroEnergy ?? 100}%` }}
                  />
                </div>
              </button>

              <div className="hidden lg:block text-[11px] text-slate-400 font-mono">
                <div>W/S/A/D: Lái · Shift: Nitro · Space: Phanh</div>
                <div>Nhặt Xu &amp; Hộp Quà Tím trên đường để mở Bản đồ Tri thức!</div>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onToggleAutopilot}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  jetbotConfig.driveMode === 'ai_autopilot'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>
                  {jetbotConfig.driveMode === 'ai_autopilot'
                    ? 'AI Tự hành: BẬT'
                    : 'AI Tự hành: TẮT'}
                </span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playStepClick();
                  onOpenKnowledgeMapModal();
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/50 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                title="Mở Bản Đồ Tri Thức KHTN 8 & Xưởng Đổi Quà/Nâng Cấp JetBot"
              >
                <Network className="w-3.5 h-3.5 text-amber-400" />
                <span>Bản Đồ Tri Thức &amp; Quà ({wallet.coins} Xu)</span>
              </button>

              <button
                onClick={onResetCheckpoint}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                title="Quay về trạm/checkpoint gần nhất đã vượt (Phím R)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Checkpoint</span>
              </button>

              <button
                onClick={onOpenSetupWizard}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Cấu hình
              </button>

              <button
                onClick={() => {
                  soundEngine.playPronounceChime();
                  onOpenPronunciationModal();
                }}
                className="px-2.5 py-2 rounded-xl text-xs font-bold bg-cyan-950/90 hover:bg-cyan-900 text-cyan-200 border border-cyan-500/40 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                title="Từ điển phát âm tiếng Anh tự động: Đơn chất, Hợp chất, Vật lý & Sinh học"
              >
                <Atom className="w-3.5 h-3.5 text-cyan-400" />
                <span>Phát Âm EN</span>
              </button>

              <button
                onClick={onOpenTeacherModal}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>Giáo viên</span>
              </button>

              <button
                onClick={onToggleMute}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-sky-400" />
                )}
              </button>

              <button
                onClick={onPause}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Tạm dừng</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
