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

export const M12_THERMAL_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'THERM_HOT_ZONE',
    code: 'THERM-GEOTHERMAL-HOT',
    titleVi: 'Bộ Trao Đổi Địa Nhiệt (T = 85°C)',
    rawLabelText: 'T = 85 °C (Phân tử chuyển động nhanh -> Nhiệt năng lớn)',
    displayedSymbol: 'E_nhiệt',
    rawValueText: '85 °C (Nhiệt năng cao)',
    readoutVi: 'T = 85 °C: Phân tử chuyển động hỗn loạn nhanh, nhiệt năng lớn',
    numericValue: 85,
    unit: '°C',
    isValidTarget: true,
    scientificNoteVi:
      'Nhiệt năng là tổng động năng của các phân tử cấu tạo nên vật. Nhiệt độ càng cao thì các phân tử chuyển động càng nhanh và nhiệt năng càng lớn.',
    colorHex: 0xf97316,
    accentHex: '#fb923c',
  },
  {
    id: 'THERM_COLD_ZONE',
    code: 'THERM-CRYO-COLD',
    titleVi: 'Ống Dẫn Khí Hóa Lỏng (T = -15°C)',
    rawLabelText: 'T = -15 °C (Phân tử chuyển động chậm -> Nhận nhiệt)',
    displayedSymbol: 'E_nhiệt',
    rawValueText: '-15 °C',
    readoutVi: 'T = -15 °C: Truyền nhiệt từ vật nóng hơn sang ống lạnh',
    numericValue: -15,
    unit: '°C',
    isValidTarget: true,
    scientificNoteVi:
      'Nhiệt năng truyền tự phát từ vật có nhiệt độ cao sang vật có nhiệt độ thấp hơn cho đến khi đạt cân bằng nhiệt.',
    colorHex: 0x06b6d4,
    accentHex: '#22d3ee',
  },
  {
    id: 'THERM_DISTRACTOR',
    code: 'THERM-DIST-PRESSURE',
    titleVi: 'Áp Suất Đường Ống Khí (Nhãn Nhiễu)',
    rawLabelText: 'p = 150 kPa (Áp suất chất khí)',
    displayedSymbol: 'p',
    rawValueText: '150 kPa',
    readoutVi: 'CẢNH BÁO: Ký hiệu p là Áp suất (Pascal), KHÔNG phải Nhiệt năng!',
    numericValue: null,
    unit: 'kPa',
    isValidTarget: false,
    distractorReasonVi:
      'Đại lượng p (đơn vị Pa, kPa) là Áp suất, KHÔNG phải Nhiệt năng hay Nội năng! Nhiệt năng liên quan đến nhiệt độ và chuyển động phân tử.',
    scientificNoteVi:
      'Nhiệt năng phụ thuộc vào nhiệt độ của vật. Áp suất là độ lớn của áp lực trên một đơn vị diện tích bị ép.',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'THERM_WORK_UNIT',
    code: 'THERM-WORK-FRICTION',
    titleVi: 'Khối Biến Đổi Nhiệt Bằng Thực Hiện Công',
    rawLabelText: 'A = 1500 J (Thực hiện công làm nóng vật)',
    displayedSymbol: 'A_công',
    rawValueText: '1500 J (Thực hiện công)',
    readoutVi: 'Ma sát cơ học chuyển công A thành nhiệt năng làm tăng nhiệt độ',
    numericValue: 1500,
    unit: 'J',
    isValidTarget: true,
    scientificNoteVi:
      'Có hai cách làm thay đổi nhiệt năng của một vật: Thực hiện công (như cọ xát) và Truyền nhiệt.',
    colorHex: 0xeab308,
    accentHex: '#facc15',
  },
  {
    id: 'THERM_INTERNAL_CORE',
    code: 'THERM-CORE-BALANCE',
    titleVi: 'Lõi Cân Bằng Nội Năng Nova-8',
    rawLabelText: 'U_nội = E_động + E_thế (Nội năng hệ)',
    displayedSymbol: 'U_nội',
    rawValueText: 'Cân bằng nhiệt động',
    readoutVi: 'Tổng động năng và thế năng phân tử ổn định ở mức an toàn',
    numericValue: 100,
    unit: '%',
    isValidTarget: true,
    scientificNoteVi:
      'Nội năng của một vật là tổng động năng của các phân tử cấu tạo nên vật và thế năng tương tác giữa chúng.',
    colorHex: 0xec4899,
    accentHex: '#f472b6',
  },
];

