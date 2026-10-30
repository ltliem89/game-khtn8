import * as THREE from 'three';
import {
  CameraViewMode,
  DifficultyLayer,
  GenericMissionRunEvidence,
  MissionId,
  PerformanceTier,
  UniversalMissionHudSnapshot,
} from '../../types/missionSpec';

export interface IMissionController {
  readonly id: MissionId;
  readonly titleVi: string;
  readonly rootGroup: THREE.Group;

  buildAroundStation(stationPos: THREE.Vector3, stationTangent: THREE.Vector3): void;

  update(
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
  ): void;

  getHudSnapshot(drivingScore: number): UniversalMissionHudSnapshot;

  isExitGateUnlocked(): boolean;

  getScannerBayFocusPosition(outVec: THREE.Vector3): THREE.Vector3;

  triggerSciencePulseOnAimed(): void;

  interactWithAimed(onBonusCoinsAwarded?: (coins: number, reasonVi: string) => void): void;

  selectTargetById(id: string): void;

  setDifficultyAndTier(difficulty: DifficultyLayer, tier: PerformanceTier): void;

  setCameraMode(mode: CameraViewMode): void;

  getCameraMode(): CameraViewMode;

  setImpactFeelCallback(
    cb: (hitstopSec: number, shakeIntensity: number) => void
  ): void;

  dispose(): void;
}
