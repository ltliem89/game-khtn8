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

export const M10_CURRENT_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'CUR_AMPERE_1',
    code: 'CUR-HEADLIGHT-SERIES',
    titleVi: 'Nhánh Đèn Pha (I = 2,4 A - Mắc nối tiếp)',
    rawLabelText: 'I = 2,4 A (Ampe kế mắc nối tiếp)',
    displayedSymbol: 'I',
    rawValueText: '2,4 A (2400 mA)',
    readoutVi: 'I = 2,4 A: Dòng điện chạy qua dây tóc bóng đèn',
    numericValue: 2.4,
    unit: 'A',
    isValidTarget: true,
    scientificNoteVi:
      'Cường độ dòng điện ký hiệu là I, đơn vị là ampe (A). Để đo cường độ dòng điện qua vật tiêu thụ, phải mắc Ampe kế nối tiếp với vật đó.',
    colorHex: 0x38bdf8,
    accentHex: '#7dd3fc',
  },
  {
    id: 'CUR_MILLIAMP_2',
    code: 'CUR-LIDAR-SERIES',
    titleVi: 'Nhánh Cảm Biến LiDAR (I = 450 mA)',
    rawLabelText: 'I = 450 mA = 0,45 A (Mắc nối tiếp)',
    displayedSymbol: 'I',
    rawValueText: '450 mA',
    readoutVi: 'I = 450 mA = 0,45 A: Dòng điện định mức LiDAR',
    numericValue: 450,
    unit: 'mA',
    isValidTarget: true,
    scientificNoteVi:
      '1 A = 1000 mA. Ampe kế đo dòng qua mạch cảm biến được mắc nối tiếp vào chốt (+) hướng về cực dương nguồn.',
    colorHex: 0x0ea5e9,
    accentHex: '#38bdf8',
  },
  {
    id: 'CUR_DISTRACTOR',
    code: 'CUR-DIST-VOLTAGE',
    titleVi: 'Điện Áp Nguồn Pin (Nhãn Nhiễu)',
    rawLabelText: 'U = 24 V (Hiệu điện thế)',
    displayedSymbol: 'U',
    rawValueText: '24 V (Vôn)',
    readoutVi: 'CẢNH BÁO: Ký hiệu U là Hiệu điện thế, đơn vị là Vôn (V)!',
    numericValue: null,
    unit: 'V',
    isValidTarget: false,
    distractorReasonVi:
      'Đại lượng U (đơn vị V) là Hiệu điện thế, KHÔNG phải Cường độ dòng điện I (đơn vị A/mA)! Tuyệt đối không mắc nhầm Vôn kế thay Ampe kế.',
    scientificNoteVi:
      'Cường độ dòng điện đo bằng Ampe kế (I, đơn vị A), còn Hiệu điện thế đo bằng Vôn kế (U, đơn vị V).',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'CUR_AMPERE_3',
    code: 'CUR-FAN-SERIES',
    titleVi: 'Nhánh Quạt Tản Nhiệt (I = 1,2 A)',
    rawLabelText: 'I = 1,2 A (Mắc nối tiếp)',
    displayedSymbol: 'I',
    rawValueText: '1,2 A',
    readoutVi: 'I = 1,2 A: Dòng qua động cơ quạt làm mát',
    numericValue: 1.2,
    unit: 'A',
    isValidTarget: true,
    scientificNoteVi:
      'Động cơ quạt làm mát tiêu thụ cường độ dòng điện ổn định 1,2 A khi Ampe kế được mắc nối tiếp.',
    colorHex: 0x0284c7,
    accentHex: '#38bdf8',
  },
  {
    id: 'CUR_MILLIAMP_4',
    code: 'CUR-MCU-SERIES',
    titleVi: 'Nhánh Vi Điều Khiển AI (I = 80 mA)',
    rawLabelText: 'I = 80 mA = 0,08 A (Mắc nối tiếp)',
    displayedSymbol: 'I',
    rawValueText: '80 mA',
    readoutVi: 'I = 80 mA: Vi điều khiển logic tiêu thụ dòng nhỏ',
    numericValue: 80,
    unit: 'mA',
    isValidTarget: true,
    scientificNoteVi:
      'Mạch vi điện tử tiêu thụ dòng cỡ vài chục miliampe (mA). Đơn vị mA phù hợp cho phép đo vi dòng.',
    colorHex: 0x0369a1,
    accentHex: '#0284c7',
  },
];

