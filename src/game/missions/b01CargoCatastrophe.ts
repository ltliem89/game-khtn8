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

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const B01_BOSS_ITEMS: MissionTargetItemSpec[] = [
  {
    id: 'B01_P1_MASS',
    code: 'B01-CARGO-M',
    titleVi: 'Kiện Lõi Hàng Cứu Hộ (Khối lượng m)',
    rawLabelText: 'm = 12,5 kg (Chuẩn m)',
    displayedSymbol: 'm',
    rawValueText: '12,5 kg',
    readoutVi: 'Khối lượng m = 12,5 kg đã được móc neo an toàn',
    numericValue: 12.5,
    unit: 'kg',
    isValidTarget: true,
    scientificNoteVi:
      'Giai đoạn 1: Thu hồi đúng kiện hàng theo khối lượng m = 12,5 kg, tránh nhãn trọng lượng P = 125 N.',
    colorHex: 0x0284c7,
    accentHex: '#38bdf8',
  },
  {
    id: 'B01_P1_DISTRACTOR',
    code: 'B01-DIST-WEIGHT',
    titleVi: 'Kiện Rơi Hỏng (Nhãn Nhiễu Trọng Lượng)',
    rawLabelText: 'P = 125 N (Trọng lượng)',
    displayedSymbol: 'P',
    rawValueText: '125 N',
    readoutVi: 'CẢNH BÁO: Nhãn P là Trọng lượng (N), không phải Khối lượng m',
    numericValue: null,
    unit: 'N',
    isValidTarget: false,
    distractorReasonVi:
      'P = 125 N là trọng lượng (lực hút Trái Đất), không phải khối lượng m theo tiêu chuẩn neo tải kho vận!',
    scientificNoteVi:
      'Trọng lượng P đo bằng N; Khối lượng m đo bằng kg.',
    colorHex: 0xd97706,
    accentHex: '#fbbf24',
  },
  {
    id: 'B01_P2_DENSITY',
    code: 'B01-DENSITY-CORE',
    titleVi: 'Lõi Vật Liệu Hợp Kim (D = m / V)',
    rawLabelText: 'm = 5400 g, V = 2000 cm³ -> D = 2,7 g/cm³',
    displayedSymbol: 'D',
    rawValueText: '2,7 g/cm³ (2700 kg/m³)',
    readoutVi: 'D = 5400 / 2000 = 2,7 g/cm³ (Nhôm)',
    numericValue: 2700,
    unit: 'kg/m³',
    isValidTarget: true,
    scientificNoteVi:
      'Giai đoạn 2: Cân bằng phân loại khối lượng riêng D = m / V = 2700 kg/m³ để kích hoạt bệ đỡ.',
    colorHex: 0x10b981,
    accentHex: '#34d399',
  },
  {
    id: 'B01_P3_PRESSURE',
    code: 'B01-GATE-PRESSURE',
    titleVi: 'Van Xả Áp Lực Hẻm Vực (p = d . h)',
    rawLabelText: 'd = 10000 N/m³, h = 6 m -> p = 60000 Pa',
    displayedSymbol: 'p',
    rawValueText: '60 kPa (60000 Pa)',
    readoutVi: 'p = 10000 . 6 = 60000 Pa đã xả áp thành công',
    numericValue: 60000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Giai đoạn 3: Mở van xả áp suất chất lỏng p = d . h = 60000 Pa ngăn vỡ đập chắn!',
    colorHex: 0x06b6d4,
    accentHex: '#22d3ee',
  },
];

interface BossItemNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  mesh: THREE.Mesh;
}

export class B01CargoCatastropheController implements IMissionController {
  public readonly id: MissionId = 'B01_CARGO_CATASTROPHE';
  public readonly titleVi: string = 'BOSS 01 · THẢM HỌA KHO VẬN (M01–M05)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: BossItemNode[] = [];
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

