import {
  CampaignLength,
  CampaignProgress,
  QuantityRecord,
  QuestionRecord,
  StationProgressState,
} from '../types/game';
import { buildCampaignRoute } from '../content/stations';
import { INITIAL_QUESTIONS_BANK } from '../content/questions';
import { INITIAL_QUANTITIES } from '../content/quantities';

const PROGRESS_STORAGE_KEY = 'khtn8_jetbot_campaign_progress_v1';
const QUESTIONS_STORAGE_KEY = 'khtn8_jetbot_questions_bank_v1';
const QUANTITIES_STORAGE_KEY = 'khtn8_jetbot_quantities_bank_v1';

export function computeStarsFromScore(score: number): 0 | 1 | 2 | 3 {
  if (score >= 9) return 3;
  if (score >= 7) return 2;
  if (score >= 5) return 1;
  return 0;
}

/**
 * Attendance star calculation:
 * Rule: 1 hour (3600 seconds) = 0.5 star, and so on continuously (every 30 mins = 0.25 star, 1 hr = 0.5 star, 2 hrs = 1.0 star).
 */
export function computeAttendanceStars(studyTimeSeconds: number): number {
  const halfStars = Math.floor(studyTimeSeconds / 3600) * 0.5;
  const partialProgress = Number(((studyTimeSeconds % 3600) / 7200).toFixed(2));
  return Number((halfStars + partialProgress).toFixed(2));
}

export function createInitialProgress(campaignLength: CampaignLength = 10): CampaignProgress {
  const route = buildCampaignRoute(campaignLength);
  const stationProgress: Record<string, StationProgressState> = {};

  route.forEach((st, idx) => {
    stationProgress[st.station_id] = {
      station_id: st.station_id,
      unlocked: idx === 0, // First station is unlocked
      completed: false,
      best_score: 0,
      best_stars: 0,
      attempt_count: 0,
      last_question_ids: [],
    };
  });

  return {
    campaign_length: campaignLength,
    active_station_index: 0,
    last_cleared_checkpoint_index: 0,
    driving_score: 100,
    station_progress: stationProgress,
    attempt_history: [],
    review_queue: [],
    wrong_question_ids: [],
    analytics: {
      first_try_by_quantity: {},
      first_try_by_level: {
        know: { correct: 0, total: 0 },
        understand: { correct: 0, total: 0 },
        apply: { correct: 0, total: 0 },
      },
      confused_units_count: {},
      retry_improvements: [],
      total_quiz_time_seconds: 0,
    },
    map_config: {
      campaignLength,
      laneWidthMultiplier: 1.0,
      curveScale: 1.0,
      obstacleDensity: 'standard',
      atmospherePreset: 'daylight_lab',
      mapConstructed: true,
      stationsPlaced: true,
      jetbotReady: true,
    },
    jetbot_config: {
      chassisColor: '#0284c7',
      driveMode: 'manual',
      maxSpeedSetting: 15,
      turnSensitivitySetting: 2.0,
      sensorOverlayVisible: true,
    },
    wallet: {
      coins: 60,
      totalCoinsEarned: 60,
      giftsOpened: 0,
      hint5050Charges: 2,
      aiHintCharges: 2,
      streakShieldCharges: 1,
      unlockedKnowledgeCards: ['PHY_MASS', 'PHY_VOLUME'],
      upgrades: {
        magnetLevel: 1,
        nitroLevel: 1,
        shieldLevel: 1,
        scannerLevel: 1,
      },
    },
    difficulty_layer: 'ROOKIE',
    performance_tier: 'HIGH',
    m01_runs: [],
  };
}