interface CurrentMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  meterMesh: THREE.Mesh;
  wireCurve: THREE.Line;
}

export class M10CurrentController implements IMissionController {
  public readonly id: MissionId = 'M10_CURRENT';
  public readonly titleVi: string = 'M10 · CƯỜNG ĐỘ DÒNG ĐIỆN (I, A/mA)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: CurrentMeshNode[] = [];
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
      runId: `M10_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedSeriesWiring: false,
        calibratedThreeAmmeters: false,
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

    this.items = [];
    this.interactableMeshes = [];
    this.completedCount = 0;
    this.wrongAttempts = 0;
    this.exitGateOpen = false;
    this.evidence = this.createFreshEvidence();

    this.buildCurrentNodes();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'CƯỜNG ĐỘ DÒNG ĐIỆN (I, A/mA)',
      '0 / 3 AMPE KẾ ĐÃ HIỆU CHUẨN',
      'Mắc Ampe kế NỐI TIẾP vào mạch điện — Đo dòng I'
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

  private buildCurrentNodes() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M10_CURRENT_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.2, 1.2);

      // Substation plinth
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.85, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
      );
      plinth.position.y = 0.2;

      // Ammeter dial housing (circular cylinder)
      const meterMat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: 0.7,
        roughness: 0.2,
        emissive: spec.colorHex,
        emissiveIntensity: 0.25,
      });
      const meterMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.35, 24),
        meterMat
      );
      meterMesh.position.y = 0.7;

      // Wire connecting in series
      const wirePoints = [
        new THREE.Vector3(-0.9, 0.2, 0),
        new THREE.Vector3(-0.5, 0.6, 0),
        new THREE.Vector3(0.5, 0.6, 0),
        new THREE.Vector3(0.9, 0.2, 0),
      ];
      const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
      const wireMat = new THREE.LineBasicMaterial({
        color: spec.isValidTarget ? 0x38bdf8 : 0xef4444,
        linewidth: 3,
      });
      const wireCurve = new THREE.Line(wireGeo, wireMat);

      g.add(plinth, meterMesh, wireCurve);
      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(meterMesh);

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
        meterMesh,
        wireCurve,
      });
    });
  }

  private buildConsole() {
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

    ctx.fillStyle = '#051824';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#bae6fd';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#e0f2fe';
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

    // Light up wire
    (node.meterMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;

    onBonusCoinsAwarded?.(
      20,
      `Đã mắc chuẩn Ampe kế cho ${node.spec.titleVi}! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'CƯỜNG ĐỘ DÒNG ĐIỆN (I, A/mA)',
      `${this.completedCount} / 3 AMPE KẾ ĐÃ HIỆU CHUẨN`,
      `Dòng điện đo được: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.calibratedThreeAmmeters = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Mạch điện 3 nhánh đã thông suốt — Cổng Thành Phố Điện Mở! (+50 Xu)'
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
      checkpointId: 'CP0',
      objectiveTextVi: this.exitGateOpen
        ? 'Cổng phân phối điện đã mở! Lái JetBot tiến vào cổng.'
        : `Mắc nối tiếp 3 Ampe kế vào các nhánh để đo cường độ dòng điện I (${this.completedCount}/3 nhánh).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Rất chính xác! Ampe kế (ký hiệu A/mA) bắt buộc mắc nối tiếp vào đoạn mạch cần đo dòng điện.'
        : 'Cường độ dòng điện I có đơn vị là Ampe (A) hoặc miliampe (mA). Phân biệt: U = 24 V là Hiệu điện thế!',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'nhánh',
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