  private currentBossPhase = 1;
  private totalBossPhases = 3;
  private systemStabilityPct = 15;
  private wrongAttempts = 0;
  private readonly maxWrongAttempts = 3;
  private remainingTimeSeconds = 300;

  private aimedItemId: string | null = null;
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
      runId: `B01_BOSS_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['PHASE_1'],
      objectiveFlags: {
        phase1CargoRescued: false,
        phase2DensitySorted: false,
        phase3PressureRelieved: false,
        bossRestorationComplete: false,
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
      missionPerformanceScore: 80,
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
      difficulty === 'ROOKIE' ? 360 : difficulty === 'PRO' ? 300 : 240;
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
      .addScaledVector(_upAxis, 1.8)
      .addScaledVector(this.stationTangent, -2.5);
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

    this.items = [];
    this.interactableMeshes = [];
    this.currentBossPhase = 1;
    this.systemStabilityPct = 15;
    this.wrongAttempts = 0;
    this.exitGateOpen = false;
    this.evidence = this.createFreshEvidence();

    this.buildCatastropheEnvironment();
    this.buildBossInteractiveNodes();
    this.buildBossStatusConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'BOSS 01 · SỰ CỐ KHO VẬN & HẺM VỰC',
      'ĐỘ ỔN ĐỊNH HỆ THỐNG: 15%',
      'Giai đoạn 1: Thu hồi Kiện Hàng Khối Lượng m = 12,5 kg'
    );
  }

  private addShadow(parent: THREE.Group, rx: number, rz: number) {
    if (!this.shadowTex) return;
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(rx * 2, rz * 2),
      new THREE.MeshBasicMaterial({
        map: this.shadowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    s.rotation.x = -Math.PI / 2;
    s.position.y = 0.02;
    parent.add(s);
  }

  private buildCatastropheEnvironment() {
    // Collapsed giant gantry crane leaning over track
    const gantryMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.3,
    });
    const craneArm = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 14.0, 1.2),
      gantryMat
    );
    craneArm.position.set(-4.5, 6.0, -8.0);
    craneArm.rotation.z = -0.35;
    this.rootGroup.add(craneArm);

    // Hazard lights
    const hazardLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    hazardLight.position.set(-2.0, 10.5, -8.0);
    this.rootGroup.add(hazardLight);

    // Warning telegraph rings on floor
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 5.0, 32),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.03, -6.0);
    this.rootGroup.add(ring);
  }

  private buildBossInteractiveNodes() {
    const positions: [number, number, number][] = [
      [-4.0, 0.8, -4.5],
      [-1.8, 0.8, -3.2],
      [1.8, 0.8, -3.2],
      [4.0, 0.8, -4.5],
    ];

    B01_BOSS_ITEMS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.2, 1.2);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.95, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
      );
      plinth.position.y = 0.2;

      const bodyMat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: 0.7,
        roughness: 0.3,
        emissive: spec.colorHex,
        emissiveIntensity: 0.3,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), bodyMat);
      body.position.y = 1.0;

      g.add(plinth, body);
      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(body);

      this.items.push({
        spec,
        state: {
          spec,
          scanned: false,
          taggedWithPulse: false,
          activatedOrLoaded: false,
          rejectedAttemptCount: 0,
          worldPosition: { x: pos[0], y: pos[1], z: pos[2] },
        },
        group: g,
        mesh: body,
      });
    });
  }

  private buildBossStatusConsole() {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-7.2, 0, -5.0);
    consoleGroup.rotation.y = 0.45;
    this.addShadow(consoleGroup, 2.2, 2.2);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.3, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    base.position.y = 0.15;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 3.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 })
    );
    pillar.position.set(0, 1.9, 0);

    this.consoleCanvas = document.createElement('canvas');
    this.consoleCanvas.width = 512;
    this.consoleCanvas.height = 256;
    this.consoleTexture = new THREE.CanvasTexture(this.consoleCanvas);
    this.consoleTexture.colorSpace = THREE.SRGBColorSpace;
    this.consoleTexture.anisotropy = this.maxAnisotropy;

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 2.3, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
    );
    housing.position.set(0, 3.8, 0);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 2.1),
      new THREE.MeshBasicMaterial({ map: this.consoleTexture })
    );
    screen.position.set(0, 3.8, 0.14);

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

    ctx.fillStyle = '#1e0f05';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#fde68a';
    ctx.font = '800 46px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
    });
    const leftG = new THREE.Group();
    leftG.position.set(-2.0, 0, 3.5);
    const leftDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 5.5, 0.4),
      gateMat
    );
    leftDoor.position.y = 2.75;
    leftG.add(leftDoor);

    const rightG = new THREE.Group();
    rightG.position.set(2.0, 0, 3.5);
    const rightDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 5.5, 0.4),
      gateMat
    );
    rightDoor.position.y = 2.75;
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
    const target = this.items.find((i) => i.spec.id === id);
    if (!target) return;
    this.aimedItemId = id;
    target.state.scanned = true;
    this.triggerSciencePulseOnAimed();
  }

  public triggerSciencePulseOnAimed() {
    let node = this.items.find((i) => i.spec.id === this.aimedItemId);
    if (!node) {
      node = this.items.find((i) => !i.state.scanned) || this.items[0];
      if (node) this.aimedItemId = node.spec.id;
    }
    if (!node) return;

    node.state.scanned = true;
    node.state.taggedWithPulse = true;
    soundEngine.playSciencePulse();
    this.pendingImpactCallback?.(0.04, 0.15);
    this.evidence.pulseTagCount += 1;
    this.evidence.interactionCount += 1;
  }

  public interactWithAimed(
    onBonusCoinsAwarded?: (coins: number, reasonVi: string) => void
  ) {
    let node = this.items.find((i) => i.spec.id === this.aimedItemId);
    if (!node) {
      node = this.items.find(
        (i) => !i.state.activatedOrLoaded && i.spec.isValidTarget
      );
      if (node) this.aimedItemId = node.spec.id;
    }
    if (!node) return;

    node.state.scanned = true;
    this.evidence.interactionCount += 1;

    if (node.state.activatedOrLoaded) return;

    if (!node.spec.isValidTarget) {
      this.wrongAttempts += 1;
      this.evidence.wrongAttempts += 1;
      soundEngine.playWrongAnswer();
      this.pendingImpactCallback?.(0.08, 0.45);
      this.tieredHintVi = node.spec.distractorReasonVi || null;
      return;
    }

    node.state.activatedOrLoaded = true;
    soundEngine.playCargoLoadSuccess();
    this.pendingImpactCallback?.(0.06, 0.25);

    if (this.currentBossPhase === 1) {
      this.currentBossPhase = 2;
      this.systemStabilityPct = 50;
      this.evidence.objectiveFlags.phase1CargoRescued = true;
      this.evidence.checkpointsReached.push('PHASE_2');
      onBonusCoinsAwarded?.(
        30,
        'Hoàn thành Phase 1! Đã cứu hộ kiện hàng khối lượng m = 12,5 kg! (+30 Xu)'
      );
      this.updateConsoleDisplay(
        'BOSS 01 · GIAI ĐOẠN 2/3',
        'ĐỘ ỔN ĐỊNH: 50%',
        'Phân loại Lõi Hợp Kim Nhôm D = m / V = 2700 kg/m³'
      );
    } else if (this.currentBossPhase === 2) {
      this.currentBossPhase = 3;
      this.systemStabilityPct = 80;
      this.evidence.objectiveFlags.phase2DensitySorted = true;
      this.evidence.checkpointsReached.push('PHASE_3');
      onBonusCoinsAwarded?.(
        35,
        'Hoàn thành Phase 2! Đã phân loại Lõi Khối lượng riêng D! (+35 Xu)'
      );
      this.updateConsoleDisplay(
        'BOSS 01 · GIAI ĐOẠN 3/3',
        'ĐỘ ỔN ĐỊNH: 80%',
        'Mở Van Xả Áp Lực Hẻm Vực p = d . h = 60000 Pa'
      );
    } else if (this.currentBossPhase === 3) {
      this.systemStabilityPct = 100;
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.phase3PressureRelieved = true;
      this.evidence.objectiveFlags.bossRestorationComplete = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        100,
        'CHIẾN THẮNG BOSS 01! Khôi phục 100% kho vận & hẻm vực! (+100 Xu)'
      );
      this.updateConsoleDisplay(
        'BOSS 01 · KHÔI PHỤC HOÀN TOÀN',
        'ĐỘ ỔN ĐỊNH: 100%',
        'Tuyến đường sang Vùng 3 Mechanical Frontier đã mở!'
      );
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

    // Boss items rotation
    this.items.forEach((item, idx) => {
      item.mesh.rotation.y += dt * (1.0 + idx * 0.2);
    });

    if (this.exitGateLeft && this.exitGateRight) {
      const targetLX = this.exitGateOpen ? -3.8 : -2.0;
      const targetRX = this.exitGateOpen ? 3.8 : 2.0;
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
      const parentG = hits[0].object.parent;
      const targetId = parentG?.userData?.targetId;
      if (targetId && targetId !== this.aimedItemId) {
        this.aimedItemId = targetId;
        const hitNode = this.items.find((i) => i.spec.id === targetId);
        if (hitNode && !hitNode.state.scanned) {
          hitNode.state.scanned = true;
          soundEngine.playTargetLock();
        }
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
    const aimed =
      this.items.find((i) => i.spec.id === this.aimedItemId)?.state || null;
    const all = this.items.map((i) => i.state);

    return {
      active: this.active,
      missionId: this.id,
      missionTitleVi: this.titleVi,
      missionPhase: this.exitGateOpen ? 'success' : 'playing',
      cameraMode: this.cameraMode,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      currentFps: this.currentFps,
      checkpointId: `PHASE_${this.currentBossPhase}`,
      objectiveTextVi: this.exitGateOpen
        ? 'Cổng Boss 01 đã mở! Lái JetBot qua cổng để sang Thế Giới 3.'
        : `[PHASE ${this.currentBossPhase}/3] Khôi phục hệ thống: Độ ổn định ${this.systemStabilityPct}%.`,
      orbitMessageVi: this.exitGateOpen
        ? 'Xuất sắc! Bạn đã vượt qua Thảm họa Kho Vận B01, tổng hợp hoàn hảo kiến thức M01–M05.'
        : 'Phối hợp các kỹ năng m, V, D, p: Chú ý bẫy nhãn P = 125 N là trọng lượng!',
      orbitSpeaker: 'ORBIT',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: true,
      currentProgressValue: this.systemStabilityPct,
      targetProgressValue: 100,
      progressUnit: '%',
      completedItemsCount: this.currentBossPhase - 1,
      requiredItemsCount: this.totalBossPhases,
      wrongAttempts: this.wrongAttempts,
      maxWrongAttempts: this.maxWrongAttempts,
      remainingTimeSeconds: this.remainingTimeSeconds,
      shortcutUnlocked: false,
      holoCrateCollected: false,
      exitGateOpen: this.exitGateOpen,
      aimedItem: aimed,
      allItems: all,
      reticleX: this.reticleX,
      reticleY: this.reticleY,
      tieredHintVi: this.tieredHintVi,
      bossPhase: this.currentBossPhase,
      bossTotalPhases: this.totalBossPhases,
      bossStabilityPct: this.systemStabilityPct,
      evidence: this.evidence,
    };
  }

  public dispose() {
    this.clearDiorama();
  }
}
