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
import { createFulcrumLeverApparatus } from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const M09_LEVER_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'LEV_ROCK',
    code: 'LEV-ROCK-CLEAR',
    titleVi: 'Đòn Bẩy Nâng Đá Tảng (OO1 > OO2)',
    rawLabelText: 'OO1 = 3 m, OO2 = 1 m -> F1 < P (Lợi về lực)',
    displayedSymbol: 'O',
    rawValueText: 'OO1/OO2 = 3 (Lợi 3 lần lực)',
    readoutVi: 'OO1 > OO2 (3 m > 1 m): Lực tác dụng F1 = P/3 < P',
    numericValue: 3,
    unit: 'm',
    isValidTarget: true,
    scientificNoteVi:
      'Khi khoảng cách từ điểm tựa O đến điểm tác dụng lực F1 (OO1) lớn hơn khoảng cách đến điểm đặt vật (OO2), lực nâng cần tác dụng nhỏ hơn trọng lượng vật (F1 < P).',
    colorHex: 0xf59e0b,
    accentHex: '#fbbf24',
  },
  {
    id: 'LEV_DOOR',
    code: 'LEV-COUNTERWEIGHT',
    titleVi: 'Cơ Cấu Cửa Đối Trọng Nâng',
    rawLabelText: 'OO1 = 2,5 m, OO2 = 0,5 m -> F1 = P/5',
    displayedSymbol: 'O',
    rawValueText: 'OO1/OO2 = 5 (Lợi 5 lần lực)',
    readoutVi: 'OO1 > OO2: Lợi 5 lần về lực để nhấc cửa thép nặng',
    numericValue: 5,
    unit: 'm',
    isValidTarget: true,
    scientificNoteVi:
      'Điểm tựa O được đặt lệch gần về phía cửa nặng (OO2 nhỏ), giúp nhánh tác dụng lực OO1 dài ra, giảm lực cần đẩy.',
    colorHex: 0xd97706,
    accentHex: '#f59e0b',
  },
  {
    id: 'LEV_DISTRACTOR',
    code: 'LEV-DIST-DISADVANTAGE',
    titleVi: 'Khớp Bẩy Sai Vị Trí (Thiệt Về Lực)',
    rawLabelText: 'OO1 = 0,5 m, OO2 = 2,5 m -> OO1 < OO2',
    displayedSymbol: 'F',
    rawValueText: 'OO1 < OO2 (F1 > P: Thiệt về lực)',
    readoutVi: 'CẢNH BÁO: OO1 < OO2 làm lực kéo lớn hơn trọng lượng vật!',
    numericValue: null,
    unit: 'm',
    isValidTarget: false,
    distractorReasonVi:
      'Điểm tựa O bố trí sai: OO1 < OO2 khiến lực nâng F1 > P (bị thiệt về lực), không thể nhấc được chướng ngại vật nặng!',
    scientificNoteVi:
      'Để bẩy vật nặng với lực F1 < P, bắt buộc phải chọn điểm tựa O sao cho OO1 > OO2.',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'LEV_PLIERS',
    code: 'LEV-PLIERS',
    titleVi: 'Kìm Cắt Cáp Cơ Khí (Đòn bẩy loại 1)',
    rawLabelText: 'OO1 = 15 cm, OO2 = 3 cm -> Cắt kim loại',
    displayedSymbol: 'O',
    rawValueText: 'OO1/OO2 = 5',
    readoutVi: 'OO1 > OO2: Cán kìm dài tạo lực bấm cực đại tại mũi kìm',
    numericValue: 5,
    unit: 'cm',
    isValidTarget: true,
    scientificNoteVi:
      'Kìm cắt kim loại ứng dụng đòn bẩy có trục quay O giữa cán cầm (O1) và lưỡi cắt (O2), tay cầm dài giúp cắt vật cứng dễ dàng.',
    colorHex: 0x10b981,
    accentHex: '#34d399',
  },
  {
    id: 'LEV_CROWBAR',
    code: 'LEV-CROWBAR',
    titleVi: 'Xà Bén Nạy Chốt Khóa',
    rawLabelText: 'OO1 = 80 cm, OO2 = 10 cm -> Nạy nắp hầm',
    displayedSymbol: 'O',
    rawValueText: 'OO1/OO2 = 8',
    readoutVi: 'OO1 > OO2 (80 cm > 10 cm): Lợi 8 lần lực nạy',
    numericValue: 8,
    unit: 'cm',
    isValidTarget: true,
    scientificNoteVi:
      'Xà bén có cánh tay đòn OO1 gấp 8 lần OO2, cho phép JetBot nạy nắp hầm với lực tác dụng nhỏ.',
    colorHex: 0x3b82f6,
    accentHex: '#60a5fa',
  },
];

interface LeverMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  leverBar: THREE.Mesh;
  fulcrum: THREE.Mesh;
  loadBox: THREE.Mesh;
}

export class M09LeverController implements IMissionController {
  public readonly id: MissionId = 'M09_LEVER';
  public readonly titleVi: string = 'M09 · ĐÒN BẨY & ĐIỂM TỰA O';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: LeverMeshNode[] = [];
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
      runId: `M09_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedFulcrumPositions: false,
        configuredThreeLevers: false,
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

    this.buildLeverLabyrinthLayout();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'ĐÒN BẨY & ĐIỂM TỰA O',
      '0 / 3 ĐÒN BẨY ĐÃ KÍCH HOẠT',
      'Chọn điểm tựa O sao cho OO1 > OO2 (Lợi về lực)'
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

  private buildLeverLabyrinthLayout() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M09_LEVER_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.4, 1.4);

      // Realistic Knife-Edge Fulcrum Lever Apparatus
      const { group: leverRig, leverBeam, fulcrumPrism, loadRock } = createFulcrumLeverApparatus();
      leverRig.scale.set(0.6, 0.6, 0.6);
      g.add(leverRig);

      const leverBar = leverBeam.children[0] as THREE.Mesh;

      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(leverBar);

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
        leverBar,
        fulcrum: fulcrumPrism,
        loadBox: loadRock,
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

    ctx.fillStyle = '#1c1505';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#fef08a';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#fed7aa';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
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

    // Tilt lever to show mechanical advantage lift
    node.leverBar.rotation.z = -0.25;
    node.loadBox.position.y = 1.35;

    onBonusCoinsAwarded?.(
      20,
      `Đã lắp chuẩn đòn bẩy ${node.spec.titleVi}! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'ĐÒN BẨY & ĐIỂM TỰA O',
      `${this.completedCount} / 3 ĐÒN BẨY ĐÃ KÍCH HOẠT`,
      `Khớp bẩy: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.configuredThreeLevers = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Cả 3 đòn bẩy đã mở thông đường ray — Cổng Mê Cung Đã Mở! (+50 Xu)'
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
        ? 'Cổng đòn bẩy đã mở! Lái JetBot tiến vào cổng thoát.'
        : `Lắp đặt và kích hoạt 3 đòn bẩy có lợi về lực OO1 > OO2 (${this.completedCount}/3).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Tuyệt vời! Khi OO1 > OO2, lực tác dụng F1 < P giúp nâng vật nặng dễ dàng.'
        : 'Quan sát điểm tựa O: chọn cấu hình có OO1 > OO2 để có lợi về lực. Tránh OO1 < OO2 gây thiệt về lực!',
      orbitSpeaker: 'ORBIT',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'đòn bẩy',
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
