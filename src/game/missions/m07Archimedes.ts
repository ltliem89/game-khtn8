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

export const M07_ARCH_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'ARCH_FLOAT',
    code: 'FA-FLOAT',
    titleVi: 'Phao Cứu Hộ Nổi Cân Bằng',
    rawLabelText: 'F_A = P = 40 N (Vật nổi cân bằng)',
    displayedSymbol: 'F_A',
    rawValueText: '40 N (Nổi cân bằng)',
    readoutVi: 'F_A = P = 40 N: Lực đẩy Archimedes cân bằng với trọng lượng',
    numericValue: 40,
    unit: 'N',
    isValidTarget: true,
    scientificNoteVi:
      'Khi vật nổi cân bằng trên mặt nước: Lực đẩy Archimedes có độ lớn bằng trọng lượng của vật (F_A = P).',
    colorHex: 0x2563eb,
    accentHex: '#60a5fa',
  },
  {
    id: 'ARCH_DYNAMO',
    code: 'FA-DYNAMO',
    titleVi: 'Quả Cầu Đo Bằng Lực Kế (P - F)',
    rawLabelText: 'P = 8 N, F = 5 N -> F_A = 3 N',
    displayedSymbol: 'F_A',
    rawValueText: '3 N (Đo bằng lực kế)',
    readoutVi: 'F_A = P - F = 8 - 5 = 3 N (Độ giảm số chỉ lực kế)',
    numericValue: 3,
    unit: 'N',
    isValidTarget: true,
    scientificNoteVi:
      'Xác định lực đẩy Archimedes bằng lực kế: F_A = P - F, trong đó P là trọng lượng ngoài không khí, F là số chỉ khi nhúng trong nước.',
    colorHex: 0x0284c7,
    accentHex: '#38bdf8',
  },
  {
    id: 'ARCH_DISTRACTOR',
    code: 'FA-DIST-D',
    titleVi: 'Mẫu Nước Cất (Nhãn Nhiễu Khối Lượng Riêng)',
    rawLabelText: 'D = 1000 kg/m³',
    displayedSymbol: 'D',
    rawValueText: '1000 kg/m³',
    readoutVi: 'CẢNH BÁO: Ký hiệu D là Khối lượng riêng (kg/m³)',
    numericValue: null,
    unit: 'kg/m³',
    isValidTarget: false,
    distractorReasonVi:
      'Ký hiệu D (đơn vị kg/m³) là Khối lượng riêng, KHÔNG phải Lực đẩy Archimedes F_A (lực đẩy, đơn vị Newton - N)!',
    scientificNoteVi:
      'Lực đẩy Archimedes F_A đo bằng Newton (N), công thức F_A = d . V, với d là trọng lượng riêng chất lỏng.',
    colorHex: 0xd97706,
    accentHex: '#fbbf24',
  },
  {
    id: 'ARCH_SUB',
    code: 'FA-SUB',
    titleVi: 'Thang Lặn Lơ Lửng Trong Nước',
    rawLabelText: 'F_A = P = 250 N (Vật lơ lửng)',
    displayedSymbol: 'F_A',
    rawValueText: '250 N (Lơ lửng)',
    readoutVi: 'F_A = P = 250 N (d_vật = d_chất lỏng)',
    numericValue: 250,
    unit: 'N',
    isValidTarget: true,
    scientificNoteVi:
      'Điều kiện vật lơ lửng trong lòng chất lỏng: Lực đẩy Archimedes cân bằng với trọng lượng P khi chìm hoàn toàn.',
    colorHex: 0x0ea5e9,
    accentHex: '#7dd3fc',
  },
  {
    id: 'ARCH_DISP',
    code: 'FA-DISP',
    titleVi: 'Khối Gỗ Chìm Theo Thể Tích (d . V)',
    rawLabelText: 'd = 10000 N/m³, V = 0,002 m³ -> F_A = 20 N',
    displayedSymbol: 'F_A',
    rawValueText: '20 N (F_A = d . V)',
    readoutVi: 'F_A = d . V = 10000 . 0,002 = 20 N',
    numericValue: 20,
    unit: 'N',
    isValidTarget: true,
    scientificNoteVi:
      'Công thức tính độ lớn lực đẩy Archimedes: F_A = d . V = 10000 . 0,002 = 20 N.',
    colorHex: 0x3b82f6,
    accentHex: '#93c5fd',
  },
];

interface ArchItemNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  mesh: THREE.Mesh;
}

export class M07ArchimedesController implements IMissionController {
  public readonly id: MissionId = 'M07_ARCHIMEDES';
  public readonly titleVi: string = 'M07 · LỰC ĐẨY ARCHIMEDES (F_A = d . V)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: ArchItemNode[] = [];
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
      runId: `M07_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedBuoyancyStates: false,
        calibratedThreeBuoys: false,
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

    this.buildBuoyancyBasin();
    this.buildArchimedesNodes();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'LỰC ĐẨY ARCHIMEDES (F_A = d . V)',
      '0 / 3 THIẾT BỊ NỔI ĐÃ HIỆU CHUẨN',
      'Xác thực điều kiện nổi, chìm và F_A = P - F'
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

  private buildBuoyancyBasin() {
    // Water basin testing dock
    const basinMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const basinFrame = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.5, 8),
      basinMat
    );
    basinFrame.position.set(0, 0.25, -5.5);
    this.rootGroup.add(basinFrame);

    const waterMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.6,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.52, -5.5);
    this.rootGroup.add(water);
  }

  private buildArchimedesNodes() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M07_ARCH_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.0, 1.0);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.8, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
      );
      plinth.position.y = 0.2;

      // Floating buoy shape (cylinder + sphere cap)
      const buoyMat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: 0.6,
        roughness: 0.3,
        emissive: spec.colorHex,
        emissiveIntensity: 0.3,
      });
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 1.0, 16),
        buoyMat
      );
      body.position.y = 0.9;

      const topCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        buoyMat
      );
      topCap.position.y = 1.4;

      g.add(plinth, body, topCap);
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

    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#60a5fa';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
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
      `Đã cân bằng ${node.spec.titleVi} (F_A = ${node.spec.rawValueText})! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'LỰC ĐẨY ARCHIMEDES (F_A = d . V)',
      `${this.completedCount} / 3 THIẾT BỊ NỔI ĐÃ HIỆU CHUẨN`,
      `Độ lớn F_A mới nhất: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.calibratedThreeBuoys = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Cân bằng lực đẩy Archimedes F_A = d . V thành công — Cổng Mở! (+50 Xu)'
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

    // Buoy bobbing in water animation
    this.items.forEach((item, idx) => {
      item.group.position.y = Math.sin(elapsed * 2.5 + idx * 1.2) * 0.08;
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
        ? 'Cổng bến thử Archimedes đã mở! Lái JetBot tiến vào cổng.'
        : `Hiệu chuẩn 3 phao nổi theo lực đẩy Archimedes F_A = d . V (${this.completedCount}/3 phao).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Xuất sắc! Lực đẩy Archimedes hướng thẳng đứng lên trên, có độ lớn bằng trọng lượng phần chất lỏng bị chiếm chỗ.'
        : 'Cân bằng F_A = d . V. Cảnh báo: D = 1000 kg/m³ là khối lượng riêng, không phải lực đẩy F_A!',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'phao',
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
