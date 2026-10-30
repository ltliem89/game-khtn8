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
  createLabElectronicScale,
  createSpecimenBlock,
  getDialScaleTexture,
} from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const M03_SAMPLE_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'SAMPLE_ALU',
    code: 'D-ALU',
    titleVi: 'Mẫu Hợp Kim Nhôm (Aluminium)',
    rawLabelText: 'm = 540 g, V = 200 cm³ -> D = 2,7 g/cm³',
    displayedSymbol: 'D',
    rawValueText: '2,7 g/cm³ (2700 kg/m³)',
    readoutVi: 'D = 540 / 200 = 2,7 g/cm³ = 2700 kg/m³',
    numericValue: 2700,
    unit: 'kg/m³',
    isValidTarget: true,
    scientificNoteVi:
      'Công thức tính khối lượng riêng: D = m / V = 540 / 200 = 2,7 g/cm³ = 2700 kg/m³ (chuẩn SGK).',
    colorHex: 0x38bdf8,
    accentHex: '#7dd3fc',
  },
  {
    id: 'SAMPLE_IRON',
    code: 'D-IRON',
    titleVi: 'Mẫu Khối Sắt Đặc (Iron)',
    rawLabelText: 'm = 1560 g, V = 200 cm³ -> D = 7,8 g/cm³',
    displayedSymbol: 'D',
    rawValueText: '7,8 g/cm³ (7800 kg/m³)',
    readoutVi: 'D = 1560 / 200 = 7,8 g/cm³ = 7800 kg/m³',
    numericValue: 7800,
    unit: 'kg/m³',
    isValidTarget: true,
    scientificNoteVi:
      'Khối lượng riêng của sắt là 7800 kg/m³ (7,8 g/cm³). Cùng thể tích 200 cm³, sắt nặng gấp gần 3 lần nhôm!',
    colorHex: 0x64748b,
    accentHex: '#94a3b8',
  },
  {
    id: 'SAMPLE_DISTRACTOR_PRESSURE',
    code: 'D-DIST',
    titleVi: 'Đầu Dò Áp Lực Bề Mặt (Nhãn Nhiễu)',
    rawLabelText: 'p = 10000 Pa (10 kPa)',
    displayedSymbol: 'p',
    rawValueText: '10000 Pa',
    readoutVi: 'CẢNH BÁO: Ký hiệu p là Áp suất (Pascal - Pa)',
    numericValue: null,
    unit: 'Pa',
    isValidTarget: false,
    distractorReasonVi:
      'Ký hiệu p (đơn vị Pascal - Pa hoặc N/m²) là đại lượng Áp suất trên một bề mặt, KHÔNG phải Khối lượng riêng D!',
    scientificNoteVi:
      'Cần phân biệt rõ: D = m/V đo bằng kg/m³ hoặc g/cm³; p = F/S đo bằng Pa.',
    colorHex: 0xd97706,
    accentHex: '#fbbf24',
  },
  {
    id: 'SAMPLE_WATER',
    code: 'D-WATER',
    titleVi: 'Mẫu Nước Cất Tiêu Chuẩn',
    rawLabelText: 'm = 1000 g, V = 1000 cm³ -> D = 1,0 g/cm³',
    displayedSymbol: 'D',
    rawValueText: '1,0 g/cm³ (1000 kg/m³)',
    readoutVi: 'D = 1000 / 1000 = 1,0 g/cm³ = 1000 kg/m³',
    numericValue: 1000,
    unit: 'kg/m³',
    isValidTarget: true,
    scientificNoteVi:
      'Khối lượng riêng của nước cất ở 4°C là 1000 kg/m³ (1 g/cm³ hoặc 1 kg/L).',
    colorHex: 0x06b6d4,
    accentHex: '#22d3ee',
  },
  {
    id: 'SAMPLE_COPPER',
    code: 'D-COPPER',
    titleVi: 'Mẫu Đồng Tinh Khiết (Copper)',
    rawLabelText: 'm = 890 g, V = 100 cm³ -> D = 8,9 g/cm³',
    displayedSymbol: 'D',
    rawValueText: '8,9 g/cm³ (8900 kg/m³)',
    readoutVi: 'D = 890 / 100 = 8,9 g/cm³ = 8900 kg/m³',
    numericValue: 8900,
    unit: 'kg/m³',
    isValidTarget: true,
    scientificNoteVi:
      'Khối lượng riêng của đồng là 8900 kg/m³ (8,9 g/cm³), nặng hơn cả sắt!',
    colorHex: 0xb45309,
    accentHex: '#f59e0b',
  },
];

