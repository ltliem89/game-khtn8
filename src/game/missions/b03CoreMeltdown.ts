import * as THREE from 'three';
import { IMissionController } from './missionContracts';
import {
  CameraViewMode,
  DifficultyLayer,
  GenericMissionRunEvidence,
  MissionId,
  MissionTargetItemSpec,
  MissionTargetRuntimeState,
  PerformanceTier,
  UniversalMissionHudSnapshot,
} from '../../types/missionSpec';
import { createRadialShadowTexture } from '../track/proceduralModels';
import { soundEngine } from '../audio/soundEngine';
import {
  createTokamakMeltdownCore,
  createAnalogueLabMeter,
  createCalorimeterSetup,
  createThermalExpansionRig,
} from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export type CoreMeltdownPhase =
  | 'PHASE_1_VOLTAGE'
  | 'PHASE_2_JOULE'
  | 'PHASE_3_HEAT_ROUTE'
  | 'PHASE_4_EXPANSION'
  | 'PHASE_5_CORE_RESTART'
  | 'COMPLETE';

export const B03_BOSS_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'B03_P1_VOLT',
    code: 'B03-VOLTAGE-CALIBRATION',
    titleVi: 'Hệ Lưới Điện Áp Lõi (U = 220 V - Mắc song song)',
    rawLabelText: 'U = 220 V (Vôn kế mắc song song)',
    displayedSymbol: 'U',
    rawValueText: '220 V',
    readoutVi: 'Hiệu điện thế 220 V ổn định hệ thống kích từ lõi',
    numericValue: 220,
    unit: 'V',
    isValidTarget: true,
    scientificNoteVi:
      'Vôn kế mắc song song bảo đảm đo chính xác hiệu điện thế định mức U = 220 V cấp nguồn kiểm soát lõi.',
    colorHex: 0x8b5cf6,
    accentHex: '#a78bfa',
  },
  {
    id: 'B03_P2_JOULE',
    code: 'B03-JOULE-QUENCH',
    titleVi: 'Bộ Hấp Thụ Nhiệt Lượng (Q = 5000 J)',
    rawLabelText: 'Q = 5000 J = 5 kJ (Joulemeter)',
    displayedSymbol: 'J',
    rawValueText: '5000 J (5 kJ)',
    readoutVi: 'Hấp thụ 5000 Jun nhiệt lượng dư thừa làm mát khẩn cấp',
    numericValue: 5000,
    unit: 'J',
    isValidTarget: true,
    scientificNoteVi:
      'Joulemeter đo chính xác năng lượng nhiệt Q giải phóng, ngăn chặn hiện tượng quá nhiệt phân rã.',
    colorHex: 0x10b981,
    accentHex: '#34d399',
  },
  {
    id: 'B03_P3_ROUTING',
    code: 'B03-HEAT-ROUTING',
    titleVi: 'Ba Tuyến Truyền Nhiệt Cân Bằng',
    rawLabelText: 'Dẫn nhiệt (rắn) + Đối lưu (lỏng) + Bức xạ (hồng ngoại)',
    displayedSymbol: 'TruyềnNhiệt',
    rawValueText: '3 chế độ đồng bộ',
    readoutVi: 'Dẫn nhiệt qua thanh đồng, đối lưu dòng coolant, bức xạ tản nhiệt chân không',
    numericValue: 3,
    unit: 'tuyến',
    isValidTarget: true,
    scientificNoteVi:
      'Phối hợp nhịp nhàng Dẫn nhiệt, Đối lưu và Bức xạ nhiệt giúp giải tỏa luồng nhiệt cực đại ra khỏi vỏ lò.',
    colorHex: 0xf97316,
    accentHex: '#fb923c',
  },
  {
    id: 'B03_P4_EXPANSION',
    code: 'B03-EXPANSION-LOCKDOWN',
    titleVi: 'Khóa Khớp Giãn Nở Vòm Phản Ứng',
    rawLabelText: 'Độ nở: Khí > Lỏng > Rắn (Khe co giãn ray vòm)',
    displayedSymbol: 'Delta V',
    rawValueText: 'Độ nở cân bằng',
    readoutVi: 'Khớp trượt cơ học thích ứng với sự dãn nở vì nhiệt cực hạn của các chất',
    numericValue: 100,
    unit: '%',
    isValidTarget: true,
    scientificNoteVi:
      'Cấu trúc vòm lò phản ứng sử dụng khe co giãn và con lăn trượt để hấp thụ sự biến dạng vì nhiệt của thép và bê tông.',
    colorHex: 0xf59e0b,
    accentHex: '#fbbf24',
  },
  {
    id: 'B03_P5_RESTART',
    code: 'B03-NOVA8-RESTART',
    titleVi: 'Khởi Động Lại Siêu Lõi NOVA-8',
    rawLabelText: 'ĐỒNG BỘ 15 SCIENCE NODES HOÀN TẤT',
    displayedSymbol: 'NOVA-8',
    rawValueText: '100% ONLINE',
    readoutVi: 'Lõi NOVA-8 khôi phục hoàn toàn — Chiến dịch khoa học KHTN 8 toàn thắng!',
    numericValue: 15,
    unit: 'nodes',
    isValidTarget: true,
    scientificNoteVi:
      'Thành phố tương lai NOVA-8 tái sinh nhờ làm chủ toàn diện các quy luật Vật lí và Khoa học Tự nhiên 8.',
    colorHex: 0x38bdf8,
    accentHex: '#7dd3fc',
  },
];

