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
import { soundEngine } from '../audio/soundEngine';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _projVec = new THREE.Vector3();

interface CrateMeshNode {
  spec: CargoCrateSpec;
  state: CargoCrateRuntimeState;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  outlineMesh: THREE.Mesh;
  pulseRingMesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  conveyorSlotIndex: number;
}

interface OverheadCraneHazard {
  group: THREE.Group;
  containerMesh: THREE.Mesh;
  telegraphRing: THREE.Mesh;
  centerPos: THREE.Vector3;
  cycleOffset: number;
  isDangerDown: boolean;
  warnedThisCycle: boolean;
}

export class M01MassVaultController {
  public readonly rootGroup = new THREE.Group();
  private stationCenter = new THREE.Vector3(0, 0, 44);
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;

  private crates: CrateMeshNode[] = [];
  private interactableMeshes: THREE.Object3D[] = [];
  private craneHazards: OverheadCraneHazard[] = [];
  private conveyorSlats: THREE.Mesh[] = [];

  private scaleCanvas: HTMLCanvasElement | null = null;
  private scaleTexture: THREE.CanvasTexture | null = null;
  private lastScaleText = '';

  private shortcutGateLeft: THREE.Mesh | null = null;
  private shortcutGateRight: THREE.Mesh | null = null;
  private exitGateLeft: THREE.Mesh | null = null;
  private exitGateRight: THREE.Mesh | null = null;
  private exitBeaconMat: THREE.MeshBasicMaterial | null = null;
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

  private evidence: M01RunEvidence;

