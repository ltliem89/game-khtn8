import * as THREE from 'three';
import {
  CameraViewMode,
  CargoCrateRuntimeState,
  CargoCrateSpec,
  DifficultyLayer,
  M01_CARGO_CRATE_SPECS,
  M01HudSnapshot,
  M01MissionPhase,
  M01RunEvidence,
  PerformanceTier,
} from '../../types/missionSpec';
import { createRadialShadowTexture } from '../track/proceduralModels';
import { soundEngine } from '../audio/soundEngine';

// Pre-allocated scratch math objects (Zero GC inside requestAnimationFrame)
const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _projVec = new THREE.Vector3();
const _worldScratchA = new THREE.Vector3();
const _worldScratchB = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _targetLerpVec = new THREE.Vector3();

interface CrateMeshNode {
  spec: CargoCrateSpec;
  state: CargoCrateRuntimeState;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  outlineMesh: THREE.Mesh;
  pulseRingMesh: THREE.Mesh;
  beaconLightMesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  conveyorSlotIndex: number;
  squashTimer: number;
  hitFlashTimer: number;
}

interface OverheadCraneHazard {
  group: THREE.Group;
  carriageGroup: THREE.Group;
  telegraphRing: THREE.Mesh;
  centerPos: THREE.Vector3;
  cycleOffset: number;
  isDangerDown: boolean;
  warnedThisCycle: boolean;
}

interface PooledPulseBurst {
  mesh: THREE.Mesh;
  active: boolean;
  age: number;
  maxAge: number;
}

export class M01MassVaultController {
  public readonly rootGroup = new THREE.Group();
  private stationCenter = new THREE.Vector3(0, 0, 44);
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;
  private bumpTex: THREE.CanvasTexture | null = null;

  private crates: CrateMeshNode[] = [];
  private interactableMeshes: THREE.Object3D[] = [];
  private craneHazards: OverheadCraneHazard[] = [];
  private conveyorSlats: THREE.Mesh[] = [];
  private conveyorRollers: THREE.Mesh[] = [];
  private pulseBursts: PooledPulseBurst[] = [];

  private scaleCanvas: HTMLCanvasElement | null = null;
  private scaleTexture: THREE.CanvasTexture | null = null;
  private lastScaleText = '';

  private shortcutGateLeft: THREE.Group | null = null;
  private shortcutGateRight: THREE.Group | null = null;
  private exitGateLeft: THREE.Group | null = null;
  private exitGateRight: THREE.Group | null = null;
  private exitBeaconMat: THREE.MeshStandardMaterial | null = null;
  private holoCrateMesh: THREE.Group | null = null;

  private active = true;
  private missionPhase: M01MissionPhase = 'playing';
  private cameraMode: CameraViewMode = 'chase';
  private difficulty: DifficultyLayer = 'ROOKIE';
  private performanceTier: PerformanceTier = 'HIGH';
  private currentFps = 60;

  private checkpointId: 'CP0' | 'CP1' | 'CP2' | 'EXIT' = 'CP0';
  private objectiveTextVi =
    'Lái JetBot qua Khu Phân Luồng A/B/C để tiến vào Khoang Quét Cân Điện Tử (CP1).';
  private orbitMessageVi =
    'Chào mừng tới M01 — KHO LƯU TRỮ KHỐI LƯỢNG! Hãy tránh cần cẩu hạ thùng hàng (vòng cảnh báo cam 2 giây) và tiến vào vùng quét xanh.';
  private orbitSpeaker: 'ORBIT' | 'Dr. Linh' | 'Hệ thống Cân NOVA-8' = 'ORBIT';
  private feedbackTone: 'info' | 'success' | 'warning' | 'error' = 'info';

  private inScannerZone = false;
  private conveyorWindowOpen = true;
  private conveyorCycleProgress = 0;
  private loadedMassKg = 0;
  private readonly targetMassKg = 15.0;
  private loadedCratesCount = 0;
  private readonly requiredCratesCount = 3;
  private wrongAttempts = 0;
  private readonly maxWrongAttempts = 3;
  private remainingTimeSeconds = 210;
  private shortcutUnlocked = false;
  private holoCrateCollected = false;
  private exitGateOpen = false;
  private aimedCrateId: string | null = null;
  private reticleX = 0;
  private reticleY = 0;
  private tieredHintVi: string | null = null;
  private collisionPenaltyCooldown = 0;

  // Game feel callbacks (hitstop + decaying camera shake)
  private pendingImpactCallback:
    | ((hitstopSec: number, shakeIntensity: number) => void)
    | null = null;

  private evidence: M01RunEvidence;

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

