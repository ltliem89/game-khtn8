# TECHNICAL ARCHITECTURE — JETBOT-SCI8
## Integration contract for React + TypeScript + Three.js

## 1. Technology constraints

Giữ nền tảng hiện tại nếu repository xác nhận đang dùng:
- React 19 + TypeScript.
- Three.js/WebGL cho scene 3D.
- Vite làm dev/build tool.
- Tailwind CSS v4 cho UI DOM.
- Web Audio API và Web Speech API nếu đã tích hợp.
- Express/Vite middleware hiện có nếu cần backend.

Không thêm physics engine nặng nếu có thể đạt nhu cầu bằng physics controller tùy chỉnh. Nếu cần thư viện, phải đánh giá bundle size, license, compatibility và fallback. Không nâng major dependency chỉ để có hiệu ứng.

## 2. Application architecture

### Layer 1 — React application

Quản lý menu, setup, campaign map, overlay, quiz modal, result, teacher tools. React không được cập nhật 3D mesh theo từng frame bằng state setState.

### Layer 2 — Game runtime

Một `GameRuntime` sở hữu renderer, scene, camera, clock, input, audio, simulation systems và active mission. React gửi command/subscribe snapshots có throttle.

### Layer 3 — Mission modules

Mỗi Mxx/Bxx đăng ký scene builder và controller riêng. Dùng chung hệ thống nhưng không chia sẻ mục tiêu/logic đặc thù sai cách.

### Layer 4 — Content and progress

Mission definitions, question selectors, progress storage, wallet, analytics, teacher approval.

## 3. Runtime services

Các service đề xuất:
- `GameRuntime`: init/start/stop/dispose.
- `SceneManager`: load/unload world/mission safely.
- `CampaignService`: mission unlocks, boss gates, world progression.
- `MissionRegistry`: map mission ID → module/metadata.
- `MissionController`: active objective, timer, lives/energy, checkpoint and completion.
- `VehicleController`: acceleration, steering, braking, drift, suspension approximation, collision response.
- `DroneController`: flight mode for M06; independent from vehicle controller.
- `CameraRig`: chase, cockpit, first-person, camera collision, transition.
- `InputManager`: keyboard/mouse/touch/gamepad abstraction.
- `InteractionSystem`: raycast + trigger zones + interactable interface.
- `PhysicsQuery`: collision, overlap, ground detection and raycast helpers.
- `AudioManager`: BGM/SFX/spatial audio/ducking.
- `VFXManager`: pooled particles, pulse, spark, water, heat shimmer.
- `HUDBridge`: expose low-frequency state snapshots to React.
- `QuestionAdapter`: adapt existing questions.ts schema; do not duplicate data store.
- `ProgressAdapter`: adapt existing progressStorage.ts and analytics schema.

## 4. Mission definition contract

```ts
export type MissionId =
  | 'M01_MASS' | 'M02_VOLUME' | 'M03_DENSITY'
  | 'M04_SURFACE_PRESSURE' | 'M05_LIQUID_PRESSURE'
  | 'M06_ATMOSPHERIC_PRESSURE' | 'M07_ARCHIMEDES'
  | 'M08_MOMENT' | 'M09_LEVER'
  | 'M10_CURRENT' | 'M11_VOLTAGE'
  | 'M12_THERMAL_ENERGY' | 'M13_JOULEMETER'
  | 'M14_HEAT_TRANSFER' | 'M15_THERMAL_EXPANSION'
  | 'B01_CARGO_CATASTROPHE' | 'B02_ABYSS_REACTOR' | 'B03_CORE_MELTDOWN';

export interface MissionDefinition {
  id: MissionId;
  worldId: string;
  sequence: number;
  type: 'learning' | 'boss';
  title: string;
  learningObjectives: string[];
  prerequisites: MissionId[];
  recommendedDurationSeconds: number;
  difficultyTuning: Record<string, unknown>;
  assets: string[];
  assessmentPolicy: {
    questionCount: 10;
    distribution: { know: 4; understand: 3; apply: 3 };
    teacherApprovedOnly: true;
  };
}
```

Mission-specific controller can be typed separately; keep public interface stable.

## 5. Scene lifecycle and frame loop

- `requestAnimationFrame` owned by GameRuntime.
- Use `deltaTime` clamped to avoid giant physics steps after tab becomes inactive.
- Fixed timestep for gameplay simulation (suggest 1/60 s accumulator) with render interpolation; tune after profiling.
- Pause stops simulation, timers, movement, AI, hazards and game-time audio where appropriate.
- Resume resets frame timestamp to prevent sudden jump.
- On route change/unmount: remove event listeners, dispose geometries/materials/textures/render targets, stop audio nodes, clear timers, release input capture.
- Do not recreate WebGLRenderer on every React state update.

## 6. Rendering pipeline

