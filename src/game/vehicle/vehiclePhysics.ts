import * as THREE from 'three';
import { VehicleInputState } from '../input/inputManager';

export interface TrackNodeSample {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  t: number;
  distanceSq: number;
}

export interface ObstacleCollider {
  id: string;
  position: THREE.Vector3;
  radius: number;
}

export interface VehicleTelemetry {
  x: number;
  z: number;
  heading: number;
  speed: number;
  steeringAngle: number;
  wheelRotation: number;
  isOffLane: boolean;
  offLaneDurationMs: number;
  isPenalizingOffLane: boolean;
  distanceToTargetMeters: number;
  autopilotActive: boolean;
  nitroEnergy?: number;
  nitroActive?: boolean;
}

export class VehiclePhysicsEngine {
  public position = new THREE.Vector3(0, 0, 0);
  public heading = 0; // radians, 0 points along +Z
  public speed = 0; // m/s
  public steeringAngle = 0;
  public wheelRotation = 0;
  public nitroEnergy = 100; // 0..100%
  public nitroActive = false;
  public boostPadTimer = 0;

  // Off-lane tracking: 700ms grace period per 04_WORLD_PHYSICS_AND_ACCEPTANCE.md
  public isOffLane = false;
  public offLaneDurationMs = 0;
  private penaltyAccumulatorSec = 0;
  private reverseHoldTimer = 0;

  public resetAtPoint(pos: THREE.Vector3, tangent: THREE.Vector3) {
    this.position.set(pos.x, 0, pos.z);
    this.heading = Math.atan2(tangent.x, tangent.z);
    this.speed = 0;
    this.steeringAngle = 0;
    this.isOffLane = false;
    this.offLaneDurationMs = 0;
    this.penaltyAccumulatorSec = 0;
    this.reverseHoldTimer = 0;
    this.nitroActive = false;
    this.boostPadTimer = 0;
  }

  public refillNitro(amount: number) {
    this.nitroEnergy = Math.min(100, this.nitroEnergy + amount);
  }

  public triggerBoostPad(durationSec = 1.6) {
    this.boostPadTimer = Math.max(this.boostPadTimer, durationSec);
    this.refillNitro(25);
  }

  public forceStop() {
    this.speed = 0;
    this.steeringAngle = 0;
    this.reverseHoldTimer = 0;
    this.nitroActive = false;
    this.boostPadTimer = 0;
  }

