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
import { createThermalExpansionRig } from './proceduralLabModels';

const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _worldScratchA = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export const M15_EXPANSION_SPECS: MissionTargetItemSpec[] = [
  {
    id: 'EXP_SOLID_JOINT',
    code: 'EXP-SOLID-EXPANSION-JOINT',
    titleVi: 'Khe Co Giãn Ray Thép Cầu (Chất rắn)',
    rawLabelText: 'CHẤT RẮN NỞ VÌ NHIỆT (Khe hở + con lăn trượt)',
    displayedSymbol: 'Delta L_rắn',
    rawValueText: 'Khe co giãn 5 cm',
    readoutVi: 'Chất rắn nở dài khi nhiệt độ tăng; để khe hở và gối lăn tránh cong vênh',
    numericValue: 5,
    unit: 'cm',
    isValidTarget: true,
    scientificNoteVi:
      'Chất rắn nở ra khi nóng lên, co lại khi lạnh đi. Đầu cầu sắt luôn được đặt trên các con lăn và có khe co giãn để thanh ray nở tự do khi thời tiết nắng nóng.',
    colorHex: 0xf59e0b,
    accentHex: '#fbbf24',
  },
  {
    id: 'EXP_LIQUID_COLUMN',
    code: 'EXP-LIQUID-THERMOMETER',
    titleVi: 'Ống Cột Mức Chất Lỏng (Nhiệt kế)',
    rawLabelText: 'CHẤT LỎNG NỞ VÌ NHIỆT (Delta V_lỏng > Delta V_rắn)',
    displayedSymbol: 'Delta V_lỏng',
    rawValueText: 'Nở thể tích chất lỏng',
    readoutVi: 'Chất lỏng nở vì nhiệt nhiều hơn chất rắn: cột chất lỏng dâng cao',
    numericValue: 15,
    unit: 'mL',
    isValidTarget: true,
    scientificNoteVi:
      'Chất lỏng nở vì nhiệt nhiều hơn chất rắn. Ứng dụng chế tạo nhiệt kế chất lỏng (thủy ngân hoặc rượu cồn). Khi nóng lên, chất lỏng nở nhiều hơn vỏ thủy tinh nên mực chất lỏng dâng lên.',
    colorHex: 0x06b6d4,
    accentHex: '#22d3ee',
  },
  {
    id: 'EXP_DISTRACTOR',
    code: 'EXP-DIST-MASS-CHANGE',
    titleVi: 'Khối Lượng Tăng Khi Nóng (Nhãn Nhiễu)',
    rawLabelText: 'm tăng khi nóng lên (Khối lượng thay đổi)',
    displayedSymbol: 'm_sai',
    rawValueText: 'm tăng thêm 2 kg',
    readoutVi: 'CẢNH BÁO: Khi nở vì nhiệt, khối lượng m KHÔNG ĐỔI, chỉ có thể tích V tăng!',
    numericValue: null,
    unit: 'kg',
    isValidTarget: false,
    distractorReasonVi:
      'Khi một vật nở ra vì nhiệt, số lượng phân tử không đổi nên Khối lượng m KHÔNG ĐỔI! Chỉ có Thể tích V tăng lên khiến Khối lượng riêng D = m/V giảm đi.',
    scientificNoteVi:
      'Sự nở vì nhiệt chỉ làm tăng thể tích V và kích thước hình học, khối lượng m của vật luôn được bảo toàn.',
    colorHex: 0xef4444,
    accentHex: '#f87171',
  },
  {
    id: 'EXP_GAS_PISTON',
    code: 'EXP-GAS-CHAMBER',
    titleVi: 'Xy Lanh Piston Giãn Nở Khí',
    rawLabelText: 'CHẤT KHÍ NỞ VÌ NHIỆT NHIỀU NHẤT (Delta V_khí cực đại)',
    displayedSymbol: 'Delta V_khí',
    rawValueText: 'Delta V_khí > Delta V_lỏng > Delta V_rắn',
    readoutVi: 'Chất khí nở vì nhiệt nhiều nhất; các chất khí khác nhau nở như nhau',
    numericValue: 40,
    unit: 'mL',
    isValidTarget: true,
    scientificNoteVi:
      'Chất khí nở vì nhiệt nhiều hơn chất lỏng, chất lỏng nở vì nhiệt nhiều hơn chất rắn: Delta V_khí > Delta V_lỏng > Delta V_rắn. Đặc biệt, các chất khí khác nhau nở vì nhiệt giống nhau.',
    colorHex: 0x8b5cf6,
    accentHex: '#a78bfa',
  },
  {
    id: 'EXP_BIMETAL',
    code: 'EXP-BIMETALLIC-STRIP',
    titleVi: 'Băng Kép Rơ-le Nhiệt (Đồng - Thép)',
    rawLabelText: 'BĂNG KÉP TỰ NGẮT (Đồng nở nhiều hơn thép -> Cong về phía thép)',
    displayedSymbol: 'BăngKép',
    rawValueText: 'Rơ-le đóng ngắt mạch',
    readoutVi: 'Đồng nở nhiều hơn thép làm băng kép uốn cong, tự động ngắt điện',
    numericValue: 1,
    unit: 'switch',
    isValidTarget: true,
    scientificNoteVi:
      'Các chất rắn khác nhau nở vì nhiệt khác nhau. Băng kép gồm hai thanh kim loại có độ nở khác nhau ghép chặt vào nhau; khi bị hơ nóng sẽ uốn cong về phía kim loại nở ít hơn.',
    colorHex: 0xec4899,
    accentHex: '#f472b6',
  },
];

