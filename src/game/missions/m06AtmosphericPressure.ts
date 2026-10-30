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

export const M06_ATM_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'ATM_TORRICELLI',
    code: 'ATM-TORR',
    titleVi: 'Ống Thủy Ngân Torricelli (760 mmHg)',
    rawLabelText: 'h = 760 mmHg -> p0 ≈ 103360 Pa',
    displayedSymbol: 'p0',
    rawValueText: '760 mmHg (103,36 kPa)',
    readoutVi: 'p0 = 103360 Pa (chuẩn khí áp mực nước biển)',
    numericValue: 103360,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Thí nghiệm Torricelli: Áp suất khí quyển tương đương áp suất của cột thủy ngân cao 760 mm (760 mmHg ≈ 103360 Pa).',
    colorHex: 0x38bdf8,
    accentHex: '#7dd3fc',
  },
  {
    id: 'ATM_SUCTION',
    code: 'ATM-SUCT',
    titleVi: 'Giác Mút Chân Không Bám Kính',
    rawLabelText: 'Chênh lệch áp suất khí quyển ép dính mặt phẳng',
    displayedSymbol: 'p0',
    rawValueText: '101325 Pa (Bám dính)',
    readoutVi: 'Áp suất khí quyển bên ngoài ép chặt giác mút',
    numericValue: 101325,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Ứng dụng áp suất khí quyển: Khi hút hết không khí bên trong, áp suất khí quyển bên ngoài ép giác mút dính chặt vào tường.',
    colorHex: 0x0ea5e9,
    accentHex: '#38bdf8',
  },
  {
    id: 'ATM_DISTRACTOR',
    code: 'ATM-DIST',
    titleVi: 'Lực Kéo Cửa Buồng (Nhãn Nhiễu)',
    rawLabelText: 'P = 100 N (Trọng lượng)',
    displayedSymbol: 'P',
    rawValueText: '100 N',
    readoutVi: 'CẢNH BÁO: Ký hiệu P là Trọng lượng (N)',
    numericValue: null,
    unit: 'N',
    isValidTarget: false,
    distractorReasonVi:
      'Ký hiệu P (đơn vị N) là Trọng lượng, KHÔNG phải Áp suất khí quyển p0 (đo bằng Pa hoặc mmHg)!',
    scientificNoteVi:
      'Trọng lượng P đo bằng N; Áp suất khí quyển p0 đo bằng Pa, mmHg hoặc atm.',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'ATM_AIRLOCK',
    code: 'ATM-LOCK',
    titleVi: 'Van Điều Áp Buồng Airlock',
    rawLabelText: 'Cân bằng khí áp buồng đệm p0 = 100 kPa',
    displayedSymbol: 'p0',
    rawValueText: '100 kPa (100000 Pa)',
    readoutVi: 'Cân bằng áp suất 100 kPa trước khi mở cổng',
    numericValue: 100000,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Cân bằng khí áp bên trong và ngoài buồng đệm airlock giúp mở cửa an toàn mà không bị gió lốc cuốn.',
    colorHex: 0x10b981,
    accentHex: '#34d399',
  },
  {
    id: 'ATM_BARO',
    code: 'ATM-BARO',
    titleVi: 'Khí Áp Kế Kim Loại Màng Xếp',
    rawLabelText: 'Đo trực tiếp khí áp: 1013 hPa',
    displayedSymbol: 'p0',
    rawValueText: '1013 hPa (101300 Pa)',
    readoutVi: 'Khí áp kế màng xếp: 101300 Pa',
    numericValue: 101300,
    unit: 'Pa',
    isValidTarget: true,
    scientificNoteVi:
      'Khí áp kế kim loại đo trực tiếp áp suất khí quyển mà không cần dùng thủy ngân độc hại.',
    colorHex: 0x6366f1,
    accentHex: '#818cf8',
  },
];

interface AtmItemNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  mesh: THREE.Mesh;
}

export class M06AtmosphericPressureController implements IMissionController {
  public readonly id: MissionId = 'M06_ATMOSPHERIC_PRESSURE';
  public readonly titleVi: string = 'M06 · ÁP SUẤT KHÍ QUYỂN & BUỒNG ĐỆM KHÍ';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: AtmItemNode[] = [];
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
      runId: `M06_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedBarometer: false,
        equalizedAirlockPressure: false,
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

    this.buildAirlockTower();
    this.buildAtmosphericNodes();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'ÁP SUẤT KHÍ QUYỂN (p0 ≈ 103360 Pa)',
      '0 / 3 THIẾT BỊ ĐÃ KHÓA',
      'Kiểm định ống Torricelli & giác mút để cân bằng buồng đệm'
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

  private buildAirlockTower() {
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const colLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 8.0, 16),
      towerMat
    );
    colLeft.position.set(-6.5, 4.0, -5.5);
    const colRight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 8.0, 16),
      towerMat
    );
    colRight.position.set(6.5, 4.0, -5.5);
    this.rootGroup.add(colLeft, colRight);

    // High barometer glass cylinder
    const mercuryMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.1,
    });
    const baroCol = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 5.0, 16),
      mercuryMat
    );
    baroCol.position.set(0, 4.0, -7.0);
    this.rootGroup.add(baroCol);
  }

  private buildAtmosphericNodes() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M06_ATM_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.0, 1.0);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.8, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
      );
      plinth.position.y = 0.2;

      const bodyMat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: 0.7,
        roughness: 0.3,
        emissive: spec.colorHex,
        emissiveIntensity: 0.25,
      });
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.45, 1.4, 16),
        bodyMat
      );
      body.position.y = 1.1;

      g.add(plinth, body);
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

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#38bdf8';
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
      `Đã cân bằng ${node.spec.titleVi} (${node.spec.rawValueText})! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'ÁP SUẤT KHÍ QUYỂN (p0 ≈ 103360 Pa)',
      `${this.completedCount} / 3 THIẾT BỊ ĐÃ KHÓA`,
      `Khí áp mới nhất: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.equalizedAirlockPressure = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Cân bằng khí áp buồng đệm hoàn tất — Cổng Airlock Mở! (+50 Xu)'
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
        ? 'Cổng buồng đệm airlock đã mở! Lái JetBot tiến vào cổng.'
        : `Kiểm tra thiết bị áp suất khí quyển p0 để cân bằng áp suất buồng đệm (${this.completedCount}/3).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Xuất sắc! Áp suất khí quyển tác dụng theo mọi phương và tương đương cột thủy ngân 760 mmHg.'
        : 'Cân bằng khí áp p0 ≈ 103360 Pa. Cảnh báo: P = 100 N là Trọng lượng, không phải Áp suất khí quyển!',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'thiết bị',
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
