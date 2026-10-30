import React, { useState } from 'react';
import {
  CameraViewMode,
  UniversalMissionHudSnapshot,
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
  Radio,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../game/audio/soundEngine';

interface UniversalMissionHudOverlayProps {
  snapshot: UniversalMissionHudSnapshot;
  onSwitchCameraMode: (mode?: CameraViewMode) => void;
  onTriggerSciencePulse: () => void;
  onTriggerInteract: () => void;
  onSelectTargetById: (targetId: string) => void;
  onProceedToQuizNow: () => void;
}

export const UniversalMissionHudOverlay: React.FC<UniversalMissionHudOverlayProps> = ({
  snapshot,
  onSwitchCameraMode,
  onTriggerSciencePulse,
  onTriggerInteract,
  onSelectTargetById,
  onProceedToQuizNow,
}) => {
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [musicStatus, setMusicStatus] = useState<string | null>(null);
  const [generatingMusic, setGeneratingMusic] = useState(false);

  if (!snapshot.active) return null;

  const aimed = snapshot.aimedItem;
  const isFps = snapshot.cameraMode === 'fps_scanner';

  const cameraLabel =
    snapshot.cameraMode === 'chase'
      ? 'Chase'
      : snapshot.cameraMode === 'cockpit'
      ? 'Cockpit'
      : 'FPS Scanner';

  const reticleLeftPct = Math.round(((snapshot.reticleX + 1) / 2) * 100);
  const reticleTopPct = Math.round(((1 - snapshot.reticleY) / 2) * 100);

  const handleGenerateOrToggleMusic = async () => {
    if (generatingMusic) return;
    setGeneratingMusic(true);
    setMusicStatus('Đang kích hoạt Lyria AI...');
    try {
      const resp = await fetch('/api/ai/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'clip',
          prompt:
            'Sci-fi science mission soundtrack, dynamic electronic synth, 124 BPM, educational urgency.',
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.audioDataUrl) {
        soundEngine.playGeneratedMusicDataUrl(data.audioDataUrl);
        setMusicStatus('Đang phát AI Lyria BGM!');
      } else {
        const playing = soundEngine.toggleBgm();
        setMusicStatus(playing ? 'Đang phát Synth BGM tích hợp!' : 'Đã tắt nhạc nền.');
      }
    } catch {
      const playing = soundEngine.toggleBgm();
      setMusicStatus(playing ? 'Đang phát Synth BGM tích hợp!' : 'Đã tắt nhạc nền.');
    } finally {
      setGeneratingMusic(false);
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round(
      (snapshot.currentProgressValue / Math.max(1, snapshot.targetProgressValue)) * 100
    )
  );

  return (
    <div className="fixed inset-0 z-15 pointer-events-none">
      {/* 1. Interactive FPS / Scanner Reticle in Viewport */}
      {(isFps || snapshot.inInteractiveZone) && (
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
                ? aimed.spec.isValidTarget
                  ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_14px_rgba(52,211,153,0.45)]'
                  : 'border-amber-400 bg-amber-500/10 shadow-[0_0_14px_rgba(251,191,36,0.45)]'
                : 'border-sky-400/70 bg-sky-500/5'
            }`}
          >
            <Crosshair
              className={`w-5 h-5 ${
                aimed
                  ? aimed.spec.isValidTarget
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

      {/* 2. Compact Collapsible Left Dock (Solid Surface) */}
      <div className="fixed top-32 left-3 z-20 w-72 max-w-[88vw] bg-[#0b1322]/96 border border-slate-800 rounded-xl p-3 shadow-xl pointer-events-auto space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-sky-400 truncate">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{snapshot.missionTitleVi}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300 tabular-nums shrink-0">
            <Timer className="w-3 h-3 text-amber-400" />
            <span>{snapshot.remainingTimeSeconds}s</span>
            <span className="text-emerald-400">{snapshot.currentFps}fps</span>
            <button
              onClick={() => setPanelCollapsed((p) => !p)}
              className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title={panelCollapsed ? 'Mở rộng bảng' : 'Thu gọn bảng'}
            >
              {panelCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="p-2 rounded-lg bg-[#070c17] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
            <span className="text-slate-400">TIẾN ĐỘ NHIỆM VỤ:</span>
            <span className="text-emerald-400 font-extrabold">
              {snapshot.completedItemsCount} / {snapshot.requiredItemsCount} {snapshot.progressUnit} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {!panelCollapsed && (
          <>
            {/* Target Items List */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between tabular-nums">
                <span>MỤC TIÊU KHẢO SÁT:</span>
                <span>
                  {snapshot.allItems.filter((c) => c.scanned).length}/{snapshot.allItems.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto">
                {snapshot.allItems.map((item) => {
                  const isSelected = aimed?.spec.id === item.spec.id;
                  return (
                    <button
                      key={item.spec.id}
                      onClick={() => onSelectTargetById(item.spec.id)}
                      className={`px-2 py-1 rounded-md border text-left transition flex items-center justify-between gap-1.5 cursor-pointer text-[11px] ${
                        item.activatedOrLoaded
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                          : isSelected
                          ? 'bg-sky-950 border-sky-400 text-white'
                          : 'bg-[#080e1a] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate font-mono">
                        <strong className="text-sky-300">{item.spec.code}</strong>{' '}
                        {item.spec.rawLabelText}
                      </span>
                      <span className="text-[10px] font-mono shrink-0 tabular-nums">
                        {item.activatedOrLoaded ? (
                          <span className="text-emerald-400 font-bold">✓ XONG</span>
                        ) : item.scanned ? (
                          item.spec.isValidTarget ? (
                            <span className="text-cyan-300">={item.spec.rawValueText}</span>
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

            {/* Action Buttons: Camera (C), Pulse (F), Interact (E) */}
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => onSwitchCameraMode()}
                className="py-1.5 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                title="Đổi góc nhìn Camera: Chase / Cockpit / FPS Scanner (Phím C)"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>C: {cameraLabel}</span>
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
                onClick={onTriggerInteract}
                className="py-1.5 px-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                title="Tương tác / Kích hoạt mục tiêu khoa học (Phím E)"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>E: Thao Tác</span>
              </button>
            </div>

            {/* Music Generator / Toggle */}
            <button
              onClick={handleGenerateOrToggleMusic}
              disabled={generatingMusic}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-amber-300 flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Music className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{musicStatus || 'Nhạc nền AI Lyria / Synth'}</span>
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
            <span>CỔNG ĐÃ MỞ — THI 10 CÂU</span>
          </button>
        )}
      </div>

      {/* 3. Top-Center Feedback Banner */}
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
