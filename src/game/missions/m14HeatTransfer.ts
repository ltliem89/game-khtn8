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
import { createHeatConductionApparatus } from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const M14_HEAT_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'HEAT_CONDUCTION',
    code: 'HEAT-TRANSFER-CONDUCTION',
    titleVi: 'Thanh Đồng Dẫn Nhiệt (Tiếp xúc chất rắn)',
    rawLabelText: 'DẪN NHIỆT (Kim loại đồng dẫn nhiệt tốt)',
    displayedSymbol: 'DẫnNhiệt',
    rawValueText: 'Dẫn nhiệt (Chất rắn)',
    readoutVi: 'Dẫn nhiệt: Nhiệt năng truyền dọc theo thanh kim loại tiếp xúc',
    numericValue: 1,
    unit: 'mode',
    isValidTarget: true,
    scientificNoteVi:
      'Dẫn nhiệt là sự truyền nhiệt năng từ phần này sang phần khác của một vật hoặc giữa các vật tiếp xúc với nhau. Chất rắn (nhất là kim loại) dẫn nhiệt tốt nhất.',
    colorHex: 0xf97316,
    accentHex: '#fb923c',
  },
  {
    id: 'HEAT_CONVECTION',
    code: 'HEAT-TRANSFER-CONVECTION',
    titleVi: 'Tháp Đối Lưu Luồng Khí Đứng',
    rawLabelText: 'ĐỐI LƯU (Dòng khí nóng bốc lên, khí lạnh chìm xuống)',
    displayedSymbol: 'ĐốiLưu',
    rawValueText: 'Đối lưu (Chất khí/lỏng)',
    readoutVi: 'Đối lưu: Truyền nhiệt bằng các dòng chất lỏng hoặc chất khí di chuyển',
    numericValue: 2,
    unit: 'mode',
    isValidTarget: true,
    scientificNoteVi:
      'Đối lưu là sự truyền nhiệt bằng các dòng chất lưu. Không khí nóng nở ra, khối lượng riêng giảm nên nhẹ hơn bay lên, không khí lạnh nặng hơn chìm xuống.',
    colorHex: 0x06b6d4,
    accentHex: '#22d3ee',
  },
  {
    id: 'HEAT_DISTRACTOR',
    code: 'HEAT-DIST-REFRACTION',
    titleVi: 'Tán Sắc Khúc Xạ Quang Học (Nhãn Nhiễu)',
    rawLabelText: 'Khúc xạ ánh sáng (Hiện tượng quang học)',
    displayedSymbol: 'n_quang',
    rawValueText: 'n = 1,33',
    readoutVi: 'CẢNH BÁO: Khúc xạ là hiện tượng ánh sáng, KHÔNG phải hình thức truyền nhiệt!',
    numericValue: null,
    unit: 'n',
    isValidTarget: false,
    distractorReasonVi:
      'Khúc xạ ánh sáng là hiện tượng tia sáng bị gãy khúc khi truyền qua mặt phân cách, KHÔNG phải 1 trong 3 hình thức truyền nhiệt (Dẫn nhiệt, Đối lưu, Bức xạ nhiệt)!',
    scientificNoteVi:
      'Ba hình thức truyền nhiệt chính trong KHTN 8 là: Dẫn nhiệt, Đối lưu và Bức xạ nhiệt.',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'HEAT_RADIATION',
    code: 'HEAT-TRANSFER-RADIATION',
    titleVi: 'Bộ Thu Bức Xạ Nhiệt (Tia nhiệt thẳng)',
    rawLabelText: 'BỨC XẠ NHIỆT (Truyền bằng tia nhiệt xuyên chân không)',
    displayedSymbol: 'BứcXạ',
    rawValueText: 'Bức xạ nhiệt (Chân không)',
    readoutVi: 'Bức xạ nhiệt: Truyền nhiệt bằng các tia nhiệt đi thẳng xuyên chân không',
    numericValue: 3,
    unit: 'mode',
    isValidTarget: true,
    scientificNoteVi:
      'Bức xạ nhiệt là sự truyền nhiệt bằng các tia nhiệt đi thẳng. Khác với dẫn nhiệt và đối lưu, bức xạ nhiệt có thể xảy ra cả trong chân không (như năng lượng Mặt Trời tới Trái Đất).',
    colorHex: 0xa855f7,
    accentHex: '#c084fc',
  },
  {
    id: 'HEAT_CONVECTION_WATER',
    code: 'HEAT-TRANSFER-WATER-CONV',
    titleVi: 'Ống Đối Lưu Nước Làm Mát',
    rawLabelText: 'ĐỐI LƯU CHẤT LỎNG (Tuần hoàn nước nóng chìm/nổi)',
    displayedSymbol: 'ĐốiLưu',
    rawValueText: 'Đối lưu chất lỏng',
    readoutVi: 'Đối lưu: Dòng chất lỏng đối lưu luân chuyển tản nhiệt động cơ',
    numericValue: 2,
    unit: 'mode',
    isValidTarget: true,
    scientificNoteVi:
      'Trong ấm đun nước hoặc két nước ô tô, truyền nhiệt diễn ra chủ yếu bằng hình thức đối lưu của dòng nước.',
    colorHex: 0x3b82f6,
    accentHex: '#60a5fa',
  },
];

