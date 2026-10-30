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
import { createAnalogueLabMeter } from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const M11_VOLTAGE_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'VOLT_12V',
    code: 'VOLT-BATTERY-12V',
    titleVi: 'Cổng Ắc-Quy Xe (U = 12 V - Mắc song song)',
    rawLabelText: 'U = 12 V (Vôn kế mắc song song)',
    displayedSymbol: 'U',
    rawValueText: '12 V (12000 mV)',
    readoutVi: 'U = 12 V: Đo hiệu điện thế giữa hai cực ắc-quy',
    numericValue: 12,
    unit: 'V',
    isValidTarget: true,
    scientificNoteVi:
      'Hiệu điện thế ký hiệu là U, đơn vị là vôn (V). Muốn đo hiệu điện thế giữa hai đầu thiết bị, phải mắc Vôn kế song song với thiết bị đó.',
    colorHex: 0x8b5cf6,
    accentHex: '#a78bfa',
  },
  {
    id: 'VOLT_220V',
    code: 'VOLT-GRID-220V',
    titleVi: 'Cổng Lưới Điện Phân Phối (U = 220 V)',
    rawLabelText: 'U = 220 V = 0,22 kV (Mắc song song)',
    displayedSymbol: 'U',
    rawValueText: '220 V',
    readoutVi: 'U = 220 V: Hiệu điện thế định mức lưới điện sinh hoạt',
    numericValue: 220,
    unit: 'V',
    isValidTarget: true,
    scientificNoteVi:
      '1 kV = 1000 V. Vôn kế mắc song song vào hai chốt pha và trung tính để kiểm tra điện áp 220 V.',
    colorHex: 0x7c3aed,
    accentHex: '#8b5cf6',
  },
  {
    id: 'VOLT_DISTRACTOR',
    code: 'VOLT-DIST-CURRENT',
    titleVi: 'Cường Độ Dòng Tải (Nhãn Nhiễu)',
    rawLabelText: 'I = 5 A (Cường độ dòng điện)',
    displayedSymbol: 'I',
    rawValueText: '5 A (Ampe)',
    readoutVi: 'CẢNH BÁO: Ký hiệu I là Cường độ dòng điện, đơn vị là Ampe (A)!',
    numericValue: null,
    unit: 'A',
    isValidTarget: false,
    distractorReasonVi:
      'Đại lượng I (đơn vị A) là Cường độ dòng điện, KHÔNG phải Hiệu điện thế U (đơn vị V)! Không được nhầm lẫn giữa U và I.',
    scientificNoteVi:
      'Hiệu điện thế U đo bằng Vôn kế mắc song song. Cường độ dòng điện I đo bằng Ampe kế mắc nối tiếp.',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'VOLT_5V',
    code: 'VOLT-LOGIC-5V',
    titleVi: 'Cổng Mạch Logic Cảm Biến (U = 5 V)',
    rawLabelText: 'U = 5 V = 5000 mV (Mắc song song)',
    displayedSymbol: 'U',
    rawValueText: '5 V',
    readoutVi: 'U = 5 V: Điện áp cấp cho chip xử lý',
    numericValue: 5,
    unit: 'V',
    isValidTarget: true,
    scientificNoteVi:
      'Mạch điện tử thường dùng hiệu điện thế an toàn 5 V hoặc 3,3 V. Vôn kế điện tử có trở kháng rất lớn khi mắc song song.',
    colorHex: 0x6d28d9,
    accentHex: '#8b5cf6',
  },
  {
    id: 'VOLT_1KV',
    code: 'VOLT-SUBSTATION-1KV',
    titleVi: 'Trạm Biến Áp Cao Thế (U = 1 kV)',
    rawLabelText: 'U = 1 kV = 1000 V (Mắc song song)',
    displayedSymbol: 'U',
    rawValueText: '1000 V',
    readoutVi: 'U = 1 kV = 1000 V: Điện áp cao thế trạm trung chuyển',
    numericValue: 1000,
    unit: 'V',
    isValidTarget: true,
    scientificNoteVi:
      '1 kV = 1000 V. Thang đo của Vôn kế cần chọn phù hợp với giá trị hiệu điện thế cần đo để kim không vọt quá thang.',
    colorHex: 0x5b21b6,
    accentHex: '#7c3aed',
  },
];

