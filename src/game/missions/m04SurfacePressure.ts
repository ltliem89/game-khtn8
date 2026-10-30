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

export const M04_PRESSURE_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'SURF_MUD',
    code: 'P-MUD',
    titleVi: 'Lốp Bản Rộng Qua Bùn Lún',
    rawLabelText: 'F = 1200 N, S = 0,08 m² -> p = 15000 Pa',
    displayedSymbol: 'p',
    rawValueText: '15000 Pa (15 kPa)',
    readoutVi: 'p = F / S = 1200 / 0,08 = 15000 Pa (15 kPa)',
    numericValue: 15000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Để tránh lún bùn, ta tăng diện tích bị ép S để giảm áp suất p: p = F / S = 15000 Pa.',
    colorHex: 0xf59e0b,
    accentHex: '#fbbf24',
  },
  {
    id: 'SURF_ICE',
    code: 'P-ICE',
    titleVi: 'Đinh Bám Băng Cực Nhọn',
    rawLabelText: 'F = 1200 N, S = 0,002 m² -> p = 600000 Pa',
    displayedSymbol: 'p',
    rawValueText: '600 kPa',
    readoutVi: 'p = 1200 / 0,002 = 600000 Pa (600 kPa)',
    numericValue: 600000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Để găm sâu vào băng trơn, ta giảm diện tích S để tăng áp suất p cực lớn.',
    colorHex: 0x06b6d4,
    accentHex: '#38bdf8',
  },
  {
    id: 'SURF_DISTRACTOR',
    code: 'P-DIST',
    titleVi: 'Cảm Biến Trọng Lượng (Nhãn Nhiễu)',
    rawLabelText: 'F = 1200 N (Lực Ép)',
    displayedSymbol: 'F',
    rawValueText: '1200 N',
    readoutVi: 'CẢNH BÁO: Ký hiệu F là Áp lực (Newton - N)',
    numericValue: null,
    unit: 'N',
    isValidTarget: false,
    distractorReasonVi:
      'Ký hiệu F (đơn vị Newton - N) là Áp lực tác dụng vuông góc lên mặt bị ép, KHÔNG phải Áp suất p (đo bằng Pa hoặc N/m²)!',
    scientificNoteVi:
      'Học sinh thường nhầm Áp lực F (lực tác dụng, đơn vị N) với Áp suất p (tác dụng của lực trên 1 m², đơn vị Pa).',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'SURF_SAND',
    code: 'P-SAND',
    titleVi: 'Bánh Xích Cát Sa Mạc',
    rawLabelText: 'F = 1200 N, S = 0,12 m² -> p = 10000 Pa',
    displayedSymbol: 'p',
    rawValueText: '10000 Pa (10 kPa)',
    readoutVi: 'p = 1200 / 0,12 = 10000 Pa',
    numericValue: 10000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Bánh xích bản lớn làm tăng diện tích tiếp xúc S, giúp xe di chuyển êm ái trên cát mà không bị sa lầy.',
    colorHex: 0xd97706,
    accentHex: '#f59e0b',
  },
  {
    id: 'SURF_ROAD',
    code: 'P-ROAD',
    titleVi: 'Lốp Đua Tiêu Chuẩn',
    rawLabelText: 'F = 1200 N, S = 0,04 m² -> p = 30000 Pa',
    displayedSymbol: 'p',
    rawValueText: '30000 Pa (30 kPa)',
    readoutVi: 'p = 1200 / 0,04 = 30000 Pa',
    numericValue: 30000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Đường nhựa cứng chịu được áp suất cao hơn, cho phép lốp nhỏ hơn để tăng tính linh hoạt khi đánh lái.',
    colorHex: 0x10b981,
    accentHex: '#34d399',
  },
];

interface PressureMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  padMesh: THREE.Mesh;
}

