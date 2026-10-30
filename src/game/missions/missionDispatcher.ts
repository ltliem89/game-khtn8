import * as THREE from 'three';
import { IMissionController } from './missionContracts';
import {
  CameraViewMode,
  DifficultyLayer,
  MissionId,
  PerformanceTier,
  UniversalMissionHudSnapshot,
} from '../../types/missionSpec';

import { M01MissionAdapter } from './m01Adapter';
import { M01MassVaultController } from './m01MassVault';
import { M02VolumeMazeController } from './m02VolumeMaze';
import { M03DensityHuntController } from './m03DensityHunt';
import { M04SurfacePressureController } from './m04SurfacePressure';
import { M05FluidPressureController } from './m05FluidPressure';
import { B01CargoCatastropheController } from './b01CargoCatastrophe';
import { M06AtmosphericPressureController } from './m06AtmosphericPressure';
import { M07ArchimedesController } from './m07Archimedes';
import { M08MomentController } from './m08Moment';
import { M09LeverController } from './m09Lever';
import { M10CurrentController } from './m10Current';
import { B02AbyssReactorController } from './b02AbyssReactor';
import { M11VoltageController } from './m11Voltage';
import { M12ThermalEnergyController } from './m12ThermalEnergy';
import { M13JoulemeterController } from './m13Joulemeter';
import { M14HeatTransferController } from './m14HeatTransfer';
import { M15ThermalExpansionController } from './m15ThermalExpansion';
import { B03CoreMeltdownController } from './b03CoreMeltdown';

export class MissionDispatcher {
  private scene: THREE.Scene;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private controllers: Map<MissionId, IMissionController> = new Map();
  private activeController: IMissionController | null = null;
  private activeMissionId: MissionId | null = null;

  private difficulty: DifficultyLayer = 'ROOKIE';
  private performanceTier: PerformanceTier = 'HIGH';
  private cameraMode: CameraViewMode = 'chase';

  private impactCallback: ((hitstopSec: number, shakeIntensity: number) => void) | null = null;

  constructor(
    scene: THREE.Scene,
    isSoftwareGl: boolean,
    maxAnisotropy: number,
    existingM01Vault?: M01MassVaultController
  ) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;
    this.maxAnisotropy = maxAnisotropy;