interface VoltageMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  voltmeterMesh: THREE.Mesh;
  parallelLeads: THREE.Line;
}

export class M11VoltageController implements IMissionController {
  public readonly id: MissionId = 'M11_VOLTAGE';
  public readonly titleVi: string = 'M11 · HIỆU ĐIỆN THẾ (U, V/mV/kV)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: VoltageMeshNode[] = [];
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
      runId: `M11_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedParallelWiring: false,
        calibratedThreeVoltmeters: false,
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

    this.buildVoltageNodes();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'HIỆU ĐIỆN THẾ (U, V/mV/kV)',
      '0 / 3 VÔN KẾ ĐÃ HIỆU CHUẨN',
      'Mắc Vôn kế SONG SONG qua 2 điểm cần đo — Đo U (V)'
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

  private buildVoltageNodes() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M11_VOLTAGE_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.2, 1.2);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.85, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
      );
      plinth.position.y = 0.175;

      // Authentic Laboratory Voltmeter Apparatus
      const isAmmeterDistractor = !spec.isValidTarget;
      const { group: meterRig, setReadingValue } = createAnalogueLabMeter(
        isAmmeterDistractor ? 'ammeter' : 'voltmeter'
      );
      meterRig.scale.set(0.65, 0.65, 0.65);
      meterRig.position.y = 0.35;

      const readingVal = spec.numericValue || 3.0;
      setReadingValue(readingVal, isAmmeterDistractor ? 3.0 : 15.0);

      const voltmeterMesh = meterRig.children[0] as THREE.Mesh;

      // Parallel test leads bridging side by side
      const leadPoints = [
        new THREE.Vector3(-0.6, 0.3, 0.3),
        new THREE.Vector3(-0.35, 0.8, 0.3),
        new THREE.Vector3(0.35, 0.8, 0.3),
        new THREE.Vector3(0.6, 0.3, 0.3),
      ];
      const leadGeo = new THREE.BufferGeometry().setFromPoints(leadPoints);
      const leadMat = new THREE.LineBasicMaterial({
        color: spec.isValidTarget ? 0xa78bfa : 0xef4444,
        linewidth: 3,
      });
      const parallelLeads = new THREE.Line(leadGeo, leadMat);

      g.add(plinth, meterRig, parallelLeads);
      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(voltmeterMesh);

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
        voltmeterMesh,
        parallelLeads,
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

    ctx.fillStyle = '#110c22';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#c4b5fd';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#ede9fe';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#ddd6fe';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
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

    (node.voltmeterMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;

    onBonusCoinsAwarded?.(
      20,
      `Đã mắc chuẩn Vôn kế cho ${node.spec.titleVi}! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'HIỆU ĐIỆN THẾ (U, V/mV/kV)',
      `${this.completedCount} / 3 VÔN KẾ ĐÃ HIỆU CHUẨN`,
      `Hiệu điện thế đo được: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.calibratedThreeVoltmeters = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Cả 3 cổng điện áp đã chuẩn hóa song song — Cổng Điện Thoát Đã Mở! (+50 Xu)'
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
        ? 'Cổng điện áp đã mở! Lái JetBot tiến vào cổng.'
        : `Mắc song song 3 Vôn kế vào các cổng để đo hiệu điện thế U (${this.completedCount}/3 cổng).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Chính xác! Vôn kế (ký hiệu V) phải mắc song song với đoạn mạch cần đo hiệu điện thế.'
        : 'Hiệu điện thế ký hiệu U, đơn vị là Vôn (V). Tránh nhầm với Cường độ dòng điện I (Ampe) và Thể tích V (mL/lít)!',
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