interface ThermalMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  podMesh: THREE.Mesh;
}

export class M12ThermalEnergyController implements IMissionController {
  public readonly id: MissionId = 'M12_THERMAL_ENERGY';
  public readonly titleVi: string = 'M12 · NĂNG LƯỢNG NHIỆT & NỘI NĂNG';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: ThermalMeshNode[] = [];
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
      runId: `M12_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedThermalZones: false,
        stabilizedThreeThermalNodes: false,
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

    this.buildThermalNodes();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'NĂNG LƯỢNG NHIỆT & NỘI NĂNG',
      '0 / 3 BỘ ỔN ĐỊNH ĐÃ KÍCH HOẠT',
      'Nhiệt độ cao -> Phân tử chuyển động nhanh -> Nhiệt năng lớn'
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

  private buildThermalNodes() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M12_THERMAL_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.2, 1.2);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.85, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
      );
      plinth.position.y = 0.175;

      let podMesh: THREE.Mesh;

      if (spec.id === 'THERM_HOT_ZONE') {
        // Finned geothermal copper heat-pipe radiator
        const heatPipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 1.4, 16),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.2 })
        );
        heatPipe.position.y = 0.85;

        // Aluminium radial cooling fins
        const finMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 });
        for (let y = 0.35; y <= 1.35; y += 0.15) {
          const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 16), finMat);
          fin.position.y = y;
          g.add(fin);
        }
        g.add(heatPipe);
        podMesh = heatPipe;
      } else if (spec.id === 'THERM_COLD_ZONE') {
        // Cryogenic insulated conduit with frosty white rime
        const cryoConduit = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 1.4, 16),
          new THREE.MeshStandardMaterial({ color: 0xe0f2fe, metalness: 0.8, roughness: 0.1 })
        );
        cryoConduit.position.y = 0.85;

        const frostRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.42, 0.05, 8, 20),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
        );
        frostRing.rotation.x = Math.PI / 2;
        frostRing.position.y = 0.85;
        g.add(cryoConduit, frostRing);
        podMesh = cryoConduit;
      } else {
        // Friction work brake drum with glowing orange rotor
        const brakeRotor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 0.2, 24),
          new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0xd97706,
            emissiveIntensity: 0.6,
            metalness: 0.8,
          })
        );
        brakeRotor.position.y = 0.7;

        const caliper = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.35, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85 })
        );
        caliper.position.set(0.45, 0.7, 0);
        g.add(brakeRotor, caliper);
        podMesh = brakeRotor;
      }

      g.add(plinth);
      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(podMesh);

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
        podMesh,
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

    ctx.fillStyle = '#220d04';
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

    ctx.fillStyle = '#ffedd5';
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

    (node.podMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;

    onBonusCoinsAwarded?.(
      20,
      `Đã ổn định ${node.spec.titleVi}! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'NĂNG LƯỢNG NHIỆT & NỘI NĂNG',
      `${this.completedCount} / 3 BỘ ỔN ĐỊNH HOẠT ĐỘNG`,
      `Trạng thái: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.stabilizedThreeThermalNodes = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Cân bằng nhiệt nội năng thung lũng hoàn tất — Cổng Vùng Nhiệt Mở! (+50 Xu)'
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
        ? 'Cổng vùng nhiệt đã mở! Lái JetBot tiến vào cổng.'
        : `Quản lý tải nhiệt và kích hoạt 3 bộ ổn định nội năng (${this.completedCount}/3 bộ).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Rất tốt! Nhiệt độ vật càng cao thì các phân tử chuyển động càng nhanh và nhiệt năng càng lớn.'
        : 'Nhiệt năng là tổng động năng của các phân tử cấu tạo nên vật. Tránh nhầm lẫn với Áp suất p = 150 kPa!',
      orbitSpeaker: 'ORBIT',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'bộ',
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
