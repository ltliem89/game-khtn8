import React from 'react';
import {
  DifficultyLayer,
  PerformanceTier,
} from '../../types/missionSpec';
import {
  CheckCircle2,
  Cpu,
  Gauge,
  Play,
  Scan,
  Scale,
  ShieldAlert,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { soundEngine } from '../../game/audio/soundEngine';

interface MissionBriefingOverlayProps {
  difficulty: DifficultyLayer;
  performanceTier: PerformanceTier;
  onChangeDifficulty: (d: DifficultyLayer) => void;
  onChangePerformanceTier: (t: PerformanceTier) => void;
  onStartM01Mission: () => void;
  onSkipBriefingToDrive: () => void;
}

export const MissionBriefingOverlay: React.FC<MissionBriefingOverlayProps> = ({
  difficulty,
  performanceTier,
  onChangeDifficulty,
  onChangePerformanceTier,
  onStartM01Mission,
  onSkipBriefingToDrive,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto pointer-events-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-[#0b1322]/95 border border-sky-500/40 shadow-2xl overflow-hidden text-slate-100 my-auto">
        {/* Top Story & Mission Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-sky-950/90 via-slate-900 to-amber-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-[11px] font-mono text-sky-300 mb-1.5">
              <span>WORLD 01 · MATERIAL FACTORY</span>
              <span>·</span>
              <span className="text-amber-300 font-bold">M01 — THE MASS VAULT</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Nhiệm Vụ M01: Kho Lưu Trữ Khối Lượng (NOVA-8)
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              KHTN 8 (Kết nối tri thức) · Chương III: Khối lượng riêng &amp; Áp suất · Đại lượng: Khối lượng (m — đơn vị SI: kg)
            </p>
          </div>

          <button
            onClick={() =>
              soundEngine.speakEnglishAuto(
                'Mission One: The Mass Vault. Physical quantity: Mass, symbol m, SI unit: kilogram. Calibrate fifteen kilograms on the electronic balance conveyor.'
              )
            }
            className="px-3 py-2 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>Nghe Chuẩn Quốc Tế (EN)</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Narrative Dialogue from Dr. Linh & Drone ORBIT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  TIẾN SĨ LINH · TRƯỞNG TRẠM NOVA-8
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  BRIEFING LOG #01
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                &ldquo;Hệ thống phân loại tự động tại <strong>Kho Lưu Trữ Khối Lượng</strong> đang bị nhiễu dữ liệu! Một số kiện hàng bị dán nhầm nhãn <strong>Trọng lượng (P — Newton)</strong> và <strong>Thể tích (V — Lít)</strong> thay vì <strong>Khối lượng (m — kg, g, yến)</strong>.&rdquo;
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  DRONE ORBIT · TRỢ LÝ CẢM BIẾN
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  MỤC TIÊU: 15,0 kg
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                &ldquo;Hãy điều khiển JetBot vượt qua <strong>Khu Phân Luồng A/B/C</strong> (chú ý vòng cảnh báo cam 2 giây của cần cẩu), tiến vào <strong>Khoang Quét Cân Điện Tử (CP1)</strong>, dùng <strong>Góc nhìn FPS Scanner (Phím C)</strong> quét 5 kiện hàng và nạp đúng <strong>3 kiện Khối lượng (2,5 kg + 5,0 kg + 7,5 kg = 15,0 kg)</strong> lên băng chuyền!&rdquo;
              </p>
            </div>
          </div>

          {/* 3-Stage Playable Pipeline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>1. ĐUA PHÂN LUỒNG (CP0 → CP1)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Lái xe qua 3 làn phân loại A/B/C, tránh cần cẩu hạ container (báo trước 2 giây trên sàn) để giữ trọn điểm lái.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <Scan className="w-4 h-4 text-emerald-400" />
                <span>2. QUÉT FPS &amp; NẠP CÂN (CP1 → CP2)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Chuyển <strong>Camera FPS (Phím C)</strong>, phát xung <strong>Science Pulse (Phím F)</strong> và nhấn <strong>Phím E</strong> nạp 3 kiện khối lượng đạt chuẩn <strong>15,0 kg</strong>. Quét đủ 5 nhãn sẽ mở <strong>Cổng Tắt Bảo Trì + Holo-Crate</strong>!
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <Scale className="w-4 h-4 text-sky-400" />
                <span>3. VƯỢT CỔNG &amp; THI 10 CÂU</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khi đủ 15,0 kg, Cổng Thoát mở xanh. Lái xe qua cổng để làm bài kiểm tra 10 câu (4 Biết · 3 Hiểu · 3 Vận dụng).
              </p>
            </div>
          </div>

          {/* Difficulty Layer & Graphics Performance Tier Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/75 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
                Cấp độ thử thách (Difficulty Layer):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    ['ROOKIE', 'Rookie (Dễ)'],
                    ['PRO', 'Pro (Chuẩn)'],
                    ['ELITE', 'Elite (Khó)'],
                    ['SCIENCE_MASTER', 'Master'],
                  ] as [DifficultyLayer, string][]
                ).map(([lvl, label]) => (
                  <button
                    key={lvl}
                    onClick={() => onChangeDifficulty(lvl)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cấu hình Đồ họa 3D (Performance Tier):</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['ULTRA', 'Ultra PBR'],
                    ['HIGH', 'High (60 FPS)'],
                    ['PERFORMANCE', 'Performance'],
                  ] as [PerformanceTier, string][]
                ).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => onChangePerformanceTier(t)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      performanceTier === t
                        ? 'bg-emerald-500 text-slate-950 shadow'
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

        {/* Footer Action Bar */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              3 Bảng điểm độc lập: Điểm Kiến Thức (0–10) · Điểm Lái (0–100) · Điểm Nhiệm Vụ M01 (0–100)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSkipBriefingToDrive}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Bỏ qua giới thiệu
            </button>
            <button
              onClick={onStartM01Mission}
              className="px-6 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>BẮT ĐẦU NHIỆM VỤ M01 NGAY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
