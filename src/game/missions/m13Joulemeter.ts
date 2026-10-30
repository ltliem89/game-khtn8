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

export const M13_JOULEMETER_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'JOULE_WATER_500J',
    code: 'JOULE-CALORIMETER-WATER',
    titleVi: 'Nhiệt Lượng Kế Nước (Q = 500 J)',
    rawLabelText: 'Q = 500 J (Nhiệt lượng đo bằng Joulemeter)',
    displayedSymbol: 'J',
    rawValueText: '500 J',
    readoutVi: 'Q = 500 J: Năng lượng nhiệt cung cấp làm tăng nhiệt độ nước',
    numericValue: 500,
    unit: 'J',
    isValidTarget: true,
    scientificNoteVi:
      'Joulemeter đo trực tiếp năng lượng nhiệt (hoặc điện năng tiêu thụ chuyển thành nhiệt) với đơn vị đo là Jun (J) hoặc kilojun (kJ).',
    colorHex: 0x10b981,
    accentHex: '#34d399',
  },
  {
    id: 'JOULE_ALUMINUM_2KJ',
    code: 'JOULE-METAL-BLOCK-2KJ',
    titleVi: 'Khối Nhôm Gia Nhiệt (Q = 2,4 kJ)',
    rawLabelText: 'Q = 2,4 kJ = 2400 J (Joulemeter)',
    displayedSymbol: 'J',
    rawValueText: '2,4 kJ (2400 J)',
    readoutVi: 'Q = 2,4 kJ: Đầu dò nhiệt lượng ghi nhận 2400 Jun',
    numericValue: 2400,
    unit: 'J',
    isValidTarget: true,
    scientificNoteVi:
      '1 kJ = 1000 J. Joulemeter kỹ thuật số hiển thị số chỉ Jun tăng dần theo thời gian cấp nhiệt: Q = P . t.',
    colorHex: 0x059669,
    accentHex: '#10b981',
  },
  {
    id: 'JOULE_DISTRACTOR',
    code: 'JOULE-DIST-POWER',
    titleVi: 'Công Suất Dây Nung (Nhãn Nhiễu)',
    rawLabelText: 'P = 100 W (Công suất điện)',
    displayedSymbol: 'W',
    rawValueText: '100 W (Oát)',
    readoutVi: 'CẢNH BÁO: Ký hiệu W là Oát (Công suất), KHÔNG phải Jun (Nhiệt lượng)!',
    numericValue: null,
    unit: 'W',
    isValidTarget: false,
    distractorReasonVi:
      'Đại lượng P (đơn vị W) là Công suất, KHÔNG phải Năng lượng nhiệt Q (đơn vị J)! Để tính nhiệt lượng phải nhân công suất với thời gian: Q = P . t.',
    scientificNoteVi:
      'Oát (W = J/s) là tốc độ thực hiện công hoặc tiêu thụ năng lượng. Đơn vị nhiệt lượng đo trên Joulemeter là Jun (J).',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'JOULE_OIL_SAMPLE',
    code: 'JOULE-COOLANT-OIL',
    titleVi: 'Mẫu Dầu Làm Mát Động Cơ (Q = 1200 J)',
    rawLabelText: 'Q = 1200 J = 1,2 kJ (Đo Joulemeter)',
    displayedSymbol: 'J',
    rawValueText: '1200 J',
    readoutVi: 'Q = 1200 J: Dầu hấp thụ nhiệt ổn định từ điện trở nhiệt',
    numericValue: 1200,
    unit: 'J',
    isValidTarget: true,
    scientificNoteVi:
      'Mỗi chất lỏng hấp thụ nhiệt lượng Q khác nhau tùy theo nhiệt dung riêng: Q = m . c . Delta t.',
    colorHex: 0x047857,
    accentHex: '#059669',
  },
  {
    id: 'JOULE_BATTERY_CELL',
    code: 'JOULE-BATTERY-HEAT',
    titleVi: 'Nhiệt Thất Thoát Pin (Q = 850 J)',
    rawLabelText: 'Q = 850 J (Nhiệt Joule tỏa ra)',
    displayedSymbol: 'J',
    rawValueText: '850 J',
    readoutVi: 'Q = 850 J: Cảm biến đo nhiệt lượng Joule tỏa trên nội trở',
    numericValue: 850,
    unit: 'J',
    isValidTarget: true,
    scientificNoteVi:
      'Nhiệt lượng tỏa ra trên vật dẫn khi có dòng điện chạy qua tuân theo định luật Joule: Q = I^2 . R . t.',
    colorHex: 0x065f46,
    accentHex: '#047857',
  },
];

interface JoulemeterMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  flaskMesh: THREE.Mesh;
  probeMesh: THREE.Mesh;
}

export class M13JoulemeterController implements IMissionController {
  public readonly id: MissionId = 'M13_JOULEMETER';
  public readonly titleVi: string = 'M13 · ĐO NĂNG LƯỢNG NHIỆT (JOULEMETER, J)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: JoulemeterMeshNode[] = [];
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
      runId: `M13_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedLabProbes: false,
        measuredThreeSamples: false,
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

    this.buildJoulemeterNodes();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'PHÒNG THÍ NGHIỆM JOULEMETER',
      '0 / 3 MẪU ĐÃ ĐO NHIỆT LƯỢNG',
      'Đo năng lượng nhiệt Q bằng Joulemeter (đơn vị Jun - J)'
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

  private buildJoulemeterNodes() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M13_JOULEMETER_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.2, 1.2);

      const tableBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.85, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
      );
      tableBase.position.y = 0.2;

      // Calorimeter flask (insulated cup)
      const flaskMat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: 0.8,
        roughness: 0.2,
        emissive: spec.colorHex,
        emissiveIntensity: 0.25,
      });
      const flaskMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.45, 0.9, 16),
        flaskMat
      );
      flaskMesh.position.y = 0.75;

      // Joulemeter sensor probe dipped into flask
      const probeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.9 })
      );
      probeMesh.position.set(0.15, 1.1, 0);
      probeMesh.rotation.z = -0.15;

      g.add(tableBase, flaskMesh, probeMesh);
      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(flaskMesh);

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
        flaskMesh,
        probeMesh,
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

    ctx.fillStyle = '#062016';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#6ee7b7';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#d1fae5';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
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

    (node.flaskMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;

    onBonusCoinsAwarded?.(
      20,
      `Đã đo chính xác nhiệt lượng mẫu ${node.spec.titleVi}! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'PHÒNG THÍ NGHIỆM JOULEMETER',
      `${this.completedCount} / 3 MẪU ĐÃ ĐO NHIỆT LƯỢNG`,
      `Nhiệt lượng: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.measuredThreeSamples = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Hiệu chuẩn phép đo Joulemeter hoàn tất — Cổng Phòng Thí Nghiệm Mở! (+50 Xu)'
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
        ? 'Cổng phòng lab đã mở! Lái JetBot tiến vào cổng.'
        : `Lắp cảm biến Joulemeter đo nhiệt lượng Q theo đơn vị Jun (J) (${this.completedCount}/3 mẫu).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Rất chuẩn xác! Joulemeter ghi nhận nhiệt lượng Q truyền vào chất lỏng với đơn vị là Jun (J).'
        : 'Joulemeter đo nhiệt lượng theo đơn vị Jun (J). Lưu ý: P = 100 W là Công suất, không phải nhiệt lượng!',
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
