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
import { getDialScaleTexture, getBrushedMetalBumpTexture } from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const M08_MOMENT_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'MOM_CRANE',
    code: 'M-CRANE',
    titleVi: 'Cần Nâng Cẩu Xoay (M = F . d)',
    rawLabelText: 'F = 50 N, d = 2 m -> M = 100 N.m',
    displayedSymbol: 'M',
    rawValueText: '100 N.m (Moment lực)',
    readoutVi: 'M = F . d = 50 . 2 = 100 N.m: Tác dụng làm quay trục cần cẩu',
    numericValue: 100,
    unit: 'N.m',
    isValidTarget: true,
    scientificNoteVi:
      'Moment lực đặc trưng cho tác dụng làm quay của lực: M = F . d, với d là khoảng cách từ trục quay đến giá của lực (cánh tay đòn).',
    colorHex: 0xf97316,
    accentHex: '#fb923c',
  },
  {
    id: 'MOM_WRENCH',
    code: 'M-WRENCH',
    titleVi: 'Cờ Lê Tháo Bu-Lông Cán Dài',
    rawLabelText: 'F = 40 N, d = 0,25 m -> M = 10 N.m',
    displayedSymbol: 'M',
    rawValueText: '10 N.m',
    readoutVi: 'M = F . d = 40 . 0,25 = 10 N.m',
    numericValue: 10,
    unit: 'N.m',
    isValidTarget: true,
    scientificNoteVi:
      'Cán cờ lê càng dài (d lớn) thì moment lực càng lớn, giúp tháo ốc bu-lông dễ dàng mà không tốn nhiều lực F.',
    colorHex: 0xea580c,
    accentHex: '#f97316',
  },
  {
    id: 'MOM_DISTRACTOR',
    code: 'M-DIST-FORCE',
    titleVi: 'Lực Kéo Dây Cáp (Nhãn Nhiễu)',
    rawLabelText: 'F = 50 N (Lực kéo)',
    displayedSymbol: 'F',
    rawValueText: '50 N',
    readoutVi: 'CẢNH BÁO: Ký hiệu F là Lực (Newton - N)',
    numericValue: null,
    unit: 'N',
    isValidTarget: false,
    distractorReasonVi:
      'Ký hiệu F (đơn vị N) là độ lớn của Lực, KHÔNG phải Moment lực M (đơn vị N.m)!',
    scientificNoteVi:
      'Moment lực M = F . d có đơn vị là N.m (Newton nhân mét), biểu thị tác dụng làm quay.',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'MOM_DOOR',
    code: 'M-DOOR',
    titleVi: 'Tay Nắm Cánh Cửa Bản Lề',
    rawLabelText: 'F = 25 N, d = 0,8 m -> M = 20 N.m',
    displayedSymbol: 'M',
    rawValueText: '20 N.m',
    readoutVi: 'M = 25 . 0,8 = 20 N.m: Tay nắm đặt xa bản lề',
    numericValue: 20,
    unit: 'N.m',
    isValidTarget: true,
    scientificNoteVi:
      'Tay nắm cửa luôn được bố trí xa bản lề (trục quay) để tăng khoảng cách d, tạo moment lực lớn giúp mở cửa nhẹ nhàng.',
    colorHex: 0xf59e0b,
    accentHex: '#fde047',
  },
  {
    id: 'MOM_STEER',
    code: 'M-STEER',
    titleVi: 'Vô Lăng Lái Khảo Sát',
    rawLabelText: 'F = 30 N, d = 0,2 m -> M = 6 N.m',
    displayedSymbol: 'M',
    rawValueText: '6 N.m',
    readoutVi: 'M = 30 . 0,2 = 6 N.m',
    numericValue: 6,
    unit: 'N.m',
    isValidTarget: true,
    scientificNoteVi:
      'Vô lăng biến lực quay của tay thành moment lực quay trục lái xe JetBot.',
    colorHex: 0xd97706,
    accentHex: '#fbbf24',
  },
];

interface MomentMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  mesh: THREE.Mesh;
}

