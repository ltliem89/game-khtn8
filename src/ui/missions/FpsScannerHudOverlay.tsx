import React, { useState } from 'react';
import {
  CameraViewMode,
  M01HudSnapshot,
} from '../../types/missionSpec';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  DoorOpen,
  Lightbulb,
  Music,
  PackageCheck,
  Radio,
  Scale,
  Sparkles,
  Timer,
} from 'lucide-react';
import { soundEngine } from '../../game/audio/soundEngine';

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
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [musicStatus, setMusicStatus] = useState<string | null>(null);
  const [generatingMusic, setGeneratingMusic] = useState(false);

  if (!snapshot.active) return null;

  const aimed = snapshot.aimedCrate;
  const isFps = snapshot.cameraMode === 'fps_scanner';

  const cameraLabel =
    snapshot.cameraMode === 'chase'
      ? 'Chase (Thứ 3)'
      : snapshot.cameraMode === 'cockpit'
      ? 'Cockpit (Buồng lái)'
      : 'FPS Scanner';

  const reticleLeftPct = Math.round(((snapshot.reticleX + 1) / 2) * 100);
  const reticleTopPct = Math.round(((1 - snapshot.reticleY) / 2) * 100);

  const handleGenerateOrToggleMusic = async () => {
    if (generatingMusic) return;
    setGeneratingMusic(true);
    setMusicStatus('Đang kết nối Lyria AI (lyria-3-clip-preview)...');
    try {
      const resp = await fetch('/api/ai/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'clip',
          prompt:
            'Generate a 30-second futuristic sci-fi electronic soundtrack for a physics laboratory rover mission, 120 BPM.',
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.audioDataUrl) {
        soundEngine.playGeneratedMusicDataUrl(data.audioDataUrl);
        setMusicStatus('Đang phát nhạc nền AI Lyria (30s)! ');
      } else {
        // Graceful fallback to built-in 3-track procedural synth BGM
        const playing = soundEngine.toggleBgm();
        setMusicStatus(
          playing
            ? 'Đang phát nhạc nền Synth Khoa Học tích hợp!'
            : 'Đã tắt nhạc nền.'
        );
      }
    } catch {
      const playing = soundEngine.toggleBgm();
      setMusicStatus(
        playing
          ? 'Đang phát nhạc nền Synth Khoa Học tích hợp!'
          : 'Đã tắt nhạc nền.'
      );
    } finally {
      setGeneratingMusic(false);
    }
  };

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
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
              aimed
                ? aimed.spec.isValidMassTarget
                  ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_14px_rgba(52,211,153,0.45)]'
                  : 'border-amber-400 bg-amber-500/10 shadow-[0_0_14px_rgba(251,191,36,0.45)]'
                : 'border-sky-400/70 bg-sky-500/5'
            }`}
          >
            <Crosshair
              className={`w-5 h-5 ${
                aimed
                  ? aimed.spec.isValidMassTarget
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                  : 'text-sky-300/80'
              }`}
            />
          </div>
          {aimed && (
            <div className="mt-1 px-2 py-0.5 rounded bg-[#080e1a] border border-slate-700 text-[10px] font-mono text-white whitespace-nowrap text-center">
              {aimed.spec.code}: {aimed.spec.rawLabelText}
            </div>
          )}
        </div>
      )}

      {/* 2. Compact Collapsible Left M01 Dock (<= 15% Viewport Footprint, Solid Surface) */}
      <div className="fixed top-32 left-3 z-20 w-72 max-w-[88vw] bg-[#0b1322]/96 border border-slate-800 rounded-xl p-3 shadow-xl pointer-events-auto space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-sky-400">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>M01 · CÂN KHỐI LƯỢNG</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300 tabular-nums">
            <Timer className="w-3 h-3 text-amber-400" />
            <span>{snapshot.remainingTimeSeconds}s</span>
            <span className="text-emerald-400">{snapshot.currentFps}fps</span>
            <button
              onClick={() => setPanelCollapsed((p) => !p)}
              className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title={panelCollapsed ? 'Mở rộng bảng M01' : 'Thu gọn bảng M01'}
            >
              {panelCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Electronic Balance Progress Bar (Always visible, tabular-nums) */}
        <div className="p-2 rounded-lg bg-[#070c17] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
            <span className="text-slate-400">BĂNG CHUYỀN:</span>
            <span className="text-emerald-400 font-extrabold">
              {snapshot.loadedMassKg.toFixed(1)} / {snapshot.targetMassKg.toFixed(1)} kg ({snapshot.loadedCratesCount}/3)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
        </div>

        {!panelCollapsed && (
          <>
            {/* 5 Cargo Crates Quick Inspector List */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between tabular-nums">
                <span>5 KIỆN HÀNG (CHẠM ĐỂ QUÉT):</span>
                <span>
                  Đã quét {snapshot.allCrates.filter((c) => c.scanned).length}/5
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {snapshot.allCrates.map((crate) => {
                  const isSelected = aimed?.spec.id === crate.spec.id;
                  return (
                    <button
                      key={crate.spec.id}
                      onClick={() => onSelectCrateById(crate.spec.id)}
                      className={`px-2 py-1 rounded-md border text-left transition flex items-center justify-between gap-1.5 cursor-pointer text-[11px] ${
                        crate.loadedOnConveyor
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                          : isSelected
                          ? 'bg-sky-950 border-sky-400 text-white'
                          : 'bg-[#080e1a] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate font-mono">
                        <strong className="text-sky-300">
                          {crate.spec.code}
                        </strong>{' '}
                        {crate.spec.rawLabelText}
                      </span>
                      <span className="text-[10px] font-mono shrink-0 tabular-nums">
                        {crate.loadedOnConveyor ? (
                          <span className="text-emerald-400 font-bold">
                            ✓ ĐÃ NẠP
                          </span>
                        ) : crate.scanned ? (
                          crate.spec.isValidMassTarget ? (
                            <span className="text-cyan-300">
                              ={crate.spec.massKg}kg
                            </span>
                          ) : (
                            <span className="text-amber-400">Nhiễu</span>
                          )
                        ) : (
                          <span className="text-slate-500">Quét</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Camera (C), Pulse (F), Load (E) */}
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => onSwitchCameraMode()}
                className="py-1.5 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                title="Đổi góc nhìn Camera: Chase / Cockpit / FPS Scanner (Phím C)"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>C: {cameraLabel.split(' ')[0]}</span>
              </button>

              <button
                onClick={onTriggerSciencePulse}
                className="py-1.5 px-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                title="Phát xung Science Pulse phân tích đại lượng (Phím F)"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>F: Pulse</span>
              </button>

              <button
                onClick={onTriggerLoadCrate}
                className="py-1.5 px-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                title="Nạp kiện hàng Khối lượng (m) lên Băng chuyền Cân (Phím E)"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>E: Nạp Cân</span>
              </button>
            </div>

            {/* Lyria / Synth BGM Generator Button */}
            <button
              onClick={handleGenerateOrToggleMusic}
              disabled={generatingMusic}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-amber-300 flex items-center justify-between cursor-pointer"
              title="Tạo nhạc nền AI Lyria (lyria-3-clip-preview) hoặc bật/tắt nhạc Synth Khoa Học"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Music className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">
                  {musicStatus || 'Nhạc nền AI Lyria / Synth BGM'}
                </span>
              </span>
              <span className="text-sky-400 font-bold shrink-0 ml-1">
                {generatingMusic ? '...' : 'PHÁT'}
              </span>
            </button>
          </>
        )}

        {snapshot.exitGateOpen && (
          <button
            onClick={onProceedToQuizNow}
            className="w-full py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>CỔNG ĐÃ MỞ (15,0 kg) — THI 10 CÂU</span>
          </button>
        )}
      </div>

      {/* 3. Top-Center ORBIT Scientific Feedback Banner (Solid surface, no backdrop-filter) */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 max-w-lg w-[90vw] pointer-events-auto space-y-1">
        <div
          className={`px-3.5 py-2 rounded-xl border shadow-lg text-xs flex items-start gap-2 ${
            snapshot.feedbackTone === 'error'
              ? 'bg-[#2a0a12] border-rose-500 text-rose-100'
              : snapshot.feedbackTone === 'warning'
              ? 'bg-[#291805] border-amber-500 text-amber-100'
              : snapshot.feedbackTone === 'success'
              ? 'bg-[#062419] border-emerald-500 text-emerald-100'
              : 'bg-[#0b1322]/96 border-sky-500/50 text-slate-100'
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
          <div className="flex-1 leading-snug">
            <span className="font-mono font-bold uppercase text-sky-300 mr-1">
              [{snapshot.orbitSpeaker}]:
            </span>
            <span>{snapshot.orbitMessageVi}</span>
          </div>
        </div>

        {snapshot.tieredHintVi && (
          <div className="px-3.5 py-1.5 rounded-xl bg-[#291805] border border-amber-400 text-amber-100 text-[11px] flex items-center gap-2 shadow-md">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{snapshot.tieredHintVi}</span>
          </div>
        )}
      </div>
    </div>
  );
};