- WebGLRenderer with antialias based on device tier; pixel ratio capped.
- Tone mapping and color space configured consistently.
- PBR materials with controlled roughness/metalness; use baked/vertex colors for distant assets.
- Shadows only for hero props and nearby geometry; use shadow budget.
- LOD for environment and props; cull objects outside camera frustum.
- InstancedMesh for repeated crates, rocks, grass, pipes, bolts, lights and track elements.
- Particle systems pooled; do not allocate new geometry/material every frame.
- Avoid real-time point lights for every neon object; use emissive materials and a small number of dynamic lights.
- Post-processing optional by performance tier.
- Loading screen with actual asset/scene progress or staged messages; do not fake 100% while assets are still loading.

## 7. Coordinate and world conventions

- World up: +Y.
- Vehicle forward: choose and document one convention consistently (e.g. local -Z in Three.js).
- Units: 1 world unit ≈ 1 meter for gameplay tuning where practical.
- Keep track centerline and road width in mission metadata.
- Trigger volumes have debug visualization in development mode.
- All colliders have named IDs and tags for collision analytics.

## 8. Input handling

- Centralized input map; no direct document key listeners inside individual mission components.
- Support keyboard, pointer, touch and optional gamepad.
- Pointer lock only after explicit player interaction and only in first-person segment; release on pause/visibility loss.
- Prevent browser scroll on game controls but preserve normal page scroll outside game canvas.
- Mobile input: joystick vector normalized; simultaneous throttle + steering supported.
- UI buttons must not accidentally trigger gameplay input through event bubbling.

## 9. Vehicle physics model

Minimum model:
- Longitudinal acceleration, max speed, braking, rolling resistance.
- Steering response dependent on speed.
- Lateral grip and drift state.
- Ground contact and slope response.
- Collision impulse/damage or penalty, with recovery/reset policy.
- Nitro multiplier with charge, duration, cooldown and no bypass of mission gate logic.
- Lane deviation grace period consistent with current project unless tuning is explicitly changed.

Keep `drivingScore` independent from `knowledgeScore`.

## 10. Interaction architecture

Each interactable implements a contract such as:
- `id`, `kind`, `enabled`.
- `getPrompt()`.
- `canInteract(context)`.
- `interact(context)`.
- `getTargetingInfo()`.

Use raycast interaction in FPS mode and trigger/overlap interaction in driving mode. Display target outline only for valid and reachable object. Interactions must be debounced and idempotent.

## 11. State, persistence and data integrity

Persist at safe boundaries:
- mission started/completed;
- checkpoint reached;
- quiz attempt submitted;
- reward granted;
- upgrade purchased;
- campaign unlock changed.

Use versioned storage schema and migration. Handle corrupted LocalStorage gracefully. Avoid save writes every frame. A mission result write must be idempotent so double-click cannot duplicate rewards.

Suggested `MissionRun`:
```ts
interface MissionRun {
  runId: string;
  missionId: string;
  startedAt: number;
  completedAt?: number;
  checkpointId?: string;
  state: 'active' | 'paused' | 'completed' | 'failed';
  drivingScore: number;
  knowledgeScore?: number;
  timeMs: number;
  retries: number;
  collectedIds: string[];
  objectiveFlags: Record<string, boolean>;
  interactionEvidence: Record<string, unknown>;
}
```

## 12. Question engine integration

- Adapter converts existing bank records to the mission quiz shape without altering source truth.
- Select exactly 4 know + 3 understand + 3 apply.
- Exclude `teacher_approved !== true` for official quiz.
- Deterministic run seed may be stored for audit; option order randomized per attempt.
- Never persist answer correctness in a client-visible object before answer lock if that would reveal solution.
- Score and explanation appear after each submitted answer according to current assessment design.
- Store attempt history and misconception tags for teacher analytics.

## 13. Error handling

- WebGL unavailable: show actionable fallback message and do not enter broken blank canvas.
- Context lost: show recovery overlay; attempt renderer restore if supported.
- Asset fail: use designed fallback asset, record error, maintain gameplay if non-critical.
- Question bank missing: allow exploration only; clearly mark assessment unavailable. Never invent a test.
- Storage unavailable: temporary in-memory session with clear warning; do not claim persistent save.

## 14. Observability and developer tools

Development overlay may show FPS, draw calls, triangles, active meshes, physics step, current mission state, collision tags and input state. Hidden in production by default.

Provide mission debug menu in development build: teleport to checkpoint, complete objective, toggle hazard, reset puzzle, show triggers. Do not expose these in student production mode.

## 15. Integration with existing project paths

Audit and reuse current files where applicable:
- `src/App.tsx`
- `src/types/game.ts`
- `src/content/quantities.ts`
- `src/content/stations.ts`
- `src/content/questions.ts`
- `src/storage/progressStorage.ts`
- `src/game/input/inputManager.ts`
- `src/game/vehicle/vehiclePhysics.ts`
- `src/game/track/world3D.ts`
- `src/game/audio/soundEngine.ts`
- `src/ui/hud/DrivingHudOverlay.tsx`
- `src/ui/quiz/StationQuizModal.tsx`
- `src/ui/quiz/StationResultModal.tsx`
- `src/ui/knowledge/KnowledgeMapModal.tsx`
- `src/ui/teacher-review/TeacherReviewModal.tsx`

The file list is a baseline from the report, not proof that every path exists in the actual repository. Verify before editing.