export class M08MomentController implements IMissionController {
  public readonly id: MissionId = 'M08_MOMENT';
  public readonly titleVi: string = 'M08 · MOMENT LỰC (M = F . d)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: MomentMeshNode[] = [];
  private interactableMeshes: THREE.Object3D[] = [];
  private rotatingCraneArm: THREE.Group | null = null;

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
      runId: `M08_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedTorqueRig: false,
        calibratedThreeMoments: false,
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

    this.buildCraneRig();
    this.buildMomentNodes();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'MOMENT LỰC (M = F . d)',
      '0 / 3 CƠ CẤU ĐÃ HIỆU CHUẨN',
      'Đo moment lực M (N.m) theo khoảng cách trục quay d'
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

  private buildCraneRig() {
    const craneTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 7.0, 16),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.25,
      })
    );
    craneTower.position.set(0, 3.5, -6.5);
    this.rootGroup.add(craneTower);

    // Rotating crane horizontal arm with counterweight & distance notches
    this.rotatingCraneArm = new THREE.Group();
    this.rotatingCraneArm.position.set(0, 7.0, -6.5);

    const boom = new THREE.Mesh(
      new THREE.BoxGeometry(11.0, 0.4, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    boom.position.set(2.5, 0, 0);

    // Heavy counterweight on back arm
    const counterweight = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85 })
    );
    counterweight.position.set(-2.4, 0, 0);

    // Distance graduation marks on boom
    for (let x = 0; x <= 7.0; x += 1.5) {
      const mark = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      mark.position.set(x, 0, 0.25);
      this.rotatingCraneArm.add(mark);
    }

    this.rotatingCraneArm.add(boom, counterweight);
    this.rootGroup.add(this.rotatingCraneArm);
  }

  private buildMomentNodes() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M08_MOMENT_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.1, 1.1);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.85, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
      );
      plinth.position.y = 0.2;

      // Pivot gear hub with central ball bearing
      const gearMat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: 0.85,
        roughness: 0.2,
        emissive: spec.colorHex,
        emissiveIntensity: 0.25,
      });
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.35, 20),
        gearMat
      );
      body.position.y = 0.65;

      // Calibrated torque arm with distance notches
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 1.6),
        gearMat
      );
      arm.position.set(0, 0.85, 0);

      // Calibrated Torque Indicator Dial Face (M = F . d)
      const dialTex = getDialScaleTexture('MÔMEN LỰC', 'M', 0, 100, 'N.m');
      const dial = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65, 0.65),
        new THREE.MeshBasicMaterial({ map: dialTex })
      );
      dial.rotation.x = -Math.PI / 2;
      dial.position.set(0, 0.85, 0);

      g.add(plinth, body, arm, dial);
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

    ctx.fillStyle = '#1c0f05';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#fb923c';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#fed7aa';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
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

    onBonusCoinsAwarded?.(
      20,
      `Đã hiệu chỉnh ${node.spec.titleVi} (M = ${node.spec.rawValueText})! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'MOMENT LỰC (M = F . d)',
      `${this.completedCount} / 3 CƠ CẤU ĐÃ HIỆU CHUẨN`,
      `Moment mới nhất: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.calibratedThreeMoments = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Cân bằng moment lực M = F . d hoàn tất — Cổng Cơ Khí Mở! (+50 Xu)'
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

    // Rotate crane arm
    if (this.rotatingCraneArm) {
      this.rotatingCraneArm.rotation.y = Math.sin(elapsed * 0.8) * 0.65;
    }

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
        ? 'Cổng xưởng cơ khí đã mở! Lái JetBot tiến vào cổng.'
        : `Hiệu chuẩn 3 cơ cấu có trục quay theo moment lực M = F . d (${this.completedCount}/3 cơ cấu).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Xuất sắc! Cánh tay đòn d càng dài thì tác dụng làm quay của lực (M) càng lớn.'
        : 'Tính M = F . d (đơn vị N.m). Cảnh báo: F = 50 N là Lực kéo, không phải Moment lực M!',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'cơ cấu',
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