export function loadProgressSafely(): { progress: CampaignProgress; warning: string | null } {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      return { progress: createInitialProgress(10), warning: null };
    }
    const parsed = JSON.parse(raw) as Partial<CampaignProgress>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      ![10, 15, 20, 30].includes(Number(parsed.campaign_length)) ||
      !parsed.station_progress
    ) {
      return {
        progress: createInitialProgress(10),
        warning: 'Dữ liệu tiến độ lưu trữ không hợp lệ, hệ thống đã khôi phục cấu hình an toàn.',
      };
    }

    const base = createInitialProgress(parsed.campaign_length as CampaignLength);
    const mergedStations: Record<string, StationProgressState> = { ...base.station_progress };
    for (const [id, stState] of Object.entries(parsed.station_progress)) {
      if (mergedStations[id] && stState) {
        mergedStations[id] = {
          ...mergedStations[id],
          ...stState,
        };
      }
    }
    const route = buildCampaignRoute(parsed.campaign_length as CampaignLength);
    if (route[0] && mergedStations[route[0].station_id]) {
      mergedStations[route[0].station_id].unlocked = true;
    }

    return {
      progress: {
        ...base,
        ...parsed,
        station_progress: mergedStations,
        difficulty_layer: parsed.difficulty_layer || base.difficulty_layer,
        performance_tier: parsed.performance_tier || base.performance_tier,
        m01_runs: Array.isArray(parsed.m01_runs) ? parsed.m01_runs : [],
        map_config: {
          ...base.map_config,
          ...(parsed.map_config || {}),
          campaignLength: parsed.campaign_length as CampaignLength,
        },
        jetbot_config: {
          ...base.jetbot_config,
          ...(parsed.jetbot_config || {}),
        },
        wallet: {
          ...base.wallet,
          ...(parsed.wallet || {}),
          upgrades: {
            ...base.wallet.upgrades,
            ...(parsed.wallet?.upgrades || {}),
          },
          unlockedKnowledgeCards: Array.from(
            new Set([
              ...base.wallet.unlockedKnowledgeCards,
              ...(parsed.wallet?.unlockedKnowledgeCards || []),
            ])
          ),
        },
      },
      warning: null,
    };
  } catch (err) {
    console.warn('Error loading progress from localStorage:', err);
    return {
      progress: createInitialProgress(10),
      warning: 'Không thể đọc bộ nhớ trình duyệt, đã khởi tạo phiên học tập an toàn.',
    };
  }
}

export function saveProgressSafely(progress: CampaignProgress): boolean {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (err) {
    console.warn('Could not save progress to localStorage:', err);
    return false;
  }
}

export function loadQuestionsBankSafely(): QuestionRecord[] {
  try {
    const raw = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    if (!raw) return INITIAL_QUESTIONS_BANK;
    const saved = JSON.parse(raw) as QuestionRecord[];
    if (!Array.isArray(saved) || saved.length === 0) return INITIAL_QUESTIONS_BANK;

    // Merge initial bank with teacher edits or custom additions, while keeping freshly shuffled options from INITIAL_QUESTIONS_BANK
    const byId = new Map<string, QuestionRecord>();
    INITIAL_QUESTIONS_BANK.forEach((q) => byId.set(q.question_id, q));
    saved.forEach((q) => {
      if (q && q.question_id) {
        const initialQ = byId.get(q.question_id);
        if (initialQ) {
          byId.set(q.question_id, {
            ...initialQ,
            teacher_approved: q.teacher_approved,
            source_status: q.source_status,
            prompt: q.prompt || initialQ.prompt,
            explanation_vi: q.explanation_vi || initialQ.explanation_vi,
          });
        } else {
          byId.set(q.question_id, q);
        }
      }
    });
    return Array.from(byId.values());
  } catch {
    return INITIAL_QUESTIONS_BANK;
  }
}

export function saveQuestionsBankSafely(questions: QuestionRecord[]): boolean {
  try {
    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(questions));
    return true;
  } catch {
    return false;
  }
}

export function loadQuantitiesBankSafely(): QuantityRecord[] {
  try {
    const raw = localStorage.getItem(QUANTITIES_STORAGE_KEY);
    if (!raw) return INITIAL_QUANTITIES;
    const saved = JSON.parse(raw) as QuantityRecord[];
    if (!Array.isArray(saved) || saved.length === 0) return INITIAL_QUANTITIES;
    const byId = new Map<string, QuantityRecord>();
    INITIAL_QUANTITIES.forEach((q) => byId.set(q.id, q));
    saved.forEach((q) => {
      if (q && q.id) byId.set(q.id, q);
    });
    return Array.from(byId.values());
  } catch {
    return INITIAL_QUANTITIES;
  }
}

export function saveQuantitiesBankSafely(quantities: QuantityRecord[]): boolean {
  try {
    localStorage.setItem(QUANTITIES_STORAGE_KEY, JSON.stringify(quantities));
    return true;
  } catch {
    return false;
  }
}