interface HeatMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  chamberMesh: THREE.Mesh;
}

export class M14HeatTransferController implements IMissionController {
  public readonly id: MissionId = 'M14_HEAT_TRANSFER';
  public readonly titleVi: string = 'M14 · SỰ TRUYỀN NHIỆT (DẪN NHIỆT - ĐỐI LƯU - BỨC XẠ)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: HeatMeshNode[] = [];
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
      runId: `M14_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedHeatChambers: false,
        routedThreeHeatCores: false,
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

    this.buildHeatChambers();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'SỰ TRUYỀN NHIỆT',
      '0 / 3 LÕI ĐÃ ĐỊNH TUYẾN',
      'Phân biệt: Dẫn nhiệt (rắn), Đối lưu (lỏng/khí), Bức xạ (chân không)'
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

  private buildHeatChambers() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M14_HEAT_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.4, 1.4);

      let chamberMesh: THREE.Mesh;

      if (spec.id === 'HEAT_CONDUCTION') {
        // Authentic Conduction apparatus: Copper bar with wax drops and hanging pins
        const { group: condRig, copperBar } = createHeatConductionApparatus();
        condRig.scale.set(0.65, 0.65, 0.65);
        g.add(condRig);
        chamberMesh = copperBar;
      } else if (spec.id === 'HEAT_CONVECTION') {
        // Convection closed glass loop with circulating purple dye
        const glassLoop = new THREE.Mesh(
          new THREE.TorusGeometry(0.65, 0.12, 12, 32),
          new THREE.MeshStandardMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.65 })
        );
        glassLoop.position.y = 1.0;

        const burner = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.25, 0.4, 12),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        burner.position.set(0, 0.2, 0);
        g.add(glassLoop, burner);
        chamberMesh = glassLoop;
      } else if (spec.id === 'HEAT_RADIATION') {
        // Radiant parabolic reflector dish and thermopile receiver
        const dish = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 24, 16, 0, Math.PI * 2, 0, Math.PI / 3),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 })
        );
        dish.rotation.x = Math.PI / 2;
        dish.position.y = 1.0;

        const receiver = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12),
          new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 })
        );
        receiver.position.set(0, 1.0, 0.4);
        g.add(dish, receiver);
        chamberMesh = dish;
      } else {
        const plinth = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.85, 0.4, 16),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
        );
        plinth.position.y = 0.2;

        const defaultChamber = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.65, 0.85, 8),
          new THREE.MeshStandardMaterial({ color: spec.colorHex, metalness: 0.75, roughness: 0.25 })
        );
        defaultChamber.position.y = 0.8;
        g.add(plinth, defaultChamber);
        chamberMesh = defaultChamber;
      }

      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(chamberMesh);

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
        chamberMesh,
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

    ctx.fillStyle = '#1c0d02';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#fdba74';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(header, 256, 48);

    ctx.fillStyle = '#ffedd5';
    ctx.font = '800 48px "JetBrains Mono", monospace';
    ctx.fillText(mainVal, 256, 130);

    ctx.fillStyle = '#fed7aa';
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

    (node.chamberMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;

    onBonusCoinsAwarded?.(
      20,
      `Đã định tuyến chuẩn hình thức ${node.spec.titleVi}! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'SỰ TRUYỀN NHIỆT',
      `${this.completedCount} / 3 LÕI ĐÃ ĐỊNH TUYẾN`,
      `Hình thức: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.routedThreeHeatCores = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Cả 3 luồng trao đổi nhiệt đã vận hành hoàn hảo — Cổng Mở! (+50 Xu)'
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
        ? 'Cổng tuyến truyền nhiệt đã mở! Lái JetBot tiến vào cổng.'
        : `Phân loại và kích hoạt 3 hình thức truyền nhiệt: Dẫn nhiệt, Đối lưu, Bức xạ nhiệt (${this.completedCount}/3).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Xuất sắc! Kim loại dẫn nhiệt tốt, chất lưu truyền nhiệt chủ yếu bằng đối lưu, bức xạ nhiệt truyền cả trong chân không.'
        : 'Ba hình thức truyền nhiệt: Dẫn nhiệt, Đối lưu và Bức xạ nhiệt. Khúc xạ là hiện tượng quang học, không phải truyền nhiệt!',
      orbitSpeaker: 'Dr. Linh',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'hình thức',
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
