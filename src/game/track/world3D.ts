import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GameStatePhase,
  JetBotConfig,
  MapSetupConfig,
  StationProgressState,
  StationRecord,
} from '../../types/game';
import { InputManager } from '../input/inputManager';
import {
  ObstacleCollider,
  TrackNodeSample,
  VehiclePhysicsEngine,
  VehicleTelemetry,
} from '../vehicle/vehiclePhysics';
import {
  createJetBotRover,
  createRadialShadowTexture,
  createRoadSurfaceTexture,
  createStationStructure,
  JetBotRig,
} from './proceduralModels';
import { soundEngine } from '../audio/soundEngine';
import { M01MassVaultController } from '../missions/m01MassVault';
import { MissionDispatcher } from '../missions/missionDispatcher';
import {
  CameraViewMode,
  DifficultyLayer,
  M01HudSnapshot,
  PerformanceTier,
  UniversalMissionHudSnapshot,
} from '../../types/missionSpec';

// Pre-allocated scratch math helpers (Zero GC in render loop)
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _scratchVecA = new THREE.Vector3();
const _scratchVecB = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();

export interface StationWorldAnchor {
  station: StationRecord;
  index: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  splineT: number;
  group: THREE.Group;
  ringMesh: THREE.Mesh;
  beaconMesh: THREE.Mesh;
}

export interface RoadCollectibleAnchor {
  id: string;
  type: 'coin' | 'gift_box' | 'boost_pad';
  stationId: string;
  position: THREE.Vector3;
  baseY: number;
  mesh: THREE.Group;
  collected: boolean;
  respawnTimer: number;
  value: number;
}

export interface PickupBurstEffect {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
}

export interface WorldCallbacks {
  onStationTriggerReached: (stationIndex: number) => void;
  onDrivingPenaltyTick: (penaltyDelta: number) => void;
  onWrongGateEntered?: (stationTitle: string) => void;
  onCollectiblePickedUp?: (
    type: 'coin' | 'gift_box' | 'boost_pad',
    value: number,
    stationId: string
  ) => void;
  onM01BonusCoins?: (coins: number, messageVi: string) => void;
  onM01HudUpdate?: (snapshot: M01HudSnapshot) => void;
  onUniversalBonusCoins?: (coins: number, messageVi: string) => void;
  onUniversalHudUpdate?: (snapshot: UniversalMissionHudSnapshot) => void;
  onTelemetryUpdate: (
    telemetry: VehicleTelemetry,
    minimapPoints: { x: number; z: number }[],
    stationCoords: { id: string; x: number; z: number; title: string }[]
  ) => void;
  onPauseRequested: () => void;
  onCheckpointResetRequested: () => void;
}