interface ExpansionMeshNode {
  spec: MissionTargetItemSpec;
  state: MissionTargetRuntimeState;
  group: THREE.Group;
  jointMesh: THREE.Mesh;
}

export class M15ThermalExpansionController implements IMissionController {
  public readonly id: MissionId = 'M15_THERMAL_EXPANSION';
  public readonly titleVi: string = 'M15 · SỰ NỞ VÌ NHIỆT (RẮN - LỎNG - KHÍ)';
  public readonly rootGroup = new THREE.Group();

  private stationCenter = new THREE.Vector3();
  private stationTangent = new THREE.Vector3(0, 0, 1);
  private stationRight = new THREE.Vector3(1, 0, 0);

  private isSoftwareGl = false;
  private maxAnisotropy = 1;
  private shadowTex: THREE.CanvasTexture | null = null;

  private items: ExpansionMeshNode[] = [];
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
      runId: `M15_RUN_${Date.now()}`,
      missionId: this.id,
      difficulty: this.difficulty,
      performanceTier: this.performanceTier,
      checkpointsReached: ['CP0'],
      objectiveFlags: {
        checkedExpansionJoints: false,
        calibratedThreeExpansionStates: false,
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

    this.buildExpansionJoints();
    this.buildConsole();
    this.buildExitGates();

    this.updateConsoleDisplay(
      'SỰ NỞ VÌ NHIỆT (RẮN - LỎNG - KHÍ)',
      '0 / 3 KHỚP CẦU ĐÃ CĂN CHỈNH',
      'Độ nở vì nhiệt: Khí > Lỏng > Rắn — Khối lượng m không đổi!'
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

  private buildExpansionJoints() {
    const positions: [number, number, number][] = [
      [-4.6, 0.8, -3.2],
      [-2.3, 0.8, -2.0],
      [0.0, 0.8, -1.6],
      [2.3, 0.8, -2.0],
      [4.6, 0.8, -3.2],
    ];

    M15_EXPANSION_SPECS.forEach((spec, idx) => {
      const pos = positions[idx];
      const g = new THREE.Group();
      g.position.set(pos[0], 0, pos[2]);
      this.addShadow(g, 1.4, 1.4);

      let jointMesh: THREE.Mesh;

      if (spec.id === 'EXP_SOLID_JOINT') {
        // Authentic Gravesande Ring & Ball apparatus
        const { group: gravRig, animatedPart } = createThermalExpansionRig('GRAVESANDE');
        gravRig.scale.set(0.65, 0.65, 0.65);
        g.add(gravRig);
        jointMesh = animatedPart;
      } else if (spec.id === 'EXP_BIMETALLIC' || !spec.isValidTarget) {
        // Authentic Bimetallic Strip with burner
        const { group: biRig, animatedPart } = createThermalExpansionRig('BIMETALLIC');
        biRig.scale.set(0.65, 0.65, 0.65);
        g.add(biRig);
        jointMesh = animatedPart;
      } else {
        // Bridge expansion finger joint on roller bearings
        const plinth = new THREE.Mesh(
          new THREE.CylinderGeometry(0.75, 0.85, 0.35, 16),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
        );
        plinth.position.y = 0.175;

        const joint = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.45, 0.8),
          new THREE.MeshStandardMaterial({
            color: spec.colorHex,
            metalness: 0.85,
            roughness: 0.25,
            emissive: spec.colorHex,
            emissiveIntensity: 0.25,
          })
        );
        joint.position.y = 0.6;

        // Cylindrical roller bearings underneath
        [-0.4, 0.4].forEach((rx) => {
          const roller = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.75, 12),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95 })
          );
          roller.rotation.x = Math.PI / 2;
          roller.position.set(rx, 0.42, 0);
          g.add(roller);
        });