interface SampleMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  podMesh: THREE.Mesh;
}

export class M03DensityHuntController implements IMissionController {
  public readonly id: MissionId = 'M03_DENSITY';
  public readonly titleVi: string = 'M03 · THỢ SĂN KHỐI LƯỢNG RIÊNG (D = m / V)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private samples: SampleMeshNode[] = [];
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
      runId: `M03_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        scannedMaterials: false,
        calibratedThreeDensities: false,
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
        classifiedSampleIds: [],
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

    this.samples = [];
    this.interactableMeshes = [];
    this.completedCount = 0;
    this.wrongAttempts = 0;
    this.exitGateOpen = false;
    this.evidence = this.createFreshEvidence();

    this.buildForensicLabStructure();
    this.buildMaterialSamplePods();
    this.buildDensityConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'PHÂN LOẠI KHỐI LƯỢNG RIÊNG (D = m/V)',
      '0 / 3 MẪU ĐẠT CHUẨN',
      'Tính D = m / V cho các mẫu vật để mở cổng'
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

  private buildForensicLabStructure() {
    // Hexagonal lab ring on floor
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 4.6, 6),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.03, -5.5);
    this.rootGroup.add(ring);

    // Overhead diagnostic scanner arch
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    [-6.2, 6.2].forEach((ax) => {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 7.5, 16),
        archMat
      );
      col.position.set(ax, 3.75, -5.5);
      this.rootGroup.add(col);
    });

    const topSpan = new THREE.Mesh(
      new THREE.BoxGeometry(13.2, 0.6, 1.2),
      archMat
    );
    topSpan.position.set(0, 7.5, -5.5);
    this.rootGroup.add(topSpan);

    // Central Laboratory Balance Workstation
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.8, 1.8), benchMat);
    bench.position.set(0, 0.4, -5.5);
    this.rootGroup.add(bench);

    const { group: scaleRig } = createLabElectronicScale({
      width: 1.6,
      depth: 1.4,
      height: 0.4,
      panRadius: 0.55,
      initialReadingKg: 0.0,
    });
    scaleRig.position.set(0, 0.8, -5.5);
    this.rootGroup.add(scaleRig);
  }

  private buildMaterialSamplePods() {
    const positions: [number, number, number][] = [
      [-4.8, 0.9, -3.5],
      [-2.4, 0.9, -2.0],
      [0.0, 0.9, -1.5],
      [2.4, 0.9, -2.0],
      [4.8, 0.9, -3.5],
    ];

    M03_SAMPLE_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.1, 1.1);

      // Heavy industrial plinth base
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.95, 0.45, 16),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          metalness: 0.8,
          roughness: 0.3,
        })
      );
      plinth.position.y = 0.225;
      g.add(plinth);

      let pod: THREE.Mesh;

      if (spec.id === 'SAMPLE_ALU') {
        const block = createSpecimenBlock({
          materialType: 'ALUMINIUM',
          size: new THREE.Vector3(0.9, 0.8, 0.9),
          label: 'NHÔM (Al)',
          densityValue: 2700,
        });
        block.position.y = 0.45;
        g.add(block);
        pod = block.children[0] as THREE.Mesh;
      } else if (spec.id === 'SAMPLE_IRON') {
        const block = createSpecimenBlock({
          materialType: 'IRON',
          size: new THREE.Vector3(0.9, 0.8, 0.9),
          label: 'SẮT ĐẶC (Fe)',
          densityValue: 7800,
        });
        block.position.y = 0.45;
        g.add(block);
        pod = block.children[0] as THREE.Mesh;
      } else if (spec.id === 'SAMPLE_COPPER') {
        const block = createSpecimenBlock({
          materialType: 'COPPER',
          size: new THREE.Vector3(0.85, 0.75, 0.85),
          label: 'ĐỒNG (Cu)',
          densityValue: 8900,
        });
        block.position.y = 0.45;
        g.add(block);
        pod = block.children[0] as THREE.Mesh;
      } else if (spec.id === 'SAMPLE_WATER') {
        const block = createSpecimenBlock({
          materialType: 'GLASS',
          size: new THREE.Vector3(0.9, 0.9, 0.9),
          label: 'NƯỚC CẤT (H2O)',
          densityValue: 1000,
        });
        block.position.y = 0.45;
        g.add(block);
        pod = block.children[0] as THREE.Mesh;
      } else {
        // Distractor Pressure sensor with Bourdon dial face
        const distBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.85, 0.9),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 })
        );
        distBox.position.y = 0.875;
        const dialTex = getDialScaleTexture('ÁP SUẤT', 'p', 0, 100, 'kPa');
        const dialPlate = new THREE.Mesh(
          new THREE.PlaneGeometry(0.65, 0.65),
          new THREE.MeshBasicMaterial({ map: dialTex })
        );
        dialPlate.position.set(0, 0.875, 0.46);
        g.add(distBox, dialPlate);
        pod = distBox;
      }

      // Glowing selection beacon ring
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 0.85, 20),
        new THREE.MeshBasicMaterial({
          color: spec.colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.46;
      g.add(halo);

      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(pod);

      this.samples.push({
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
        podMesh: pod,
      });
    });
  }

  private buildDensityConsole() {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-6.8, 0, -4.5);
    consoleGroup.rotation.y = 0.42;
    this.addShadow(consoleGroup, 2.0, 2.0);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.3, 3.5),
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

    ctx.fillStyle = '#061a14';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#34d399';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#6ee7b7';
    ctx.font = '800 50px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
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
    const target = this.samples.find((s) => s.spec.id === id);
    if (!target) return;
    this.aimedItemId = id;
    target.state.scanned = true;
    this.triggerSciencePulseOnAimed();
  }

  public triggerSciencePulseOnAimed() {
    let node = this.samples.find((s) => s.spec.id === this.aimedItemId);
    if (!node) {
      node = this.samples.find((s) => !s.state.scanned) || this.samples[0];
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
    let node = this.samples.find((s) => s.spec.id === this.aimedItemId);
    if (!node) {
      node = this.samples.find(
        (s) => !s.state.activatedOrLoaded && s.spec.isValidTarget
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

    // Valid sample
    node.state.activatedOrLoaded = true;
    this.completedCount += 1;
    soundEngine.playCargoLoadSuccess();
    this.pendingImpactCallback?.(0.05, 0.2);

    onBonusCoinsAwarded?.(
      20,
      `Đã phân loại ${node.spec.titleVi} (D = ${node.spec.numericValue} kg/m³)! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'PHÂN LOẠI KHỐI LƯỢNG RIÊNG (D = m/V)',
      `${this.completedCount} / 3 MẪU HOÀN THÀNH`,
      `Mẫu mới nhất: ${node.spec.code} -> D = ${node.spec.numericValue} kg/m³`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.calibratedThreeDensities = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Xác thực hoàn tất! Đã phân loại đủ 3 mẫu Khối lượng riêng — Cổng Mở! (+50 Xu)'
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

    // Pod floating animation
    this.samples.forEach((s, idx) => {
      s.podMesh.rotation.y += dt * 1.2;
      s.podMesh.position.y = 1.1 + Math.sin(elapsed * 2 + idx) * 0.08;
    });

    const distToCenter = roverPos.distanceTo(
      _worldScratchA.copy(this.stationCenter).addScaledVector(this.stationTangent, -5.5)
    );
    this.inInteractiveZone = distToCenter < 12.0;

    // Exit gates opening
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
        const hitNode = this.samples.find((s) => s.spec.id === targetId);
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
      this.samples.find((s) => s.spec.id === this.aimedItemId)?.state || null;
    const all = this.samples.map((s) => s.state);

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
        ? 'Cổng phân loại đã mở! Lái JetBot qua cổng để hoàn tất trạm.'
        : `Phân loại đúng 3 mẫu vật bằng công thức D = m / V (${this.completedCount}/3 mẫu).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Xuất sắc! Bạn đã phân loại chính xác các mẫu vật liệu theo Khối lượng riêng D = m / V.'
        : 'Tính D = m / V cho từng mẫu. Cảnh báo: Nhãn p = 10000 Pa là Áp suất, không phải Khối lượng riêng!',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'mẫu',
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