export class B03CoreMeltdownController implements IMissionController {
  public readonly id: MissionId = 'B03_CORE_MELTDOWN';
  public readonly titleVi: string = 'B03 · TRẬN CUỐI KHÔI PHỤC NOVA-8 (GRAND FINALE)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private currentPhase: CoreMeltdownPhase = 'PHASE_1_VOLTAGE';
  private systemStabilityPercent = 5; // 0 to 100%

  private grandCoreRings: THREE.Group | null = null;
  private coreSphere: THREE.Mesh | null = null;
  private voltModule: THREE.Mesh | null = null;
  private jouleModule: THREE.Mesh | null = null;
  private routingModule: THREE.Mesh | null = null;
  private expansionModule: THREE.Mesh | null = null;
  private restartConsole: THREE.Mesh | null = null;

  private interactableMeshes: THREE.Object3D[] = [];

  private consoleCanvas: HTMLCanvasElement | null = null;
  private consoleTexture: THREE.CanvasTexture | null = null;
  private lastConsoleText = '';

  private exitGateLeft: THREE.Group | null = null;
  private exitGateRight: THREE.Group | null = null;
  private exitGateOpen = false;

  private active = true;
  private cameraMode: CameraViewMode = 'chase';
  private difficulty: DifficultyLayer = 'ROOKIE';
  private performanceTier: PerformanceTier = 'HIGH';
  private currentFps = 60;

  private inInteractiveZone = false;
  private wrongAttempts = 0;
  private readonly maxWrongAttempts = 4;
  private remainingTimeSeconds = 480;

  private aimedItemId: string | null = 'B03_P1_VOLT';
  private reticleX = 0;
  private reticleY = 0;
  private tieredHintVi: string | null = null;

  private pendingImpactCallback:
    | ((hitstopSec: number, shakeIntensity: number) => void)
    | null = null;

  private evidence: GenericMissionRunEvidence;

  constructor(isSoftwareGl: boolean, maxAnisotropy: number) {
    this.isSoftwareGl = isSoftwareGl;
    this.maxAnisotropy = maxAnisotropy;
    this.evidence = this.createFreshEvidence();
  }

  public setImpactFeelCallback(
    cb: (hitstopSec: number, shakeIntensity: number) => void
  ) {
    this.pendingImpactCallback = cb;
  }

