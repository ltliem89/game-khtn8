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
  createAnalogueLabMeter,
  createFulcrumLeverApparatus,
  getDialScaleTexture,
} from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export type AbyssReactorPhase = 'PHASE_1_SKYLOCK' | 'PHASE_2_BUOYANCY' | 'PHASE_3_LEVER' | 'PHASE_4_CURRENT' | 'COMPLETE';

export const B02_BOSS_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'B02_P1_ATMOS',
    code: 'B02-SKYLOCK-ATMOS',
    titleVi: 'Hệ Khí Quyển Skylock (p0 = 101,3 kPa)',
    rawLabelText: 'p0 = 760 mmHg = 101300 Pa (Mở khoang khí)',
    displayedSymbol: 'p0',
    rawValueText: '101,3 kPa',
    readoutVi: 'Áp suất khí quyển chuẩn p0 cân bằng áp suất khoang Skylock',
    numericValue: 101.3,
    unit: 'kPa',
    isValidTarget: true,
    scientificNoteVi:
      'Áp suất khí quyển p0 tác dụng theo mọi hướng; cân bằng áp suất bên trong và bên ngoài giúp khoang Skylock mở an toàn.',
    colorHex: 0x38bdf8,
    accentHex: '#7dd3fc',
  },
  {
    id: 'B02_P2_BUOYANCY',
    code: 'B02-RAFT-ARCHIMEDES',
    titleVi: 'Bè Nâng Phao Nổi (FA = d . V)',
    rawLabelText: 'FA = d_nuoc . V = 10000 . 0,5 = 5000 N',
    displayedSymbol: 'FA',
    rawValueText: '5000 N',
    readoutVi: 'Lực đẩy Archimedes FA = 5000 N cân bằng tải trọng bè',
    numericValue: 5000,
    unit: 'N',
    isValidTarget: true,
    scientificNoteVi:
      'Lực đẩy Archimedes FA = d . V hướng thẳng đứng lên trên giúp bè thiết bị nổi cân bằng trên mặt nước ngầm canyon.',
    colorHex: 0x06b6d4,
    accentHex: '#22d3ee',
  },
  {
    id: 'B02_P3_LEVER',
    code: 'B02-CRANE-LEVER',
    titleVi: 'Cơ Cấu Đòn Bẩy & Cánh Tay Đòn (OO1 > OO2)',
    rawLabelText: 'OO1 = 3 m, OO2 = 0,6 m -> Lợi 5 lần lực',
    displayedSymbol: 'M',
    rawValueText: 'OO1/OO2 = 5, M = 150 N.m',
    readoutVi: 'OO1 > OO2 và Moment M = F . d giúp nạy chốt khóa buồng phản ứng',
    numericValue: 150,
    unit: 'N.m',
    isValidTarget: true,
    scientificNoteVi:
      'Kết hợp Moment lực M = F . d và cánh tay đòn OO1 > OO2 tạo lực cực đại nhấc khối khóa chốt lõi.',
    colorHex: 0xf59e0b,
    accentHex: '#fbbf24',
  },
  {
    id: 'B02_P4_CURRENT',
    code: 'B02-CIRCUIT-SERIES',
    titleVi: 'Mạch Khởi Động Lõi (Ampe kế nối tiếp)',
    rawLabelText: 'I = 2,5 A (Ampe kế nối tiếp vào cuộn kích từ)',
    displayedSymbol: 'I',
    rawValueText: '2,5 A (2500 mA)',
    readoutVi: 'Cường độ dòng điện kích từ I = 2,5 A khởi động chu trình Abyss Reactor',
    numericValue: 2.5,
    unit: 'A',
    isValidTarget: true,
    scientificNoteVi:
      'Ampe kế mắc nối tiếp kiểm soát dòng điện định mức I = 2,5 A, bảo đảm lõi Abyss Reactor vận hành an toàn.',
    colorHex: 0x6366f1,
    accentHex: '#818cf8',
  },
];

export class B02AbyssReactorController implements IMissionController {
  public readonly id: MissionId = 'B02_ABYSS_REACTOR';
  public readonly titleVi: string = 'B02 · LÕI PHẢN ỨNG HẺM SÂU (ABYSS REACTOR)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private currentPhase: AbyssReactorPhase = 'PHASE_1_SKYLOCK';
  private systemStabilityPercent = 0; // 0 to 100%

  private reactorCoreMesh: THREE.Mesh | null = null;
  private reactorRings: THREE.Group | null = null;
  private skylockMesh: THREE.Mesh | null = null;
  private raftMesh: THREE.Mesh | null = null;
  private leverMesh: THREE.Mesh | null = null;
  private ammeterConsoleMesh: THREE.Mesh | null = null;

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
  private wrongAttempts = 0;
  private readonly maxWrongAttempts = 4;
  private remainingTimeSeconds = 360;

