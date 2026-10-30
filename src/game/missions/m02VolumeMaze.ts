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
import { createGraduatedCylinder } from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _projVec = new THREE.Vector3();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const M02_VESSEL_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'VESSEL_A1',
    code: 'VOL-250',
    titleVi: 'Bình Chia Độ A (250 mL)',
    rawLabelText: 'V = 250 mL (0,25 L)',
    displayedSymbol: 'V',
    rawValueText: '250 mL',
    readoutVi: '250 mL (0,25 L = 0,25 dm³)',
    numericValue: 250,
    unit: 'mL',
    isValidTarget: true,
    scientificNoteVi:
      'Đúng chuẩn đại lượng Thể tích (ký hiệu V). Đổi đơn vị: 250 mL = 0,25 L = 0,25 dm³.',
    colorHex: 0x06b6d4,
    accentHex: '#22d3ee',
  },
  {
    id: 'VESSEL_B2',
    code: 'VOL-DISP',
    titleVi: 'Ống Đo Nước Dâng (Vật Chìm)',
    rawLabelText: 'V1 = 300 mL -> V2 = 450 mL (ΔV = 150 mL)',
    displayedSymbol: 'V',
    rawValueText: '450 mL',
    readoutVi: '450 mL tổng dung tích (ΔV = 150 mL)',
    numericValue: 450,
    unit: 'mL',
    isValidTarget: true,
    scientificNoteVi:
      'Đo thể tích vật rắn không thấm nước: V_vật = V2 - V1 = 450 - 300 = 150 mL. Dung tích chất lỏng nạp là 450 mL.',
    colorHex: 0x0ea5e9,
    accentHex: '#38bdf8',
  },
  {
    id: 'VESSEL_DISTRACTOR',
    code: 'VOL-DIST',
    titleVi: 'Cảm Biến Nguồn Điện (Nhãn Nhiễu)',
    rawLabelText: 'U = 220 V',
    displayedSymbol: 'U',
    rawValueText: '220 V',
    readoutVi: 'CẢNH BÁO: Ký hiệu U, đơn vị Vôn (V)',
    numericValue: null,
    unit: 'V',
    isValidTarget: false,
    distractorReasonVi:
      'Chữ V ở đây là đơn vị Vôn (V) của Hiệu điện thế U, KHÔNG phải đại lượng Thể tích V đo bằng lít hay mL!',
    scientificNoteVi:
      'Rất nhiều học sinh nhầm lẫn giữa chữ V của Thể tích và đơn vị V của Hiệu điện thế.',
    colorHex: 0xd97706,
    accentHex: '#f59e0b',
  },
  {
    id: 'VESSEL_C3',
    code: 'VOL-500',
    titleVi: 'Bình Định Mức C (500 mL)',
    rawLabelText: 'V = 500 mL (0,5 dm³)',
    displayedSymbol: 'V',
    rawValueText: '500 mL',
    readoutVi: '500 mL (0,5 L chuẩn)',
    numericValue: 500,
    unit: 'mL',
    isValidTarget: true,
    scientificNoteVi:
      'Đúng chuẩn đại lượng Thể tích: 500 mL = 0,5 L = 0,5 dm³ = 0,0005 m³.',
    colorHex: 0x3b82f6,
    accentHex: '#60a5fa',
  },
  {
    id: 'VESSEL_D4',
    code: 'VOL-300',
    titleVi: 'Bình Nón Thí Nghiệm D (300 mL)',
    rawLabelText: 'V = 300 mL',
    displayedSymbol: 'V',
    rawValueText: '300 mL',
    readoutVi: '300 mL dung dịch thí nghiệm',
    numericValue: 300,
    unit: 'mL',
    isValidTarget: true,
    scientificNoteVi:
      'Bình chứa chất lỏng 300 mL. Khi kết hợp: 250 + 450 + 500 = 1200 mL!',
    colorHex: 0x6366f1,
    accentHex: '#818cf8',
  },
];

interface VesselMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  liquidMesh: THREE.Mesh;
  cylinderGlass: THREE.Mesh;
  hitFlashTimer: number;
  squashTimer: number;
}