  private createFreshEvidence(): GenericMissionRunEvidence {
    return {
      runId: `B03_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP_B03_START'],
      objectiveFlags: {
        voltageCalibrated: false,
        jouleMeasurementCompleted: false,
        thermalRoutingCompleted: false,
        expansionBridgeStabilized: false,
        nova8CoreRestarted: false,
      },
      interactionCount: 0,
      scanCount: 0,
      pulseTagCount: 0,
      wrongAttempts: 0,
      retries: 0,
      collectedIds: [],
      routeChoices: [],
      missionTimeMs: 0,
      drivingScore: 100,
      missionPerformanceScore: 90,
      interactionEvidence: {},
    };
  }

  public setDifficultyAndTier(
    difficulty: DifficultyLayer,
    tier: PerformanceTier
  ) {
    this.difficulty = difficulty;
    this.performanceTier = tier;
    this.evidence.difficulty = difficulty;
    this.evidence.performanceTier = tier;
    this.remainingTimeSeconds =
      difficulty === 'ROOKIE' ? 540 : difficulty === 'PRO' ? 480 : 360;
  }

  public setCameraMode(mode: CameraViewMode) {
    this.cameraMode = mode;
  }

  public getCameraMode(): CameraViewMode {
    return this.cameraMode;
  }

  public isExitGateUnlocked(): boolean {
    return this.exitGateOpen;
  }

  public getScannerBayFocusPosition(outVec: THREE.Vector3): THREE.Vector3 {
    return outVec
      .copy(this.stationCenter)
      .addScaledVector(this.stationRight, 0)
      .addScaledVector(_upAxis, 2.0)
      .addScaledVector(this.stationTangent, -3.0);
  }

  public buildAroundStation(
    stationPos: THREE.Vector3,
    stationTangent: THREE.Vector3
  ) {
    this.clearDiorama();
    this.stationCenter.copy(stationPos);
    this.stationTangent.copy(stationTangent).normalize();
    this.stationRight
      .set(-this.stationTangent.z, 0, this.stationTangent.x)
      .normalize();

    this.rootGroup.position.copy(this.stationCenter);
    this.rootGroup.rotation.y = Math.atan2(
      this.stationTangent.x,
      this.stationTangent.z
    );

    if (!this.shadowTex) {
      this.shadowTex = createRadialShadowTexture();
    }

    this.interactableMeshes = [];
    this.currentPhase = 'PHASE_1_VOLTAGE';
    this.systemStabilityPercent = 10;
    this.wrongAttempts = 0;
    this.exitGateOpen = false;
    this.aimedItemId = 'B03_P1_VOLT';
    this.evidence = this.createFreshEvidence();

    this.buildGrandCoreChamber();
    this.buildSubsystemPillars();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'SIÊU LÕI NOVA-8 (B03 FINALE)',
      'STABILITY: 10%',
      'Phase 1: Mắc Vôn kế song song hiệu chuẩn U = 220 V'
    );
  }

  private addShadow(parent: THREE.Group, rx: number, rz: number) {
    if (!this.shadowTex) return;
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(rx * 2, rz * 2),
      new THREE.MeshBasicMaterial({
        map: this.shadowTex,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    s.rotation.x = -Math.PI / 2;
    s.position.y = 0.02;
    parent.add(s);
  }

  private buildGrandCoreChamber() {
    this.grandCoreRings = new THREE.Group();
    this.grandCoreRings.position.set(0, 1.0, -9.0);

    // Realistic Tokamak Fusion Reactor Core
    const { group: tokamakRig, plasmaCore } = createTokamakMeltdownCore();
    tokamakRig.scale.set(1.3, 1.3, 1.3);
    this.grandCoreRings.add(tokamakRig);
    this.coreSphere = plasmaCore;

    this.rootGroup.add(this.grandCoreRings);
  }

  private buildSubsystemPillars() {
    // 1. Voltage Pillar (Far Left - Voltmeter Apparatus)
    const voltG = new THREE.Group();
    voltG.position.set(-6.2, 0, -3.5);
    this.addShadow(voltG, 1.5, 1.5);

    const { group: voltRig, setReadingValue } = createAnalogueLabMeter('voltmeter');
    voltRig.scale.set(0.7, 0.7, 0.7);
    voltRig.position.y = 0.3;
    setReadingValue(220, 250);

    const voltM = voltRig.children[0] as THREE.Mesh;
    voltM.userData = { targetId: 'B03_P1_VOLT' };
    voltG.add(voltRig);
    this.voltModule = voltM;
    this.rootGroup.add(voltG);
    this.interactableMeshes.push(voltM);

    // 2. Joule Pillar (Mid Left - Calorimeter Setup)
    const jouleG = new THREE.Group();
    jouleG.position.set(-3.2, 0, -2.5);
    this.addShadow(jouleG, 1.5, 1.5);

    const { group: jouleRig, updateJoules } = createCalorimeterSetup();
    jouleRig.scale.set(0.65, 0.65, 0.65);
    updateJoules(4200);

    const jouleM = jouleRig.children[0] as THREE.Mesh;
    jouleM.userData = { targetId: 'B03_P2_JOULE' };
    jouleG.add(jouleRig);
    this.jouleModule = jouleM;
    this.rootGroup.add(jouleG);
    this.interactableMeshes.push(jouleM);

    // 3. Routing Pillar (Mid Right - Finned Geothermal Heat Exchanger)
    const routeG = new THREE.Group();
    routeG.position.set(3.2, 0, -2.5);
    this.addShadow(routeG, 1.5, 1.5);

    const heatPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 1.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.2 })
    );
    heatPipe.position.y = 0.9;
    const finMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 });
    for (let y = 0.3; y <= 1.5; y += 0.2) {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.03, 16), finMat);
      fin.position.y = y;
      routeG.add(fin);
    }
    heatPipe.userData = { targetId: 'B03_P3_ROUTING' };
    routeG.add(heatPipe);
    this.routingModule = heatPipe;
    this.rootGroup.add(routeG);
    this.interactableMeshes.push(heatPipe);

    // 4. Expansion Pillar (Far Right - Gravesande Ring & Ball Rig)
    const expG = new THREE.Group();
    expG.position.set(6.2, 0, -3.5);
    this.addShadow(expG, 1.5, 1.5);

    const { group: expRig, animatedPart } = createThermalExpansionRig('GRAVESANDE');
    expRig.scale.set(0.65, 0.65, 0.65);
    animatedPart.userData = { targetId: 'B03_P4_EXPANSION' };
    expG.add(expRig);
    this.expansionModule = animatedPart;
    this.rootGroup.add(expG);
    this.interactableMeshes.push(animatedPart);

    // 5. Restart Console (Center Front)
    const restG = new THREE.Group();
    restG.position.set(0, 0, -1.8);
    this.addShadow(restG, 1.2, 1.2);
    const restM = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, 1.2, 24),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.9,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.4,
      })
    );
    restM.position.y = 0.6;
    restM.userData = { targetId: 'B03_P5_RESTART' };
    restG.add(restM);
    this.restartConsole = restM;
    this.rootGroup.add(restG);
    this.interactableMeshes.push(restM);
  }

  private buildConsole() {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-8.2, 0, -5.5);
    consoleGroup.rotation.y = 0.45;
    this.addShadow(consoleGroup, 2.2, 2.2);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.3, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    base.position.y = 0.15;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 4.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 })
    );
    pillar.position.set(0, 2.1, 0);

    this.consoleCanvas = document.createElement('canvas');
    this.consoleCanvas.width = 512;
    this.consoleCanvas.height = 256;
    this.consoleTexture = new THREE.CanvasTexture(this.consoleCanvas);
    this.consoleTexture.colorSpace = THREE.SRGBColorSpace;
    this.consoleTexture.anisotropy = this.maxAnisotropy;

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 2.5, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    housing.position.set(0, 4.2, 0);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 2.3),
      new THREE.MeshBasicMaterial({ map: this.consoleTexture })
    );
    screen.position.set(0, 4.2, 0.14);

    consoleGroup.add(base, pillar, housing, screen);
    this.rootGroup.add(consoleGroup);
  }

  private updateConsoleDisplay(
    header: string,
    mainVal: string,
    subNote: string
  ) {
    const key = `${header}|${mainVal}|${subNote}`;
    if (
      !this.consoleCanvas ||
      !this.consoleTexture ||
      this.lastConsoleText === key
    )
      return;
    this.lastConsoleText = key;

    const ctx = this.consoleCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#67e8f9';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#bae6fd';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
    });
    const leftG = new THREE.Group();
    leftG.position.set(-2.2, 0, 4.5);
    const leftDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 6.0, 0.4),
      gateMat
    );
    leftDoor.position.y = 3.0;
    leftG.add(leftDoor);

    const rightG = new THREE.Group();
    rightG.position.set(2.2, 0, 4.5);
    const rightDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 6.0, 0.4),
      gateMat
    );
    rightDoor.position.y = 3.0;
    rightG.add(rightDoor);

    this.exitGateLeft = leftG;
    this.exitGateRight = rightG;
    this.rootGroup.add(leftG, rightG);
  }

  private clearDiorama() {
    while (this.rootGroup.children.length > 0) {
      const obj = this.rootGroup.children[0];
      this.rootGroup.remove(obj);
    }
  }

  public selectTargetById(id: string) {
    this.aimedItemId = id;
    this.triggerSciencePulseOnAimed();
  }

  public triggerSciencePulseOnAimed() {
    soundEngine.playSciencePulse();
    this.pendingImpactCallback?.(0.04, 0.15);
    this.evidence.pulseTagCount += 1;
    this.evidence.interactionCount += 1;
  }

  public interactWithAimed(
    onBonusCoinsAwarded?: (coins: number, reasonVi: string) => void
  ) {
    this.evidence.interactionCount += 1;

    switch (this.currentPhase) {
      case 'PHASE_1_VOLTAGE':
        this.systemStabilityPercent = 25;
        this.evidence.objectiveFlags.voltageCalibrated = true;
        this.currentPhase = 'PHASE_2_JOULE';
        this.aimedItemId = 'B03_P2_JOULE';
        soundEngine.playCargoLoadSuccess();
        this.pendingImpactCallback?.(0.06, 0.25);
        onBonusCoinsAwarded?.(30, 'Phase 1: Vôn kế mắc song song chuẩn hóa U = 220 V! (+30 Xu)');
        this.updateConsoleDisplay(
          'SIÊU LÕI NOVA-8 (B03 FINALE)',
          'STABILITY: 25%',
          'Phase 2: Joulemeter hấp thụ nhiệt dư Q = 5000 J'
        );
        break;

      case 'PHASE_2_JOULE':
        this.systemStabilityPercent = 50;
        this.evidence.objectiveFlags.jouleMeasurementCompleted = true;
        this.currentPhase = 'PHASE_3_HEAT_ROUTE';
        this.aimedItemId = 'B03_P3_ROUTING';
        soundEngine.playCargoLoadSuccess();
        this.pendingImpactCallback?.(0.06, 0.25);
        onBonusCoinsAwarded?.(30, 'Phase 2: Nhiệt lượng Q = 5 kJ đã được triệt tiêu! (+30 Xu)');
        this.updateConsoleDisplay(
          'SIÊU LÕI NOVA-8 (B03 FINALE)',
          'STABILITY: 50%',
          'Phase 3: Đồng bộ Dẫn nhiệt - Đối lưu - Bức xạ'
        );
        break;

      case 'PHASE_3_HEAT_ROUTE':
        this.systemStabilityPercent = 75;
        this.evidence.objectiveFlags.thermalRoutingCompleted = true;
        this.currentPhase = 'PHASE_4_EXPANSION';
        this.aimedItemId = 'B03_P4_EXPANSION';
        soundEngine.playCargoLoadSuccess();
        this.pendingImpactCallback?.(0.06, 0.25);
        onBonusCoinsAwarded?.(30, 'Phase 3: Cân bằng 3 hình thức truyền nhiệt thành công! (+30 Xu)');
        this.updateConsoleDisplay(
          'SIÊU LÕI NOVA-8 (B03 FINALE)',
          'STABILITY: 75%',
          'Phase 4: Cố định khe giãn nở nhiệt vòm lò'
        );
        break;

      case 'PHASE_4_EXPANSION':
        this.systemStabilityPercent = 90;
        this.evidence.objectiveFlags.expansionBridgeStabilized = true;
        this.currentPhase = 'PHASE_5_CORE_RESTART';
        this.aimedItemId = 'B03_P5_RESTART';
        soundEngine.playCargoLoadSuccess();
        this.pendingImpactCallback?.(0.06, 0.25);
        onBonusCoinsAwarded?.(30, 'Phase 4: Khớp co giãn đã khóa chốt an toàn! (+30 Xu)');
        this.updateConsoleDisplay(
          'SIÊU LÕI NOVA-8 (B03 FINALE)',
          'STABILITY: 90%',
          'Phase 5: Nhấn KÍCH HOẠT LÕI NOVA-8 tại bệ trung tâm'
        );
        break;

      case 'PHASE_5_CORE_RESTART':
        this.systemStabilityPercent = 100;
        this.evidence.objectiveFlags.nova8CoreRestarted = true;
        this.currentPhase = 'COMPLETE';
        this.exitGateOpen = true;
        soundEngine.playGateUnlock();
        this.pendingImpactCallback?.(0.1, 0.5);
        onBonusCoinsAwarded?.(
          200,
          'CHIẾN DỊCH HOÀN TẤT: Siêu Lõi NOVA-8 Đã Hồi Sinh Rực Rỡ! (+200 Xu)'
        );
        this.updateConsoleDisplay(
          'SIÊU LÕI NOVA-8 (B03 FINALE)',
          '100% ONLINE — VICTORY',
          'Tất cả 15 Science Nodes KHTN 8 đã hòa vào mạng lưới!'
        );
        break;

      case 'COMPLETE':
        break;
    }
  }

  public update(
    dt: number,
    elapsed: number,
    roverPos: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    reticleX: number,
    reticleY: number,
    justPressedInteract: boolean,
    justPressedPulse: boolean,
    isActive: boolean,
    onDrivingPenalty: (pts: number) => void,
    onBonusCoinsAwarded: (coins: number, reasonVi: string) => void
  ) {
    this.active = isActive;
    this.rootGroup.visible = isActive;
    if (!isActive) return;

    this.reticleX = reticleX;
    this.reticleY = reticleY;

    if (this.grandCoreRings) {
      this.grandCoreRings.rotation.z += dt * 0.55;
      this.grandCoreRings.rotation.y += dt * 0.35;
    }

    const distToCenter = roverPos.distanceTo(
      _worldScratchA.copy(this.stationCenter).addScaledVector(this.stationTangent, -6.5)
    );
    this.inInteractiveZone = distToCenter < 15.0;

    if (this.exitGateLeft && this.exitGateRight) {
      const targetLX = this.exitGateOpen ? -4.2 : -2.2;
      const targetRX = this.exitGateOpen ? 4.2 : 2.2;
      this.exitGateLeft.position.x = THREE.MathUtils.lerp(
        this.exitGateLeft.position.x,
        targetLX,
        dt * 3.5
      );
      this.exitGateRight.position.x = THREE.MathUtils.lerp(
        this.exitGateRight.position.x,
        targetRX,
        dt * 3.5
      );
    }

    _ndcVec.set(reticleX, reticleY);
    _raycaster.setFromCamera(_ndcVec, camera);
    const hits = _raycaster.intersectObjects(this.interactableMeshes, false);
    if (hits.length > 0) {
      const targetId = hits[0].object.userData?.targetId;
      if (targetId && targetId !== this.aimedItemId) {
        this.aimedItemId = targetId;
        soundEngine.playTargetLock();
      }
    }

    if (justPressedPulse) {
      this.triggerSciencePulseOnAimed();
    }
    if (justPressedInteract) {
      this.interactWithAimed(onBonusCoinsAwarded);
    }
  }

  public getHudSnapshot(drivingScore: number): UniversalMissionHudSnapshot {
    const activeSpec = B03_BOSS_SPECS.find((s) => s.id === this.aimedItemId) || B03_BOSS_SPECS[0];
    const aimedState: MissionTargetRuntimeState = {
      spec: activeSpec,
      scanned: true,
      taggedWithPulse: true,
      activatedOrLoaded: this.systemStabilityPercent === 100,
      rejectedAttemptCount: this.wrongAttempts,
      worldPosition: { x: 0, y: 0, z: 0 },
    };

    const allStates: MissionTargetRuntimeState[] = B03_BOSS_SPECS.map((s) => ({
      spec: s,
      scanned: true,
      taggedWithPulse: false,
      activatedOrLoaded: this.systemStabilityPercent >= 90,
      rejectedAttemptCount: 0,
      worldPosition: { x: 0, y: 0, z: 0 },
    }));

    const phaseNumber =
      this.currentPhase === 'PHASE_1_VOLTAGE'
        ? 1
        : this.currentPhase === 'PHASE_2_JOULE'
        ? 2
        : this.currentPhase === 'PHASE_3_HEAT_ROUTE'
        ? 3
        : this.currentPhase === 'PHASE_4_EXPANSION'
        ? 4
        : 5;

    return {
      active: this.active,
      missionId: this.id,
      missionTitleVi: this.titleVi,
      missionPhase: this.exitGateOpen ? 'success' : 'boss_phase',
      cameraMode: this.cameraMode,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      currentFps: this.currentFps,
      checkpointId: 'CP_B03_START',
      objectiveTextVi: this.exitGateOpen
        ? 'LÕI NOVA-8 ĐÃ TÁI SINH HOÀN TOÀN! Tiến qua cổng khải hoàn.'
        : `[PHASE ${phaseNumber}/5] ${activeSpec.titleVi}: Khôi phục hệ thống (${this.systemStabilityPercent}% Độ ổn định).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Chúc mừng bạn! Toàn bộ 15 trạm kiến thức KHTN 8 đã được chinh phục vẻ vang!'
        : 'Dr. Linh: Đây là trận chiến cuối cùng! Từng bước ổn định điện áp, nhiệt lượng và giãn nở vòm lò.',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.systemStabilityPercent,
      targetProgressValue: 100,
      progressUnit: '%',
      completedItemsCount: phaseNumber - (this.exitGateOpen ? 0 : 1),
      requiredItemsCount: 5,
      wrongAttempts: this.wrongAttempts,
      maxWrongAttempts: this.maxWrongAttempts,
      remainingTimeSeconds: this.remainingTimeSeconds,
      shortcutUnlocked: false,
      holoCrateCollected: false,
      exitGateOpen: this.exitGateOpen,
      aimedItem: aimedState,
      allItems: allStates,
      reticleX: this.reticleX,
      reticleY: this.reticleY,
      tieredHintVi: this.tieredHintVi,
      evidence: this.evidence,
    };
  }

  public dispose() {
    this.clearDiorama();
  }
}
