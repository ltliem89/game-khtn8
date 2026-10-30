import React from 'react';
import {
  CameraViewMode,
  M01HudSnapshot,
} from '../../types/missionSpec';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Crosshair,
  DoorOpen,
  Lightbulb,
  PackageCheck,
  Radio,
  Scale,
  Sparkles,
  Timer,
} from 'lucide-react';

interface FpsScannerHudOverlayProps {
  snapshot: M01HudSnapshot;
  onSwitchCameraMode: (mode?: CameraViewMode) => void;
  onTriggerSciencePulse: () => void;
  onTriggerLoadCrate: () => void;
  onSelectCrateById: (crateId: string) => void;
  onProceedToQuizNow: () => void;
}

export const FpsScannerHudOverlay: React.FC<FpsScannerHudOverlayProps> = ({
  snapshot,
  onSwitchCameraMode,
  onTriggerSciencePulse,
  onTriggerLoadCrate,
  onSelectCrateById,
  onProceedToQuizNow,
}) => {
  if (!snapshot.active) return null;

  const aimed = snapshot.aimedCrate;
  const isFps = snapshot.cameraMode === 'fps_scanner';

  const cameraLabel =
    snapshot.cameraMode === 'chase'
      ? 'Góc nhìn: Chase (Thứ 3)'
      : snapshot.cameraMode === 'cockpit'
      ? 'Góc nhìn: Cockpit (Buồng lái)'
      : 'Góc nhìn: FPS Scanner (Quét Cân)';

  // Reticle screen position percentage
  const reticleLeftPct = Math.round(((snapshot.reticleX + 1) / 2) * 100);
  const reticleTopPct = Math.round(((1 - snapshot.reticleY) / 2) * 100);

  return (
    <div className="fixed inset-0 z-15 pointer-events-none">
      {/* 1. Interactive FPS / Scanner Reticle in Viewport */}
      {(isFps || snapshot.inScannerZone) && (
        <div
          style={{
            left: `${reticleLeftPct}%`,
            top: `${reticleTopPct}%`,
          }}
          className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
        >
          <div
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${
              aimed
                ? aimed.spec.isValidMassTarget
                  ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_16px_rgba(52,211,153,0.5)]'
                  : 'border-amber-400 bg-amber-500/10 shadow-[0_0_16px_rgba(251,191,36,0.5)]'
                : 'border-sky-400/70 bg-sky-500/5'
            }`}
          >
            <Crosshair
              className={`w-6 h-6 ${
                aimed
                  ? aimed.spec.isValidMassTarget
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                  : 'text-sky-300/80'
              }`}
            />
          </div>
          {aimed && (
            <div className="mt-1 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-white whitespace-nowrap text-center">
              {aimed.spec.code}: {aimed.spec.rawLabelText}
            </div>
          )}
        </div>
      )}

      {/* 2. Left Mission Panel: M01 Electronic Balance Progress & Quick Crate Selector */}
      <div className="fixed top-36 left-3 sm:left-4 z-20 w-80 max-w-[92vw] bg-[#0b1322]/92 border border-slate-800 rounded-2xl p-3.5 shadow-2xl pointer-events-auto space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>M01 · KHO LƯU TRỮ KHỐI LƯỢNG</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 tabular-nums">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <span>{snapshot.remainingTimeSeconds}s</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400">{snapshot.currentFps} FPS</span>
          </div>
        </div>

        {/* Objective Text */}
        <div className="text-xs text-slate-200 leading-snug font-medium">
          {snapshot.objectiveTextVi}
        </div>

        {/* Electronic Balance Progress Bar (0.0 / 15.0 kg) */}
        <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="text-slate-400">BĂNG CHUYỀN CÂN:</span>
            <span className="text-emerald-400 font-extrabold">
              {snapshot.loadedMassKg.toFixed(1)} / {snapshot.targetMassKg.toFixed(1)} kg ({snapshot.loadedCratesCount}/3 kiện)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (snapshot.loadedMassKg / snapshot.targetMassKg) * 100
                )}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span
              className={
                snapshot.conveyorWindowOpen ? 'text-emerald-400' : 'text-amber-400'
              }
            >
              {snapshot.conveyorWindowOpen
                ? '● Cửa băng chuyền: MỞ (Xanh)'
                : '● Cửa băng chuyền: CHỜ NHỊP'}
            </span>
            <span className="text-slate-400">
              Lỗi sai: {snapshot.wrongAttempts}/{snapshot.maxWrongAttempts}
            </span>
          </div>
        </div>

        {/* 5 Cargo Crates Interactive Inspector List */}
        <div>
          <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
            <span>5 KIỆN HÀNG TRONG KHOANG CÂN (CHẠM ĐỂ QUÉT):</span>
            <span>
              Đã quét {snapshot.allCrates.filter((c) => c.scanned).length}/5
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {snapshot.allCrates.map((crate) => {
              const isSelected = aimed?.spec.id === crate.spec.id;
              return (
                <button
                  key={crate.spec.id}
                  onClick={() => onSelectCrateById(crate.spec.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition flex items-center justify-between gap-2 cursor-pointer text-xs ${
                    crate.loadedOnConveyor
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                      : isSelected
                      ? 'bg-sky-950/90 border-sky-400 text-white'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="truncate">
                    <span className="font-mono font-bold text-sky-300">
                      {crate.spec.code}
                    </span>{' '}
                    ·{' '}
                    <span className="font-mono font-semibold text-white">
                      {crate.spec.rawLabelText}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono shrink-0">
                    {crate.loadedOnConveyor ? (
                      <span className="text-emerald-400 font-bold">✓ ĐÃ NẠP</span>
                    ) : crate.scanned ? (
                      crate.spec.isValidMassTarget ? (
                        <span className="text-cyan-300">
                          ={crate.spec.massKg} kg
                        </span>
                      ) : (
                        <span className="text-amber-400">Nhãn nhiễu</span>
                      )
                    ) : (
                      <span className="text-slate-400">Chưa quét</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons for Camera, Science Pulse, and Loading Crate onto Conveyor */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            onClick={() => onSwitchCameraMode()}
            className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
            title="Chuyển đổi góc nhìn Camera: Chase / Cockpit / FPS Scanner (Phím C)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Phím C: Camera</span>
          </button>

          <button
            onClick={onTriggerSciencePulse}
            className="py-2 px-2 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
            title="Phát xung Science Pulse phân tích đại lượng trên kiện hàng đang ngắm (Phím F)"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Phím F: Pulse</span>
          </button>

          <button
            onClick={onTriggerLoadCrate}
            className="py-2 px-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow"
            title="Nạp kiện hàng Khối lượng (m) đang chọn lên Băng chuyền Cân (Phím E)"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Phím E: Nạp Cân</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-0.5">
          <span>{cameraLabel}</span>
          {snapshot.shortcutUnlocked && (
            <span className="text-purple-300 font-bold">
              ★ Đã mở Cổng Tắt!
            </span>
          )}
        </div>

        {/* Proceed to 10-question Science Challenge CTA once Exit Gate is open */}
        {snapshot.exitGateOpen && (
          <button
            onClick={onProceedToQuizNow}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg animate-pulse cursor-pointer"
          >
            <DoorOpen className="w-4 h-4" />
            <span>CỔNG ĐÃ MỞ (15,0 kg) — VÀO 10 CÂU HỎI NGAY</span>
          </button>
        )}
      </div>

      {/* 3. Right / Top-Center ORBIT & Electronic Scale Live Scientific Feedback Banner */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[92vw] pointer-events-auto space-y-1.5">
        <div
          className={`px-4 py-2.5 rounded-xl border shadow-xl text-xs flex items-start gap-2.5 ${
            snapshot.feedbackTone === 'error'
              ? 'bg-rose-950/95 border-rose-500 text-rose-100'
              : snapshot.feedbackTone === 'warning'
              ? 'bg-amber-950/95 border-amber-500 text-amber-100'
              : snapshot.feedbackTone === 'success'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
              : 'bg-[#0b1322]/95 border-sky-500/50 text-slate-100'
          }`}
        >
          {snapshot.feedbackTone === 'error' ||
          snapshot.feedbackTone === 'warning' ? (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          ) : snapshot.feedbackTone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
          )}
          <div className="flex-1">
            <span className="font-mono font-bold uppercase text-sky-300 mr-1.5">
              [{snapshot.orbitSpeaker}]:
            </span>
            <span>{snapshot.orbitMessageVi}</span>
          </div>
        </div>

        {snapshot.tieredHintVi && (
          <div className="px-4 py-2 rounded-xl bg-amber-950/95 border border-amber-400 text-amber-100 text-xs flex items-center gap-2 shadow-lg">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{snapshot.tieredHintVi}</span>
          </div>
        )}
      </div>
    </div>
  );
};
