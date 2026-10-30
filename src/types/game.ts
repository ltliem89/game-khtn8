export type CognitiveLevel = 'know' | 'understand' | 'apply';

export type VerificationStatus = 'approved' | 'teacher_review';

export type StationType = 'foundation' | 'core' | 'application' | 'checkpoint';

export type CampaignLength = 10 | 15 | 20 | 30;

export type SceneZoneId =
  | 'starter_garage'
  | 'mass_warehouse'
  | 'volume_lab'
  | 'materials_lab'
  | 'pressure_track'
  | 'fluid_channel'
  | 'archimedes_dock'
  | 'mechanics_workshop'
  | 'lever_yard'
  | 'electric_lab'
  | 'voltage_station'
  | 'thermal_chamber'
  | 'joulemeter_station'
  | 'heat_transfer_dome'
  | 'thermal_bridge'
  | 'command_plaza';

export type GameStatePhase =
  | 'menu'
  | 'map_setup'
  | 'station_setup'
  | 'jetbot_setup'
  | 'briefing'
  | 'driving'
  | 'paused'
  | 'station_brake'
  | 'quiz'
  | 'feedback'
  | 'station_result'
  | 'campaign_result';

export interface VariableExplanation {
  symbol: string;
  meaning_vi: string;
  unit: string;
}

export interface QuantityRecord {
  id: string;
  domain: 'physics_quantity' | 'physics_concept' | 'checkpoint_synthesis';
  name_vi: string;
  symbol: string;
  meaning_vi: string;
  unit_si: string;
  common_units: string[];
  formula_as_taught: string;
  formula_status: VerificationStatus;
  variable_explanations: VariableExplanation[];
  lesson_refs: string[];
  grade_scope: 'KHTN 8';
  prerequisites: string[];
  common_misconceptions: string[];
  source_note: string;
  verification_status: VerificationStatus;
  teacher_approved: boolean;
}

export interface StationTrackConfig {
  lane_width: number;
  curve_complexity: number;
  obstacle_count: number;
  max_speed: number;
  turn_sensitivity: number;
  checkpoint_id: string;
  station_trigger_radius: number;
}

export interface StationRecord {
  station_id: string;
  order: number;
  station_type: StationType;
  type_label_vi: 'Kiến thức nền' | 'Trạm chính' | 'Nhiệm vụ vận dụng' | 'Checkpoint tổng hợp';
  title: string;
  target_quantity_id: string;
  lesson_refs: string[];
  chapter_label: string;
  learning_objective: string;
  real_life_context: string;
  scene_id: SceneZoneId;
  minigame_id: string;
  difficulty_tier: 1 | 2 | 3 | 4 | 5;
  question_count: 10;
  question_blueprint: {
    know: 4;
    understand: 3;
    apply: 3;
  };
  pass_score: 5;
  retry_policy: 'new_equivalent_set';
  teacher_approved: boolean;
  track_config: StationTrackConfig;
  accent_color: string;
}

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuestionRecord {
  question_id: string;
  station_id: string;
  target_quantity_id: string;
  lesson_refs: string[];
  level: CognitiveLevel;
  skill: string;
  context: string;
  prompt: string;
  options: QuestionOption[];
  correct_option_id: 'A' | 'B' | 'C' | 'D';
  explanation_vi: string;
  expected_unit: string | null;
  accepted_answers: string[];
  given_values?: Record<string, string>;
  solution_steps?: string[];
  numeric_tolerance?: number | null;
  difficulty: 1 | 2 | 3;
  source_status: VerificationStatus;
  teacher_approved: boolean;
}

export interface StationAttemptRecord {
  attempt_id: string;
  station_id: string;
  question_set_id: string;
  score_0_10: number;
  stars: 0 | 1 | 2 | 3;
  completed_at: string;
  duration_seconds: number;
  wrong_question_ids: string[];
  weak_objectives: string[];
}

export interface StationProgressState {
  station_id: string;
  unlocked: boolean;
  completed: boolean;
  best_score: number;
  best_stars: 0 | 1 | 2 | 3;
  attempt_count: number;
  last_question_ids: string[];
}

export interface TeacherAnalytics {
  first_try_by_quantity: Record<string, { correct: number; total: number }>;
  first_try_by_level: Record<CognitiveLevel, { correct: number; total: number }>;
  confused_units_count: Record<string, number>;
  retry_improvements: { station_id: string; first_score: number; best_score: number }[];
  total_quiz_time_seconds: number;
}

export interface MapSetupConfig {
  campaignLength: CampaignLength;
  laneWidthMultiplier: number;
  curveScale: number;
  obstacleDensity: 'low' | 'standard' | 'high';
  atmospherePreset: 'daylight_lab' | 'golden_campus' | ' twilight_research';
  mapConstructed: boolean;
  stationsPlaced: boolean;
  jetbotReady: boolean;
}

export interface JetBotConfig {
  chassisColor: string;
  driveMode: 'manual' | 'ai_autopilot';
  maxSpeedSetting: number;
  turnSensitivitySetting: number;
  sensorOverlayVisible: boolean;
}

export interface JetBotTechUpgrades {
  magnetLevel: number; // 1..3: increases coin/gift attraction radius
  nitroLevel: number; // 1..3: increases turbo boost speed & duration
  shieldLevel: number; // 1..3: increases off-lane grace tolerance
  scannerLevel: number; // 1..3: bonus coins on quiz streak
}

export interface RewardWallet {
  coins: number;
  totalCoinsEarned: number;
  giftsOpened: number;
  hint5050Charges: number;
  aiHintCharges: number;
  streakShieldCharges: number;
  unlockedKnowledgeCards: string[]; // quantity IDs unlocked via road gift boxes or station mastery
  upgrades: JetBotTechUpgrades;
}

export interface CollectibleSpawnNode {
  id: string;
  type: 'coin' | 'gift_box' | 'boost_pad';
  x: number;
  z: number;
  collected: boolean;
  value: number;
}

import {
  DifficultyLayer,
  M01RunEvidence,
  PerformanceTier,
} from './missionSpec';

export interface CampaignProgress {
  campaign_length: CampaignLength;
  active_station_index: number;
  last_cleared_checkpoint_index: number;
  driving_score: number;
  station_progress: Record<string, StationProgressState>;
  attempt_history: StationAttemptRecord[];
  review_queue: string[];
  wrong_question_ids: string[];
  analytics: TeacherAnalytics;
  map_config: MapSetupConfig;
  jetbot_config: JetBotConfig;
  wallet: RewardWallet;
  difficulty_layer?: DifficultyLayer;
  performance_tier?: PerformanceTier;
  m01_runs?: M01RunEvidence[];
}