  private aimedItemId: string | null = 'B02_P1_ATMOS';
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
      runId: `B02_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP_B02_START'],
      objectiveFlags: {
        skylockRetrieved: false,
        buoyancyRaftRecovered: false,
        mechanicalLockReleased: false,
        currentRestarted: false,
        coreStabilized: false,
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
      missionPerformanceScore: 85,
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
      difficulty === 'ROOKIE' ? 420 : difficulty === 'PRO' ? 360 : 300;
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
      .addScaledVector(_upAxis, 1.8)
      .addScaledVector(this.stationTangent, -2.5);
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

    this.interactableMeshes = [];
    this.currentPhase = 'PHASE_1_SKYLOCK';
    this.systemStabilityPercent = 10;
    this.wrongAttempts = 0;
    this.exitGateOpen = false;
    this.aimedItemId = 'B02_P1_ATMOS';
    this.evidence = this.createFreshEvidence();

    this.buildAbyssChamber();
    this.buildPhaseModules();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'LÕI PHẢN ỨNG HẺM SÂU (B02)',
      'STABILITY: 10%',
      'Phase 1: Quét áp suất khí quyển Skylock p0'
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

  private buildAbyssChamber() {
    // Huge central reactor ring
    this.reactorRings = new THREE.Group();
    this.reactorRings.position.set(0, 4.0, -8.0);

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.4, 16, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.85,
        roughness: 0.2,
      })
    );

    const innerCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.1,
      })
    );
    this.reactorCoreMesh = innerCore;

    this.reactorRings.add(outerRing, innerCore);
    this.rootGroup.add(this.reactorRings);
  }

  private buildPhaseModules() {
    // 1. Skylock Module (Torricelli Vacuum Air Lock Ring)
    const skylockGroup = new THREE.Group();
    skylockGroup.position.set(-5.5, 0, -3.5);
    this.addShadow(skylockGroup, 1.6, 1.6);

    const skyMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 1.6, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x0284c7,
        emissiveIntensity: 0.35,
      })
    );
    skyMesh.position.y = 0.8;
    skyMesh.userData = { targetId: 'B02_P1_ATMOS' };

    // Vacuum seal ring
    const sealRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.08, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.5 })
    );
    sealRing.rotation.x = Math.PI / 2;
    sealRing.position.y = 1.62;

    skylockGroup.add(skyMesh, sealRing);
    this.skylockMesh = skyMesh;
    this.rootGroup.add(skylockGroup);
    this.interactableMeshes.push(skyMesh);

    // 2. Buoyancy Raft Module (Archimedes Flotation Pontoons)
    const raftGroup = new THREE.Group();
    raftGroup.position.set(-2.8, 0, -2.5);
    this.addShadow(raftGroup, 1.6, 1.6);

    const raft = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.45, 1.8),
      new THREE.MeshStandardMaterial({
        color: 0x0f766e,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0x0f766e,
        emissiveIntensity: 0.25,
      })
    );
    raft.position.y = 0.225;
    raft.userData = { targetId: 'B02_P2_BUOYANCY' };

    // Waterline demarcation ring
    const raftWaterline = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.04, 1.85),
      new THREE.MeshBasicMaterial({ color: 0x2dd4bf })
    );
    raftWaterline.position.y = 0.225;

    raftGroup.add(raft, raftWaterline);
    this.raftMesh = raft;
    this.rootGroup.add(raftGroup);
    this.interactableMeshes.push(raft);

    // 3. Lever Release Module (Knife-Edge Fulcrum Rig)
    const leverGroup = new THREE.Group();
    leverGroup.position.set(2.8, 0, -2.5);
    this.addShadow(leverGroup, 1.6, 1.6);

    const { group: leverRig, leverBeam } = createFulcrumLeverApparatus();
    leverRig.scale.set(0.55, 0.55, 0.55);
    leverGroup.add(leverRig);

    const lev = leverBeam.children[0] as THREE.Mesh;
    lev.userData = { targetId: 'B02_P3_LEVER' };
    this.leverMesh = lev;
    this.rootGroup.add(leverGroup);
    this.interactableMeshes.push(lev);

    // 4. Current Restart Module (High-Voltage Moving-Coil Ammeter Substation)
    const ammeterGroup = new THREE.Group();
    ammeterGroup.position.set(5.5, 0, -3.5);
    this.addShadow(ammeterGroup, 1.6, 1.6);

    const { group: meterRig, setReadingValue } = createAnalogueLabMeter('ammeter');
    meterRig.scale.set(0.65, 0.65, 0.65);
    meterRig.position.y = 0.3;
    setReadingValue(2.5, 3.0);

    const ammeter = meterRig.children[0] as THREE.Mesh;
    ammeter.userData = { targetId: 'B02_P4_CURRENT' };
    ammeterGroup.add(meterRig);
    this.ammeterConsoleMesh = ammeter;
    this.rootGroup.add(ammeterGroup);
    this.interactableMeshes.push(ammeter);
  }

  private buildConsole() {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-7.5, 0, -5.0);
    consoleGroup.rotation.y = 0.45;
    this.addShadow(consoleGroup, 2.0, 2.0);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.3, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    base.position.y = 0.15;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 4.0, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 })
    );
    pillar.position.set(0, 2.0, 0);

    this.consoleCanvas = document.createElement('canvas');
    this.consoleCanvas.width = 512;
    this.consoleCanvas.height = 256;
    this.consoleTexture = new THREE.CanvasTexture(this.consoleCanvas);
    this.consoleTexture.colorSpace = THREE.SRGBColorSpace;
    this.consoleTexture.anisotropy = this.maxAnisotropy;

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 2.4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    housing.position.set(0, 4.0, 0);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 2.2),
      new THREE.MeshBasicMaterial({ map: this.consoleTexture })
    );
    screen.position.set(0, 4.0, 0.14);

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

    ctx.fillStyle = '#67e8f9';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#bae6fd';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subNote.slice(0, 48), 256, 202);

    this.consoleTexture.needsUpdate = true;
  }

  private buildExitGates() {
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.85,
      roughness: 0.2,
    });
    const leftG = new THREE.Group();
    leftG.position.set(-2.0, 0, 4.0);
    const leftDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 5.5, 0.4),
      gateMat
    );
    leftDoor.position.y = 2.75;
    leftG.add(leftDoor);

    const rightG = new THREE.Group();
    rightG.position.set(2.0, 0, 4.0);
    const rightDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 5.5, 0.4),
      gateMat
    );
    rightDoor.position.y = 2.75;
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
    this.aimedItemId = id;
    this.triggerSciencePulseOnAimed();
  }

  public triggerSciencePulseOnAimed() {
    soundEngine.playSciencePulse();
    this.pendingImpactCallback?.(0.04, 0.15);
    this.evidence.pulseTagCount += 1;
    this.evidence.interactionCount += 1;
  }

  public interactWithAimed(
    onBonusCoinsAwarded?: (coins: number, reasonVi: string) => void
  ) {
    this.evidence.interactionCount += 1;

    switch (this.currentPhase) {
      case 'PHASE_1_SKYLOCK':
        this.systemStabilityPercent = 35;
        this.evidence.objectiveFlags.skylockRetrieved = true;
        this.currentPhase = 'PHASE_2_BUOYANCY';
        this.aimedItemId = 'B02_P2_BUOYANCY';
        soundEngine.playCargoLoadSuccess();
        this.pendingImpactCallback?.(0.06, 0.25);
        onBonusCoinsAwarded?.(25, 'Phase 1: Áp suất khí quyển p0 ổn định! (+25 Xu)');
        this.updateConsoleDisplay(
          'LÕI PHẢN ỨNG HẺM SÂU (B02)',
          'STABILITY: 35%',
          'Phase 2: Kích hoạt bè phao Archimedes FA = d . V'
        );
        break;

      case 'PHASE_2_BUOYANCY':
        this.systemStabilityPercent = 60;
        this.evidence.objectiveFlags.buoyancyRaftRecovered = true;
        this.currentPhase = 'PHASE_3_LEVER';
        this.aimedItemId = 'B02_P3_LEVER';
        soundEngine.playCargoLoadSuccess();
        this.pendingImpactCallback?.(0.06, 0.25);
        onBonusCoinsAwarded?.(25, 'Phase 2: Lực nổi Archimedes đã cứu bè! (+25 Xu)');
        this.updateConsoleDisplay(
          'LÕI PHẢN ỨNG HẺM SÂU (B02)',
          'STABILITY: 60%',
          'Phase 3: Bố trí đòn bẩy OO1 > OO2 giải phóng chốt'
        );
        break;

      case 'PHASE_3_LEVER':
        this.systemStabilityPercent = 85;
        this.evidence.objectiveFlags.mechanicalLockReleased = true;
        this.currentPhase = 'PHASE_4_CURRENT';
        this.aimedItemId = 'B02_P4_CURRENT';
        soundEngine.playCargoLoadSuccess();
        this.pendingImpactCallback?.(0.06, 0.25);
        onBonusCoinsAwarded?.(25, 'Phase 3: Cơ cấu đòn bẩy mở chốt khóa! (+25 Xu)');
        this.updateConsoleDisplay(
          'LÕI PHẢN ỨNG HẺM SÂU (B02)',
          'STABILITY: 85%',
          'Phase 4: Mắc Ampe kế nối tiếp kích khởi dòng I = 2,5 A'
        );
        break;

      case 'PHASE_4_CURRENT':
        this.systemStabilityPercent = 100;
        this.evidence.objectiveFlags.currentRestarted = true;
        this.evidence.objectiveFlags.coreStabilized = true;
        this.currentPhase = 'COMPLETE';
        this.exitGateOpen = true;
        soundEngine.playGateUnlock();
        this.pendingImpactCallback?.(0.08, 0.4);
        onBonusCoinsAwarded?.(
          100,
          'BOSS B02 HOÀN TẤT: Abyss Reactor đã tái kích hoạt an toàn! (+100 Xu)'
        );
        this.updateConsoleDisplay(
          'LÕI PHẢN ỨNG HẺM SÂU (B02)',
          'STABILITY: 100% ONLINE',
          'Tất cả 4 hệ thống M06-M10 đã đồng bộ an toàn!'
        );
        break;

      case 'COMPLETE':
        break;
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

    // Rotate reactor core
    if (this.reactorRings) {
      this.reactorRings.rotation.z += dt * 0.45;
      this.reactorRings.rotation.y += dt * 0.3;
    }

    const distToCenter = roverPos.distanceTo(
      _worldScratchA.copy(this.stationCenter).addScaledVector(this.stationTangent, -6.0)
    );
    this.inInteractiveZone = distToCenter < 14.0;

    if (this.exitGateLeft && this.exitGateRight) {
      const targetLX = this.exitGateOpen ? -3.8 : -2.0;
      const targetRX = this.exitGateOpen ? 3.8 : 2.0;
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
      const targetId = hits[0].object.userData?.targetId;
      if (targetId && targetId !== this.aimedItemId) {
        this.aimedItemId = targetId;
        soundEngine.playTargetLock();
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
    const activeSpec = B02_BOSS_SPECS.find((s) => s.id === this.aimedItemId) || B02_BOSS_SPECS[0];
    const aimedState: MissionTargetRuntimeState = {
      spec: activeSpec,
      scanned: true,
      taggedWithPulse: true,
      activatedOrLoaded: this.systemStabilityPercent === 100,
      rejectedAttemptCount: this.wrongAttempts,
      worldPosition: { x: 0, y: 0, z: 0 },
    };

    const allStates: MissionTargetRuntimeState[] = B02_BOSS_SPECS.map((s) => ({
      spec: s,
      scanned: true,
      taggedWithPulse: false,
      activatedOrLoaded: this.systemStabilityPercent >= 85,
      rejectedAttemptCount: 0,
      worldPosition: { x: 0, y: 0, z: 0 },
    }));

    const phaseNumber =
      this.currentPhase === 'PHASE_1_SKYLOCK'
        ? 1
        : this.currentPhase === 'PHASE_2_BUOYANCY'
        ? 2
        : this.currentPhase === 'PHASE_3_LEVER'
        ? 3
        : this.currentPhase === 'PHASE_4_CURRENT'
        ? 4
        : 4;

    return {
      active: this.active,
      missionId: this.id,
      missionTitleVi: this.titleVi,
      missionPhase: this.exitGateOpen ? 'success' : 'boss_phase',
      cameraMode: this.cameraMode,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      currentFps: this.currentFps,
      checkpointId: 'CP_B02_START',
      objectiveTextVi: this.exitGateOpen
        ? 'LÕI ABYSS REACTOR ĐÃ ỔN ĐỊNH HOÀN TOÀN! Tiến qua cổng năng lượng.'
        : `[PHASE ${phaseNumber}/4] ${activeSpec.titleVi}: Khôi phục hệ thống (${this.systemStabilityPercent}% Độ ổn định).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Xuất sắc! Bạn đã tổng hợp thành công Áp suất khí quyển, Archimedes, Moment, Đòn bẩy và Cường độ dòng điện!'
        : 'ORBIT: Giải quyết tuần tự 4 sự cố để phục hồi độ ổn định Abyss Reactor lên 100%.',
      orbitSpeaker: 'ORBIT',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.systemStabilityPercent,
      targetProgressValue: 100,
      progressUnit: '%',
      completedItemsCount: phaseNumber - (this.exitGateOpen ? 0 : 1),
      requiredItemsCount: 4,
      wrongAttempts: this.wrongAttempts,
      maxWrongAttempts: this.maxWrongAttempts,
      remainingTimeSeconds: this.remainingTimeSeconds,
      shortcutUnlocked: false,
      holoCrateCollected: false,
      exitGateOpen: this.exitGateOpen,
      aimedItem: aimedState,
      allItems: allStates,
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