    if (existingM01Vault) {
      const adapter = new M01MissionAdapter(existingM01Vault);
      this.controllers.set('M01_MASS', adapter);
    }
  }

  public setImpactFeelCallback(
    cb: (hitstopSec: number, shakeIntensity: number) => void
  ) {
    this.impactCallback = cb;
    for (const ctrl of this.controllers.values()) {
      ctrl.setImpactFeelCallback(cb);
    }
  }

  public getOrCreateController(missionId: MissionId): IMissionController {
    let ctrl = this.controllers.get(missionId);
    if (ctrl) return ctrl;

    switch (missionId) {
      case 'M01_MASS': {
        const vault = new M01MassVaultController(this.isSoftwareGl, this.maxAnisotropy);
        ctrl = new M01MissionAdapter(vault);
        break;
      }
      case 'M02_VOLUME':
        ctrl = new M02VolumeMazeController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M03_DENSITY':
        ctrl = new M03DensityHuntController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M04_SURFACE_PRESSURE':
        ctrl = new M04SurfacePressureController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M05_LIQUID_PRESSURE':
        ctrl = new M05FluidPressureController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'B01_CARGO_CATASTROPHE':
        ctrl = new B01CargoCatastropheController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M06_ATMOSPHERIC_PRESSURE':
        ctrl = new M06AtmosphericPressureController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M07_ARCHIMEDES':
        ctrl = new M07ArchimedesController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M08_MOMENT':
        ctrl = new M08MomentController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M09_LEVER':
        ctrl = new M09LeverController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M10_CURRENT':
        ctrl = new M10CurrentController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'B02_ABYSS_REACTOR':
        ctrl = new B02AbyssReactorController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M11_VOLTAGE':
        ctrl = new M11VoltageController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M12_THERMAL_ENERGY':
        ctrl = new M12ThermalEnergyController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M13_JOULEMETER':
        ctrl = new M13JoulemeterController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M14_HEAT_TRANSFER':
        ctrl = new M14HeatTransferController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'M15_THERMAL_EXPANSION':
        ctrl = new M15ThermalExpansionController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      case 'B03_CORE_MELTDOWN':
        ctrl = new B03CoreMeltdownController(this.isSoftwareGl, this.maxAnisotropy);
        break;
      default:
        ctrl = new M02VolumeMazeController(this.isSoftwareGl, this.maxAnisotropy);
        break;
    }

    if (this.impactCallback) {
      ctrl.setImpactFeelCallback(this.impactCallback);
    }
    ctrl.setDifficultyAndTier(this.difficulty, this.performanceTier);
    ctrl.setCameraMode(this.cameraMode);

    this.controllers.set(missionId, ctrl);
    return ctrl;
  }

  public mapStationToMissionId(stationId: string, stationIndex: number): MissionId {
    if (stationId === 'CP_A') return 'B01_CARGO_CATASTROPHE';
    if (stationId === 'CP_B') return 'B02_ABYSS_REACTOR';
    if (stationId === 'CP_C') return 'B03_CORE_MELTDOWN';

    if (stationId.startsWith('ST01')) return 'M01_MASS';
    if (stationId.startsWith('ST02')) return 'M02_VOLUME';
    if (stationId.startsWith('ST03') || stationId.startsWith('ST04') || stationId.startsWith('ST05')) return 'M03_DENSITY';
    if (stationId.startsWith('ST06') || stationId.startsWith('ST07')) return 'M04_SURFACE_PRESSURE';
    if (stationId.startsWith('ST08') || stationId.startsWith('ST09')) return 'M05_LIQUID_PRESSURE';
    if (stationId.startsWith('ST10')) return 'M06_ATMOSPHERIC_PRESSURE';
    if (stationId.startsWith('ST11') || stationId.startsWith('ST12')) return 'M07_ARCHIMEDES';
    if (stationId.startsWith('ST13') || stationId.startsWith('ST14')) return 'M08_MOMENT';
    if (stationId.startsWith('ST15') || stationId.startsWith('ST16') || stationId.startsWith('ST17')) return 'M09_LEVER';
    if (stationId.startsWith('ST18') || stationId.startsWith('ST19')) return 'M10_CURRENT';
    if (stationId.startsWith('ST20') || stationId.startsWith('ST21') || stationId.startsWith('ST22')) return 'M11_VOLTAGE';
    if (stationId.startsWith('ST23') || stationId.startsWith('ST24')) return 'M12_THERMAL_ENERGY';
    if (stationId.startsWith('ST25') || stationId.startsWith('ST26')) return 'M13_JOULEMETER';
    if (stationId.startsWith('ST27') || stationId.startsWith('ST28')) return 'M14_HEAT_TRANSFER';
    if (stationId.startsWith('ST29') || stationId.startsWith('ST30')) return 'M15_THERMAL_EXPANSION';

    const fallbackList: MissionId[] = [
      'M01_MASS',
      'M02_VOLUME',
      'M03_DENSITY',
      'M04_SURFACE_PRESSURE',
      'M05_LIQUID_PRESSURE',
      'B01_CARGO_CATASTROPHE',
      'M06_ATMOSPHERIC_PRESSURE',
      'M07_ARCHIMEDES',
      'M08_MOMENT',
      'M09_LEVER',
      'M10_CURRENT',
      'B02_ABYSS_REACTOR',
      'M11_VOLTAGE',
      'M12_THERMAL_ENERGY',
      'M13_JOULEMETER',
      'M14_HEAT_TRANSFER',
      'M15_THERMAL_EXPANSION',
      'B03_CORE_MELTDOWN',
    ];
    return fallbackList[stationIndex % fallbackList.length];
  }

  public activateMission(
    missionId: MissionId,
    stationPos: THREE.Vector3,
    stationTangent: THREE.Vector3
  ) {
    if (this.activeMissionId === missionId && this.activeController) {
      return;
    }

    if (this.activeController) {
      this.scene.remove(this.activeController.rootGroup);
    }

    const nextCtrl = this.getOrCreateController(missionId);
    nextCtrl.buildAroundStation(stationPos, stationTangent);

    if (nextCtrl.rootGroup.parent !== this.scene) {
      this.scene.add(nextCtrl.rootGroup);
    }

    this.activeController = nextCtrl;
    this.activeMissionId = missionId;
  }

  public getActiveController(): IMissionController | null {
    return this.activeController;
  }

  public getActiveMissionId(): MissionId | null {
    return this.activeMissionId;
  }

  public setDifficultyAndTier(
    difficulty: DifficultyLayer,
    tier: PerformanceTier
  ) {
    this.difficulty = difficulty;
    this.performanceTier = tier;
    for (const ctrl of this.controllers.values()) {
      ctrl.setDifficultyAndTier(difficulty, tier);
    }
  }

  public setCameraMode(mode: CameraViewMode) {
    this.cameraMode = mode;
    for (const ctrl of this.controllers.values()) {
      ctrl.setCameraMode(mode);
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
    if (!this.activeController) return;

    this.activeController.update(
      dt,
      elapsed,
      roverPos,
      camera,
      reticleX,
      reticleY,
      justPressedInteract,
      justPressedPulse,
      isActive,
      onDrivingPenalty,
      onBonusCoinsAwarded
    );
  }

  public getHudSnapshot(drivingScore: number): UniversalMissionHudSnapshot | null {
    if (!this.activeController) return null;
    return this.activeController.getHudSnapshot(drivingScore);
  }

  public isExitGateUnlocked(): boolean {
    if (!this.activeController) return true;
    return this.activeController.isExitGateUnlocked();
  }

  public getScannerBayFocusPosition(outVec: THREE.Vector3): THREE.Vector3 {
    if (!this.activeController) {
      return outVec.set(0, 1.5, 0);
    }
    return this.activeController.getScannerBayFocusPosition(outVec);
  }

  public dispose() {
    for (const ctrl of this.controllers.values()) {
      if (ctrl.rootGroup.parent === this.scene) {
        this.scene.remove(ctrl.rootGroup);
      }
      ctrl.dispose();
    }
    this.controllers.clear();
    this.activeController = null;
    this.activeMissionId = null;
  }
}