export class World3DEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private mapGroup = new THREE.Group();
  private stationsGroup = new THREE.Group();
  private collectiblesGroup = new THREE.Group();
  private jetbotRig: JetBotRig;
  public m01Vault: M01MassVaultController;
  public missionDispatcher: MissionDispatcher;
  private cameraMode: CameraViewMode = 'chase';

  private splineCurve: THREE.CatmullRomCurve3 | null = null;
  private sampledNodes: { point: THREE.Vector3; tangent: THREE.Vector3; t: number }[] = [];
  private minimapPath: { x: number; z: number }[] = [];
  private stationAnchors: StationWorldAnchor[] = [];
  private obstacles: ObstacleCollider[] = [];
  private collectibles: RoadCollectibleAnchor[] = [];
  private burstEffects: PickupBurstEffect[] = [];
  private magnetLevel = 1;
  private currentDrivingScore = 100;

  public physics = new VehiclePhysicsEngine();
  private inputManager: InputManager;
  private callbacks: WorldCallbacks;

  private currentPhase: GameStatePhase = 'menu';
  private activeStationIndex = 0;
  private stationBraking = false;
  private mapConfig: MapSetupConfig;
  private jetbotConfig: JetBotConfig;
  private currentLookAt = new THREE.Vector3(0, 1, 10);
  private offLaneBeepCooldown = 0;
  private hitstopTimer = 0;
  private cameraShakeIntensity = 0;

  constructor(
    container: HTMLElement,
    inputManager: InputManager,
    initialMapConfig: MapSetupConfig,
    initialJetBotConfig: JetBotConfig,
    callbacks: WorldCallbacks
  ) {
    this.container = container;
    this.inputManager = inputManager;
    this.mapConfig = initialMapConfig;
    this.jetbotConfig = initialJetBotConfig;
    this.callbacks = callbacks;

    // 1. Software WebGL detection per Three.js skill directive
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    // 2. Scene, Studio Environment Map (RoomEnvironment + PMREMGenerator), Lighting & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1424);
    this.scene.fog = new THREE.FogExp2(0x0c1424, 0.0048);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(
      56,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.2,
      360
    );
    this.camera.position.set(0, 14, -16);

    this.setupLighting();

    this.scene.add(this.mapGroup);
    this.scene.add(this.stationsGroup);
    this.scene.add(this.collectiblesGroup);

    // 3. Create composite 10-part JetBot AI Rover
    const shadowTex = createRadialShadowTexture();
    this.jetbotRig = createJetBotRover(
      this.jetbotConfig.chassisColor,
      this.isSoftwareGl,
      shadowTex
    );
    this.scene.add(this.jetbotRig.group);

    // 4. Create M01 — THE MASS VAULT 3D Controller & Universal Mission Dispatcher
    this.m01Vault = new M01MassVaultController(
      this.isSoftwareGl,
      this.maxAnisotropy
    );
    this.m01Vault.setImpactFeelCallback((hitstopSec, shake) => {
      this.triggerImpactFeel(hitstopSec, shake);
    });
    this.scene.add(this.m01Vault.rootGroup);

    this.missionDispatcher = new MissionDispatcher(
      this.scene,
      this.isSoftwareGl,
      this.maxAnisotropy,
      this.m01Vault
    );
    this.missionDispatcher.setImpactFeelCallback((hitstopSec, shake) => {
      this.triggerImpactFeel(hitstopSec, shake);
    });

    window.addEventListener('resize', this.handleResize);
    this.startLoop();
  }

  public triggerImpactFeel(hitstopSec: number, shakeIntensity: number) {
    this.hitstopTimer = Math.max(this.hitstopTimer, hitstopSec);
    this.cameraShakeIntensity = Math.min(
      0.65,
      this.cameraShakeIntensity + shakeIntensity
    );
  }

  public setDrivingScoreForHud(score: number) {
    this.currentDrivingScore = score;
  }

  public cycleCameraMode(explicitMode?: CameraViewMode) {
    if (explicitMode) {
      this.cameraMode = explicitMode;
    } else if (this.cameraMode === 'chase') {
      this.cameraMode = 'cockpit';
    } else if (this.cameraMode === 'cockpit') {
      this.cameraMode = 'fps_scanner';
    } else {
      this.cameraMode = 'chase';
    }
    this.m01Vault.setCameraMode(this.cameraMode);
    this.missionDispatcher.setCameraMode(this.cameraMode);
    soundEngine.playStepClick();
  }

  public setM01DifficultyAndTier(
    difficulty: DifficultyLayer,
    tier: PerformanceTier
  ) {
    this.m01Vault.setDifficultyAndTier(difficulty, tier);
    this.missionDispatcher.setDifficultyAndTier(difficulty, tier);
    if (!this.isSoftwareGl) {
      if (tier === 'PERFORMANCE') {
        this.renderer.setPixelRatio(1);
      } else if (tier === 'HIGH') {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      } else {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }
    }
  }

  private setupLighting() {
    // Cool sky / warm ground HemisphereLight fill
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.75);
    hemiLight.position.set(0, 80, 0);
    this.scene.add(hemiLight);

    // Warm Directional Key Light with tight shadow bounds
    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
    dirLight.position.set(45, 75, -35);
    if (!this.isSoftwareGl) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      const d = 65;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.camera.near = 5;
      dirLight.shadow.camera.far = 220;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(dirLight);

    // Subtle Rim Backlight
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    rimLight.position.set(-40, 30, 50);
    this.scene.add(rimLight);
  }

  public rebuildWorld(
    stations: StationRecord[],
    mapConfig: MapSetupConfig,
    jetbotConfig: JetBotConfig,
    stationProgress: Record<string, StationProgressState>
  ) {
    this.mapConfig = mapConfig;
    this.jetbotConfig = jetbotConfig;

    // Clear previous map, station, and collectible meshes cleanly
    this.clearGroup(this.mapGroup);
    this.clearGroup(this.stationsGroup);
    this.clearGroup(this.collectiblesGroup);
    this.stationAnchors = [];
    this.obstacles = [];
    this.collectibles = [];
    this.burstEffects = [];

    // 1. Build 3D Spline Control Points based on station count & curveScale
    const controlPoints: THREE.Vector3[] = [];
    const segmentSpacing = 44;
    const curveAmp = 26 * mapConfig.curveScale;

    // Starter garage lead-in
    controlPoints.push(new THREE.Vector3(0, 0, -24));
    controlPoints.push(new THREE.Vector3(0, 0, 0));

    stations.forEach((st, idx) => {
      const z = (idx + 1) * segmentSpacing;
      const wave =
        Math.sin((idx + 1) * 0.85) *
        curveAmp *
        (0.5 + st.track_config.curve_complexity);
      controlPoints.push(new THREE.Vector3(wave, 0, z));
    });

    // Run-off tail after final station
    const lastPt = controlPoints[controlPoints.length - 1];
    controlPoints.push(new THREE.Vector3(lastPt.x, 0, lastPt.z + 28));

    this.splineCurve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5);

    // Sample high-resolution track nodes for fast nearest-lane lookup
    const totalSamples = Math.max(400, stations.length * 45);
    this.sampledNodes = [];
    this.minimapPath = [];
    for (let i = 0; i <= totalSamples; i++) {
      const t = i / totalSamples;
      const pt = this.splineCurve.getPointAt(t);
      const tan = this.splineCurve.getTangentAt(t).normalize();
      this.sampledNodes.push({ point: pt, tangent: tan, t });
      if (i % 4 === 0) {
        this.minimapPath.push({ x: pt.x, z: pt.z });
      }
    }

    // 2. Construct Extended Terrain Floor & Natural Perimeter (Hills + InstancedMesh Trees)
    const trackLengthZ = lastPt.z + 180;
    const groundGeo = new THREE.PlaneGeometry(360, trackLengthZ + 200);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.92,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(0, -0.04, trackLengthZ * 0.42);
    groundMesh.receiveShadow = !this.isSoftwareGl;
    this.mapGroup.add(groundMesh);

    // Subtle science campus coordinate grid (offset Y = -0.01 to avoid Z-fighting)
    const gridHelper = new THREE.GridHelper(
      Math.max(400, trackLengthZ + 120),
      80,
      0x1e293b,
      0x1e293b
    );
    gridHelper.position.set(0, -0.01, trackLengthZ * 0.42);
    this.mapGroup.add(gridHelper);

    // 3. Build Ribbon Road Mesh along Spline with Lane Markings
    const baseLaneWidth = 8.6 * mapConfig.laneWidthMultiplier;
    this.buildRibbonRoad(baseLaneWidth, totalSamples);

    // 4. Build InstancedMesh Perimeter Trees & Bollards (>20 repeated props)
    this.buildInstancedEnvironment(baseLaneWidth);

    // 5. Place Station Dioramas along the route
    const totalControlPts = controlPoints.length;
    stations.forEach((st, idx) => {
      // Approximate spline t for each station control point
      const approxT = (idx + 2) / (totalControlPts - 1);
      const pos = this.splineCurve!.getPointAt(approxT);
      const tan = this.splineCurve!.getTangentAt(approxT).normalize();

      const { group, ringMesh, beaconMesh } = createStationStructure(
        st,
        this.maxAnisotropy,
        this.isSoftwareGl
      );
      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = Math.atan2(tan.x, tan.z);
      this.stationsGroup.add(group);

      this.stationAnchors.push({
        station: st,
        index: idx,
        position: pos.clone(),
        tangent: tan.clone(),
        splineT: approxT,
        group,
        ringMesh,
        beaconMesh,
      });

      if (idx === 0) {
        this.m01Vault.buildVaultAroundStation(pos, tan);
      }

      // Place non-violent safety cone obstacles between stations if configured
      const obsMultiplier =
        mapConfig.obstacleDensity === 'low'
          ? 0
          : mapConfig.obstacleDensity === 'high'
          ? 2
          : 1;
      const obsCount = Math.min(3, st.track_config.obstacle_count * obsMultiplier);
      for (let o = 0; o < obsCount; o++) {
        const obsT = approxT - (0.35 + o * 0.22) / (totalControlPts - 1);
        if (obsT > 0.04) {
          const obsCenter = this.splineCurve!.getPointAt(obsT);
          const obsTan = this.splineCurve!.getTangentAt(obsT).normalize();
          const rightVec = new THREE.Vector3(-obsTan.z, 0, obsTan.x);
          const lateralOffset = (o % 2 === 0 ? 1 : -1) * (baseLaneWidth * 0.22);
          const obsPos = obsCenter
            .clone()
            .addScaledVector(rightVec, lateralOffset);

          const coneGroup = this.createSafetyBarrierMesh();
          coneGroup.position.copy(obsPos);
          this.mapGroup.add(coneGroup);

          this.obstacles.push({
            id: `${st.station_id}_OBS_${o}`,
            position: obsPos,
            radius: 0.85,
          });
        }
      }

      // 6. Spawn Sci-Coins, Mystery Science Gift Boxes & Turbo Boost Pads along each segment
      const prevT = (idx + 1) / (totalControlPts - 1);
      const segSpan = approxT - prevT;

      // 4 Sci-Coins in a smooth slalom arc per segment
      for (let c = 0; c < 4; c++) {
        const coinT = prevT + segSpan * (0.18 + c * 0.14);
        if (coinT > 0.02 && coinT < 0.98) {
          const cCenter = this.splineCurve!.getPointAt(coinT);
          const cTan = this.splineCurve!.getTangentAt(coinT).normalize();
          const rightVec = new THREE.Vector3(-cTan.z, 0, cTan.x);
          const arcOffset = Math.sin((idx * 4 + c) * 0.9) * (baseLaneWidth * 0.24);
          const coinPos = cCenter.clone().addScaledVector(rightVec, arcOffset);
          coinPos.y = 0.72;

          const coinMesh = this.createSciCoinMesh();
          coinMesh.position.copy(coinPos);
          this.collectiblesGroup.add(coinMesh);

          this.collectibles.push({
            id: `${st.station_id}_COIN_${c}`,
            type: 'coin',
            stationId: st.station_id,
            position: coinPos,
            baseY: 0.72,
            mesh: coinMesh,
            collected: false,
            respawnTimer: 0,
            value: 15,
          });
        }
      }

      // 1 Mystery Science Gift Box (Holo-Crate) per segment
      const giftT = prevT + segSpan * 0.66;
      if (giftT > 0.03 && giftT < 0.98) {
        const gCenter = this.splineCurve!.getPointAt(giftT);
        const gTan = this.splineCurve!.getTangentAt(giftT).normalize();
        const rightVec = new THREE.Vector3(-gTan.z, 0, gTan.x);
        const sideOffset = (idx % 2 === 0 ? -1 : 1) * (baseLaneWidth * 0.2);
        const giftPos = gCenter.clone().addScaledVector(rightVec, sideOffset);
        giftPos.y = 0.95;

        const giftMesh = this.createMysteryGiftBoxMesh();
        giftMesh.position.copy(giftPos);
        this.collectiblesGroup.add(giftMesh);

        this.collectibles.push({
          id: `${st.station_id}_GIFT`,
          type: 'gift_box',
          stationId: st.station_id,
          position: giftPos,
          baseY: 0.95,
          mesh: giftMesh,
          collected: false,
          respawnTimer: 0,
          value: 40,
        });
      }

      // 1 Turbo Boost Pad on road every segment
      const boostT = prevT + segSpan * 0.38;
      if (boostT > 0.03 && boostT < 0.98) {
        const bCenter = this.splineCurve!.getPointAt(boostT);
        const bTan = this.splineCurve!.getTangentAt(boostT).normalize();
        const boostPos = bCenter.clone();
        boostPos.y = 0.04;

        const boostMesh = this.createBoostPadMesh();
        boostMesh.position.copy(boostPos);
        boostMesh.rotation.y = Math.atan2(bTan.x, bTan.z);
        this.collectiblesGroup.add(boostMesh);

        this.collectibles.push({
          id: `${st.station_id}_BOOST`,
          type: 'boost_pad',
          stationId: st.station_id,
          position: boostPos,
          baseY: 0.04,
          mesh: boostMesh,
          collected: false,
          respawnTimer: 0,
          value: 10,
        });
      }
    });

    this.updateStageVisibility(mapConfig);
    this.updateJetBotAppearance(jetbotConfig);
    this.updateStationUnlockVisuals(stationProgress, this.activeStationIndex);
    this.syncActiveStationMission();

    // Position JetBot at start of track if at index 0
    if (this.sampledNodes.length > 10) {
      const startNode = this.sampledNodes[8];
      this.physics.resetAtPoint(startNode.point, startNode.tangent);
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildRibbonRoad(roadWidth: number, segments: number) {
    if (!this.splineCurve) return;
    const halfW = roadWidth * 0.5;
    const positions = new Float32Array((segments + 1) * 2 * 3);
    const normals = new Float32Array((segments + 1) * 2 * 3);
    const uvs = new Float32Array((segments + 1) * 2 * 2);
    const indices: number[] = [];

    let accDist = 0;
    let prevPt = this.splineCurve.getPointAt(0);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = this.splineCurve.getPointAt(t);
      const tan = this.splineCurve.getTangentAt(t).normalize();
      if (i > 0) accDist += pt.distanceTo(prevPt);
      prevPt = pt;

      // Perpendicular right vector on XZ plane
      const rx = -tan.z;
      const rz = tan.x;

      const vIdx = i * 2 * 3;
      // Left edge
      positions[vIdx] = pt.x - rx * halfW;
      positions[vIdx + 1] = 0.015;
      positions[vIdx + 2] = pt.z - rz * halfW;
      // Right edge
      positions[vIdx + 3] = pt.x + rx * halfW;
      positions[vIdx + 4] = 0.015;
      positions[vIdx + 5] = pt.z + rz * halfW;

      for (let k = 0; k < 6; k += 3) {
        normals[vIdx + k] = 0;
        normals[vIdx + k + 1] = 1;
        normals[vIdx + k + 2] = 0;
      }

      const uvIdx = i * 2 * 2;
      const vCoord = accDist / 10;
      uvs[uvIdx] = 0;
      uvs[uvIdx + 1] = vCoord;
      uvs[uvIdx + 2] = 1;
      uvs[uvIdx + 3] = vCoord;

      if (i < segments) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    roadGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    roadGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeBoundingSphere();

    const roadTex = createRoadSurfaceTexture(this.maxAnisotropy);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.72,
      metalness: 0.1,
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = !this.isSoftwareGl;
    this.mapGroup.add(roadMesh);
  }

  private buildInstancedEnvironment(roadWidth: number) {
    if (this.sampledNodes.length === 0) return;

    const bollardCount = Math.floor(this.sampledNodes.length / 6) * 2;
    const bollardGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.9, 12);
    const bollardMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.35,
      metalness: 0.5,
    });
    const bollardInstanced = new THREE.InstancedMesh(
      bollardGeo,
      bollardMat,
      bollardCount
    );

    const treeCount = Math.floor(this.sampledNodes.length / 8) * 2;
    const crownGeo = new THREE.ConeGeometry(1.8, 4.6, 7);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      roughness: 0.85,
      metalness: 0.05,
    });
    const treeInstanced = new THREE.InstancedMesh(
      crownGeo,
      crownMat,
      treeCount
    );

    let bIdx = 0;
    let tIdx = 0;
    const halfW = roadWidth * 0.5 + 0.65;
    const colorVar = new THREE.Color();

    for (let i = 0; i < this.sampledNodes.length; i += 6) {
      const node = this.sampledNodes[i];
      const rx = -node.tangent.z;
      const rz = node.tangent.x;

      [-1, 1].forEach((side) => {
        if (bIdx < bollardCount) {
          _dummyObj.position.set(
            node.point.x + rx * halfW * side,
            0.45,
            node.point.z + rz * halfW * side
          );
          _dummyObj.rotation.set(0, 0, 0);
          _dummyObj.scale.setScalar(1);
          _dummyObj.updateMatrix();
          bollardInstanced.setMatrixAt(bIdx++, _dummyObj.matrix);
        }
      });

      if (i % 8 === 0) {
        [-1, 1].forEach((side) => {
          if (tIdx < treeCount) {
            const distOut = halfW + 11 + ((i * 7) % 9);
            const scale = 0.85 + ((i * 13) % 30) / 100;
            _dummyObj.position.set(
              node.point.x + rx * distOut * side,
              2.3 * scale,
              node.point.z + rz * distOut * side
            );
            _dummyObj.rotation.set(0, (i * 0.5) % Math.PI, 0);
            _dummyObj.scale.setScalar(scale);
            _dummyObj.updateMatrix();
            treeInstanced.setMatrixAt(tIdx, _dummyObj.matrix);
            colorVar.setHSL(0.47 + ((tIdx % 5) - 2) * 0.015, 0.65, 0.26);
            treeInstanced.setColorAt(tIdx, colorVar);
            tIdx++;
          }
        });
      }
    }

    bollardInstanced.instanceMatrix.needsUpdate = true;
    bollardInstanced.computeBoundingSphere();

    treeInstanced.instanceMatrix.needsUpdate = true;
    if (treeInstanced.instanceColor) treeInstanced.instanceColor.needsUpdate = true;
    treeInstanced.computeBoundingSphere();

    this.mapGroup.add(bollardInstanced, treeInstanced);
  }

  private createSafetyBarrierMesh(): THREE.Group {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.75, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    base.position.y = 0.09;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.52, 1.35, 16),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 })
    );
    cone.position.y = 0.75;
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.38, 0.32, 16),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0xe2e8f0,
        emissiveIntensity: 0.25,
      })
    );
    stripe.position.y = 0.72;
    g.add(base, cone, stripe);
    return g;
  }

  private createSciCoinMesh(): THREE.Group {
    const g = new THREE.Group();
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.11, 10, 20),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.55,
        metalness: 0.75,
        roughness: 0.2,
      })
    );
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
        metalness: 0.4,
        roughness: 0.15,
      })
    );
    g.add(torus, core);
    return g;
  }

  private createMysteryGiftBoxMesh(): THREE.Group {
    const g = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.76, 0.76),
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.45,
        metalness: 0.5,
        roughness: 0.25,
      })
    );
    const ribbon1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.78, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.6,
      })
    );
    const ribbon2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.78, 0.8),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.6,
      })
    );
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.76, 24),
      new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })
    );
    halo.rotation.x = Math.PI / 2;
    g.add(box, ribbon1, ribbon2, halo);
    return g;
  }

  private createBoostPadMesh(): THREE.Group {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 3.4),
      new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    );
    base.rotation.x = -Math.PI / 2;
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 2.2),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.y = 0.01;
    g.add(base, strip);
    return g;
  }

  private spawnPickupBurst(pos: THREE.Vector3, colorHex: number) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.55, 24),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.35, pos.z);
    this.collectiblesGroup.add(ring);
    this.burstEffects.push({
      mesh: ring,
      age: 0,
      maxAge: 0.48,
    });
  }

  public setMagnetLevel(level: number) {
    this.magnetLevel = Math.max(1, Math.min(3, level));
  }

  public updateStageVisibility(mapConfig: MapSetupConfig) {
    this.mapConfig = mapConfig;
    this.mapGroup.visible = mapConfig.mapConstructed;
    this.stationsGroup.visible = mapConfig.stationsPlaced;
    this.collectiblesGroup.visible = mapConfig.mapConstructed;
    this.jetbotRig.group.visible = mapConfig.jetbotReady;

    // Atmosphere preset adjustment
    if (mapConfig.atmospherePreset === 'golden_campus') {
      this.scene.background = new THREE.Color(0x1c1917);
      this.scene.fog = new THREE.FogExp2(0x1c1917, 0.0045);
    } else if (mapConfig.atmospherePreset === ' twilight_research') {
      this.scene.background = new THREE.Color(0x090d16);
      this.scene.fog = new THREE.FogExp2(0x090d16, 0.005);
    } else {
      this.scene.background = new THREE.Color(0x0c1424);
      this.scene.fog = new THREE.FogExp2(0x0c1424, 0.0048);
    }
  }

  public updateJetBotAppearance(jetbotConfig: JetBotConfig) {
    this.jetbotConfig = jetbotConfig;
    const mat = this.jetbotRig.chassisMesh.material as THREE.MeshPhysicalMaterial;
    mat.color.set(jetbotConfig.chassisColor);
    this.jetbotRig.sensorCone.visible = jetbotConfig.sensorOverlayVisible;
  }

  public syncActiveStationMission() {
    if (this.stationAnchors.length === 0) return;
    const clamped = Math.min(
      this.activeStationIndex,
      this.stationAnchors.length - 1
    );
    const anchor = this.stationAnchors[clamped];
    if (!anchor) return;
    const missionId = this.missionDispatcher.mapStationToMissionId(
      anchor.station.station_id,
      clamped
    );
    this.missionDispatcher.activateMission(
      missionId,
      anchor.position,
      anchor.tangent
    );
  }

  public updateStationUnlockVisuals(
    stationProgress: Record<string, StationProgressState>,
    activeIndex: number
  ) {
    this.activeStationIndex = activeIndex;
    this.syncActiveStationMission();
    this.stationAnchors.forEach((anchor, idx) => {
      const stProg = stationProgress[anchor.station.station_id];
      const isCompleted = stProg?.completed ?? false;
      const isCurrentTarget = idx === activeIndex;

      const ringMat = anchor.ringMesh.material as THREE.MeshBasicMaterial;
      const beaconMat = anchor.beaconMesh.material as THREE.MeshStandardMaterial;

      if (isCompleted) {
        ringMat.color.setHex(0x10b981); // Emerald completed
        ringMat.opacity = 0.55;
        beaconMat.color.setHex(0x10b981);
        beaconMat.emissive.setHex(0x059669);
      } else if (isCurrentTarget) {
        ringMat.color.set(anchor.station.accent_color || '#38bdf8');
        ringMat.opacity = 0.92;
        beaconMat.color.set(anchor.station.accent_color || '#38bdf8');
        beaconMat.emissive.set(anchor.station.accent_color || '#38bdf8');
      } else {
        ringMat.color.setHex(0x475569); // Locked slate
        ringMat.opacity = 0.35;
        beaconMat.color.setHex(0x475569);
        beaconMat.emissive.setHex(0x1e293b);
      }
    });
  }

  public setPhase(phase: GameStatePhase, activeStationIndex: number) {
    this.currentPhase = phase;
    this.activeStationIndex = activeStationIndex;
    this.stationBraking = phase === 'station_brake';
    this.syncActiveStationMission();

    const shouldLockInput = phase !== 'driving';
    this.inputManager.setLocked(shouldLockInput);
    if (shouldLockInput && phase !== 'station_brake') {
      this.physics.forceStop();
    }
  }

  public teleportToStationOrStart(stationIndex: number) {
    if (stationIndex <= 0 || this.stationAnchors.length === 0) {
      if (this.sampledNodes.length > 8) {
        this.physics.resetAtPoint(
          this.sampledNodes[8].point,
          this.sampledNodes[8].tangent
        );
      }
      return;
    }
    const clampedIdx = Math.min(stationIndex - 1, this.stationAnchors.length - 1);
    const prevAnchor = this.stationAnchors[clampedIdx];
    // Spawn slightly ahead of the cleared station/checkpoint along tangent
    const spawnPos = prevAnchor.position
      .clone()
      .addScaledVector(prevAnchor.tangent, 6.5);
    this.physics.resetAtPoint(spawnPos, prevAnchor.tangent);
  }

  private findNearestTrackSample(pos: THREE.Vector3): {
    nearest: TrackNodeSample;
    lookaheadPoint: THREE.Vector3;
  } {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    for (let i = 0; i < this.sampledNodes.length; i++) {
      const node = this.sampledNodes[i];
      const dx = pos.x - node.point.x;
      const dz = pos.z - node.point.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }

    const bestNode = this.sampledNodes[bestIdx] || {
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(0, 0, 1),
      t: 0,
    };
    const lookaheadIdx = Math.min(bestIdx + 12, this.sampledNodes.length - 1);
    const lookaheadPoint =
      this.sampledNodes[lookaheadIdx]?.point || bestNode.point;

    return {
      nearest: {
        point: bestNode.point,
        tangent: bestNode.tangent,
        t: bestNode.t,
        distanceSq: bestDistSq,
      },
      lookaheadPoint,
    };
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = this.clock.getElapsedTime();

      this.updateSimulation(dt, elapsed);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private updateSimulation(dt: number, elapsed: number) {
    // Brief 30-80ms simulation hitstop on heavy impacts
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateCameraChoreography(dt, elapsed);
      return;
    }

    // Rotate station beacons gently
    for (let i = 0; i < this.stationAnchors.length; i++) {
      const anchor = this.stationAnchors[i];
      anchor.beaconMesh.rotation.y = elapsed * 1.4 + i;
    }

    // Rotate JetBot LiDAR turret
    this.jetbotRig.lidarTurret.rotation.y = elapsed * 4.5;

    const input = this.inputManager.sampleInput();
    if (input.justPressedPause) {
      this.callbacks.onPauseRequested();
    }
    if (input.justPressedReset && this.currentPhase === 'driving') {
      this.callbacks.onCheckpointResetRequested();
    }
    if (input.justPressedCamera && this.currentPhase === 'driving') {
      this.cycleCameraMode();
    }

    const activeAnchor =
      this.stationAnchors[
        Math.min(this.activeStationIndex, Math.max(0, this.stationAnchors.length - 1))
      ];

    // Update M01 — THE MASS VAULT when activeStationIndex === 0
    if (this.currentPhase === 'driving' || this.currentPhase === 'briefing') {
      this.m01Vault.update(
        dt,
        elapsed,
        this.physics.position,
        this.camera,
        input.reticleX,
        input.reticleY,
        input.justPressedInteract,
        input.justPressedPulse,
        this.activeStationIndex === 0,
        (penaltyPts) => {
          this.callbacks.onDrivingPenaltyTick(penaltyPts);
        },
        (bonusCoins, msgVi) => {
          this.callbacks.onM01BonusCoins?.(bonusCoins, msgVi);
        }
      );
      if (this.activeStationIndex === 0) {
        this.callbacks.onM01HudUpdate?.(
          this.m01Vault.getHudSnapshot(this.currentDrivingScore)
        );
      }

      // Universal Mission Dispatcher for all active missions & bosses
      this.missionDispatcher.update(
        dt,
        elapsed,
        this.physics.position,
        this.camera,
        input.reticleX,
        input.reticleY,
        input.justPressedInteract,
        input.justPressedPulse,
        true,
        (penaltyPts) => {
          this.callbacks.onDrivingPenaltyTick(penaltyPts);
        },
        (bonusCoins, msgVi) => {
          this.callbacks.onUniversalBonusCoins?.(bonusCoins, msgVi);
        }
      );
      const universalSnap = this.missionDispatcher.getHudSnapshot(
        this.currentDrivingScore
      );
      if (universalSnap) {
        this.callbacks.onUniversalHudUpdate?.(universalSnap);
      }
    }

    if (
      (this.currentPhase === 'driving' || this.currentPhase === 'station_brake') &&
      activeAnchor
    ) {
      const { nearest, lookaheadPoint } = this.findNearestTrackSample(
        this.physics.position
      );
      const laneHalfWidth =
        activeAnchor.station.track_config.lane_width *
        0.5 *
        this.mapConfig.laneWidthMultiplier;

      const stepRes = this.physics.step(dt, input, {
        maxSpeed: this.jetbotConfig.maxSpeedSetting,
        turnSensitivity: this.jetbotConfig.turnSensitivitySetting,
        laneHalfWidth,
        nearestTrackSample: nearest,
        lookaheadPoint,
        targetStationPos: activeAnchor.position,
        stationTriggerRadius:
          activeAnchor.station.track_config.station_trigger_radius,
        obstacles: this.obstacles,
        autopilot: this.jetbotConfig.driveMode === 'ai_autopilot',
        stationBraking: this.stationBraking,
      });

      if (stepRes.drivingPenaltyDelta > 0) {
        this.callbacks.onDrivingPenaltyTick(stepRes.drivingPenaltyDelta);
      }

      if (this.physics.isOffLane && this.physics.offLaneDurationMs > 700) {
        this.offLaneBeepCooldown -= dt;
        if (this.offLaneBeepCooldown <= 0) {
          soundEngine.playOffLaneWarning();
          this.offLaneBeepCooldown = 1.0;
        }
      } else {
        this.offLaneBeepCooldown = 0;
      }

      if (stepRes.reachedStationTrigger && this.currentPhase === 'driving') {
        const isGateUnlocked =
          this.activeStationIndex === 0
            ? this.m01Vault.isExitGateUnlocked()
            : this.missionDispatcher.isExitGateUnlocked();

        if (!isGateUnlocked) {
          this.physics.forceStop();
          // Nudge rover slightly back into the Scanner Bay in front of the closed Exit Gate
          this.physics.position.addScaledVector(activeAnchor.tangent, -3.5);
          if (this.cameraMode !== 'fps_scanner') {
            this.cycleCameraMode('fps_scanner');
          }
        } else {
          this.stationBraking = true;
          this.callbacks.onStationTriggerReached(this.activeStationIndex);
        }
      } else if (this.currentPhase === 'driving' && !this.stationBraking) {
        // Check if player drove into a locked/wrong station gate ahead (-15 driving_score & reset to checkpoint)
        for (let i = this.activeStationIndex + 1; i < this.stationAnchors.length; i++) {
          const lockedAnchor = this.stationAnchors[i];
          const distLocked = Math.hypot(
            this.physics.position.x - lockedAnchor.position.x,
            this.physics.position.z - lockedAnchor.position.z
          );
          if (distLocked < lockedAnchor.station.track_config.station_trigger_radius * 0.85) {
            soundEngine.playWrongAnswer();
            this.callbacks.onDrivingPenaltyTick(15);
            this.callbacks.onWrongGateEntered?.(lockedAnchor.station.title);
            this.teleportToStationOrStart(this.activeStationIndex);
            break;
          }
        }
      }
    }

    // Animate collectibles & check magnet attraction + collision pickup
    const magnetRadius = 2.8 + (this.magnetLevel - 1) * 1.6;
    const pickupRadius = 1.65;

    for (let i = 0; i < this.collectibles.length; i++) {
      const item = this.collectibles[i];
      if (item.collected) {
        item.respawnTimer -= dt;
        if (item.respawnTimer <= 0) {
          item.collected = false;
          item.mesh.visible = true;
        }
        continue;
      }

      // Spin & bobbing animation
      if (item.type === 'coin') {
        item.mesh.rotation.y = elapsed * 3.2 + i * 0.5;
        item.mesh.position.y = item.baseY + Math.sin(elapsed * 3.5 + i) * 0.14;
      } else if (item.type === 'gift_box') {
        item.mesh.rotation.y = elapsed * 2.1 + i;
        item.mesh.rotation.x = Math.sin(elapsed * 1.8 + i) * 0.22;
        item.mesh.position.y = item.baseY + Math.sin(elapsed * 2.8 + i) * 0.18;
      }

      if (this.currentPhase === 'driving') {
        const dx = this.physics.position.x - item.mesh.position.x;
        const dz = this.physics.position.z - item.mesh.position.z;
        const dist = Math.hypot(dx, dz);

        // Magnet pull for coins and gift boxes
        if (
          (item.type === 'coin' || item.type === 'gift_box') &&
          dist < magnetRadius &&
          dist > 0.05
        ) {
          const pullSpeed = 14.5 * dt;
          item.mesh.position.x += (dx / dist) * pullSpeed;
          item.mesh.position.z += (dz / dist) * pullSpeed;
        }

        if (dist <= (item.type === 'boost_pad' ? 2.1 : pickupRadius)) {
          item.collected = true;
          // Boost pads respawn quickly (4s), coins/gifts respawn after 25s
          item.respawnTimer = item.type === 'boost_pad' ? 4.0 : 25.0;
          if (item.type !== 'boost_pad') {
            item.mesh.visible = false;
            // Reset position to original anchor for when it respawns
            item.mesh.position.copy(item.position);
          }

          if (item.type === 'coin') {
            soundEngine.playCoinPickup();
            this.physics.refillNitro(10);
            this.spawnPickupBurst(this.physics.position, 0xfbbf24);
          } else if (item.type === 'gift_box') {
            soundEngine.playGiftBoxOpen();
            this.physics.refillNitro(25);
            this.spawnPickupBurst(this.physics.position, 0xa855f7);
          } else if (item.type === 'boost_pad') {
            soundEngine.playNitroBoost();
            this.physics.triggerBoostPad(1.8);
            this.spawnPickupBurst(this.physics.position, 0x22d3ee);
          }

          this.callbacks.onCollectiblePickedUp?.(
            item.type,
            item.value,
            item.stationId
          );
        }
      }
    }

    // Update pickup burst rings
    for (let i = this.burstEffects.length - 1; i >= 0; i--) {
      const b = this.burstEffects[i];
      b.age += dt;
      if (b.age >= b.maxAge) {
        this.collectiblesGroup.remove(b.mesh);
        this.burstEffects.splice(i, 1);
      } else {
        const progressRatio = b.age / b.maxAge;
        const scale = 1 + progressRatio * 4.2;
        b.mesh.scale.setScalar(scale);
        const mat = b.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - progressRatio) * 0.9;
      }
    }

    // Sync JetBot 3D mesh transform with physics state
    this.jetbotRig.group.position.copy(this.physics.position);
    this.jetbotRig.group.rotation.y = this.physics.heading;

    for (let i = 0; i < this.jetbotRig.wheels.length; i++) {
      this.jetbotRig.wheels[i].rotation.x = this.physics.wheelRotation;
    }
    for (let i = 0; i < this.jetbotRig.frontSteerPivots.length; i++) {
      this.jetbotRig.frontSteerPivots[i].rotation.y = this.physics.steeringAngle;
    }

    // Camera choreography based on active phase + Dynamic Nitro Speed FOV
    const targetFov = this.physics.nitroActive ? 65 : 56;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, dt);
      this.camera.updateProjectionMatrix();
    }
    this.updateCameraChoreography(dt, elapsed, activeAnchor);

    // Emit HUD telemetry
    const distToTarget = activeAnchor
      ? Math.hypot(
          activeAnchor.position.x - this.physics.position.x,
          activeAnchor.position.z - this.physics.position.z
        )
      : 0;

    this.callbacks.onTelemetryUpdate(
      {
        x: this.physics.position.x,
        z: this.physics.position.z,
        heading: this.physics.heading,
        speed: this.physics.speed,
        steeringAngle: this.physics.steeringAngle,
        wheelRotation: this.physics.wheelRotation,
        isOffLane: this.physics.isOffLane,
        offLaneDurationMs: this.physics.offLaneDurationMs,
        isPenalizingOffLane:
          this.physics.isOffLane && this.physics.offLaneDurationMs > 700,
        distanceToTargetMeters: Math.max(0, Math.round(distToTarget)),
        autopilotActive: this.jetbotConfig.driveMode === 'ai_autopilot',
        nitroEnergy: Math.round(this.physics.nitroEnergy),
        nitroActive: this.physics.nitroActive,
      },
      this.minimapPath,
      this.stationAnchors.map((a) => ({
        id: a.station.station_id,
        x: a.position.x,
        z: a.position.z,
        title: a.station.title,
      }))
    );
  }

  private updateCameraChoreography(
    dt: number,
    elapsed: number,
    activeAnchor?: StationWorldAnchor
  ) {
    if (this.currentPhase === 'map_setup') {
      // High bird's-eye pan over the spline road
      _camTargetPos.set(
        Math.sin(elapsed * 0.25) * 28,
        42,
        45 + Math.cos(elapsed * 0.2) * 25
      );
      _camLookAt.set(0, 0, 75);
    } else if (this.currentPhase === 'station_setup' && activeAnchor) {
      // Orbit around first station laboratory diorama
      const firstSt = this.stationAnchors[0] || activeAnchor;
      _camTargetPos.set(
        firstSt.position.x + Math.cos(elapsed * 0.45) * 16,
        9.5,
        firstSt.position.z + Math.sin(elapsed * 0.45) * 16
      );
      _camLookAt.set(firstSt.position.x, 3.2, firstSt.position.z);
    } else if (
      this.currentPhase === 'jetbot_setup' ||
      this.currentPhase === 'menu'
    ) {
      // Hero showcase orbit around the JetBot AI Rover
      const rPos = this.physics.position;
      _camTargetPos.set(
        rPos.x + Math.sin(elapsed * 0.5) * 5.2,
        2.6,
        rPos.z + Math.cos(elapsed * 0.5) * 5.2
      );
      _camLookAt.set(rPos.x, 0.85, rPos.z);
    } else if (this.currentPhase === 'briefing') {
      // Cinematic sweeping pan through M01 Mass Vault warehouse
      const firstSt = this.stationAnchors[0] || activeAnchor;
      if (firstSt) {
        _camTargetPos.set(
          firstSt.position.x + Math.sin(elapsed * 0.35) * 9.5,
          5.8,
          firstSt.position.z - 14 + Math.cos(elapsed * 0.25) * 6.0
        );
        _camLookAt.set(firstSt.position.x, 1.8, firstSt.position.z - 2);
      }
    } else {
      const sinH = Math.sin(this.physics.heading);
      const cosH = Math.cos(this.physics.heading);

      if (this.cameraMode === 'cockpit') {
        // First-person cockpit hood camera mounted on JetBot sensor mast
        _camTargetPos.set(
          this.physics.position.x + sinH * 0.45,
          1.45,
          this.physics.position.z + cosH * 0.45
        );
        _camLookAt.set(
          this.physics.position.x + sinH * 14.0,
          1.2,
          this.physics.position.z + cosH * 14.0
        );
      } else if (this.cameraMode === 'fps_scanner') {
        // First-Person LiDAR Scanner camera overlooking the M01 Cargo Crates & Electronic Balance
        _camTargetPos.set(
          this.physics.position.x + sinH * 0.6,
          2.25,
          this.physics.position.z + cosH * 0.6
        );
        if (this.activeStationIndex === 0) {
          this.m01Vault.getScannerBayFocusPosition(_scratchVecA);
          const hudSnap = this.m01Vault.getHudSnapshot(this.currentDrivingScore);
          _camLookAt.set(
            _scratchVecA.x + hudSnap.reticleX * 4.5,
            _scratchVecA.y + hudSnap.reticleY * 2.2,
            _scratchVecA.z
          );
        } else {
          this.missionDispatcher.getScannerBayFocusPosition(_scratchVecA);
          const uSnap = this.missionDispatcher.getHudSnapshot(
            this.currentDrivingScore
          );
          const rx = uSnap?.reticleX ?? 0;
          const ry = uSnap?.reticleY ?? 0;
          _camLookAt.set(
            _scratchVecA.x + rx * 4.5,
            _scratchVecA.y + ry * 2.2,
            _scratchVecA.z
          );
        }
      } else {
        // Damped third-person chase camera behind JetBot
        const chaseDist = 8.4 + Math.min(Math.abs(this.physics.speed) * 0.14, 2.0);
        const chaseHeight = 4.6;

        _camTargetPos.set(
          this.physics.position.x - sinH * chaseDist,
          chaseHeight,
          this.physics.position.z - cosH * chaseDist
        );
        _camLookAt.set(
          this.physics.position.x + sinH * 6.5,
          1.25,
          this.physics.position.z + cosH * 6.5
        );
      }
    }

    const dampFactor = 1 - Math.exp(-6.5 * dt);
    this.camera.position.lerp(_camTargetPos, dampFactor);

    // Decaying camera shake on impacts, gate unlocks, or boost pads
    if (this.cameraShakeIntensity > 0.001) {
      this.camera.position.x +=
        (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.y +=
        (Math.random() - 0.5) * this.cameraShakeIntensity * 0.7;
      this.cameraShakeIntensity = Math.max(
        0,
        this.cameraShakeIntensity - dt * 1.8
      );
    }

    this.currentLookAt.lerp(_camLookAt, dampFactor);
    this.camera.lookAt(this.currentLookAt);
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
  }

  private handleResize = () => {
    if (!this.container || this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.m01Vault.dispose();
    this.missionDispatcher.dispose();
    this.renderer.dispose();
  }
}
