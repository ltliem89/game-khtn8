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
import { createHydrostaticColumnRig } from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const M05_FLUID_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'FLUID_2M',
    code: 'P-DEPTH-2M',
    titleVi: 'Cổng Thủy Lực Nông (h = 2 m)',
    rawLabelText: 'd = 10000 N/m³, h = 2 m -> p = 20000 Pa',
    displayedSymbol: 'p',
    rawValueText: '20 kPa (20000 Pa)',
    readoutVi: 'p = d . h = 10000 . 2 = 20000 Pa (20 kPa)',
    numericValue: 20000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Áp suất chất lỏng tại độ sâu h = 2 m: p = d . h = 10000 . 2 = 20000 Pa.',
    colorHex: 0x0ea5e9,
    accentHex: '#38bdf8',
  },
  {
    id: 'FLUID_5M',
    code: 'P-DEPTH-5M',
    titleVi: 'Cổng Áp Lực Tầng Giữa (h = 5 m)',
    rawLabelText: 'd = 10000 N/m³, h = 5 m -> p = 50000 Pa',
    displayedSymbol: 'p',
    rawValueText: '50 kPa (50000 Pa)',
    readoutVi: 'p = d . h = 10000 . 5 = 50000 Pa (50 kPa)',
    numericValue: 50000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Độ sâu tăng lên h = 5 m khiến áp suất chất lỏng tăng lên 50000 Pa.',
    colorHex: 0x0284c7,
    accentHex: '#0ea5e9',
  },
  {
    id: 'FLUID_DISTRACTOR',
    code: 'P-DIST-VOL',
    titleVi: 'Lưu Lượng Kế Thể Tích (Nhãn Nhiễu)',
    rawLabelText: 'V = 500 m³ (Thể Tích Xả)',
    displayedSymbol: 'V',
    rawValueText: '500 m³',
    readoutVi: 'CẢNH BÁO: Ký hiệu V là Thể tích nước (m³)',
    numericValue: null,
    unit: 'm³',
    isValidTarget: false,
    distractorReasonVi:
      'Ký hiệu V (đơn vị m³ hoặc lít) là Thể tích nước, KHÔNG phải Áp suất chất lỏng p = d.h (đo bằng Pa)!',
    scientificNoteVi:
      'Phân biệt rõ: Áp suất chất lỏng p phụ thuộc độ sâu h và trọng lượng riêng d (p = d.h), không phụ thuộc vào thể tích toàn bể.',
    colorHex: 0x7c3aed,
    accentHex: '#a78bfa',
  },
  {
    id: 'FLUID_8M',
    code: 'P-DEPTH-8M',
    titleVi: 'Cổng Xả Đáy Chịu Lực (h = 8 m)',
    rawLabelText: 'd = 10000 N/m³, h = 8 m -> p = 80000 Pa',
    displayedSymbol: 'p',
    rawValueText: '80 kPa (Chân đập chịu lực)',
    readoutVi: 'p = d . h = 10000 . 8 = 80000 Pa (80 kPa)',
    numericValue: 80000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Tại đáy đập h = 8 m, áp suất chất lỏng đạt cực đại 80000 Pa. Chân đập nước luôn phải xây dày hơn đỉnh đập để chịu áp suất lớn nhất!',
    colorHex: 0x0369a1,
    accentHex: '#38bdf8',
  },
  {
    id: 'FLUID_3M',
    code: 'P-DEPTH-3M',
    titleVi: 'Cổng Quan Trắc Kênh Nước (h = 3 m)',
    rawLabelText: 'd = 10000 N/m³, h = 3 m -> p = 30000 Pa',
    displayedSymbol: 'p',
    rawValueText: '30 kPa (30000 Pa)',
    readoutVi: 'p = d . h = 10000 . 3 = 30000 Pa',
    numericValue: 30000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Áp suất chất lỏng tại độ sâu h = 3 m: p = 10000 . 3 = 30000 Pa.',
    colorHex: 0x0891b2,
    accentHex: '#22d3ee',
  },
];

interface FluidGateMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  gateDoorMesh: THREE.Mesh;
}

