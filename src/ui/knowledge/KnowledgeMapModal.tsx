import React, { useState, useMemo } from 'react';
import {
  X,
  Network,
  Sparkles,
  Coins,
  Gift,
  Zap,
  Shield,
  Magnet,
  Cpu,
  CheckCircle2,
  Lock,
  Star,
  Volume2,
  BookOpen,
  Lightbulb,
  ArrowUpRight,
  Award,
} from 'lucide-react';
import {
  QuantityRecord,
  RewardWallet,
  StationProgressState,
  StationRecord,
  TeacherAnalytics,
} from '../../types/game';
import {
  buildInternationalSpeechText,
  getPronunciationByQuantityId,
} from '../../content/chemistryElementsCompounds';
import { soundEngine } from '../../game/audio/soundEngine';

interface KnowledgeMapModalProps {
  quantities: QuantityRecord[];
  stations: StationRecord[];
  stationProgress: Record<string, StationProgressState>;
  analytics: TeacherAnalytics;
  wallet: RewardWallet;
  onSpendCoinsForItem: (
    itemType:
      | 'hint5050'
      | 'aiHint'
      | 'streakShield'
      | 'upgrade_magnet'
      | 'upgrade_nitro'
      | 'upgrade_scanner'
      | 'unlock_card',
    cost: number,
    cardId?: string
  ) => void;
  onTeleportToStation?: (stationIndex: number) => void;
  onClose: () => void;
}

interface GraphNodeDef {
  id: string;
  shortLabel: string;
  cluster: 'foundation' | 'mechanics' | 'electricity' | 'thermal' | 'synthesis';
  x: number;
  y: number;
  edgesTo: string[];
}

const KNOWLEDGE_GRAPH_NODES: GraphNodeDef[] = [
  // Foundation Cluster
  {
    id: 'PHY_MASS',
    shortLabel: 'Khối lượng (m)',
    cluster: 'foundation',
    x: 95,
    y: 120,
    edgesTo: ['PHY_DENSITY', 'PHY_PRESSURE'],
  },
  {
    id: 'PHY_VOLUME',
    shortLabel: 'Thể tích (V)',
    cluster: 'foundation',
    x: 95,
    y: 260,
    edgesTo: ['PHY_DENSITY', 'PHY_ARCHIMEDES', 'PHY_THERMAL_EXPANSION'],
  },
  // Mechanics & Fluids Cluster
  {
    id: 'PHY_DENSITY',
    shortLabel: 'Khối lượng riêng (D)',
    cluster: 'mechanics',
    x: 260,
    y: 185,
    edgesTo: ['PHY_PRESSURE', 'PHY_FLUID_PRESSURE', 'PHY_ARCHIMEDES'],
  },
  {
    id: 'PHY_PRESSURE',
    shortLabel: 'Áp suất (p = F/S)',
    cluster: 'mechanics',
    x: 430,
    y: 95,
    edgesTo: ['PHY_FLUID_PRESSURE', 'PHY_CHECKPOINT_SYNTHESIS'],
  },
  {
    id: 'PHY_FLUID_PRESSURE',
    shortLabel: 'Áp suất lỏng & khí',
    cluster: 'mechanics',
    x: 430,
    y: 195,
    edgesTo: ['PHY_ARCHIMEDES', 'PHY_CHECKPOINT_SYNTHESIS'],
  },
  {
    id: 'PHY_ARCHIMEDES',
    shortLabel: 'Lực đẩy FA = d.V',
    cluster: 'mechanics',
    x: 430,
    y: 300,
    edgesTo: ['PHY_CHECKPOINT_SYNTHESIS'],
  },
  {
    id: 'PHY_MOMENT',
    shortLabel: 'Moment lực (M)',
    cluster: 'mechanics',
    x: 260,
    y: 365,
    edgesTo: ['PHY_LEVER'],
  },
  {
    id: 'PHY_LEVER',
    shortLabel: 'Đòn bẩy (O)',
    cluster: 'mechanics',
    x: 430,
    y: 395,
    edgesTo: ['PHY_CHECKPOINT_SYNTHESIS'],
  },
  // Electricity Cluster
  {
    id: 'PHY_CURRENT',
    shortLabel: 'Dòng điện (I - A)',
    cluster: 'electricity',
    x: 625,
    y: 115,
    edgesTo: ['PHY_VOLTAGE', 'PHY_JOULEMETER'],
  },
  {
    id: 'PHY_VOLTAGE',
    shortLabel: 'Hiệu điện thế (U - V)',
    cluster: 'electricity',
    x: 625,
    y: 230,
    edgesTo: ['PHY_JOULEMETER', 'PHY_CHECKPOINT_SYNTHESIS'],
  },
  // Thermal Cluster
  {
    id: 'PHY_THERMAL_ENERGY',
    shortLabel: 'Nội năng & Nhiệt (J)',
    cluster: 'thermal',
    x: 625,
    y: 350,
    edgesTo: ['PHY_JOULEMETER', 'PHY_HEAT_TRANSFER', 'PHY_THERMAL_EXPANSION'],
  },
  {
    id: 'PHY_JOULEMETER',
    shortLabel: 'Thực hành Joulemeter',
    cluster: 'thermal',
    x: 805,
    y: 230,
    edgesTo: ['PHY_CHECKPOINT_SYNTHESIS'],
  },
  {
    id: 'PHY_HEAT_TRANSFER',
    shortLabel: 'Dẫn · Đối lưu · Bức xạ',
    cluster: 'thermal',
    x: 805,
    y: 335,
    edgesTo: ['PHY_CHECKPOINT_SYNTHESIS'],
  },
  {
    id: 'PHY_THERMAL_EXPANSION',
    shortLabel: 'Sự nở vì nhiệt',
    cluster: 'thermal',
    x: 805,
    y: 425,
    edgesTo: ['PHY_CHECKPOINT_SYNTHESIS'],
  },
  // Synthesis Hub
  {
    id: 'PHY_CHECKPOINT_SYNTHESIS',
    shortLabel: 'Tổng hợp KHTN 8',
    cluster: 'synthesis',
    x: 965,
    y: 255,
    edgesTo: [],
  },
];