  private createFreshEvidence(): M01RunEvidence {
    return {
      runId: `M01_RUN_${Date.now()}`,
      missionId: 'M01_MASS',
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        reachedSortingLanes: false,
        enteredScannerBay: false,
        scannedThreeTargetCrates: false,
        loadedThreeValidCrates: false,
        unlockedShortcutGate: false,
        collectedHoloCrate: false,
        noCollisionBonus: true,
        activatedExitGate: false,
      },
      interactionCount: 0,
      scanCount: 0,
      pulseTagCount: 0,
      wrongCrateAttempts: 0,
      retries: 0,
      collectedIds: [],
      routeChoices: [],
      missionTimeMs: 0,
      drivingScore: 100,
      missionPerformanceScore: 60,
      interactionEvidence: {
        scannedCrateIds: [],
        loadedCrateIds: [],
        rejectedDistractorIds: [],
        calibratedTotalMassKg: 0,
        targetTotalMassKg: 15.0,
      },
    };
  }

  private createIndustrialBumpTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 128; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  public setDifficultyAndTier(
    difficulty: DifficultyLayer,
    tier: PerformanceTier
  ) {
    this.difficulty = difficulty;
    this.performanceTier = tier;
    this.evidence.difficulty = difficulty;
    this.evidence.performanceTier = tier;

    if (difficulty === 'ROOKIE') {
      this.remainingTimeSeconds = 240;
    } else if (difficulty === 'PRO') {
      this.remainingTimeSeconds = 180;
    } else if (difficulty === 'ELITE') {
      this.remainingTimeSeconds = 150;
    } else {
      this.remainingTimeSeconds = 135;
    }
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
    return this.localToWorldInto(0, 1.5, -1.5, outVec);
  }

  public selectAndInspectCrateById(crateId: string) {
    const node = this.crates.find((c) => c.spec.id === crateId);
    if (!node) return;
    this.aimedCrateId = crateId;
    this.markCrateScanned(node);
    this.triggerSciencePulseOnAimed();
  }

  private localToWorldInto(
    lx: number,
    ly: number,
    lz: number,
    target: THREE.Vector3
  ): THREE.Vector3 {
    return target
      .copy(this.stationCenter)
      .addScaledVector(this.stationRight, lx)
      .addScaledVector(_upAxis, ly)
      .addScaledVector(this.stationTangent, lz);
  }

  public buildVaultAroundStation(
    stationPos: THREE.Vector3,
    stationTangent: THREE.Vector3
  ) {
    this.clearVault();
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
    if (!this.bumpTex) {
      this.bumpTex = this.createIndustrialBumpTexture();
    }

    // Reset runtime mission state
    this.crates = [];
    this.interactableMeshes = [];
    this.craneHazards = [];
    this.conveyorSlats = [];
    this.conveyorRollers = [];
    this.pulseBursts = [];
    this.loadedMassKg = 0;
    this.loadedCratesCount = 0;
    this.wrongAttempts = 0;
    this.shortcutUnlocked = false;
    this.holoCrateCollected = false;
    this.exitGateOpen = false;
    this.checkpointId = 'CP0';
    this.evidence = this.createFreshEvidence();

    this.buildWarehouseMegastructure();
    this.buildSortingLanesAndHazards();
    this.buildScannerBayAndElectronicScale();
    this.buildConveyorAndCargoCrates();
    this.buildShortcutAndExitGates();
    this.buildPooledPulseBursts();

    this.updateScaleDisplay(
      'CÂN ĐIỆN TỬ NOVA-8',
      '0,0 / 15,0 kg',
      'Quét 5 kiện hàng & nạp đúng 3 kiện Khối lượng (m)'
    );
  }

  private addContactShadow(parent: THREE.Group, radiusX: number, radiusZ: number) {
    if (!this.shadowTex) return;
    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2),
      new THREE.MeshBasicMaterial({
        map: this.shadowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    parent.add(shadowMesh);
  }

  private buildWarehouseMegastructure() {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.82,
      roughness: 0.28,
      bumpMap: this.bumpTex,
      bumpScale: 0.015,
    });
    const flangeMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.72,
      roughness: 0.35,
    });
    const hazardStripeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
      metalness: 0.4,
      roughness: 0.45,
    });

    const zOffsets = [-34, -26, -18, -10, -2, 6];
    const xSpan = 14.2;

    // Composite 6-part steel I-beam columns & roof trusses
    zOffsets.forEach((zOff, idx) => {
      [-xSpan, xSpan].forEach((xPos) => {
        const colGroup = new THREE.Group();
        colGroup.position.set(xPos, 0, zOff);
        this.addContactShadow(colGroup, 1.2, 1.2);

        const webCore = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 11.4, 0.72),
          steelMat
        );
        webCore.position.y = 5.7;

        const frontFlange = new THREE.Mesh(
          new THREE.BoxGeometry(0.82, 11.4, 0.16),
          flangeMat
        );
        frontFlange.position.set(0, 5.7, 0.32);

        const backFlange = new THREE.Mesh(
          new THREE.BoxGeometry(0.82, 11.4, 0.16),
          flangeMat
        );
        backFlange.position.set(0, 5.7, -0.32);

        const basePlinth = new THREE.Mesh(
          new THREE.BoxGeometry(1.22, 0.65, 1.22),
          hazardStripeMat
        );
        basePlinth.position.y = 0.325;

        const kneeBrace = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 2.8, 8),
          flangeMat
        );
        kneeBrace.position.set(xPos > 0 ? -0.95 : 0.95, 10.1, 0);
        kneeBrace.rotation.z = xPos > 0 ? 0.65 : -0.65;

        colGroup.add(webCore, frontFlange, backFlange, basePlinth, kneeBrace);
        this.rootGroup.add(colGroup);
      });

      const roofBeam = new THREE.Mesh(
        new THREE.BoxGeometry(xSpan * 2 + 1.4, 0.65, 0.65),
        steelMat
      );
      roofBeam.position.set(0, 11.2, zOff);
      this.rootGroup.add(roofBeam);

      if (idx % 2 === 0) {
        const beaconHousing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.38, 0.25, 12),
          flangeMat
        );
        beaconHousing.position.set(0, 10.8, zOff);
        const beaconBulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        beaconBulb.position.y = -0.15;
        beaconHousing.add(beaconBulb);
        this.rootGroup.add(beaconHousing);
      }

      if (!this.isSoftwareGl && idx % 2 === 1) {
        const shaftGeo = new THREE.ConeGeometry(4.2, 11.0, 16, 1, true);
        const shaftMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.05,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.set((idx - 2) * 2.2, 5.5, zOff);
        this.rootGroup.add(shaft);
      }
    });

    // Composite multi-part industrial storage containers along walls
    const containerColors = [0x0369a1, 0x0f766e, 0x334155, 0xb45309];
    for (let i = 0; i < 4; i++) {
      const cMat = new THREE.MeshStandardMaterial({
        color: containerColors[i % containerColors.length],
        metalness: 0.58,
        roughness: 0.38,
        bumpMap: this.bumpTex,
        bumpScale: 0.02,
      });
      const frameTrimMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        roughness: 0.25,
      });

      [-12.2, 12.2].forEach((sideX, sIdx) => {
        const contGroup = new THREE.Group();
        contGroup.position.set(sideX, 0, -27 + i * 7.5 + sIdx * 1.2);
        this.addContactShadow(contGroup, 1.8, 3.0);

        const hull = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 2.4, 5.0),
          cMat
        );
        hull.position.y = 1.2;
        const topFrame = new THREE.Mesh(
          new THREE.BoxGeometry(2.62, 0.18, 5.12),
          frameTrimMat
        );
        topFrame.position.y = 2.42;
        const endCap = new THREE.Mesh(
          new THREE.BoxGeometry(2.58, 2.3, 0.22),
          frameTrimMat
        );
        endCap.position.set(0, 1.2, 2.48);

        contGroup.add(hull, topFrame, endCap);
        this.rootGroup.add(contGroup);
      });
    }
  }

  private buildSortingLanesAndHazards() {
    const laneColors = [0x38bdf8, 0xfbbf24, 0x34d399];
    [-3.2, 0, 3.2].forEach((laneX, laneIdx) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 13.5),
        new THREE.MeshBasicMaterial({
          color: laneColors[laneIdx],
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
        })
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(laneX, 0.03, -21);
      this.rootGroup.add(strip);
    });

    // 2 Composite 6-part Overhead Gantry Crane Hazards with 2-second Amber Floor Telegraph Rings
    const hazardPositions = [
      new THREE.Vector3(-2.4, 0, -24.5),
      new THREE.Vector3(2.4, 0, -17.5),
    ];

    hazardPositions.forEach((hPos, idx) => {
      const hGroup = new THREE.Group();
      hGroup.position.copy(hPos);
      this.addContactShadow(hGroup, 1.7, 1.7);

      const carriageGroup = new THREE.Group();
      carriageGroup.position.y = 5.5;

      const containerBody = new THREE.Mesh(
        new THREE.BoxGeometry(2.45, 1.65, 2.45),
        new THREE.MeshStandardMaterial({
          color: 0xd97706,
          metalness: 0.65,
          roughness: 0.32,
          bumpMap: this.bumpTex,
          bumpScale: 0.02,
        })
      );

      const spreaderBar = new THREE.Mesh(
        new THREE.BoxGeometry(2.65, 0.22, 0.55),
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.85,
          roughness: 0.22,
        })
      );
      spreaderBar.position.y = 0.95;

      const cableLeft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 6.0, 8),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
      );
      cableLeft.position.set(-0.85, 3.8, 0);

      const cableRight = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 6.0, 8),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
      );
      cableRight.position.set(0.85, 3.8, 0);

      const cornerBumper = new THREE.Mesh(
        new THREE.BoxGeometry(2.58, 0.24, 2.58),
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xd97706,
          emissiveIntensity: 0.35,
        })
      );
      cornerBumper.position.y = -0.75;

      carriageGroup.add(
        containerBody,
        spreaderBar,
        cableLeft,
        cableRight,
        cornerBumper
      );
      hGroup.add(carriageGroup);

      const telegraphRing = new THREE.Mesh(
        new THREE.RingGeometry(1.15, 1.7, 28),
        new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.25,
        })
      );
      telegraphRing.rotation.x = -Math.PI / 2;
      telegraphRing.position.y = 0.04;
      hGroup.add(telegraphRing);

      this.rootGroup.add(hGroup);
      this.craneHazards.push({
        group: hGroup,
        carriageGroup,
        telegraphRing,
        centerPos: hPos.clone(),
        cycleOffset: idx * 3.1,
        isDangerDown: false,
        warnedThisCycle: false,
      });
    });
  }

  private buildScannerBayAndElectronicScale() {
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 4.25, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(0, 0.04, -8.5);
    this.rootGroup.add(padRing);

    const padFill = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 32),
      new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.16,
      })
    );
    padFill.rotation.x = -Math.PI / 2;
    padFill.position.set(0, 0.03, -8.5);
    this.rootGroup.add(padFill);

    // Composite 7-part Electronic Weighing Platform & Digital Scale Readout
    const scaleGroup = new THREE.Group();
    scaleGroup.position.set(-7.8, 0, -4.5);
    scaleGroup.rotation.y = 0.42;
    this.addContactShadow(scaleGroup, 2.5, 2.5);

    const baseChassis = new THREE.Mesh(
      new THREE.BoxGeometry(3.9, 0.28, 3.9),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.82,
        roughness: 0.24,
      })
    );
    baseChassis.position.y = 0.14;

    const loadCellPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.85, 0.16, 24),
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.75,
        roughness: 0.28,
        bumpMap: this.bumpTex,
        bumpScale: 0.01,
      })
    );
    loadCellPlate.position.y = 0.36;

    const sensorRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.82, 0.06, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    sensorRing.rotation.x = Math.PI / 2;
    sensorRing.position.y = 0.38;

    const pillarLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 4.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
    );
    pillarLeft.position.set(-1.3, 2.1, -1.5);

    const pillarRight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 4.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
    );
    pillarRight.position.set(1.3, 2.1, -1.5);

    this.scaleCanvas = document.createElement('canvas');
    this.scaleCanvas.width = 512;
    this.scaleCanvas.height = 256;
    this.scaleTexture = new THREE.CanvasTexture(this.scaleCanvas);
    this.scaleTexture.colorSpace = THREE.SRGBColorSpace;
    this.scaleTexture.anisotropy = this.maxAnisotropy;

    const screenHousing = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 2.4, 0.22),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    screenHousing.position.set(0, 4.1, -1.5);

    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 2.2),
      new THREE.MeshBasicMaterial({ map: this.scaleTexture })
    );
    screenMesh.position.set(0, 4.1, -1.37);

    scaleGroup.add(
      baseChassis,
      loadCellPlate,
      sensorRing,
      pillarLeft,
      pillarRight,
      screenHousing,
      screenMesh
    );
    this.rootGroup.add(scaleGroup);
  }

  private updateScaleDisplay(
    header: string,
    mainValue: string,
    subNote: string
  ) {
    const key = `${header}|${mainValue}|${subNote}`;
    if (!this.scaleCanvas || !this.scaleTexture || this.lastScaleText === key) {
      return;
    }
    this.lastScaleText = key;

    const ctx = this.scaleCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#071120';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#34d399';
    ctx.font = '800 54px "JetBrains Mono", monospace';
    ctx.fillText(mainValue, 256, 132);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 46), 256, 204);

    this.scaleTexture.needsUpdate = true;
  }

  private buildConveyorAndCargoCrates() {
    // Composite Multi-Part Moving Conveyor Belt at (x = 7.8, z = -4.5)
    const convGroup = new THREE.Group();
    convGroup.position.set(7.8, 0, -4.5);
    convGroup.rotation.y = -0.35;
    this.addContactShadow(convGroup, 2.2, 5.2);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.52, 9.6),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.78,
        roughness: 0.28,
      })
    );
    frame.position.y = 0.26;
    convGroup.add(frame);

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.65,
      roughness: 0.3,
    });
    [-1.58, 1.58].forEach((rx) => {
      const sideRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.28, 9.7),
        railMat
      );
      sideRail.position.set(rx, 0.62, 0);
      convGroup.add(sideRail);
    });

    const rollerGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.9, 12);
    rollerGeo.rotateZ(Math.PI / 2);
    const rollerMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.2,
    });
    [-4.55, 0, 4.55].forEach((rz) => {
      const roller = new THREE.Mesh(rollerGeo, rollerMat);
      roller.position.set(0, 0.42, rz);
      convGroup.add(roller);
      this.conveyorRollers.push(roller);
    });

    const slatGeo = new THREE.BoxGeometry(2.7, 0.08, 0.45);
    const slatMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
    });
    for (let i = 0; i < 10; i++) {
      const slat = new THREE.Mesh(slatGeo, slatMat);
      slat.position.set(0, 0.58, -4.2 + i * 0.9);
      convGroup.add(slat);
      this.conveyorSlats.push(slat);
    }

    this.rootGroup.add(convGroup);

    // 5 Composite 6-Part Interactive Cargo Crates arrayed around Scanner Bay
    const crateOffsets: [number, number, number][] = [
      [-5.2, 0.95, -1.8],
      [-2.6, 0.95, -0.5],
      [0.0, 0.95, -0.2],
      [2.6, 0.95, -0.5],
      [5.2, 0.95, -1.8],
    ];

    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.82,
      roughness: 0.25,
    });

    M01_CARGO_CRATE_SPECS.forEach((spec, idx) => {
      const [lx, ly, lz] = crateOffsets[idx] || [0, 0.95, -1];
      const crateGroup = new THREE.Group();
      crateGroup.position.set(lx, ly, lz);

      const labelTex = this.createCrateLabelTexture(spec);
      const bodyMat = new THREE.MeshStandardMaterial({
        map: labelTex,
        roughness: 0.32,
        metalness: 0.34,
      });

      // Part 1: Main labeled core cube
      const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.52, 1.52, 1.52),
        bodyMat
      );
      bodyMesh.userData = { crateId: spec.id };
      crateGroup.add(bodyMesh);
      this.interactableMeshes.push(bodyMesh);

      // Part 2 & 3: Top and bottom reinforced alloy frames
      const topFrame = new THREE.Mesh(
        new THREE.BoxGeometry(1.62, 0.14, 1.62),
        bumperMat
      );
      topFrame.position.y = 0.74;
      const bottomFrame = new THREE.Mesh(
        new THREE.BoxGeometry(1.62, 0.14, 1.62),
        bumperMat
      );
      bottomFrame.position.y = -0.74;

      // Part 4: Top status transponder dome
      const beaconLightMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 0.16, 12),
        new THREE.MeshStandardMaterial({
          color: spec.colorHex,
          emissive: spec.colorHex,
          emissiveIntensity: 0.65,
        })
      );
      beaconLightMesh.position.y = 0.86;

      // Part 5: Holographic target lock wireframe cage
      const outlineMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.72, 1.72, 1.72),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.0,
        })
      );

      // Part 6: Science Pulse floor tag ring
      const pulseRingMesh = new THREE.Mesh(
        new THREE.RingGeometry(1.05, 1.38, 24),
        new THREE.MeshBasicMaterial({
          color: spec.colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.0,
        })
      );
      pulseRingMesh.rotation.x = -Math.PI / 2;
      pulseRingMesh.position.y = -0.76;

      crateGroup.add(
        topFrame,
        bottomFrame,
        beaconLightMesh,
        outlineMesh,
        pulseRingMesh
      );
      this.rootGroup.add(crateGroup);

      this.localToWorldInto(lx, ly, lz, _worldScratchA);
      const runtimeState: CargoCrateRuntimeState = {
        spec,
        scanned: false,
        taggedWithPulse: false,
        loadedOnConveyor: false,
        rejectedAttemptCount: 0,
        worldPosition: {
          x: _worldScratchA.x,
          y: _worldScratchA.y,
          z: _worldScratchA.z,
        },
      };

      this.crates.push({
        spec,
        state: runtimeState,
        group: crateGroup,
        bodyMesh,
        outlineMesh,
        pulseRingMesh,
        beaconLightMesh,
        basePosition: new THREE.Vector3(lx, ly, lz),
        conveyorSlotIndex: -1,
        squashTimer: 0,
        hitFlashTimer: 0,
      });
    });
  }

  private createCrateLabelTexture(spec: CargoCrateSpec): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = spec.accentHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 240, 240);

    ctx.fillStyle = spec.accentHex;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(spec.code, 128, 46);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 30px "JetBrains Mono", monospace';
    ctx.fillText(spec.rawLabelText, 128, 128);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(spec.titleVi.slice(0, 22), 128, 195);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAnisotropy;
    return tex;
  }

  private buildShortcutAndExitGates() {
    // Shortcut Maintenance Gate on Left Lane (x = -6.8, z = -11.5)
    const shortcutGroup = new THREE.Group();
    shortcutGroup.position.set(-6.8, 0, -11.5);

    const gateMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.45,
      metalness: 0.65,
      roughness: 0.28,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.22,
    });

    this.shortcutGateLeft = new THREE.Group();
    this.shortcutGateLeft.position.set(-0.75, 1.4, 0);
    this.shortcutGateLeft.add(
      new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 0.25), gateMat),
      new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.35, 0.32), trimMat)
    );

    this.shortcutGateRight = new THREE.Group();
    this.shortcutGateRight.position.set(0.75, 1.4, 0);
    this.shortcutGateRight.add(
      new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 0.25), gateMat),
      new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.35, 0.32), trimMat)
    );

    shortcutGroup.add(this.shortcutGateLeft, this.shortcutGateRight);

    // Bonus Composite Holo-Crate behind Shortcut Gate
    this.holoCrateMesh = new THREE.Group();
    this.holoCrateMesh.position.set(-6.8, 1.1, -8.2);
    const holoCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 0),
      new THREE.MeshStandardMaterial({
        color: 0x2dd4bf,
        emissive: 0x0d9488,
        emissiveIntensity: 0.85,
        metalness: 0.4,
        roughness: 0.15,
      })
    );
    const holoRingA = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.08, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    const holoRingB = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.06, 10, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    holoRingB.rotation.x = Math.PI / 2;
    this.holoCrateMesh.add(holoCore, holoRingA, holoRingB);
    this.rootGroup.add(shortcutGroup, this.holoCrateMesh);

    // Composite 6-Part Sliding Exit Gate across Station 1 Trigger (x = 0, z = +2.4)
    const exitGroup = new THREE.Group();
    exitGroup.position.set(0, 0, 2.4);

    const exitDoorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0xbe123c,
      emissiveIntensity: 0.3,
      metalness: 0.78,
      roughness: 0.26,
      bumpMap: this.bumpTex,
      bumpScale: 0.015,
    });

    this.exitGateLeft = new THREE.Group();
    this.exitGateLeft.position.set(-2.15, 2.1, 0);
    this.exitGateLeft.add(
      new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.42), exitDoorMat),
      new THREE.Mesh(new THREE.BoxGeometry(4.26, 0.45, 0.52), trimMat)
    );

    this.exitGateRight = new THREE.Group();
    this.exitGateRight.position.set(2.15, 2.1, 0);
    this.exitGateRight.add(
      new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.42), exitDoorMat),
      new THREE.Mesh(new THREE.BoxGeometry(4.26, 0.45, 0.52), trimMat)
    );

    this.exitBeaconMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.85,
    });
    const exitHeader = new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 0.58, 0.68),
      this.exitBeaconMat
    );
    exitHeader.position.set(0, 4.48, 0);

    exitGroup.add(this.exitGateLeft, this.exitGateRight, exitHeader);
    this.rootGroup.add(exitGroup);
  }

  private buildPooledPulseBursts() {
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.75, 28),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.rootGroup.add(ring);
      this.pulseBursts.push({
        mesh: ring,
        active: false,
        age: 0,
        maxAge: 0.55,
      });
    }
  }

  private spawnPooledBurstAtCrate(node: CrateMeshNode, colorHex: number) {
    const burst = this.pulseBursts.find((b) => !b.active) || this.pulseBursts[0];
    if (!burst) return;
    burst.active = true;
    burst.age = 0;
    burst.mesh.visible = true;
    burst.mesh.position.set(
      node.group.position.x,
      0.22,
      node.group.position.z
    );
    burst.mesh.scale.setScalar(1);
    const mat = burst.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = 0.95;
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
    isActiveStationZero: boolean,
    onDrivingPenalty: (pts: number) => void,
    onBonusCoinsAwarded: (coins: number, reasonVi: string) => void
  ) {
    this.active = isActiveStationZero;
    this.rootGroup.visible = isActiveStationZero;
    if (!isActiveStationZero) return;

    if (dt > 0.001) {
      const instFps = Math.min(120, Math.round(1 / dt));
      this.currentFps = Math.round(this.currentFps * 0.9 + instFps * 0.1);
    }

    this.reticleX = reticleX;
    this.reticleY = reticleY;
    this.evidence.missionTimeMs += Math.round(dt * 1000);
    if (this.collisionPenaltyCooldown > 0) {
      this.collisionPenaltyCooldown -= dt;
    }

    if (!this.exitGateOpen && this.remainingTimeSeconds > 0) {
      this.remainingTimeSeconds = Math.max(0, this.remainingTimeSeconds - dt);
      if (this.remainingTimeSeconds <= 0) {
        this.resetScannerBayOnFailure(
          'Hết thời gian hiệu chuẩn khoang cân! Hệ thống đưa bạn về Checkpoint CP1 (Khoang Quét) để thử lại.'
        );
      }
    }

    // 1. Animate Overhead Crane Hazards & Check Collision in Sorting Lanes
    const damp10 = 1 - Math.exp(-10 * dt);
    const damp5 = 1 - Math.exp(-5 * dt);

    for (let i = 0; i < this.craneHazards.length; i++) {
      const haz = this.craneHazards[i];
      const cycle = (elapsed + haz.cycleOffset) % 6.0;
      const isTelegraph = cycle >= 2.5 && cycle < 4.5;
      const isDown = cycle >= 4.5;
      haz.isDangerDown = isDown;

      const ringMat = haz.telegraphRing.material as THREE.MeshBasicMaterial;
      if (isTelegraph) {
        ringMat.color.setHex(0xf59e0b);
        ringMat.opacity = 0.45 + Math.sin(elapsed * 16) * 0.35;
        haz.carriageGroup.position.y = 5.5 - ((cycle - 2.5) / 2.0) * 1.5;

        if (!haz.warnedThisCycle) {
          haz.warnedThisCycle = true;
          this.localToWorldInto(
            haz.centerPos.x,
            0,
            haz.centerPos.z,
            _worldScratchA
          );
          if (roverPos.distanceTo(_worldScratchA) < 16) {
            soundEngine.playTelegraphWarning();
          }
        }
      } else if (isDown) {
        ringMat.color.setHex(0xf43f5e);
        ringMat.opacity = 0.85;
        haz.carriageGroup.position.y = THREE.MathUtils.lerp(
          haz.carriageGroup.position.y,
          1.15,
          damp10
        );

        this.localToWorldInto(
          haz.centerPos.x,
          0,
          haz.centerPos.z,
          _worldScratchA
        );
        if (
          roverPos.distanceTo(_worldScratchA) < 2.25 &&
          this.collisionPenaltyCooldown <= 0
        ) {
          this.collisionPenaltyCooldown = 2.0;
          this.evidence.objectiveFlags.noCollisionBonus = false;
          this.evidence.drivingScore = Math.max(
            0,
            this.evidence.drivingScore - 5
          );
          onDrivingPenalty(5);
          this.pendingImpactCallback?.(0.055, 0.42);
          soundEngine.playOffLaneWarning();
          this.orbitSpeaker = 'ORBIT';
          this.feedbackTone = 'warning';
          this.orbitMessageVi =
            'Va chạm thùng cẩu (-5 điểm lái)! Hãy quan sát vòng cảnh báo màu cam 2 giây trên sàn.';
        }
      } else {
        haz.warnedThisCycle = false;
        ringMat.color.setHex(0x38bdf8);
        ringMat.opacity = 0.18;
        haz.carriageGroup.position.y = THREE.MathUtils.lerp(
          haz.carriageGroup.position.y,
          5.5,
          damp5
        );
      }
    }

    // 2. Animate Moving Conveyor Belt & Rollers
    this.conveyorCycleProgress = (elapsed * 0.28) % 1;
    this.conveyorWindowOpen =
      this.difficulty === 'ROOKIE' ? true : this.conveyorCycleProgress < 0.82;

    for (let i = 0; i < this.conveyorSlats.length; i++) {
      const slat = this.conveyorSlats[i];
      slat.position.z = ((elapsed * 2.2 + i * 0.9) % 9.0) - 4.5;
      const mat = slat.material as THREE.MeshStandardMaterial;
      mat.color.setHex(this.conveyorWindowOpen ? 0x10b981 : 0xf59e0b);
    }
    for (let i = 0; i < this.conveyorRollers.length; i++) {
      this.conveyorRollers[i].rotation.x = elapsed * 4.0;
    }

    // 3. Check Rover proximity to Sorting Lanes & Scanner Bay (CP1)
    this.localToWorldInto(0, 0, -8.5, _worldScratchA);
    const distToScannerBay = Math.hypot(
      roverPos.x - _worldScratchA.x,
      roverPos.z - _worldScratchA.z
    );

    if (
      distToScannerBay < 26 &&
      !this.evidence.objectiveFlags.reachedSortingLanes
    ) {
      this.evidence.objectiveFlags.reachedSortingLanes = true;
      if (!this.evidence.routeChoices.includes('SORTING_LANES_ABC')) {
        this.evidence.routeChoices.push('SORTING_LANES_ABC');
      }
    }

    const wasInScanner = this.inScannerZone;
    this.inScannerZone = distToScannerBay < 13.5;

    if (this.inScannerZone && !wasInScanner) {
      this.checkpointId = 'CP1';
      if (!this.evidence.checkpointsReached.includes('CP1')) {
        this.evidence.checkpointsReached.push('CP1');
      }
      this.evidence.objectiveFlags.enteredScannerBay = true;
      if (!this.exitGateOpen) {
        this.missionPhase = 'scanner_bay';
        this.objectiveTextVi =
          'KHOANG QUÉT (CP1): Quét 5 kiện hàng bằng tia LiDAR & nạp đúng 3 kiện Khối lượng (m = 15,0 kg) lên băng chuyền!';
        this.orbitSpeaker = 'Dr. Linh';
        this.feedbackTone = 'info';
        this.orbitMessageVi =
          'Đã vào Khoang Quét Cân Điện Tử! Nhấn phím C (hoặc nút Camera), rê tâm ngắm vào kiện hàng, nhấn F phát xung Science Pulse và nhấn E nạp kiện hàng Khối lượng (m) lên băng chuyền.';
        soundEngine.playTargetLock();
      }
    }

    // 4. Check Bonus Holo-Crate pickup
    if (
      this.shortcutUnlocked &&
      !this.holoCrateCollected &&
      this.holoCrateMesh
    ) {
      this.holoCrateMesh.rotation.y = elapsed * 2.6;
      this.localToWorldInto(-6.8, 0, -8.2, _worldScratchB);
      if (
        Math.hypot(roverPos.x - _worldScratchB.x, roverPos.z - _worldScratchB.z) <
        4.5
      ) {
        this.holoCrateCollected = true;
        this.holoCrateMesh.visible = false;
        this.evidence.objectiveFlags.collectedHoloCrate = true;
        this.evidence.collectedIds.push('M01_HOLO_CRATE_01');
        this.pendingImpactCallback?.(0.035, 0.2);
        onBonusCoinsAwarded(
          50,
          '🌟 Mở Cổng Tắt Bảo Trì & Thu thập Holo-Crate M01: +50 Xu Khoa Học!'
        );
      }
    }

    // 5. Update Pooled Pulse Bursts
    for (let i = 0; i < this.pulseBursts.length; i++) {
      const b = this.pulseBursts[i];
      if (!b.active) continue;
      b.age += dt;
      if (b.age >= b.maxAge) {
        b.active = false;
        b.mesh.visible = false;
      } else {
        const ratio = b.age / b.maxAge;
        b.mesh.scale.setScalar(1 + ratio * 3.8);
        (b.mesh.material as THREE.MeshBasicMaterial).opacity =
          (1 - ratio) * 0.9;
      }
    }

    // 6. Raycast + Aim Assist + Squash & Stretch for Cargo Crates
    this.updateCrateAimingAndVisuals(dt, elapsed, camera);

    // 7. Handle Science Pulse & Cargo Load Interaction
    if (justPressedPulse) {
      this.triggerSciencePulseOnAimed();
    }
    if (justPressedInteract) {
      this.interactWithAimedCrate(onBonusCoinsAwarded);
    }

    // 8. Animate Shortcut Gate & Main Exit Gate doors with exponential damping
    if (this.shortcutGateLeft && this.shortcutGateRight) {
      const targetLeftX = this.shortcutUnlocked ? -2.3 : -0.75;
      const targetRightX = this.shortcutUnlocked ? 2.3 : 0.75;
      this.shortcutGateLeft.position.x = THREE.MathUtils.lerp(
        this.shortcutGateLeft.position.x,
        targetLeftX,
        damp5
      );
      this.shortcutGateRight.position.x = THREE.MathUtils.lerp(
        this.shortcutGateRight.position.x,
        targetRightX,
        damp5
      );
    }

    if (this.exitGateLeft && this.exitGateRight) {
      const targetLeftX = this.exitGateOpen ? -5.8 : -2.15;
      const targetRightX = this.exitGateOpen ? 5.8 : 2.15;
      this.exitGateLeft.position.x = THREE.MathUtils.lerp(
        this.exitGateLeft.position.x,
        targetLeftX,
        damp5
      );
      this.exitGateRight.position.x = THREE.MathUtils.lerp(
        this.exitGateRight.position.x,
        targetRightX,
        damp5
      );
    }

    this.recalculateMissionPerformanceScore();
  }

  private updateCrateAimingAndVisuals(
    dt: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera
  ) {
    _ndcVec.set(this.reticleX, this.reticleY);
    _raycaster.setFromCamera(_ndcVec, camera);
    const hits = _raycaster.intersectObjects(this.interactableMeshes, false);

    let newAimedId: string | null = null;
    if (hits.length > 0 && hits[0].distance < 34) {
      newAimedId = hits[0].object.userData?.crateId || null;
    }

    if (
      !newAimedId &&
      (this.inScannerZone || this.cameraMode === 'fps_scanner')
    ) {
      let bestScreenDist = 0.34;
      for (let i = 0; i < this.crates.length; i++) {
        const node = this.crates[i];
        if (node.state.loadedOnConveyor) continue;
        node.bodyMesh.getWorldPosition(_projVec);
        _projVec.project(camera);
        if (_projVec.z > 0 && _projVec.z < 1) {
          const d = Math.hypot(
            _projVec.x - this.reticleX,
            _projVec.y - this.reticleY
          );
          if (d < bestScreenDist) {
            bestScreenDist = d;
            newAimedId = node.spec.id;
          }
        }
      }
    }

    if (newAimedId && newAimedId !== this.aimedCrateId) {
      this.aimedCrateId = newAimedId;
      const aimedNode = this.crates.find((c) => c.spec.id === newAimedId);
      if (aimedNode) {
        this.markCrateScanned(aimedNode);
      }
    } else if (!newAimedId && !this.inScannerZone) {
      this.aimedCrateId = null;
    }

    const damp6 = 1 - Math.exp(-6.5 * dt);

    for (let idx = 0; idx < this.crates.length; idx++) {
      const node = this.crates[idx];
      const isAimed = node.spec.id === this.aimedCrateId;
      const outMat = node.outlineMesh.material as THREE.MeshBasicMaterial;
      const pulseMat = node.pulseRingMesh.material as THREE.MeshBasicMaterial;
      const bodyMat = node.bodyMesh.material as THREE.MeshStandardMaterial;

      // Hit flash decay
      if (node.hitFlashTimer > 0) {
        node.hitFlashTimer = Math.max(0, node.hitFlashTimer - dt);
        bodyMat.emissive.setHex(
          node.spec.isValidMassTarget ? 0x10b981 : 0xf43f5e
        );
        bodyMat.emissiveIntensity = node.hitFlashTimer * 2.5;
      } else {
        bodyMat.emissiveIntensity = 0;
      }

      // Squash & stretch decay
      if (node.squashTimer > 0) {
        node.squashTimer = Math.max(0, node.squashTimer - dt);
        const s = Math.sin(node.squashTimer * 28) * 0.16;
        node.group.scale.set(1 + s, 1 - s * 0.8, 1 + s);
      } else {
        node.group.scale.setScalar(1);
      }

      if (node.state.loadedOnConveyor) {
        const slotZ = -2.2 + node.conveyorSlotIndex * 2.1;
        _targetLerpVec.set(7.8, 1.35, -4.5 + slotZ);
        node.group.position.lerp(_targetLerpVec, damp6);
        node.group.rotation.y = elapsed * 0.8 + idx;
        outMat.opacity = 0.35;
        outMat.color.setHex(0x10b981);
      } else {
        node.group.position.x = THREE.MathUtils.lerp(
          node.group.position.x,
          node.basePosition.x,
          damp6
        );
        node.group.position.z = THREE.MathUtils.lerp(
          node.group.position.z,
          node.basePosition.z,
          damp6
        );
        node.group.position.y =
          node.basePosition.y + Math.sin(elapsed * 2.4 + idx) * 0.08;
        node.group.rotation.y = isAimed
          ? Math.sin(elapsed * 3.2) * 0.25
          : Math.sin(elapsed * 0.8 + idx) * 0.1;

        outMat.opacity = isAimed ? 0.92 : node.state.scanned ? 0.28 : 0.0;
        outMat.color.setHex(
          isAimed
            ? 0x38bdf8
            : node.spec.isValidMassTarget
            ? 0x34d399
            : 0xf59e0b
        );
      }

      if (node.state.taggedWithPulse) {
        pulseMat.opacity = 0.45 + Math.sin(elapsed * 6) * 0.25;
      } else {
        pulseMat.opacity = 0;
      }

      node.group.getWorldPosition(_worldScratchA);
      node.state.worldPosition.x = _worldScratchA.x;
      node.state.worldPosition.y = _worldScratchA.y;
      node.state.worldPosition.z = _worldScratchA.z;
    }
  }

  private markCrateScanned(node: CrateMeshNode) {
    soundEngine.playScanSweep();
    node.squashTimer = 0.22;
    this.spawnPooledBurstAtCrate(node, 0x38bdf8);

    if (!node.state.scanned) {
      node.state.scanned = true;
      this.evidence.scanCount += 1;
      if (
        !this.evidence.interactionEvidence.scannedCrateIds.includes(
          node.spec.id
        )
      ) {
        this.evidence.interactionEvidence.scannedCrateIds.push(node.spec.id);
      }
    }

    this.updateScaleDisplay(
      `QUÉT NHÃN: ${node.spec.code}`,
      node.spec.electronicScaleReadoutVi,
      `Đã nạp: ${this.loadedMassKg.toFixed(1)} / ${this.targetMassKg.toFixed(1)} kg`
    );

    const validScannedCount = this.crates.filter(
      (c) => c.state.scanned && c.spec.isValidMassTarget
    ).length;
    if (validScannedCount >= 3) {
      this.evidence.objectiveFlags.scannedThreeTargetCrates = true;
    }

    const totalScanned = this.crates.filter((c) => c.state.scanned).length;
    if (totalScanned >= 5 && !this.shortcutUnlocked) {
      this.shortcutUnlocked = true;
      this.evidence.objectiveFlags.unlockedShortcutGate = true;
      this.pendingImpactCallback?.(0.04, 0.22);
      soundEngine.playRewardUnlock();
      this.orbitSpeaker = 'ORBIT';
      this.feedbackTone = 'success';
      this.orbitMessageVi =
        'Tuyệt vời! Bạn đã quét đủ 5/5 nhãn hàng hóa và mở khóa Cổng Tắt Bảo Trì bên trái kèm Holo-Crate thưởng!';
    }
  }

  public triggerSciencePulseOnAimed() {
    let targetNode = this.crates.find((c) => c.spec.id === this.aimedCrateId);
    if (!targetNode) {
      targetNode =
        this.crates.find((c) => !c.state.scanned) || this.crates[0];
      if (targetNode) this.aimedCrateId = targetNode.spec.id;
    }
    if (!targetNode) return;

    this.markCrateScanned(targetNode);
    targetNode.state.taggedWithPulse = true;
    targetNode.hitFlashTimer = 0.35;
    targetNode.squashTimer = 0.28;
    this.spawnPooledBurstAtCrate(targetNode, targetNode.spec.colorHex);
    this.evidence.pulseTagCount += 1;
    this.evidence.interactionCount += 1;
    soundEngine.playSciencePulse();

    this.orbitSpeaker = 'Hệ thống Cân NOVA-8';
    this.feedbackTone = targetNode.spec.isValidMassTarget ? 'info' : 'warning';
    this.orbitMessageVi = `[SCIENCE PULSE · ${targetNode.spec.code}] ${targetNode.spec.rawLabelText} → ${targetNode.spec.scientificNoteVi}`;
  }

  public interactWithAimedCrate(
    onBonusCoinsAwarded?: (coins: number, reasonVi: string) => void
  ) {
    let targetNode = this.crates.find((c) => c.spec.id === this.aimedCrateId);
    if (!targetNode) {
      targetNode = this.crates.find(
        (c) => !c.state.loadedOnConveyor && c.spec.isValidMassTarget
      );
      if (targetNode) this.aimedCrateId = targetNode.spec.id;
    }
    if (!targetNode) return;

    this.markCrateScanned(targetNode);
    this.evidence.interactionCount += 1;

    if (targetNode.state.loadedOnConveyor) {
      this.orbitSpeaker = 'ORBIT';
      this.feedbackTone = 'info';
      this.orbitMessageVi = `Kiện hàng ${targetNode.spec.code} (${targetNode.spec.rawLabelText}) đã nằm trên băng chuyền cân rồi! Hãy chọn kiện hàng khác.`;
      return;
    }

    if (!this.conveyorWindowOpen) {
      soundEngine.playOffLaneWarning();
      this.orbitSpeaker = 'ORBIT';
      this.feedbackTone = 'warning';
      this.orbitMessageVi =
        'Băng chuyền đang ở nhịp chuyển tiếp màu cam! Hãy đợi đèn băng chuyền chuyển sang XANH LÁ để nạp kiện hàng.';
      return;
    }

    if (targetNode.spec.isValidMassTarget && targetNode.spec.massKg !== null) {
      targetNode.state.loadedOnConveyor = true;
      targetNode.conveyorSlotIndex = this.loadedCratesCount;
      targetNode.hitFlashTimer = 0.45;
      targetNode.squashTimer = 0.35;
      this.spawnPooledBurstAtCrate(targetNode, 0x10b981);
      this.pendingImpactCallback?.(0.045, 0.25);

      this.loadedCratesCount += 1;
      this.loadedMassKg = Number(
        (this.loadedMassKg + targetNode.spec.massKg).toFixed(2)
      );

      this.checkpointId = 'CP2';
      if (!this.evidence.checkpointsReached.includes('CP2')) {
        this.evidence.checkpointsReached.push('CP2');
      }
      if (
        !this.evidence.interactionEvidence.loadedCrateIds.includes(
          targetNode.spec.id
        )
      ) {
        this.evidence.interactionEvidence.loadedCrateIds.push(
          targetNode.spec.id
        );
      }
      this.evidence.interactionEvidence.calibratedTotalMassKg =
        this.loadedMassKg;

      soundEngine.playCargoLoadSuccess();
      this.tieredHintVi = null;

      this.updateScaleDisplay(
        `ĐÃ NẠP: ${targetNode.spec.code} (+${targetNode.spec.massKg} kg)`,
        `${this.loadedMassKg.toFixed(1)} / ${this.targetMassKg.toFixed(1)} kg`,
        `Đã nạp ${this.loadedCratesCount}/3 kiện Khối lượng chuẩn`
      );

      if (
        this.loadedCratesCount >= this.requiredCratesCount &&
        Math.abs(this.loadedMassKg - this.targetMassKg) < 0.05
      ) {
        this.exitGateOpen = true;
        this.checkpointId = 'EXIT';
        if (!this.evidence.checkpointsReached.includes('EXIT')) {
          this.evidence.checkpointsReached.push('EXIT');
        }
        this.evidence.objectiveFlags.loadedThreeValidCrates = true;
        this.evidence.objectiveFlags.activatedExitGate = true;
        this.missionPhase = 'success';

        if (this.exitBeaconMat) {
          this.exitBeaconMat.color.setHex(0x10b981);
          this.exitBeaconMat.emissive.setHex(0x059669);
        }
        this.pendingImpactCallback?.(0.065, 0.38);
        soundEngine.playGateUnlock();
        onBonusCoinsAwarded?.(
          45,
          '⚖️ Hiệu chuẩn chính xác 15,0 kg trên Băng Chuyền Cân M01: +45 Xu & Mở Cổng Thoát!'
        );

        this.objectiveTextVi =
          'ĐÃ MỞ CỔNG THOÁT (15,0 / 15,0 kg)! Hãy lái JetBot tiến qua Cổng Thoát phía trước (hoặc nhấn nút Vào Bài Thi) để mở 10 câu hỏi KHTN 8!';
        this.orbitSpeaker = 'Dr. Linh';
        this.feedbackTone = 'success';
        this.orbitMessageVi =
          'Xuất sắc! Tổng khối lượng 3 kiện đạt chuẩn 2,5 kg + 5,0 kg + 7,5 kg = 15,0 kg. Cổng Thoát Kho Lưu Trữ đã mở — tiến lên để bước vào Thử thách 10 câu hỏi KHTN 8!';
      } else {
        this.orbitSpeaker = 'Hệ thống Cân NOVA-8';
        this.feedbackTone = 'success';
        this.orbitMessageVi = `Nạp thành công ${targetNode.spec.code} (${targetNode.spec.electronicScaleReadoutVi})! Tổng khối lượng hiện tại: ${this.loadedMassKg.toFixed(1)} / 15,0 kg (${this.loadedCratesCount}/3 kiện).`;
      }
    } else {
      targetNode.state.rejectedAttemptCount += 1;
      targetNode.hitFlashTimer = 0.5;
      targetNode.squashTimer = 0.35;
      this.spawnPooledBurstAtCrate(targetNode, 0xf43f5e);
      this.pendingImpactCallback?.(0.05, 0.32);

      this.wrongAttempts += 1;
      this.evidence.wrongCrateAttempts += 1;
      if (
        !this.evidence.interactionEvidence.rejectedDistractorIds.includes(
          targetNode.spec.id
        )
      ) {
        this.evidence.interactionEvidence.rejectedDistractorIds.push(
          targetNode.spec.id
        );
      }

      soundEngine.playWrongAnswer();
      this.orbitSpeaker = 'ORBIT';
      this.feedbackTone = 'error';
      this.orbitMessageVi =
        targetNode.spec.distractorReasonVi ||
        'Kiện hàng này không phải đại lượng Khối lượng (m)!';

      this.updateScaleDisplay(
        `TỪ CHỐI: ${targetNode.spec.code}`,
        targetNode.spec.rawLabelText,
        'Sai đại lượng! Chỉ nạp kiện hàng Khối lượng (m)'
      );

      if (this.wrongAttempts === 1) {
        this.tieredHintVi =
          'Gợi ý Bậc 1 (Khái niệm): Khối lượng (ký hiệu m) chỉ lượng chất chứa trong vật. Đừng nhầm với Trọng lượng P (Newton) hoặc Thể tích V (Lít)!';
      } else if (this.wrongAttempts === 2) {
        this.tieredHintVi =
          'Gợi ý Bậc 2 (Đơn vị & Đổi đơn vị): Đơn vị khối lượng chuẩn SI là kilôgam (kg). Lưu ý: 1000 g = 1 kg và 1 yến = 10 kg (0,75 yến = 7,5 kg).';
      } else {
        this.tieredHintVi =
          'Gợi ý Bậc 3 (Làm mẫu): Hãy nạp 3 kiện có ký hiệu m: NV8-M01 (2500 g = 2,5 kg), NV8-M03 (5,0 kg) và NV8-M05 (0,75 yến = 7,5 kg) để đủ 15,0 kg.';
      }

      if (this.wrongAttempts >= this.maxWrongAttempts) {
        this.resetScannerBayOnFailure(
          'Bạn đã nạp nhầm 3 lần liên tiếp các kiện hàng nhiễu (Trọng lượng P / Thể tích V). Hệ thống đặt lại băng chuyền tại Checkpoint CP1 kèm Gợi ý Bậc 3!'
        );
      }
    }
  }

  public resetScannerBayOnFailure(reasonVi: string) {
    this.evidence.retries += 1;
    this.wrongAttempts = 0;
    this.loadedMassKg = 0;
    this.loadedCratesCount = 0;
    this.remainingTimeSeconds = 180;
    this.checkpointId = 'CP1';

    this.crates.forEach((c) => {
      c.state.loadedOnConveyor = false;
      c.conveyorSlotIndex = -1;
    });

    this.orbitSpeaker = 'Dr. Linh';
    this.feedbackTone = 'warning';
    this.orbitMessageVi = reasonVi;
    this.updateScaleDisplay(
      'ĐẶT LẠI CP1 · KHOANG CÂN',
      '0,0 / 15,0 kg',
      'Hãy chọn 3 kiện hàng có ký hiệu m (kg, g, yến)'
    );
  }

  private recalculateMissionPerformanceScore() {
    let score = 40;
    if (this.evidence.objectiveFlags.reachedSortingLanes) score += 10;
    if (this.evidence.objectiveFlags.enteredScannerBay) score += 10;
    score += this.loadedCratesCount * 10;
    if (this.evidence.objectiveFlags.unlockedShortcutGate) score += 5;
    if (this.evidence.objectiveFlags.collectedHoloCrate) score += 5;
    if (this.evidence.objectiveFlags.noCollisionBonus) score += 5;
    score -= this.evidence.wrongCrateAttempts * 5;
    this.evidence.missionPerformanceScore = Math.max(
      0,
      Math.min(100, Math.round(score))
    );
  }

  public getHudSnapshot(drivingScore: number): M01HudSnapshot {
    this.evidence.drivingScore = drivingScore;
    const aimedNode =
      this.crates.find((c) => c.spec.id === this.aimedCrateId) || null;

    return {
      active: this.active,
      missionPhase: this.missionPhase,
      cameraMode: this.cameraMode,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      currentFps: this.currentFps,
      checkpointId: this.checkpointId,
      objectiveTextVi: this.objectiveTextVi,
      orbitMessageVi: this.orbitMessageVi,
      orbitSpeaker: this.orbitSpeaker,
      feedbackTone: this.feedbackTone,
      inScannerZone: this.inScannerZone,
      conveyorWindowOpen: this.conveyorWindowOpen,
      conveyorCycleProgress: this.conveyorCycleProgress,
      loadedMassKg: this.loadedMassKg,
      targetMassKg: this.targetMassKg,
      loadedCratesCount: this.loadedCratesCount,
      requiredCratesCount: this.requiredCratesCount,
      wrongAttempts: this.wrongAttempts,
      maxWrongAttempts: this.maxWrongAttempts,
      remainingTimeSeconds: Math.ceil(this.remainingTimeSeconds),
      shortcutUnlocked: this.shortcutUnlocked,
      holoCrateCollected: this.holoCrateCollected,
      exitGateOpen: this.exitGateOpen,
      aimedCrate: aimedNode ? { ...aimedNode.state } : null,
      allCrates: this.crates.map((c) => ({ ...c.state })),
      reticleX: this.reticleX,
      reticleY: this.reticleY,
      tieredHintVi: this.tieredHintVi,
      evidence: { ...this.evidence },
    };
  }

  private clearVault() {
    while (this.rootGroup.children.length > 0) {
      const child = this.rootGroup.children[0];
      this.rootGroup.remove(child);
    }
    if (this.scaleTexture) {
      this.scaleTexture.dispose();
      this.scaleTexture = null;
    }
  }

  public dispose() {
    this.clearVault();
    if (this.shadowTex) {
      this.shadowTex.dispose();
      this.shadowTex = null;
    }
    if (this.bumpTex) {
      this.bumpTex.dispose();
      this.bumpTex = null;
    }
  }
}
