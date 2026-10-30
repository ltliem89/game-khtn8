export type MissionId =
  | 'M01_MASS'
  | 'M02_VOLUME'
  | 'M03_DENSITY'
  | 'M04_SURFACE_PRESSURE'
  | 'M05_LIQUID_PRESSURE'
  | 'M06_ATMOSPHERIC_PRESSURE'
  | 'M07_ARCHIMEDES'
  | 'M08_MOMENT'
  | 'M09_LEVER'
  | 'M10_CURRENT'
  | 'M11_VOLTAGE'
  | 'M12_THERMAL_ENERGY'
  | 'M13_JOULEMETER'
  | 'M14_HEAT_TRANSFER'
  | 'M15_THERMAL_EXPANSION'
  | 'B01_CARGO_CATASTROPHE'
  | 'B02_ABYSS_REACTOR'
  | 'B03_CORE_MELTDOWN';

export type DifficultyLayer = 'ROOKIE' | 'PRO' | 'ELITE' | 'SCIENCE_MASTER';

export type PerformanceTier = 'ULTRA' | 'HIGH' | 'PERFORMANCE';

export type CameraViewMode = 'chase' | 'cockpit' | 'fps_scanner';

export type M01MissionPhase =
  | 'locked'
  | 'ready'
  | 'briefing'
  | 'tutorial'
  | 'playing'
  | 'paused'
  | 'checkpoint'
  | 'scanner_bay'
  | 'science_challenge'
  | 'success'
  | 'failed'
  | 'results'
  | 'disposed';

export interface CargoCrateSpec {
  id: string;
  code: string;
  titleVi: string;
  rawLabelText: string;
  displayedSymbol: 'm' | 'P' | 'V';
  rawValueText: string;
  electronicScaleReadoutVi: string;
  massKg: number | null; // null if not a mass quantity (distractor)
  isValidMassTarget: boolean;
  distractorReasonVi?: string;
  scientificNoteVi: string;
  colorHex: number;
  accentHex: string;
}

export interface CargoCrateRuntimeState {
  spec: CargoCrateSpec;
  scanned: boolean;
  taggedWithPulse: boolean;
  loadedOnConveyor: boolean;
  rejectedAttemptCount: number;
  worldPosition: { x: number; y: number; z: number };
}

export interface M01RunEvidence {
  runId: string;
  missionId: 'M01_MASS';
  difficulty: DifficultyLayer;
  performanceTier: PerformanceTier;
  checkpointsReached: string[];
  objectiveFlags: {
    reachedSortingLanes: boolean;
    enteredScannerBay: boolean;
    scannedThreeTargetCrates: boolean;
    loadedThreeValidCrates: boolean;
    unlockedShortcutGate: boolean;
    collectedHoloCrate: boolean;
    noCollisionBonus: boolean;
    activatedExitGate: boolean;
  };
  interactionCount: number;
  scanCount: number;
  pulseTagCount: number;
  wrongCrateAttempts: number;
  retries: number;
  collectedIds: string[];
  routeChoices: string[];
  missionTimeMs: number;
  drivingScore: number;
  knowledgeScore?: number;
  missionPerformanceScore: number; // 0..100 independent from knowledgeScore and drivingScore
  interactionEvidence: {
    scannedCrateIds: string[];
    loadedCrateIds: string[];
    rejectedDistractorIds: string[];
    calibratedTotalMassKg: number;
    targetTotalMassKg: number;
  };
}

export interface M01HudSnapshot {
  active: boolean;
  missionPhase: M01MissionPhase;
  cameraMode: CameraViewMode;
  difficulty: DifficultyLayer;
  performanceTier: PerformanceTier;
  currentFps: number;
  checkpointId: 'CP0' | 'CP1' | 'CP2' | 'EXIT';
  objectiveTextVi: string;
  orbitMessageVi: string;
  orbitSpeaker: 'ORBIT' | 'Dr. Linh' | 'Hệ thống Cân NOVA-8';
  feedbackTone: 'info' | 'success' | 'warning' | 'error';
  inScannerZone: boolean;
  conveyorWindowOpen: boolean;
  conveyorCycleProgress: number; // 0..1
  loadedMassKg: number;
  targetMassKg: number;
  loadedCratesCount: number;
  requiredCratesCount: number;
  wrongAttempts: number;
  maxWrongAttempts: number;
  remainingTimeSeconds: number;
  shortcutUnlocked: boolean;
  holoCrateCollected: boolean;
  exitGateOpen: boolean;
  aimedCrate: CargoCrateRuntimeState | null;
  allCrates: CargoCrateRuntimeState[];
  reticleX: number; // -1..1
  reticleY: number; // -1..1
  tieredHintVi: string | null;
  evidence: M01RunEvidence;
}