export class M02VolumeMazeController implements IMissionController {
  public readonly id: MissionId = 'M02_VOLUME';
  public readonly titleVi: string = 'M02 · MÊ CUNG THỂ TÍCH & BÌNH CHIA ĐỘ';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private vessels: VesselMeshNode[] = [];
  private interactableMeshes: THREE.Object3D[] = [];
  private pipeRings: THREE.Mesh[] = [];

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
  private currentVolumeMl = 0;
  private readonly targetVolumeMl = 1200; // 250 + 450 + 500
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
      runId: `M02_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        enteredLabBay: false,
        scannedAllVessels: false,
        routedTargetVolume: false,
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
      missionPerformanceScore: 70,
      interactionEvidence: {
        routedVesselIds: [],
        finalVolumeMl: 0,
        targetVolumeMl: this.targetVolumeMl,
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

    this.vessels = [];
    this.interactableMeshes = [];
    this.pipeRings = [];
    this.currentVolumeMl = 0;
    this.completedCount = 0;
    this.wrongAttempts = 0;
    this.exitGateOpen = false;
    this.evidence = this.createFreshEvidence();

    this.buildPipelinesAndReservoir();
    this.buildMeasuringVessels();
    this.buildVolumetricConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'MÔ PHỎNG ĐO THỂ TÍCH V',
      '0 / 1200 mL',
      'Nạp đúng các bình thể tích (V) để đạt 1200 mL (1,2 L)'
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

  private buildPipelinesAndReservoir() {
    // Transparent industrial pipelines crossing overhead
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.8,
    });
    const liquidMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.6,
    });

    [-6.5, 6.5].forEach((px) => {
      const g = new THREE.Group();
      g.position.set(px, 0, -6);
      this.addShadow(g, 1.2, 1.2);

      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 8, 16),
        pipeMat
      );
      column.position.y = 4;
      g.add(column);
      this.rootGroup.add(g);
    });

    // Horizontal cross-pipeline
    const crossPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 13.5, 16),
      pipeMat
    );
    crossPipe.rotation.z = Math.PI / 2;
    crossPipe.position.set(0, 7.8, -6);
    this.rootGroup.add(crossPipe);

    // Flow indicator rings inside pipe
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.04, 8, 16),
        liquidMat
      );
      ring.position.set(-5 + i * 2.5, 7.8, -6);
      ring.rotation.y = Math.PI / 2;
      this.rootGroup.add(ring);
      this.pipeRings.push(ring);
    }

    // Interactive circular bay floor pad
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 4.4, 32),
      new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.03, -5.5);
    this.rootGroup.add(pad);
  }

  private buildMeasuringVessels() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M02_VESSEL_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.1, 1.1);

      // Realistic Borosilicate Graduated Cylinder or Distractor Voltage Apparatus
      const fillPct = spec.numericValue ? spec.numericValue / 600 : 0.2;
      const isDisplacementStone = spec.id === 'VESSEL_B2';
      const isDistractor = spec.id === 'VESSEL_DISTRACTOR';

      const { group: cylinderRig, liquidMesh, stoneMesh } = createGraduatedCylinder({
        radius: 0.46,
        height: 2.2,
        liquidFraction: fillPct,
        liquidColor: spec.colorHex,
        liquidEmissive: spec.colorHex,
        maxVolumeMl: 600,
        includeStone: isDisplacementStone,
        stoneRadius: 0.22,
      });

      // Glass mesh is the main interactable cylinder
      const glass = cylinderRig.children.find(
        (c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.CylinderGeometry && c !== liquidMesh
      ) as THREE.Mesh || liquidMesh;

      g.add(cylinderRig);

      // If distractor (Voltage), add high-voltage warning sign & copper terminals
      if (isDistractor) {
        const warningSign = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4 })
        );
        warningSign.position.set(0, 1.8, 0.52);
        g.add(warningSign);

        [-0.2, 0.2].forEach((tx) => {
          const terminal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8),
            new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 })
          );
          terminal.position.set(tx, 2.4, 0);
          g.add(terminal);
        });
      }

      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(glass);

      const node: VesselMeshNode = {
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
        liquidMesh,
        cylinderGlass: glass,
        hitFlashTimer: 0,
        squashTimer: 0,
      };
      this.vessels.push(node);
    });
  }

  private buildVolumetricConsole() {
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

    const screenHousing = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.2, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
    );
    screenHousing.position.set(0, 3.8, 0);

    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 2.0),
      new THREE.MeshBasicMaterial({ map: this.consoleTexture })
    );
    screenMesh.position.set(0, 3.8, 0.14);

    consoleGroup.add(base, pillar, screenHousing, screenMesh);
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

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#22d3ee';
    ctx.font = '800 52px "JetBrains Mono", monospace';
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
      roughness: 0.3,
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
    const target = this.vessels.find((v) => v.spec.id === id);
    if (!target) return;
    this.aimedItemId = id;
    target.state.scanned = true;
    this.triggerSciencePulseOnAimed();
  }

  public triggerSciencePulseOnAimed() {
    let node = this.vessels.find((v) => v.spec.id === this.aimedItemId);
    if (!node) {
      node = this.vessels.find((v) => !v.state.scanned) || this.vessels[0];
      if (node) this.aimedItemId = node.spec.id;
    }
    if (!node) return;

    node.state.scanned = true;
    node.state.taggedWithPulse = true;
    node.hitFlashTimer = 0.3;
    node.squashTimer = 0.25;

    soundEngine.playSciencePulse();
    this.pendingImpactCallback?.(0.04, 0.15);
    this.evidence.pulseTagCount += 1;
    this.evidence.interactionCount += 1;
  }

  public interactWithAimed(
    onBonusCoinsAwarded?: (coins: number, reasonVi: string) => void
  ) {
    let node = this.vessels.find((v) => v.spec.id === this.aimedItemId);
    if (!node) {
      node = this.vessels.find(
        (v) => !v.state.activatedOrLoaded && v.spec.isValidTarget
      );
      if (node) this.aimedItemId = node.spec.id;
    }
    if (!node) return;

    node.state.scanned = true;
    this.evidence.interactionCount += 1;

    if (node.state.activatedOrLoaded) return;

    if (!node.spec.isValidTarget) {
      // Hit distractor
      this.wrongAttempts += 1;
      this.evidence.wrongAttempts += 1;
      this.evidence.objectiveFlags.noDistractorError = false;
      soundEngine.playWrongAnswer();
      this.pendingImpactCallback?.(0.06, 0.35);
      this.tieredHintVi = node.spec.distractorReasonVi || null;
      return;
    }

    // Valid target
    node.state.activatedOrLoaded = true;
    this.completedCount += 1;
    this.currentVolumeMl += node.spec.numericValue || 0;
    soundEngine.playCargoLoadSuccess();
    this.pendingImpactCallback?.(0.05, 0.2);

    onBonusCoinsAwarded?.(
      20,
      `Đã nạp ${node.spec.numericValue} mL vào bể chứa! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'MÔ PHỎNG ĐO THỂ TÍCH V',
      `${this.currentVolumeMl} / ${this.targetVolumeMl} mL`,
      `Đã nạp ${this.completedCount}/3 bình thể tích`
    );

    if (this.currentVolumeMl >= this.targetVolumeMl) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.routedTargetVolume = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Tuyệt vời! Đã nạp đủ 1200 mL (1,2 L) — Cổng Thoát Mở! (+50 Xu)'
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

    // Check distance to interactive bay
    const distToCenter = roverPos.distanceTo(
      _worldScratchA.copy(this.stationCenter).addScaledVector(this.stationTangent, -5.5)
    );
    this.inInteractiveZone = distToCenter < 12.0;

    // Animate flow rings
    this.pipeRings.forEach((r, i) => {
      r.rotation.z += dt * (2.0 + i * 0.4);
    });

    // Animate exit gates
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

    // Raycast / Aiming
    _ndcVec.set(reticleX, reticleY);
    _raycaster.setFromCamera(_ndcVec, camera);
    const hits = _raycaster.intersectObjects(this.interactableMeshes, false);
    if (hits.length > 0) {
      const parentG = hits[0].object.parent;
      const targetId = parentG?.userData?.targetId;
      if (targetId && targetId !== this.aimedItemId) {
        this.aimedItemId = targetId;
        const hitNode = this.vessels.find((v) => v.spec.id === targetId);
        if (hitNode && !hitNode.state.scanned) {
          hitNode.state.scanned = true;
          soundEngine.playTargetLock();
        }
      }
    }

    // Handle input
    if (justPressedPulse) {
      this.triggerSciencePulseOnAimed();
    }
    if (justPressedInteract) {
      this.interactWithAimed(onBonusCoinsAwarded);
    }
  }

  public getHudSnapshot(drivingScore: number): UniversalMissionHudSnapshot {
    const aimed =
      this.vessels.find((v) => v.spec.id === this.aimedItemId)?.state || null;
    const all = this.vessels.map((v) => v.state);

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
        ? 'Cổng áp lực đã mở! Lái JetBot tiến vào cổng để hoàn thành trạm.'
        : `Nạp đúng các bình thể tích (V) để đạt ${this.targetVolumeMl} mL (${this.completedCount}/3 bình).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Dòng chất lỏng giải nhiệt đã lưu thông ổn định! Tiến vào cổng để tổng kết kiến thức Thể tích.'
        : 'Hãy quan sát vạch chia độ trên các bình chia độ và cẩn thận nhãn gây nhiễu U = 220 V!',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.currentVolumeMl,
      targetProgressValue: this.targetVolumeMl,
      progressUnit: 'mL',
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