const CLUSTER_STYLE: Record<
  GraphNodeDef['cluster'],
  { label: string; stroke: string; fill: string; badge: string }
> = {
  foundation: {
    label: 'Kiến thức nền (m, V)',
    stroke: '#38bdf8',
    fill: '#0c4a6e',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  mechanics: {
    label: 'Cơ học & Áp suất (Bài 13–19)',
    stroke: '#10b981',
    fill: '#064e3b',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  electricity: {
    label: 'Điện học (Bài 24–25)',
    stroke: '#fbbf24',
    fill: '#78350f',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  thermal: {
    label: 'Nhiệt học (Bài 26–29)',
    stroke: '#f97316',
    fill: '#7c2d12',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  synthesis: {
    label: 'Checkpoint Liên hoàn',
    stroke: '#c084fc',
    fill: '#581c87',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
};

export const KnowledgeMapModal: React.FC<KnowledgeMapModalProps> = ({
  quantities,
  stations,
  stationProgress,
  analytics,
  wallet,
  onSpendCoinsForItem,
  onTeleportToStation,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'knowledge_map' | 'tech_shop'>(
    'knowledge_map'
  );
  const [selectedQuantityId, setSelectedQuantityId] =
    useState<string>('PHY_DENSITY');
  const [shopNotice, setShopNotice] = useState<string | null>(null);

  const selectedQuantity = useMemo(
    () =>
      quantities.find((q) => q.id === selectedQuantityId) || quantities[0],
    [quantities, selectedQuantityId]
  );

  const selectedNodeDef = useMemo(
    () =>
      KNOWLEDGE_GRAPH_NODES.find((n) => n.id === selectedQuantityId) ||
      KNOWLEDGE_GRAPH_NODES[0],
    [selectedQuantityId]
  );

  // Calculate mastery per quantity from stationProgress and analytics
  const quantityMasteryMap = useMemo(() => {
    const map: Record<
      string,
      {
        unlockedCard: boolean;
        completedStations: number;
        totalStations: number;
        bestStarsSum: number;
        accuracyPercent: number | null;
        firstStationIndex: number;
      }
    > = {};

    quantities.forEach((q) => {
      const matchingStations = stations
        .map((st, idx) => ({ st, idx }))
        .filter((item) => item.st.target_quantity_id === q.id);

      const completedStations = matchingStations.filter(
        (item) => stationProgress[item.st.station_id]?.completed
      ).length;
      const bestStarsSum = matchingStations.reduce(
        (acc, item) =>
          acc + (stationProgress[item.st.station_id]?.best_stars || 0),
        0
      );

      const qStat = analytics.first_try_by_quantity[q.id];
      const accuracyPercent =
        qStat && qStat.total > 0
          ? Math.round((qStat.correct / qStat.total) * 100)
          : null;

      const unlockedCard =
        wallet.unlockedKnowledgeCards.includes(q.id) || completedStations > 0;

      map[q.id] = {
        unlockedCard,
        completedStations,
        totalStations: matchingStations.length,
        bestStarsSum,
        accuracyPercent,
        firstStationIndex:
          matchingStations.length > 0 ? matchingStations[0].idx : 0,
      };
    });

    return map;
  }, [quantities, stations, stationProgress, analytics, wallet.unlockedKnowledgeCards]);

  const totalUnlockedCards = Object.values(quantityMasteryMap).filter(
    (m) => m.unlockedCard
  ).length;

  const selectedMastery = quantityMasteryMap[selectedQuantity.id] || {
    unlockedCard: false,
    completedStations: 0,
    totalStations: 1,
    bestStarsSum: 0,
    accuracyPercent: null,
    firstStationIndex: 0,
  };

  const selectedPronItem = getPronunciationByQuantityId(selectedQuantity.id);

  const handlePurchase = (
    itemType:
      | 'hint5050'
      | 'aiHint'
      | 'streakShield'
      | 'upgrade_magnet'
      | 'upgrade_nitro'
      | 'upgrade_scanner'
      | 'unlock_card',
    cost: number,
    label: string,
    cardId?: string
  ) => {
    if (wallet.coins < cost) {
      soundEngine.playOffLaneWarning();
      setShopNotice(
        `Chưa đủ Xu Công Nghệ! Bạn cần ${cost} Xu (hiện có ${wallet.coins} Xu). Hãy lái xe nhặt Xu hoặc trả lời đúng trắc nghiệm!`
      );
      return;
    }
    soundEngine.playRewardUnlock();
    onSpendCoinsForItem(itemType, cost, cardId);
    setShopNotice(`Đã kích hoạt thành công: ${label} (-${cost} Xu)!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/88 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-6xl h-[90vh] bg-[#0b1322] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Bản Đồ Tri Thức &amp; Công Nghệ Game
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Đã mở khóa {totalUnlockedCards}/{quantities.length} Nút Tri Thức
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                Mạng Lưới Đại Lượng Vật Lý KHTN 8 &amp; Trung Tâm Nâng Cấp JetBot AI
              </h2>
            </div>
          </div>

          {/* Wallet Status Pills + Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{wallet.coins} Xu</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-400/40 text-purple-200 font-mono text-xs font-bold">
              <Gift className="w-4 h-4 text-purple-400" />
              <span>{wallet.giftsOpened} Hộp quà</span>
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  soundEngine.playStepClick();
                  setActiveTab('knowledge_map');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'knowledge_map'
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Bản Đồ Tri Thức 2D</span>
              </button>
              <button
                onClick={() => {
                  soundEngine.playStepClick();
                  setActiveTab('tech_shop');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'tech_shop'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Xưởng Công Nghệ &amp; Quà ({wallet.coins} Xu)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {shopNotice && (
          <div className="px-5 py-2 bg-sky-950/90 border-b border-sky-500/40 text-sky-200 text-xs flex items-center justify-between">
            <span>{shopNotice}</span>
            <button
              onClick={() => setShopNotice(null)}
              className="text-sky-400 font-bold cursor-pointer"
            >
              Ẩn
            </button>
          </div>
        )}

        {/* TAB 1: INTERACTIVE KNOWLEDGE CONSTELLATION MAP */}
        {activeTab === 'knowledge_map' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left 7 cols: Interactive SVG Knowledge Constellation */}
            <div className="lg:col-span-7 p-4 flex flex-col justify-between bg-[#070c17] border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-xs text-slate-400">
                  Nhấn vào từng <strong className="text-sky-300">Nút Đại Lượng</strong> để tra cứu công thức SGK, mối liên hệ kiến thức và dịch chuyển nhanh tới trạm:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CLUSTER_STYLE).map(([key, st]) => (
                    <span
                      key={key}
                      className={`text-[10px] px-2 py-0.5 rounded border font-medium ${st.badge}`}
                    >
                      {st.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Interactive SVG Graph */}
              <div className="relative w-full flex-1 min-h-[340px] flex items-center justify-center bg-[#09101f] rounded-2xl border border-slate-800/90 p-2 overflow-hidden">
                <svg
                  viewBox="0 0 1060 490"
                  className="w-full h-full max-h-[460px] select-none"
                >
                  <defs>
                    <filter id="glowNode" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Background Grid Lines */}
                  {[90, 190, 290, 390].map((gy) => (
                    <line
                      key={gy}
                      x1="20"
                      y1={gy}
                      x2="1040"
                      y2={gy}
                      stroke="#1e293b"
                      strokeDasharray="4 6"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Directed Edges */}
                  {KNOWLEDGE_GRAPH_NODES.map((node) =>
                    node.edgesTo.map((targetId) => {
                      const target = KNOWLEDGE_GRAPH_NODES.find(
                        (n) => n.id === targetId
                      );
                      if (!target) return null;
                      const isHighlighted =
                        selectedQuantityId === node.id ||
                        selectedQuantityId === target.id;
                      const sourceUnlocked =
                        quantityMasteryMap[node.id]?.unlockedCard;
                      return (
                        <g key={`${node.id}->${target.id}`}>
                          <line
                            x1={node.x}
                            y1={node.y}
                            x2={target.x}
                            y2={target.y}
                            stroke={
                              isHighlighted
                                ? '#38bdf8'
                                : sourceUnlocked
                                ? '#334155'
                                : '#1e293b'
                            }
                            strokeWidth={isHighlighted ? 3 : 2}
                            strokeDasharray={sourceUnlocked ? undefined : '5 5'}
                          />
                        </g>
                      );
                    })
                  )}

                  {/* Graph Nodes */}
                  {KNOWLEDGE_GRAPH_NODES.map((node) => {
                    const style = CLUSTER_STYLE[node.cluster];
                    const mastery = quantityMasteryMap[node.id];
                    const isSelected = selectedQuantityId === node.id;
                    const isUnlocked = mastery?.unlockedCard ?? false;
                    const isMastered = (mastery?.completedStations || 0) > 0;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => {
                          soundEngine.playStepClick();
                          setSelectedQuantityId(node.id);
                        }}
                        className="cursor-pointer"
                      >
                        {/* Outer selection pulse ring */}
                        {isSelected && (
                          <circle
                            r="38"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2.5"
                            strokeDasharray="5 3"
                          />
                        )}

                        {/* Node Box */}
                        <rect
                          x="-68"
                          y="-26"
                          width="136"
                          height="52"
                          rx="12"
                          fill={isUnlocked ? style.fill : '#0f172a'}
                          stroke={isSelected ? '#ffffff' : style.stroke}
                          strokeWidth={isSelected ? 2.8 : 1.8}
                          filter={isSelected ? 'url(#glowNode)' : undefined}
                        />

                        {/* Title */}
                        <text
                          x="0"
                          y="-4"
                          textAnchor="middle"
                          fill={isUnlocked ? '#f8fafc' : '#94a3b8'}
                          fontSize="11.5"
                          fontWeight="700"
                        >
                          {node.shortLabel}
                        </text>

                        {/* Status / Stars Row */}
                        <text
                          x="0"
                          y="14"
                          textAnchor="middle"
                          fill={
                            isMastered
                              ? '#fbbf24'
                              : isUnlocked
                              ? '#38bdf8'
                              : '#64748b'
                          }
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="600"
                        >
                          {isMastered
                            ? `★ ${mastery.bestStarsSum} sao · Đã qua`
                            : isUnlocked
                            ? '✓ Đã mở thẻ'
                            : '🔒 Chưa mở'}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Bottom Legend */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <span>Đã vượt trạm &amp; có Sao</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                    <span>Đã mở Thẻ Tri Thức (từ Hộp quà trên đường)</span>
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  Mẹo: Nhặt Hộp Quà màu tím trên đường đua để mở khóa tự động các Thẻ Tri Thức!
                </span>
              </div>
            </div>

            {/* Right 5 cols: Detailed Node Inspector */}
            <div className="lg:col-span-5 p-5 overflow-y-auto flex flex-col justify-between space-y-4 bg-[#0b1322]">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-block text-[11px] font-mono px-2.5 py-0.5 rounded border ${
                        CLUSTER_STYLE[selectedNodeDef.cluster].badge
                      }`}
                    >
                      {CLUSTER_STYLE[selectedNodeDef.cluster].label} ·{' '}
                      {selectedQuantity.lesson_refs.join(', ')}
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-1.5">
                      {selectedQuantity.name_vi}
                    </h3>
                  </div>

                  {selectedPronItem && (
                    <button
                      onClick={() =>
                        soundEngine.speakEnglishAuto(
                          buildInternationalSpeechText(selectedPronItem, true)
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{selectedPronItem.englishName}</span>
                    </button>
                  )}
                </div>

                {/* Mastery & Card Unlock Banner */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-mono text-slate-400">
                      TRẠNG THÁI THẺ
                    </div>
                    <div className="text-xs font-bold mt-1 flex items-center justify-center gap-1 text-sky-300">
                      {selectedMastery.unlockedCard ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Đã sở hữu</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Đang khóa</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-mono text-slate-400">
                      SAO ĐẠT ĐƯỢC
                    </div>
                    <div className="text-xs font-bold mt-1 flex items-center justify-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{selectedMastery.bestStarsSum} sao</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-mono text-slate-400">
                      ĐỘ CHÍNH XÁC
                    </div>
                    <div className="text-xs font-bold mt-1 text-emerald-400 font-mono">
                      {selectedMastery.accuracyPercent !== null
                        ? `${selectedMastery.accuracyPercent}%`
                        : 'Chưa thi'}
                    </div>
                  </div>
                </div>

                {/* Formula & SI Unit Card */}
                <div className="bg-slate-900/95 border border-sky-500/30 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-sky-400 font-bold">
                      CÔNG THỨC &amp; ĐƠN VỊ CHUẨN SGK
                    </span>
                    <span className="font-mono text-amber-300">
                      Ký hiệu: {selectedQuantity.symbol} · SI:{' '}
                      {selectedQuantity.unit_si}
                    </span>
                  </div>
                  <div className="text-base font-mono font-extrabold text-white bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800">
                    {selectedQuantity.formula_as_taught}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedQuantity.meaning_vi}
                  </p>
                  {selectedQuantity.variable_explanations.length > 0 && (
                    <div className="pt-1 space-y-1 border-t border-slate-800/80">
                      {selectedQuantity.variable_explanations.map((v, i) => (
                        <div
                          key={i}
                          className="text-xs text-slate-400 flex items-center justify-between font-mono"
                        >
                          <span>
                            <strong className="text-sky-300">{v.symbol}</strong>:{' '}
                            {v.meaning_vi}
                          </span>
                          <span className="text-slate-300">{v.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Common Misconceptions */}
                {selectedQuantity.common_misconceptions.length > 0 && (
                  <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 space-y-1.5">
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Lưu ý tránh nhầm lẫn thường gặp:</span>
                    </div>
                    <ul className="text-xs text-amber-100/90 space-y-1 list-disc list-inside">
                      {selectedQuantity.common_misconceptions.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Connected Nodes */}
                {selectedNodeDef.edgesTo.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-400">
                      Mở đường dẫn tới kiến thức tiếp theo:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNodeDef.edgesTo.map((nextId) => {
                        const nextNode = KNOWLEDGE_GRAPH_NODES.find(
                          (n) => n.id === nextId
                        );
                        if (!nextNode) return null;
                        return (
                          <button
                            key={nextId}
                            onClick={() => {
                              soundEngine.playStepClick();
                              setSelectedQuantityId(nextId);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 font-medium flex items-center gap-1 cursor-pointer border border-slate-700"
                          >
                            <span>{nextNode.shortLabel}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons at bottom of inspector */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2.5">
                {!selectedMastery.unlockedCard && (
                  <button
                    onClick={() =>
                      handlePurchase(
                        'unlock_card',
                        40,
                        `Thẻ Tri Thức ${selectedQuantity.name_vi}`,
                        selectedQuantity.id
                      )
                    }
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Mở khóa Thẻ Tri Thức này (40 Xu)</span>
                  </button>
                )}

                {onTeleportToStation && (
                  <button
                    onClick={() => {
                      soundEngine.playStepClick();
                      onTeleportToStation(selectedMastery.firstStationIndex);
                      onClose();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>
                      Đưa xe tới Trạm #{selectedMastery.firstStationIndex + 1}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TECH UPGRADES & QUIZ POWER-UPS SHOP */}
        {activeTab === 'tech_shop' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-6 bg-[#080e1a]">
            {/* Top summary banner */}
            <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-purple-950/70 border border-sky-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-mono text-sky-300 uppercase">
                  Hệ thống tích lũy năng lượng &amp; phần thưởng trên đường đua
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Thu thập Đồng Xu Lượng Tử &amp; Hộp Quà Bí Ẩn trên đường để nâng cấp JetBot AI
                </h3>
                <p className="text-xs text-slate-300">
                  Mỗi Đồng Xu trên đường cộng <strong>+15 Xu &amp; +10% Nitro</strong>. Mỗi Hộp Quà Tím cộng <strong>+40 Xu</strong> kèm 1 vật phẩm trợ quyền hoặc Thẻ Tri Thức ngẫu nhiên!
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2.5 rounded-xl bg-slate-950/90 border border-amber-500/40 text-center">
                  <div className="text-[10px] font-mono text-slate-400">
                    SỐ DƯ HIỆN TẠI
                  </div>
                  <div className="text-lg font-extrabold font-mono text-amber-400">
                    {wallet.coins} Xu
                  </div>
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-slate-950/90 border border-purple-500/40 text-center">
                  <div className="text-[10px] font-mono text-slate-400">
                    TỔNG XU TÍCH LŨY
                  </div>
                  <div className="text-lg font-extrabold font-mono text-purple-300">
                    {wallet.totalCoinsEarned} Xu
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Quiz Assist Items */}
            <div>
              <h4 className="text-sm font-bold text-sky-300 uppercase font-mono mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>1. Vật Phẩm Trợ Quyền Khi Thi Trắc Nghiệm Tại Trạm</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 50/50 Radar */}
                <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-xs font-mono font-bold">
                        Đang có: {wallet.hint5050Charges} thẻ
                      </span>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        35 Xu / thẻ
                      </span>
                    </div>
                    <h5 className="text-base font-bold text-white">
                      Radar Loại Trừ 50/50
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Quét và gạch bỏ ngay 2 phương án nhiễu sai trong câu hỏi trắc nghiệm khó, giúp tăng xác suất chọn đúng lên 50%.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handlePurchase(
                        'hint5050',
                        35,
                        'Thẻ Radar Loại Trừ 50/50 (+1 lượt)'
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Đổi +1 Thẻ Radar 50/50 (35 Xu)
                  </button>
                </div>

                {/* AI Formula Hint */}
                <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                        Đang có: {wallet.aiHintCharges} thẻ
                      </span>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        25 Xu / thẻ
                      </span>
                    </div>
                    <h5 className="text-base font-bold text-white">
                      Cố Vấn Công Thức SGK
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Hiển thị gợi ý công thức, đơn vị chuẩn SI và bước đổi đơn vị ngay trong lúc làm câu hỏi Vận dụng mà không bị trừ điểm.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handlePurchase(
                        'aiHint',
                        25,
                        'Thẻ Cố Vấn Công Thức SGK (+1 lượt)'
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Đổi +1 Thẻ Cố Vấn SGK (25 Xu)
                  </button>
                </div>

                {/* Streak Shield */}
                <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-mono font-bold">
                        Đang có: {wallet.streakShieldCharges} khiên
                      </span>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        30 Xu / khiên
                      </span>
                    </div>
                    <h5 className="text-base font-bold text-white">
                      Khiên Bảo Toàn Chuỗi Combo
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Bảo vệ chuỗi trả lời đúng liên tiếp (Combo Streak x2, x3 nhận thưởng Xu) không bị mất khi lỡ chọn nhầm 1 câu.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handlePurchase(
                        'streakShield',
                        30,
                        'Khiên Bảo Toàn Chuỗi Combo (+1 lượt)'
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Đổi +1 Khiên Combo (30 Xu)
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: Permanent JetBot Hardware Upgrades */}
            <div>
              <h4 className="text-sm font-bold text-amber-300 uppercase font-mono mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <span>2. Nâng Cấp Phần Cứng Công Nghệ Cao Cho Xe JetBot AI</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Magnet Upgrade */}
                <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-mono text-cyan-300 font-bold">
                        <Magnet className="w-3.5 h-3.5" />
                        <span>Cấp {wallet.upgrades.magnetLevel} / 3</span>
                      </span>
                      <span className="text-xs font-mono text-amber-400">
                        Bán kính hút: {(2.8 + (wallet.upgrades.magnetLevel - 1) * 1.6).toFixed(1)} m
                      </span>
                    </div>
                    <h5 className="text-base font-bold text-white">
                      Từ Trường Hút Quà &amp; Xu
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tự động hút các Đồng Xu Lượng Tử và Hộp Quà Bí Ẩn ở hai bên lề đường về phía xe JetBot khi chạy ngang qua.
                    </p>
                  </div>
                  <button
                    disabled={wallet.upgrades.magnetLevel >= 3}
                    onClick={() =>
                      handlePurchase(
                        'upgrade_magnet',
                        60 * wallet.upgrades.magnetLevel,
                        `Nâng cấp Từ Trường Hút Xu lên Cấp ${
                          wallet.upgrades.magnetLevel + 1
                        }`
                      )
                    }
                    className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer ${
                      wallet.upgrades.magnetLevel >= 3
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                    }`}
                  >
                    {wallet.upgrades.magnetLevel >= 3
                      ? 'Đã Đạt Cấp Tối Đa (Lv.3)'
                      : `Nâng Cấp Lv.${wallet.upgrades.magnetLevel + 1} (${
                          60 * wallet.upgrades.magnetLevel
                        } Xu)`}
                  </button>
                </div>

                {/* Nitro Upgrade */}
                <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-mono text-amber-300 font-bold">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Cấp {wallet.upgrades.nitroLevel} / 3</span>
                      </span>
                      <span className="text-xs font-mono text-emerald-400">
                        Phím Shift / Nút Turbo
                      </span>
                    </div>
                    <h5 className="text-base font-bold text-white">
                      Động Cơ Phản Lực Nitro
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tăng công suất bứt tốc khi giữ phím Shift (hoặc chạm nút Nitro trên HUD) và tăng lượng năng lượng nạp từ Đệm Tăng Tốc.
                    </p>
                  </div>
                  <button
                    disabled={wallet.upgrades.nitroLevel >= 3}
                    onClick={() =>
                      handlePurchase(
                        'upgrade_nitro',
                        60 * wallet.upgrades.nitroLevel,
                        `Nâng cấp Động Cơ Nitro lên Cấp ${
                          wallet.upgrades.nitroLevel + 1
                        }`
                      )
                    }
                    className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer ${
                      wallet.upgrades.nitroLevel >= 3
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    }`}
                  >
                    {wallet.upgrades.nitroLevel >= 3
                      ? 'Đã Đạt Cấp Tối Đa (Lv.3)'
                      : `Nâng Cấp Lv.${wallet.upgrades.nitroLevel + 1} (${
                          60 * wallet.upgrades.nitroLevel
                        } Xu)`}
                  </button>
                </div>

                {/* Quiz Streak Scanner Upgrade */}
                <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-mono text-emerald-300 font-bold">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Cấp {wallet.upgrades.scannerLevel} / 3</span>
                      </span>
                      <span className="text-xs font-mono text-sky-300">
                        +{wallet.upgrades.scannerLevel * 5} Xu / câu đúng
                      </span>
                    </div>
                    <h5 className="text-base font-bold text-white">
                      Bộ Nhân Thưởng Chuỗi Học Tập
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tăng số Xu thưởng nhận được mỗi khi trả lời đúng câu hỏi tại trạm và nhân đôi Xu khi đạt chuỗi Combo liên tiếp.
                    </p>
                  </div>
                  <button
                    disabled={wallet.upgrades.scannerLevel >= 3}
                    onClick={() =>
                      handlePurchase(
                        'upgrade_scanner',
                        60 * wallet.upgrades.scannerLevel,
                        `Nâng cấp Bộ Nhân Thưởng lên Cấp ${
                          wallet.upgrades.scannerLevel + 1
                        }`
                      )
                    }
                    className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer ${
                      wallet.upgrades.scannerLevel >= 3
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                    }`}
                  >
                    {wallet.upgrades.scannerLevel >= 3
                      ? 'Đã Đạt Cấp Tối Đa (Lv.3)'
                      : `Nâng Cấp Lv.${wallet.upgrades.scannerLevel + 1} (${
                          60 * wallet.upgrades.scannerLevel
                        } Xu)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
