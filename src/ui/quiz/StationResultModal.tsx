import React from 'react';
import {
  Star,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Navigation,
  MapPin,
  Flag,
} from 'lucide-react';
import {
  QuantityRecord,
  StationAttemptRecord,
  StationProgressState,
  StationRecord,
} from '../../types/game';
import { M01RunEvidence } from '../../types/missionSpec';

interface StationResultModalProps {
  station: StationRecord;
  quantity?: QuantityRecord;
  lastAttempt: StationAttemptRecord;
  stationState: StationProgressState;
  drivingScore: number;
  m01Evidence?: M01RunEvidence | null;
  isLastStationInCampaign: boolean;
  campaignStations?: StationRecord[];
  stationProgress?: Record<string, StationProgressState>;
  onRetryNewEquivalentSet: () => void;
  onContinueNextStation: () => void;
  onReturnToCheckpoint: () => void;
  onBackToMenu: () => void;
}

export const StationResultModal: React.FC<StationResultModalProps> = ({
  station,
  quantity,
  lastAttempt,
  stationState,
  drivingScore,
  m01Evidence,
  isLastStationInCampaign,
  campaignStations = [],
  stationProgress = {},
  onRetryNewEquivalentSet,
  onContinueNextStation,
  onReturnToCheckpoint,
  onBackToMenu,
}) => {
  const passed = lastAttempt.score_0_10 >= station.pass_score;

  // Find next checkpoint in campaign route
  const currentIdx = campaignStations.findIndex(
    (s) => s.station_id === station.station_id
  );
  const nextCheckpoint = campaignStations
    .slice(Math.max(0, currentIdx + 1))
    .find((s) => s.station_type === 'checkpoint');
  const nextStation =
    currentIdx >= 0 && currentIdx + 1 < campaignStations.length
      ? campaignStations[currentIdx + 1]
      : null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100 my-auto">
        {/* Header Banner */}
        <div
          className={`px-6 py-5 border-b flex items-center justify-between ${
            passed
              ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/30'
              : 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-rose-500/30'
          }`}
        >
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              BÁO CÁO KẾT QUẢ TRẠM #{station.order} ({station.type_label_vi})
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              {station.title}
            </h2>
            <p className="text-xs font-mono mt-1 text-slate-300">
              {passed
                ? 'ĐẠT YÊU CẦU (≥ 5/10) — Đã mở khóa lộ trình tiếp theo!'
                : 'CHƯA ĐẠT (< 5/10) — Cần ôn lại và vượt trạm với bộ câu hỏi tương đương.'}
            </p>
          </div>

          {/* 3-Star Badge */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
            {[1, 2, 3].map((starIdx) => {
              const active = starIdx <= lastAttempt.stars;
              return (
                <Star
                  key={starIdx}
                  className={`w-7 h-7 transition-transform ${
                    active
                      ? 'text-amber-400 fill-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : 'text-slate-700'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* 3 Independent Scoreboards: Knowledge Score (0-10), Driving Score (0-100), Mission Performance (0-100) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-[11px] font-mono uppercase text-sky-400">
                1. Điểm Kiến Thức (Độc lập)
              </div>
              <div className="text-2xl font-mono font-bold text-white mt-1">
                {lastAttempt.score_0_10}{' '}
                <span className="text-sm text-slate-500">/ 10</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Kỷ lục: {stationState.best_score}/10 ({stationState.best_stars}★) · {lastAttempt.duration_seconds}s
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-[11px] font-mono uppercase text-emerald-400 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                <span>2. Điểm Kỹ Năng Lái</span>
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-300 mt-1">
                {drivingScore}{' '}
                <span className="text-xs text-slate-500">/ 100 pts</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Tách biệt hoàn toàn với điểm học tập
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-[11px] font-mono uppercase text-amber-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>3. Điểm Thực Địa Trạm</span>
              </div>
              <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
                {m01Evidence ? m01Evidence.missionPerformanceScore : 90}{' '}
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {m01Evidence
                  ? `Cân: ${m01Evidence.interactionEvidence.calibratedTotalMassKg.toFixed(1)}/15,0 kg · Quét ${m01Evidence.scanCount} nhãn`
                  : 'Hoàn thành nhiệm vụ thực địa'}
              </div>
            </div>
          </div>

          {/* 2–3 Key Knowledge Mistakes / Review Cards */}
          {lastAttempt.weak_objectives.length > 0 ? (
            <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4" />
                2–3 Trọng tâm kiến thức cần lưu ý (Hàng đợi ôn tập):
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200 list-disc list-inside">
                {lastAttempt.weak_objectives.map((m, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center gap-3 text-emerald-200 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Tuyệt vời! Bạn đã trả lời chính xác toàn bộ 10/10 câu hỏi của trạm
                này mà không mắc lỗi sai nào.
              </span>
            </div>
          )}

          {/* Quick Formula & Unit Recap Card */}
          {quantity && (
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/70 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div>
                <span className="text-slate-400">Đại lượng:</span>{' '}
                <strong className="text-white">
                  {quantity.name_vi} ({quantity.symbol})
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Đơn vị SI:</span>{' '}
                <strong className="text-sky-300">{quantity.unit_si}</strong>
              </div>
              <div>
                <span className="text-slate-400">Công thức:</span>{' '}
                <strong className="text-amber-300">
                  {quantity.formula_as_taught}
                </strong>
              </div>
            </div>
          )}

          {/* Map Route Progress, Unlocked Station & Next Checkpoint (04_WORLD_PHYSICS_AND_ACCEPTANCE.md Section 7) */}
          {campaignStations.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    TIẾN ĐỘ LỘ TRÌNH BẢN ĐỒ ({campaignStations.length} ĐIỂM DỪNG)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  {nextStation && passed && (
                    <span className="text-emerald-400">
                      Mở khóa:{' '}
                      <strong>
                        #{nextStation.order} {nextStation.title}
                      </strong>
                    </span>
                  )}
                  {nextCheckpoint && (
                    <span className="text-amber-300 flex items-center gap-1">
                      <Flag className="w-3 h-3" />
                      Checkpoint kế: <strong>#{nextCheckpoint.order}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {campaignStations.map((st) => {
                  const prog = stationProgress[st.station_id];
                  const isCurrent = st.station_id === station.station_id;
                  const isCheckpoint = st.station_type === 'checkpoint';
                  let nodeClass =
                    'bg-slate-800 text-slate-500 border-slate-700';
                  if (prog?.completed) {
                    nodeClass =
                      'bg-emerald-500/25 text-emerald-300 border-emerald-500/60';
                  } else if (isCurrent) {
                    nodeClass = passed
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-bold'
                      : 'bg-rose-500/30 text-rose-300 border-rose-400 font-bold';
                  } else if (prog?.unlocked) {
                    nodeClass =
                      'bg-sky-500/25 text-sky-300 border-sky-400/60';
                  }

                  return (
                    <div
                      key={st.station_id}
                      title={`#${st.order}: ${st.title} (${prog?.best_stars || 0}★)`}
                      className={`px-2 py-1 rounded text-[10px] font-mono border shrink-0 flex items-center gap-1 ${nodeClass}`}
                    >
                      <span>
                        {isCheckpoint ? `CP${st.order}` : `#${st.order}`}
                      </span>
                      {prog?.best_stars ? (
                        <span className="text-amber-400">
                          {prog.best_stars}★
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRetryNewEquivalentSet}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {passed
                ? 'Làm lại trạm để nâng sao (Bộ câu tương đương)'
                : 'Làm lại trạm ngay (Bộ câu tương đương)'}
            </button>

            {!passed && (
              <button
                onClick={onReturnToCheckpoint}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-semibold text-xs sm:text-sm border border-amber-500/30 transition cursor-pointer"
              >
                Lùi về Checkpoint gần nhất
              </button>
            )}
          </div>

          {passed && (
            <button
              onClick={
                isLastStationInCampaign ? onBackToMenu : onContinueNextStation
              }
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
            >
              <span>
                {isLastStationInCampaign
                  ? 'Hoàn thành chiến dịch & Xem tổng kết'
                  : 'Tiếp tục lái tới trạm kế tiếp'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
