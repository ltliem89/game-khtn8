import * as THREE from 'three';
import { IMissionController } from './missionContracts';
import { M01MassVaultController } from './m01MassVault';
import {
  CameraViewMode,
  DifficultyLayer,
  GenericMissionRunEvidence,
  MissionId,
  PerformanceTier,
  UniversalMissionHudSnapshot,
} from '../../types/missionSpec';

export class M01MissionAdapter implements IMissionController {
  public readonly id: MissionId = 'M01_MASS';
  public readonly titleVi: string = 'M01 · KHO LƯU TRỮ KHỐI LƯỢNG';
  public readonly rootGroup: THREE.Group;
  public readonly innerController: M01MassVaultController;

  constructor(
    isSoftwareGlOrVault: boolean | M01MassVaultController,
    maxAnisotropy?: number
  ) {
    if (typeof isSoftwareGlOrVault === 'boolean') {
      this.innerController = new M01MassVaultController(
        isSoftwareGlOrVault,
        maxAnisotropy ?? 1
      );
    } else {
      this.innerController = isSoftwareGlOrVault;
    }
    this.rootGroup = this.innerController.rootGroup;
  }

  public buildAroundStation(stationPos: THREE.Vector3, stationTangent: THREE.Vector3): void {
    this.innerController.buildVaultAroundStation(stationPos, stationTangent);
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
  ): void {
    this.innerController.update(
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

  public getHudSnapshot(drivingScore: number): UniversalMissionHudSnapshot {
    const raw = this.innerController.getHudSnapshot(drivingScore);
    const convertedItems = raw.allCrates.map((c) => ({
      spec: {
        id: c.spec.id,
        code: c.spec.code,
        titleVi: c.spec.titleVi,
        rawLabelText: c.spec.rawLabelText,
        displayedSymbol: c.spec.displayedSymbol,
        rawValueText: c.spec.rawValueText,
        readoutVi: c.spec.electronicScaleReadoutVi,
        numericValue: c.spec.massKg,
        unit: 'kg',
        isValidTarget: c.spec.isValidMassTarget,
        distractorReasonVi: c.spec.distractorReasonVi,
        scientificNoteVi: c.spec.scientificNoteVi,
        colorHex: c.spec.colorHex,
        accentHex: c.spec.accentHex,
      },
      scanned: c.scanned,
      taggedWithPulse: c.taggedWithPulse,
      activatedOrLoaded: c.loadedOnConveyor,
      rejectedAttemptCount: c.rejectedAttemptCount,
      worldPosition: c.worldPosition,
    }));

    const aimedItem = raw.aimedCrate
      ? convertedItems.find((i) => i.spec.id === raw.aimedCrate?.spec.id) || null
      : null;

    const evidence: GenericMissionRunEvidence = {
      runId: raw.evidence.runId,
      missionId: this.id,
      difficulty: raw.difficulty,
      performanceTier: raw.performanceTier,
      checkpointsReached: raw.evidence.checkpointsReached,
      objectiveFlags: raw.evidence.objectiveFlags,
      interactionCount: raw.evidence.interactionCount,
      scanCount: raw.evidence.scanCount,
      pulseTagCount: raw.evidence.pulseTagCount,
      wrongAttempts: raw.evidence.wrongCrateAttempts,
      retries: raw.evidence.retries,
      collectedIds: raw.evidence.collectedIds,
      routeChoices: raw.evidence.routeChoices,
      missionTimeMs: raw.evidence.missionTimeMs,
      drivingScore: raw.evidence.drivingScore,
      knowledgeScore: raw.evidence.knowledgeScore,
      missionPerformanceScore: raw.evidence.missionPerformanceScore,
      interactionEvidence: raw.evidence.interactionEvidence,
    };

    return {
      active: raw.active,
      missionId: this.id,
      missionTitleVi: this.titleVi,
      missionPhase: raw.missionPhase,
      cameraMode: raw.cameraMode,
      difficulty: raw.difficulty,
      performanceTier: raw.performanceTier,
      currentFps: raw.currentFps,
      checkpointId: raw.checkpointId,
      objectiveTextVi: raw.objectiveTextVi,
      orbitMessageVi: raw.orbitMessageVi,
      orbitSpeaker: raw.orbitSpeaker,
      feedbackTone: raw.feedbackTone,
      inInteractiveZone: raw.inScannerZone,
      currentProgressValue: raw.loadedMassKg,
      targetProgressValue: raw.targetMassKg,
      progressUnit: 'kg',
      completedItemsCount: raw.loadedCratesCount,
      requiredItemsCount: raw.requiredCratesCount,
      wrongAttempts: raw.wrongAttempts,
      maxWrongAttempts: raw.maxWrongAttempts,
      remainingTimeSeconds: raw.remainingTimeSeconds,
      shortcutUnlocked: raw.shortcutUnlocked,
      holoCrateCollected: raw.holoCrateCollected,
      exitGateOpen: raw.exitGateOpen,
      aimedItem,
      allItems: convertedItems,
      reticleX: raw.reticleX,
      reticleY: raw.reticleY,
      tieredHintVi: raw.tieredHintVi,
      evidence,
    };
  }

  public isExitGateUnlocked(): boolean {
    return this.innerController.isExitGateUnlocked();
  }

  public getScannerBayFocusPosition(outVec: THREE.Vector3): THREE.Vector3 {
    return this.innerController.getScannerBayFocusPosition(outVec);
  }

  public triggerSciencePulseOnAimed(): void {
    this.innerController.triggerSciencePulseOnAimed();
  }

  public interactWithAimed(
    onBonusCoinsAwarded?: (coins: number, reasonVi: string) => void
  ): void {
    this.innerController.interactWithAimedCrate(onBonusCoinsAwarded);
  }

  public selectTargetById(id: string): void {
    this.innerController.selectAndInspectCrateById(id);
  }

  public setDifficultyAndTier(
    difficulty: DifficultyLayer,
    tier: PerformanceTier
  ): void {
    this.innerController.setDifficultyAndTier(difficulty, tier);
  }

  public setCameraMode(mode: CameraViewMode): void {
    this.innerController.setCameraMode(mode);
  }

  public getCameraMode(): CameraViewMode {
    return this.innerController.getCameraMode();
  }

  public setImpactFeelCallback(
    cb: (hitstopSec: number, shakeIntensity: number) => void
  ): void {
    this.innerController.setImpactFeelCallback(cb);
  }

  public dispose(): void {
    this.innerController.dispose();
  }
}