export const M01_CARGO_CRATE_SPECS: CargoCrateSpec[] = [
  {
    id: 'CRATE_A1',
    code: 'NV8-M01',
    titleVi: 'Kiện Hợp Kim Nhôm Chuẩn',
    rawLabelText: 'm = 2500 g',
    displayedSymbol: 'm',
    rawValueText: '2500 g',
    electronicScaleReadoutVi: '2,5 kg (2500 g)',
    massKg: 2.5,
    isValidMassTarget: true,
    scientificNoteVi:
      'Đúng chuẩn đại lượng Khối lượng (ký hiệu m). Đổi đơn vị: 2500 g = 2500 : 1000 = 2,5 kg.',
    colorHex: 0x0284c7,
    accentHex: '#38bdf8',
  },
  {
    id: 'CRATE_B2',
    code: 'NV8-P02',
    titleVi: 'Kiện Lò Xo Chịu Lực (Nhãn Nhiễu)',
    rawLabelText: 'P = 50 N',
    displayedSymbol: 'P',
    rawValueText: '50 N',
    electronicScaleReadoutVi: 'CẢNH BÁO: Nhãn ghi Trọng lượng P (Newton)',
    massKg: null,
    isValidMassTarget: false,
    distractorReasonVi:
      'Nhãn ghi P = 50 N là Trọng lượng (lực hút Trái Đất, đơn vị Newton - N), KHÔNG phải số đo khối lượng m theo đơn vị kg hoặc g của dây chuyền cân!',
    scientificNoteVi:
      'Cần phân biệt rõ: Khối lượng m (đơn vị SI là kg) chỉ lượng chất của vật; còn P (đơn vị N) là trọng lượng.',
    colorHex: 0xd97706,
    accentHex: '#fbbf24',
  },
  {
    id: 'CRATE_C3',
    code: 'NV8-M03',
    titleVi: 'Kiện Thép Cacbon Đặc',
    rawLabelText: 'm = 5,0 kg',
    displayedSymbol: 'm',
    rawValueText: '5,0 kg',
    electronicScaleReadoutVi: '5,0 kg (Đơn vị SI chuẩn)',
    massKg: 5.0,
    isValidMassTarget: true,
    scientificNoteVi:
      'Đúng chuẩn đại lượng Khối lượng (ký hiệu m = 5,0 kg). Kilôgam (kg) là đơn vị đo khối lượng chuẩn trong hệ SI.',
    colorHex: 0x059669,
    accentHex: '#34d399',
  },
  {
    id: 'CRATE_D4',
    code: 'NV8-V04',
    titleVi: 'Bình Dung Dịch Chuẩn (Nhãn Nhiễu)',
    rawLabelText: 'V = 50 L',
    displayedSymbol: 'V',
    rawValueText: '50 L (0,05 m³)',
    electronicScaleReadoutVi: 'CẢNH BÁO: Nhãn ghi Thể tích V (Lít / m³)',
    massKg: null,
    isValidMassTarget: false,
    distractorReasonVi:
      'Nhãn ghi V = 50 L là đại lượng Thể tích (phần không gian vật chiếm chỗ, đơn vị L hoặc m³), KHÔNG phải đại lượng Khối lượng m!',
    scientificNoteVi:
      'Ký hiệu V (đơn vị m³, dm³, cm³, L, mL) biểu thị Thể tích. Để biết khối lượng cần dùng cân đo theo đơn vị kg hoặc g.',
    colorHex: 0x7c3aed,
    accentHex: '#a78bfa',
  },
  {
    id: 'CRATE_E5',
    code: 'NV8-M05',
    titleVi: 'Kiện Đồng Tinh Khiết',
    rawLabelText: 'm = 0,75 yến (7500 g)',
    displayedSymbol: 'm',
    rawValueText: '0,75 yến (7500 g)',
    electronicScaleReadoutVi: '7,5 kg (0,75 yến = 7500 g)',
    massKg: 7.5,
    isValidMassTarget: true,
    scientificNoteVi:
      'Đúng chuẩn đại lượng Khối lượng (ký hiệu m). Đổi đơn vị: 0,75 yến = 7,5 kg (7500 g). Tổng 3 kiện: 2,5 + 5,0 + 7,5 = 15,0 kg!',
    colorHex: 0x0891b2,
    accentHex: '#22d3ee',
  },
];