  public step(
    dt: number,
    input: VehicleInputState,
    options: {
      maxSpeed: number;
      turnSensitivity: number;
      laneHalfWidth: number;
      nearestTrackSample: TrackNodeSample;
      lookaheadPoint: THREE.Vector3;
      targetStationPos: THREE.Vector3;
      stationTriggerRadius: number;
      obstacles: ObstacleCollider[];
      autopilot: boolean;
      stationBraking: boolean;
    }
  ): {
    drivingPenaltyDelta: number;
    reachedStationTrigger: boolean;
    hitObstacle: boolean;
  } {
    const clampedDt = Math.min(dt, 0.05);

    // 1. If in station_brake state, smoothly damp speed to 0 and lock steering
    if (options.stationBraking) {
      this.nitroActive = false;
      this.boostPadTimer = 0;
      this.speed = THREE.MathUtils.damp(this.speed, 0, 12, clampedDt);
      if (Math.abs(this.speed) < 0.08) this.speed = 0;
      this.position.x += Math.sin(this.heading) * this.speed * clampedDt;
      this.position.z += Math.cos(this.heading) * this.speed * clampedDt;
      this.wheelRotation += this.speed * clampedDt * 2.2;
      return {
        drivingPenaltyDelta: 0,
        reachedStationTrigger: true,
        hitObstacle: false,
      };
    }

    const dxStation = options.targetStationPos.x - this.position.x;
    const dzStation = options.targetStationPos.z - this.position.z;
    const distToStation = Math.hypot(dxStation, dzStation);

    // Check if inside station trigger radius
    if (distToStation <= options.stationTriggerRadius) {
      this.nitroActive = false;
      this.boostPadTimer = 0;
      this.speed = THREE.MathUtils.damp(this.speed, 0, 14, clampedDt);
      return {
        drivingPenaltyDelta: 0,
        reachedStationTrigger: true,
        hitObstacle: false,
      };
    }

    if (this.boostPadTimer > 0) {
      this.boostPadTimer = Math.max(0, this.boostPadTimer - clampedDt);
    }

    const wantsNitro = input.nitro && this.nitroEnergy > 4;
    if (wantsNitro) {
      this.nitroActive = true;
      this.nitroEnergy = Math.max(0, this.nitroEnergy - 28 * clampedDt);
    } else {
      this.nitroActive = this.boostPadTimer > 0;
      this.nitroEnergy = Math.min(100, this.nitroEnergy + 9 * clampedDt);
    }

    const boostMultiplier = this.nitroActive ? 1.48 : 1.0;
    const maxFwdSpeed = options.maxSpeed * boostMultiplier;
    const maxRevSpeed = Math.min(4.2, options.maxSpeed * 0.28);
    const accelRate = this.nitroActive ? 22.0 : 11.5;
    const brakeRate = 22.0;
    const coastFriction = 4.2;

    let throttleInput = this.nitroActive ? 1 : 0;
    let steerInput = 0;
    let activeBrake = input.brake;

    // 2. Manual input vs JetBot AI Lane-Following Autopilot
    const manualOverride =
      input.forward || input.backward || input.left || input.right || input.brake;

    if (options.autopilot && !manualOverride) {
      // PID steering toward lookahead point on spline, with obstacle avoidance
      let desiredX = options.lookaheadPoint.x;
      let desiredZ = options.lookaheadPoint.z;

      // Soft obstacle repulsion for AI autopilot
      for (const obs of options.obstacles) {
        const ox = this.position.x - obs.position.x;
        const oz = this.position.z - obs.position.z;
        const od = Math.hypot(ox, oz);
        if (od < obs.radius + 4.5 && od > 0.01) {
          desiredX += (ox / od) * 3.2;
          desiredZ += (oz / od) * 3.2;
        }
      }

      const targetAngle = Math.atan2(
        desiredX - this.position.x,
        desiredZ - this.position.z
      );
      let angleDiff = targetAngle - this.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      steerInput = THREE.MathUtils.clamp(angleDiff * 2.2, -1, 1);

      // Slow down smoothly when approaching station trigger or sharp turns
      const approachFactor = THREE.MathUtils.clamp(
        (distToStation - options.stationTriggerRadius * 0.6) / 14,
        0.28,
        1.0
      );
      const turnSlowdown = 1 - Math.min(Math.abs(steerInput) * 0.35, 0.35);
      const desiredSpeed = maxFwdSpeed * 0.82 * approachFactor * turnSlowdown;

      if (this.speed < desiredSpeed - 0.3) {
        throttleInput = 1;
      } else if (this.speed > desiredSpeed + 0.8) {
        activeBrake = true;
      }
    } else {
      if (input.forward || this.nitroActive) throttleInput = 1;
      else if (input.backward) throttleInput = -1;
      if (input.left) steerInput += 1;
      if (input.right) steerInput -= 1;
    }

    // 3. Longitudinal velocity update (prevent instant max reverse when holding S)
    if (activeBrake) {
      if (Math.abs(this.speed) < 0.25) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * brakeRate * clampedDt;
      }
    } else if (throttleInput > 0) {
      this.reverseHoldTimer = 0;
      if (this.speed < 0) {
        this.speed += brakeRate * clampedDt;
      } else {
        this.speed = Math.min(maxFwdSpeed, this.speed + accelRate * clampedDt);
      }
    } else if (throttleInput < 0) {
      if (this.speed > 0.3) {
        // Braking from forward motion first
        this.speed = Math.max(0, this.speed - brakeRate * clampedDt);
        this.reverseHoldTimer = 0;
      } else {
        // Brief pause before smoothly accelerating in reverse up to capped maxRevSpeed
        this.reverseHoldTimer += clampedDt;
        if (this.reverseHoldTimer > 0.18) {
          this.speed = Math.max(
            -maxRevSpeed,
            this.speed - accelRate * 0.55 * clampedDt
          );
        } else {
          this.speed = 0;
        }
      }
    } else {
      this.reverseHoldTimer = 0;
      if (Math.abs(this.speed) <= coastFriction * clampedDt) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * coastFriction * clampedDt;
      }
    }

    // 4. Speed-dependent turning (vehicle cannot spin in place like a chess piece)
    const targetSteer = steerInput * 0.55;
    this.steeringAngle = THREE.MathUtils.damp(
      this.steeringAngle,
      targetSteer,
      10,
      clampedDt
    );

    const speedRatio = Math.min(Math.abs(this.speed) / 2.2, 1.0);
    const highSpeedDamp =
      1.0 - 0.32 * Math.min(Math.abs(this.speed) / maxFwdSpeed, 1.0);
    const directionSign = this.speed >= -0.05 ? 1 : -1;

    if (Math.abs(this.speed) > 0.06) {
      const yawRate =
        steerInput *
        options.turnSensitivity *
        speedRatio *
        highSpeedDamp *
        directionSign;
      this.heading += yawRate * clampedDt;
    }

    // Advance position
    this.position.x += Math.sin(this.heading) * this.speed * clampedDt;
    this.position.z += Math.cos(this.heading) * this.speed * clampedDt;
    this.wheelRotation += this.speed * clampedDt * 2.2;

    // 5. Obstacle collision detection & gentle non-violent pushback
    let hitObstacle = false;
    const roverRadius = 1.05;
    for (const obs of options.obstacles) {
      const dx = this.position.x - obs.position.x;
      const dz = this.position.z - obs.position.z;
      const dist = Math.hypot(dx, dz);
      const minSep = roverRadius + obs.radius;
      if (dist < minSep && dist > 0.0001) {
        hitObstacle = true;
        const overlap = minSep - dist;
        this.position.x += (dx / dist) * overlap;
        this.position.z += (dz / dist) * overlap;
        this.speed *= 0.35; // Reduce speed on barrier contact
      }
    }

    // 6. Off-lane check with mandatory 700ms grace period
    const distFromCenterline = Math.sqrt(options.nearestTrackSample.distanceSq);
    const currentlyOffLane = distFromCenterline > options.laneHalfWidth;

    let drivingPenaltyDelta = 0;
    if (currentlyOffLane) {
      this.isOffLane = true;
      this.offLaneDurationMs += clampedDt * 1000;
      if (this.offLaneDurationMs > 700) {
        this.penaltyAccumulatorSec += clampedDt;
        if (this.penaltyAccumulatorSec >= 1.0) {
          const wholeSeconds = Math.floor(this.penaltyAccumulatorSec);
          drivingPenaltyDelta = wholeSeconds;
          this.penaltyAccumulatorSec -= wholeSeconds;
        }
      }
    } else {
      // Immediately stop penalty when returning to lane
      this.isOffLane = false;
      this.offLaneDurationMs = 0;
      this.penaltyAccumulatorSec = 0;
    }

    // Soft outer perimeter clamp so vehicle never gets lost in the void
    const maxOffset = options.laneHalfWidth + 6.5;
    if (distFromCenterline > maxOffset) {
      const pullX = options.nearestTrackSample.point.x - this.position.x;
      const pullZ = options.nearestTrackSample.point.z - this.position.z;
      const pullLen = Math.hypot(pullX, pullZ) || 1;
      const excess = distFromCenterline - maxOffset;
      this.position.x += (pullX / pullLen) * excess;
      this.position.z += (pullZ / pullLen) * excess;
      this.speed *= 0.6;
    }

    return {
      drivingPenaltyDelta,
      reachedStationTrigger: false,
      hitObstacle,
    };
  }
}