        g.add(plinth, joint);
        jointMesh = joint;
      }

      g.userData = { targetId: spec.id };
      this.rootGroup.add(g);
      this.interactableMeshes.push(jointMesh);

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
        jointMesh,
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

    ctx.fillStyle = '#fde68a';
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

    (node.jointMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;

    onBonusCoinsAwarded?.(
      20,
      `Đã căn chỉnh khớp giãn nở ${node.spec.titleVi}! (+20 Xu)`
    );

    this.updateConsoleDisplay(
      'SỰ NỞ VÌ NHIỆT (RẮN - LỎNG - KHÍ)',
      `${this.completedCount} / 3 KHỚP CẦU ĐÃ CĂN CHỈNH`,
      `Khớp: ${node.spec.rawValueText}`
    );

    if (this.completedCount >= this.requiredCount) {
      this.exitGateOpen = true;
      this.evidence.objectiveFlags.calibratedThreeExpansionStates = true;
      this.evidence.objectiveFlags.activatedExitGate = true;
      soundEngine.playGateUnlock();
      onBonusCoinsAwarded?.(
        50,
        'Cả 3 khớp giãn nở đã ổn định — Cầu Vượt Tới Lõi NOVA-8 Đã Mở! (+50 Xu)'
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
        ? 'Cầu giãn nở đã ổn định! Lái JetBot tiến vào cổng lõi trung tâm.'
        : `Căn chỉnh 3 cơ cấu giãn nở vì nhiệt của chất rắn, lỏng, khí (${this.completedCount}/3).`,
      orbitMessageVi: this.exitGateOpen
        ? 'Tuyệt vời! Chất khí nở vì nhiệt nhiều hơn chất lỏng, chất lỏng nở nhiều hơn chất rắn.'
        : 'Sự nở vì nhiệt: Khi nóng lên, thể tích V tăng nhưng khối lượng m không đổi! Tránh nhầm m tăng.',
      orbitSpeaker: 'ORBIT',
      feedbackTone: this.exitGateOpen
        ? 'success'
        : this.wrongAttempts > 0
        ? 'warning'
        : 'info',
      inInteractiveZone: this.inInteractiveZone,
      currentProgressValue: this.completedCount,
      targetProgressValue: this.requiredCount,
      progressUnit: 'khớp',
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