export class M05FluidPressureController implements IMissionController {
  public readonly id: MissionId = 'M05_LIQUID_PRESSURE';
  public readonly titleVi: string = 'M05 · ÁP SUẤT CHẤT LỎNG (p = d . h)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private gates: FluidGateMeshNode[] = [];
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
      runId: `M05_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        analyzedDepthHydrostatics: false,
        equalizedThreeGates: false,
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
        equalizedGateIds: [],
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

    this.gates = [];
    this.interactableMeshes = [];
    this.completedCount = 0;
    this.wrongAttempts = 0;
    this.exitGateOpen = false;
    this.evidence = this.createFreshEvidence();

    this.buildDamStructure();
    this.buildPressureGates();
    this.buildHydrostaticConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'ÁP SUẤT CHẤT LỎNG THEO ĐỘ SÂU (p = d.h)',
      '0 / 3 CỔNG ĐIỀU ÁP ĐÃ MỞ',
      'Tính p = d . h theo độ sâu h để giải tỏa áp lực đập'
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

  private buildDamStructure() {
    // Massive reinforced concrete dam wall (slanted, thicker at base)
    const damMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.3,
      roughness: 0.8,
    });
    const damGeo = new THREE.BoxGeometry(16, 8, 3.5);
    const damMesh = new THREE.Mesh(damGeo, damMat);
    damMesh.position.set(0, 4, -7.0);
    this.rootGroup.add(damMesh);

    // Cyan water channel pool
    const waterMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(15, 6), waterMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.03, -4.5);
    this.rootGroup.add(pool);
  }

  private buildPressureGates() {
    const positions: [number, number, number][] = [
      [-4.6, 0.2, -3.2],
      [-2.3, 0.2, -2.0],
      [0.0, 0.2, -1.6],
      [2.3, 0.2, -2.0],
      [4.6, 0.2, -3.2],
    ];

    M05_FLUID_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.3, 1.3);

      // Gate arch with reinforced structural steel
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.25,
      });
      const leftCol = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 3.2, 0.3),
        frameMat
      );
      leftCol.position.set(-0.7, 1.6, 0);
      const rightCol = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 3.2, 0.3),
        frameMat
      );
      rightCol.position.set(0.7, 1.6, 0);
      const topBeam = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.35, 0.35),
        frameMat
      );
      topBeam.position.set(0, 3.2, 0);

      // Moving hydraulic gate door
      const doorMat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: 0.7,
        roughness: 0.3,
        emissive: spec.colorHex,
        emissiveIntensity: 0.3,
      });
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.9, 0.18), doorMat);
      door.position.set(0, 1.45, 0);

      // Authentic Hydrostatic column rig with U-tube manometer
      const depthFrac = spec.numericValue ? spec.numericValue / 100000 : 0.3;
      const { group: columnRig } = createHydrostaticColumnRig({ depthFraction: depthFrac });
      columnRig.scale.set(0.55, 0.55, 0.55);
      columnRig.position.set(1.4, 0, 0);

      g.add(leftCol, rightCol, topBeam, door, columnRig);
      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(door);

      this.gates.push({
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
        gateDoorMesh: door,
      });
    });
  }

  private buildHydrostaticConsole() {
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

    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
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
    const target = this.gates.find((g) => g.spec.id === id);
    if (!target) return;
    this.aimedItemId = id;
    target.state.scanned = true;
    this.triggerSciencePulseOnAimed();
  }

  public triggerSciencePulseOnAimed() {
    let node = this.gates.find((g) => g.spec.id === this.aimedItemId);
    if (!node) {
      node = this.gates.find((g) => !g.state.scanned) || this.gates[0];
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
    let node = this.gates.find((g) => g.spec.id === this.aimedItemId);
    if (!node) {
      node = this.gates.find(
        (g) => !g.state.activatedOrLoaded && g.spec.isValidTarget
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
      `Đã cân bằng áp lực ${node.spec.titleVi} (p = ${node.spec.rawValueText})! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'ÁP SUẤT CHẤT LỎNG THEO ĐỘ SÂU (p = d.h)',
      `${this.completedCount} / 3 CỔNG ĐÃ CÂN BẰNG`,
      `Cổng mở: ${node.spec.code} (p = ${node.spec.rawValueText})`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.equalizedThreeGates = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Tuyệt vời! Hệ thống xả lũ an toàn p = d . h hoàn tất — Cổng Thoát Mở! (+50 Xu)'
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

    // Animate opened doors rising
    this.gates.forEach((g) => {
      const targetY = g.state.activatedOrLoaded ? 3.5 : 1.3;
      g.gateDoorMesh.position.y = THREE.MathUtils.lerp(
        g.gateDoorMesh.position.y,
        targetY,
        dt * 4.0
      );
    });

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
        const hitNode = this.gates.find((g) => g.spec.id === targetId);
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
      this.gates.find((g) => g.spec.id === this.aimedItemId)?.state || null;
    const all = this.gates.map((g) => g.state);

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
        ? 'Cổng áp lực đập nước đã mở! Lái JetBot tiến vào cổng để kết thúc trạm.'
        : `Cân bằng áp suất chất lỏng p = d . h tại 3 cổng điều áp (${this.completedCount}/3 cổng).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Xuất sắc! Càng xuống sâu h càng tăng thì áp suất chất lỏng p càng lớn.'
        : 'Tính p = d . h theo độ sâu h. Cảnh báo: V = 500 m³ là thể tích nước xả, không phải áp suất!',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'cổng',
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