export class M04SurfacePressureController implements IMissionController {
  public readonly id: MissionId = 'M04_SURFACE_PRESSURE';
  public readonly titleVi: string = 'M04 · ÁP SUẤT TRÊN BỀ MẶT (p = F / S)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private pads: PressureMeshNode[] = [];
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
  private completedCount = 0;
  private readonly requiredCount = 3;
  private wrongAttempts = 0;
  private readonly maxWrongAttempts = 3;
  private remainingTimeSeconds = 210;

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
      runId: `M04_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        testedGripSurfaces: false,
        tunedThreePressurePads: false,
        noDistractorError: true,
        activatedExitGate: false,
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
      missionPerformanceScore: 75,
      interactionEvidence: {
        tunedPadIds: [],
      },
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
      difficulty === 'ROOKIE' ? 240 : difficulty === 'PRO' ? 180 : 150;
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
      .addScaledVector(_upAxis, 1.6)
      .addScaledVector(this.stationTangent, -2.0);
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

    this.pads = [];
    this.interactableMeshes = [];
    this.completedCount = 0;
    this.wrongAttempts = 0;
    this.exitGateOpen = false;
    this.evidence = this.createFreshEvidence();

    this.buildPressureTestingStation();
    this.buildSurfacePads();
    this.buildPressureConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'KIỂM ĐỊNH ÁP SUẤT TIẾP XÚC (p = F/S)',
      '0 / 3 ĐIỂM THỬ ĐẠT CHUẨN',
      'Chọn cấu hình p = F / S phù hợp cho từng địa hình'
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

  private buildPressureTestingStation() {
    const canyonRockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      metalness: 0.1,
    });
    [-7.0, 7.0].forEach((cx) => {
      const g = new THREE.Group();
      g.position.set(cx, 0, -5);
      this.addShadow(g, 1.8, 1.8);
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.1, 7.0, 8),
        canyonRockMat
      );
      pillar.position.y = 3.5;
      g.add(pillar);
      this.rootGroup.add(g);
    });
  }

  private buildSurfacePads() {
    const positions: [number, number, number][] = [
      [-4.6, 0.2, -3.2],
      [-2.3, 0.2, -2.0],
      [0.0, 0.2, -1.6],
      [2.3, 0.2, -2.0],
      [4.6, 0.2, -3.2],
    ];

    M04_PRESSURE_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.1, 1.1);

      const basePlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.95, 0.2, 16),
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.8,
          roughness: 0.3,
        })
      );
      basePlate.position.y = 0.1;

      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.25, 1.2),
        new THREE.MeshStandardMaterial({
          color: spec.colorHex,
          metalness: 0.5,
          roughness: 0.4,
          emissive: spec.colorHex,
          emissiveIntensity: 0.25,
        })
      );
      pad.position.y = 0.32;

      g.add(basePlate, pad);
      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(pad);

      this.pads.push({
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
        padMesh: pad,
      });
    });
  }

  private buildPressureConsole() {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-6.8, 0, -4.5);
    consoleGroup.rotation.y = 0.45;
    this.addShadow(consoleGroup, 2.0, 2.0);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.3, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    base.position.y = 0.15;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 3.8, 12),
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
      new THREE.BoxGeometry(4.4, 2.2, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
    );
    housing.position.set(0, 3.8, 0);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.0),
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

    ctx.fillStyle = '#1c1305';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#fde68a';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.25,
    });
    const leftG = new THREE.Group();
    leftG.position.set(-1.8, 0, 3.5);
    const leftDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 5.0, 0.35),
      gateMat
    );
    leftDoor.position.y = 2.5;
    leftG.add(leftDoor);

    const rightG = new THREE.Group();
    rightG.position.set(1.8, 0, 3.5);
    const rightDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 5.0, 0.35),
      gateMat
    );
    rightDoor.position.y = 2.5;
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
    const target = this.pads.find((p) => p.spec.id === id);
    if (!target) return;
    this.aimedItemId = id;
    target.state.scanned = true;
    this.triggerSciencePulseOnAimed();
  }

  public triggerSciencePulseOnAimed() {
    let node = this.pads.find((p) => p.spec.id === this.aimedItemId);
    if (!node) {
      node = this.pads.find((p) => !p.state.scanned) || this.pads[0];
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
    let node = this.pads.find((p) => p.spec.id === this.aimedItemId);
    if (!node) {
      node = this.pads.find(
        (p) => !p.state.activatedOrLoaded && p.spec.isValidTarget
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
      this.evidence.objectiveFlags.noDistractorError = false;
      soundEngine.playWrongAnswer();
      this.pendingImpactCallback?.(0.06, 0.35);
      this.tieredHintVi = node.spec.distractorReasonVi || null;
      return;
    }

    node.state.activatedOrLoaded = true;
    this.completedCount += 1;
    soundEngine.playCargoLoadSuccess();
    this.pendingImpactCallback?.(0.05, 0.2);

    onBonusCoinsAwarded?.(
      20,
      `Đã hiệu chỉnh ${node.spec.titleVi} (p = ${node.spec.rawValueText})! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'KIỂM ĐỊNH ÁP SUẤT TIẾP XÚC (p = F/S)',
      `${this.completedCount} / 3 ĐIỂM ĐẠT CHUẨN`,
      `Áp suất mới nhất: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.tunedThreePressurePads = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Tuyệt vời! Cấu hình áp suất tiếp xúc p = F / S tối ưu — Cổng Hẻm Vực Mở! (+50 Xu)'
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

    const distToCenter = roverPos.distanceTo(
      _worldScratchA.copy(this.stationCenter).addScaledVector(this.stationTangent, -5.5)
    );
    this.inInteractiveZone = distToCenter < 12.0;

    if (this.exitGateLeft && this.exitGateRight) {
      const targetLX = this.exitGateOpen ? -3.5 : -1.8;
      const targetRX = this.exitGateOpen ? 3.5 : 1.8;
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
        const hitNode = this.pads.find((p) => p.spec.id === targetId);
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
      this.pads.find((p) => p.spec.id === this.aimedItemId)?.state || null;
    const all = this.pads.map((p) => p.state);

    return {
      active: this.active,
      missionId: this.id,
      missionTitleVi: this.titleVi,
      missionPhase: this.exitGateOpen ? 'success' : 'playing',
      cameraMode: this.cameraMode,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      currentFps: this.currentFps,
      checkpointId: 'CP0',
      objectiveTextVi: this.exitGateOpen
        ? 'Cổng hẻm vực đã mở! Lái JetBot tiến vào cổng để hoàn thành trạm.'
        : `Hiệu chỉnh áp suất tiếp xúc p = F / S cho 3 loại địa hình (${this.completedCount}/3 điểm).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Xuất sắc! Lốp xe đã tối ưu áp lực F và diện tích tiếp xúc S cho hẻm vực.'
        : 'Tính áp suất p = F / S (đơn vị Pa). Cảnh báo: F = 1200 N là Áp lực (lực vuông góc), không phải Áp suất!',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'điểm',
      completedItemsCount: this.completedCount,
      requiredItemsCount: this.requiredCount,
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
      evidence: this.evidence,
    };
  }

  public dispose() {
    this.clearDiorama();
  }
}