  constructor(isSoftwareGl: boolean, maxAnisotropy: number) {
    this.isSoftwareGl = isSoftwareGl;
    this.maxAnisotropy = maxAnisotropy;
    this.evidence = this.createFreshEvidence();
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

  public getScannerBayFocusPosition(): THREE.Vector3 {
    return this.localToWorld(0, 1.5, -1.5);
  }

  public getCrateWorldPosition(crateId: string): THREE.Vector3 | null {
    const found = this.crates.find((c) => c.spec.id === crateId);
    if (!found) return null;
    const pos = new THREE.Vector3();
    found.group.getWorldPosition(pos);
    return pos;
  }

  public selectAndInspectCrateById(crateId: string) {
    const node = this.crates.find((c) => c.spec.id === crateId);
    if (!node) return;
    this.aimedCrateId = crateId;
    this.markCrateScanned(node);
    this.triggerSciencePulseOnAimed();
  }

  private localToWorld(lx: number, ly: number, lz: number): THREE.Vector3 {
    return new THREE.Vector3()
      .copy(this.stationCenter)
      .addScaledVector(this.stationRight, lx)
      .addScaledVector(new THREE.Vector3(0, 1, 0), ly)
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

    // Reset runtime mission state for fresh build
    this.crates = [];
    this.interactableMeshes = [];
    this.craneHazards = [];
    this.conveyorSlats = [];
    this.loadedMassKg = 0;
    this.loadedCratesCount = 0;
    this.wrongAttempts = 0;
    this.shortcutUnlocked = false;
    this.holoCrateCollected = false;
    this.exitGateOpen = false;
    this.checkpointId = 'CP0';
    this.evidence = this.createFreshEvidence();

    // 1. Industrial Megastructure Columns, Roof Trusses & Skylight Volumetric Shafts
    this.buildWarehouseMegastructure();

    // 2. Sorting Lanes A / B / C & Overhead Crane Hazard with 2s Floor Telegraph Ring
    this.buildSortingLanesAndHazards();

    // 3. Scanner Bay (CP1), Electronic Balance Platform & Digital Scale Readout
    this.buildScannerBayAndElectronicScale();

    // 4. Moving Conveyor Belt (CP2) & 5 Interactive Cargo Crates
    this.buildConveyorAndCargoCrates();

    // 5. Shortcut Maintenance Gate + Bonus Holo-Crate & Main Exit Gate
    this.buildShortcutAndExitGates();

    this.updateScaleDisplay(
      'CÂN ĐIỆN TỬ NOVA-8',
      '0,0 / 15,0 kg',
      'Quét 5 kiện hàng & nạp đúng 3 kiện Khối lượng (m)'
    );
  }

  private buildWarehouseMegastructure() {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.78,
      roughness: 0.32,
    });
    const hazardStripeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
      metalness: 0.4,
      roughness: 0.45,
    });

    // 6 pairs of steel I-beam columns spanning z = -34 to z = +8
    const zOffsets = [-34, -26, -18, -10, -2, 6];
    const xSpan = 14.2;

    zOffsets.forEach((zOff, idx) => {
      [-xSpan, xSpan].forEach((xPos) => {
        const col = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 11.5, 0.75),
          steelMat
        );
        col.position.set(xPos, 5.75, zOff);
        this.rootGroup.add(col);

        const baseShoe = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, 0.7, 1.15),
          hazardStripeMat
        );
        baseShoe.position.set(xPos, 0.35, zOff);
        this.rootGroup.add(baseShoe);
      });

      // Overhead roof truss beam
      const roofBeam = new THREE.Mesh(
        new THREE.BoxGeometry(xSpan * 2 + 1.4, 0.65, 0.65),
        steelMat
      );
      roofBeam.position.set(0, 11.2, zOff);
      this.rootGroup.add(roofBeam);

      // Amber warning beacon on alternating trusses
      if (idx % 2 === 0) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        beacon.position.set(0, 10.75, zOff);
        this.rootGroup.add(beacon);
      }

      // Skylight volumetric light shaft (translucent cone)
      if (!this.isSoftwareGl && idx % 2 === 1) {
        const shaftGeo = new THREE.ConeGeometry(4.2, 11.0, 16, 1, true);
        const shaftMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.055,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.set((idx - 2) * 2.2, 5.5, zOff);
        this.rootGroup.add(shaft);
      }
    });

    // Side warehouse shelving & stacked storage containers (Midground layer)
    const containerColors = [0x0369a1, 0x0f766e, 0x334155, 0xb45309];
    for (let i = 0; i < 4; i++) {
      const cMat = new THREE.MeshStandardMaterial({
        color: containerColors[i % containerColors.length],
        metalness: 0.55,
        roughness: 0.42,
      });
      const leftStack = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.5, 5.2),
        cMat
      );
      leftStack.position.set(-12.2, 1.25 + (i % 2) * 2.55, -28 + i * 7.5);
      this.rootGroup.add(leftStack);

      const rightStack = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.5, 5.2),
        cMat
      );
      rightStack.position.set(12.2, 1.25, -26 + i * 7.5);
      this.rootGroup.add(rightStack);
    }
  }

  private buildSortingLanesAndHazards() {
    // Sorting Lane floor chevrons (z = -28 to z = -14)
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

    // 2 Overhead Gantry Crane Hazards with 2-second Amber Floor Telegraph Rings
    const hazardPositions = [
      new THREE.Vector3(-2.4, 0, -24.5),
      new THREE.Vector3(2.4, 0, -17.5),
    ];

    hazardPositions.forEach((hPos, idx) => {
      const hGroup = new THREE.Group();
      hGroup.position.copy(hPos);

      const containerMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.65,
        roughness: 0.35,
      });
      const containerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1.8, 2.5),
        containerMat
      );
      containerMesh.position.y = 5.5;
      hGroup.add(containerMesh);

      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 6.0, 8),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
      );
      cable.position.y = 3.0;
      containerMesh.add(cable);

      const telegraphRing = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.65, 28),
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
        containerMesh,
        telegraphRing,
        centerPos: hPos.clone(),
        cycleOffset: idx * 3.1,
        isDangerDown: false,
        warnedThisCycle: false,
      });
    });
  }

  private buildScannerBayAndElectronicScale() {
    // Scanner Bay Floor Pad at z = -8.5 (CP1)
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

    // Electronic Weighing Platform & Digital Scale Display Board at (x = -7.8, z = -4.5)
    const scaleGroup = new THREE.Group();
    scaleGroup.position.set(-7.8, 0, -4.5);
    scaleGroup.rotation.y = 0.42;

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.35, 3.8),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        roughness: 0.25,
      })
    );
    platform.position.y = 0.18;
    scaleGroup.add(platform);

    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.12, 4.0),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    rim.position.y = 0.36;
    scaleGroup.add(rim);

    // Upright digital readout screen
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 4.2, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 })
    );
    pillar.position.set(0, 2.1, -1.6);
    scaleGroup.add(pillar);

    this.scaleCanvas = document.createElement('canvas');
    this.scaleCanvas.width = 512;
    this.scaleCanvas.height = 256;
    this.scaleTexture = new THREE.CanvasTexture(this.scaleCanvas);
    this.scaleTexture.colorSpace = THREE.SRGBColorSpace;
    this.scaleTexture.anisotropy = this.maxAnisotropy;

    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 2.2),
      new THREE.MeshBasicMaterial({ map: this.scaleTexture })
    );
    screenMesh.position.set(0, 4.1, -1.4);
    scaleGroup.add(screenMesh);

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
    // Moving Conveyor Belt at (x = 7.8, z = -4.5)
    const convGroup = new THREE.Group();
    convGroup.position.set(7.8, 0, -4.5);
    convGroup.rotation.y = -0.35;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.55, 9.6),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.75,
        roughness: 0.3,
      })
    );
    frame.position.y = 0.28;
    convGroup.add(frame);

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

    // 5 Interactive Cargo Crates arrayed in a semi-circle around the Scanner Bay
    const crateOffsets: [number, number, number][] = [
      [-5.2, 0.95, -1.8], // CRATE_A1: m = 2500 g (2.5 kg)
      [-2.6, 0.95, -0.5], // CRATE_B2: P = 50 N (Distractor)
      [0.0, 0.95, -0.2], // CRATE_C3: m = 5.0 kg
      [2.6, 0.95, -0.5], // CRATE_D4: V = 50 L (Distractor)
      [5.2, 0.95, -1.8], // CRATE_E5: m = 0.75 yến (7.5 kg)
    ];

    M01_CARGO_CRATE_SPECS.forEach((spec, idx) => {
      const [lx, ly, lz] = crateOffsets[idx] || [0, 0.95, -1];
      const crateGroup = new THREE.Group();
      crateGroup.position.set(lx, ly, lz);

      const labelTex = this.createCrateLabelTexture(spec);
      const bodyMat = new THREE.MeshStandardMaterial({
        map: labelTex,
        roughness: 0.35,
        metalness: 0.3,
      });

      const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 1.55, 1.55),
        bodyMat
      );
      bodyMesh.userData = { crateId: spec.id };
      crateGroup.add(bodyMesh);
      this.interactableMeshes.push(bodyMesh);

      const outlineMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.68, 1.68, 1.68),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.0,
        })
      );
      crateGroup.add(outlineMesh);

      const pulseRingMesh = new THREE.Mesh(
        new THREE.RingGeometry(1.05, 1.35, 24),
        new THREE.MeshBasicMaterial({
          color: spec.colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.0,
        })
      );
      pulseRingMesh.rotation.x = -Math.PI / 2;
      pulseRingMesh.position.y = -0.72;
      crateGroup.add(pulseRingMesh);

      this.rootGroup.add(crateGroup);

      const worldPos = this.localToWorld(lx, ly, lz);
      const runtimeState: CargoCrateRuntimeState = {
        spec,
        scanned: false,
        taggedWithPulse: false,
        loadedOnConveyor: false,
        rejectedAttemptCount: 0,
        worldPosition: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
      };

      this.crates.push({
        spec,
        state: runtimeState,
        group: crateGroup,
        bodyMesh,
        outlineMesh,
        pulseRingMesh,
        basePosition: new THREE.Vector3(lx, ly, lz),
        conveyorSlotIndex: -1,
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
    // Shortcut Maintenance Gate on Left Lane (x = -6.8, z = -11.5) + Bonus Holo-Crate
    const shortcutGroup = new THREE.Group();
    shortcutGroup.position.set(-6.8, 0, -11.5);

    const gateMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.45,
      metalness: 0.6,
      roughness: 0.3,
    });
    this.shortcutGateLeft = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.8, 0.25),
      gateMat
    );
    this.shortcutGateLeft.position.set(-0.75, 1.4, 0);
    this.shortcutGateRight = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.8, 0.25),
      gateMat
    );
    this.shortcutGateRight.position.set(0.75, 1.4, 0);
    shortcutGroup.add(this.shortcutGateLeft, this.shortcutGateRight);

    // Bonus Holo-Crate behind Shortcut Gate
    this.holoCrateMesh = new THREE.Group();
    this.holoCrateMesh.position.set(-6.8, 1.1, -8.2);
    const holoCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 0),
      new THREE.MeshStandardMaterial({
        color: 0x2dd4bf,
        emissive: 0x0d9488,
        emissiveIntensity: 0.85,
        wireframe: false,
      })
    );
    const holoRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.08, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    this.holoCrateMesh.add(holoCore, holoRing);
    this.rootGroup.add(shortcutGroup, this.holoCrateMesh);

    // Main Sliding Exit Gate across Station 1 Trigger (x = 0, z = +2.4)
    const exitGroup = new THREE.Group();
    exitGroup.position.set(0, 0, 2.4);

    const exitDoorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0xbe123c,
      emissiveIntensity: 0.35,
      metalness: 0.75,
      roughness: 0.28,
    });

    this.exitGateLeft = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 4.2, 0.45),
      exitDoorMat
    );
    this.exitGateLeft.position.set(-2.15, 2.1, 0);

    this.exitGateRight = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 4.2, 0.45),
      exitDoorMat
    );
    this.exitGateRight.position.set(2.15, 2.1, 0);

    this.exitBeaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const exitHeader = new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 0.55, 0.65),
      this.exitBeaconMat
    );
    exitHeader.position.set(0, 4.45, 0);

    exitGroup.add(this.exitGateLeft, this.exitGateRight, exitHeader);
    this.rootGroup.add(exitGroup);
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

    // Track FPS smoothly
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

    // Countdown mission timer while active
    if (!this.exitGateOpen && this.remainingTimeSeconds > 0) {
      this.remainingTimeSeconds = Math.max(0, this.remainingTimeSeconds - dt);
      if (this.remainingTimeSeconds <= 0) {
        this.resetScannerBayOnFailure(
          'Hết thời gian hiệu chuẩn khoang cân! Hệ thống đưa bạn về Checkpoint CP1 (Khoang Quét) để thử lại.'
        );
      }
    }

    // 1. Animate Overhead Crane Hazards & Check Collision in Sorting Lanes
    this.craneHazards.forEach((haz) => {
      const cycle = (elapsed + haz.cycleOffset) % 6.0;
      // 0..2.5s: high up; 2.5..4.5s: 2-second Amber Telegraph Warning; 4.5..6.0s: lowered hazard
      const isTelegraph = cycle >= 2.5 && cycle < 4.5;
      const isDown = cycle >= 4.5;
      haz.isDangerDown = isDown;

      const ringMat = haz.telegraphRing.material as THREE.MeshBasicMaterial;
      if (isTelegraph) {
        ringMat.color.setHex(0xf59e0b);
        ringMat.opacity = 0.45 + Math.sin(elapsed * 16) * 0.35;
        const targetY = 5.5 - ((cycle - 2.5) / 2.0) * 1.5;
        haz.containerMesh.position.y = targetY;

        if (!haz.warnedThisCycle) {
          haz.warnedThisCycle = true;
          const worldHaz = this.localToWorld(
            haz.centerPos.x,
            0,
            haz.centerPos.z
          );
          if (roverPos.distanceTo(worldHaz) < 16) {
            soundEngine.playTelegraphWarning();
          }
        }
      } else if (isDown) {
        ringMat.color.setHex(0xf43f5e);
        ringMat.opacity = 0.85;
        haz.containerMesh.position.y = THREE.MathUtils.lerp(
          haz.containerMesh.position.y,
          1.15,
          dt * 10
        );

        // Check rover collision with lowered container
        const worldHaz = this.localToWorld(
          haz.centerPos.x,
          0,
          haz.centerPos.z
        );
        if (
          roverPos.distanceTo(worldHaz) < 2.25 &&
          this.collisionPenaltyCooldown <= 0
        ) {
          this.collisionPenaltyCooldown = 2.0;
          this.evidence.objectiveFlags.noCollisionBonus = false;
          this.evidence.drivingScore = Math.max(
            0,
            this.evidence.drivingScore - 5
          );
          onDrivingPenalty(5);
          soundEngine.playOffLaneWarning();
          this.orbitSpeaker = 'ORBIT';
          this.feedbackTone = 'warning';
          this.orbitMessageVi =
            'Cảnh báo va chạm kiện hàng cẩu (-5 điểm lái)! Hãy quan sát vòng cảnh báo màu cam 2 giây trên sàn.';
        }
      } else {
        haz.warnedThisCycle = false;
        ringMat.color.setHex(0x38bdf8);
        ringMat.opacity = 0.18;
        haz.containerMesh.position.y = THREE.MathUtils.lerp(
          haz.containerMesh.position.y,
          5.5,
          dt * 5
        );
      }
    });

    // 2. Animate Moving Conveyor Belt & Green Load Window
    this.conveyorCycleProgress = (elapsed * 0.28) % 1;
    // Conveyor window is open 85% of the cycle (Rookie/Pro friendly)
    this.conveyorWindowOpen =
      this.difficulty === 'ROOKIE' ? true : this.conveyorCycleProgress < 0.82;

    this.conveyorSlats.forEach((slat, idx) => {
      const offset = ((elapsed * 2.2 + idx * 0.9) % 9.0) - 4.5;
      slat.position.z = offset;
      const mat = slat.material as THREE.MeshStandardMaterial;
      mat.color.setHex(this.conveyorWindowOpen ? 0x10b981 : 0xf59e0b);
    });

    // 3. Check Rover proximity to Sorting Lanes & Scanner Bay (CP1)
    const scannerBayWorld = this.localToWorld(0, 0, -8.5);
    const distToScannerBay = Math.hypot(
      roverPos.x - scannerBayWorld.x,
      roverPos.z - scannerBayWorld.z
    );

    if (distToScannerBay < 26 && !this.evidence.objectiveFlags.reachedSortingLanes) {
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
          'JetBot đã vào Khoang Quét Cân Điện Tử! Nhấn phím C (hoặc nút Góc Nhìn FPS), rê tâm ngắm vào từng kiện hàng, nhấn F/Chuột để phát xung Science Pulse và nhấn E để nạp kiện hàng Khối lượng (m) lên băng chuyền.';
        soundEngine.playTargetLock();
      }
    }

    // 4. Check Bonus Holo-Crate pickup if Shortcut Gate is unlocked
    if (this.shortcutUnlocked && !this.holoCrateCollected && this.holoCrateMesh) {
      this.holoCrateMesh.rotation.y = elapsed * 2.6;
      const holoWorld = this.localToWorld(-6.8, 0, -8.2);
      if (Math.hypot(roverPos.x - holoWorld.x, roverPos.z - holoWorld.z) < 4.5) {
        this.holoCrateCollected = true;
        this.holoCrateMesh.visible = false;
        this.evidence.objectiveFlags.collectedHoloCrate = true;
        this.evidence.collectedIds.push('M01_HOLO_CRATE_01');
        onBonusCoinsAwarded(
          50,
          '🌟 Mở Cổng Tắt Bảo Trì & Thu thập Holo-Crate M01: +50 Xu Khoa Học!'
        );
      }
    }

    // 5. Raycast + Aim Assist for Cargo Crates
    this.updateCrateAimingAndVisuals(dt, elapsed, camera);

    // 6. Handle Science Pulse (F / Button) and Cargo Load Interaction (E / Button)
    if (justPressedPulse) {
      this.triggerSciencePulseOnAimed();
    }
    if (justPressedInteract) {
      this.interactWithAimedCrate(onBonusCoinsAwarded);
    }

    // 7. Animate Shortcut Gate & Main Exit Gate doors
    if (this.shortcutGateLeft && this.shortcutGateRight) {
      const targetLeftX = this.shortcutUnlocked ? -2.3 : -0.75;
      const targetRightX = this.shortcutUnlocked ? 2.3 : 0.75;
      this.shortcutGateLeft.position.x = THREE.MathUtils.lerp(
        this.shortcutGateLeft.position.x,
        targetLeftX,
        dt * 5
      );
      this.shortcutGateRight.position.x = THREE.MathUtils.lerp(
        this.shortcutGateRight.position.x,
        targetRightX,
        dt * 5
      );
    }

    if (this.exitGateLeft && this.exitGateRight) {
      const targetLeftX = this.exitGateOpen ? -5.8 : -2.15;
      const targetRightX = this.exitGateOpen ? 5.8 : 2.15;
      this.exitGateLeft.position.x = THREE.MathUtils.lerp(
        this.exitGateLeft.position.x,
        targetLeftX,
        dt * 4.5
      );
      this.exitGateRight.position.x = THREE.MathUtils.lerp(
        this.exitGateRight.position.x,
        targetRightX,
        dt * 4.5
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

    // Aim Assist in screen space if no direct raycast hit
    if (!newAimedId && (this.inScannerZone || this.cameraMode === 'fps_scanner')) {
      let bestScreenDist = 0.34;
      for (const node of this.crates) {
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

    // Update crate transforms and highlight outlines
    this.crates.forEach((node, idx) => {
      const isAimed = node.spec.id === this.aimedCrateId;
      const outMat = node.outlineMesh.material as THREE.MeshBasicMaterial;
      const pulseMat = node.pulseRingMesh.material as THREE.MeshBasicMaterial;

      if (node.state.loadedOnConveyor) {
        // Position loaded crate on the moving conveyor belt
        const slotZ = -2.2 + node.conveyorSlotIndex * 2.1;
        const targetPos = new THREE.Vector3(7.8, 1.35, -4.5 + slotZ);
        node.group.position.lerp(targetPos, dt * 6.5);
        node.group.rotation.y = elapsed * 0.8 + idx;
        outMat.opacity = 0.35;
        outMat.color.setHex(0x10b981);
      } else {
        node.group.position.x = THREE.MathUtils.lerp(
          node.group.position.x,
          node.basePosition.x,
          dt * 6
        );
        node.group.position.z = THREE.MathUtils.lerp(
          node.group.position.z,
          node.basePosition.z,
          dt * 6
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

      // Sync world coordinates for HUD
      const wp = new THREE.Vector3();
      node.group.getWorldPosition(wp);
      node.state.worldPosition = { x: wp.x, y: wp.y, z: wp.z };
    });
  }

  private markCrateScanned(node: CrateMeshNode) {
    soundEngine.playScanSweep();
    if (!node.state.scanned) {
      node.state.scanned = true;
      this.evidence.scanCount += 1;
      if (!this.evidence.interactionEvidence.scannedCrateIds.includes(node.spec.id)) {
        this.evidence.interactionEvidence.scannedCrateIds.push(node.spec.id);
      }
    }

    // Update Electronic Balance 3D Screen with live crate reading
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

    // Unlock Shortcut Maintenance Gate when all 5 labels are scanned
    const totalScanned = this.crates.filter((c) => c.state.scanned).length;
    if (totalScanned >= 5 && !this.shortcutUnlocked) {
      this.shortcutUnlocked = true;
      this.evidence.objectiveFlags.unlockedShortcutGate = true;
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
      // Fallback to first unloaded valid crate if player presses E without aiming
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

    // Check if crate is a valid Mass crate (m in kg/g/yến) vs Distractor (Weight P in N or Volume V in L)
    if (targetNode.spec.isValidMassTarget && targetNode.spec.massKg !== null) {
      targetNode.state.loadedOnConveyor = true;
      targetNode.conveyorSlotIndex = this.loadedCratesCount;
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
        }
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
      // Scientific Distractor rejected!
      targetNode.state.rejectedAttemptCount += 1;
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

      // Tiered Pedagogical Hint System (Level 1 -> Level 2 -> Level 3)
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
    score += this.loadedCratesCount * 10; // up to +30 for 3 valid crates
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
  }
}
