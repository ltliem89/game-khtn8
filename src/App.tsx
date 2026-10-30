import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CampaignLength,
  CampaignProgress,
  GameStatePhase,
  JetBotConfig,
  MapSetupConfig,
  QuantityRecord,
  QuestionRecord,
  StationAttemptRecord,
} from './types/game';
import { buildCampaignRoute } from './content/stations';
import { selectQuestionsForStationAttempt } from './content/questions';
import {
  computeStarsFromScore,
  createInitialProgress,
  loadProgressSafely,
  loadQuantitiesBankSafely,
  loadQuestionsBankSafely,
  saveProgressSafely,
  saveQuestionsBankSafely,
} from './storage/progressStorage';
import { InputManager } from './game/input/inputManager';
import { World3DEngine } from './game/track/world3D';
import { VehicleTelemetry } from './game/vehicle/vehiclePhysics';
import { soundEngine } from './game/audio/soundEngine';
import { SetupWizardOverlay } from './ui/setup/SetupWizardOverlay';
import { DrivingHudOverlay } from './ui/hud/DrivingHudOverlay';
import { StationQuizModal } from './ui/quiz/StationQuizModal';
import { StationResultModal } from './ui/quiz/StationResultModal';
import { TeacherReviewModal } from './ui/teacher-review/TeacherReviewModal';
import { ElementsCompoundsModal } from './ui/chemistry/ElementsCompoundsModal';
import { KnowledgeMapModal } from './ui/knowledge/KnowledgeMapModal';
import { MissionBriefingOverlay } from './ui/missions/MissionBriefingOverlay';
import { FpsScannerHudOverlay } from './ui/missions/FpsScannerHudOverlay';
import { UniversalMissionHudOverlay } from './ui/missions/UniversalMissionHudOverlay';
import {
  DifficultyLayer,
  M01HudSnapshot,
  PerformanceTier,
  UniversalMissionHudSnapshot,
} from './types/missionSpec';
import { Play, RotateCcw, Star, Trophy } from 'lucide-react';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<World3DEngine | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);

  // Load persisted state safely
  const initialLoaded = useMemo(() => loadProgressSafely(), []);
  const [progress, setProgress] = useState<CampaignProgress>(initialLoaded.progress);
  const [storageWarning, setStorageWarning] = useState<string | null>(initialLoaded.warning);

  const [questionsBank, setQuestionsBank] = useState<QuestionRecord[]>(() =>
    loadQuestionsBankSafely()
  );
  const [quantitiesBank] = useState<QuantityRecord[]>(() =>
    loadQuantitiesBankSafely()
  );

  const [phase, setPhase] = useState<GameStatePhase>('menu');
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [pronunciationModalOpen, setPronunciationModalOpen] = useState(false);
  const [knowledgeMapModalOpen, setKnowledgeMapModalOpen] = useState(false);
  const [pickupToast, setPickupToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState(() => soundEngine.isMuted());
  const [m01Hud, setM01Hud] = useState<M01HudSnapshot | null>(null);
  const [universalHud, setUniversalHud] = useState<UniversalMissionHudSnapshot | null>(null);

  // Active quiz questions & last attempt record
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<QuestionRecord[]>([]);
  const [lastAttemptRecord, setLastAttemptRecord] = useState<StationAttemptRecord | null>(null);

  // Live HUD telemetry from 3D world loop
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({
    x: 0,
    z: 0,
    heading: 0,
    speed: 0,
    steeringAngle: 0,
    wheelRotation: 0,
    isOffLane: false,
    offLaneDurationMs: 0,
    isPenalizingOffLane: false,
    distanceToTargetMeters: 40,
    autopilotActive: false,
  });
  const [minimapPath, setMinimapPath] = useState<{ x: number; z: number }[]>([]);
  const [stationCoords, setStationCoords] = useState<
    { id: string; x: number; z: number; title: string }[]
  >([]);

  const stations = useMemo(
    () => buildCampaignRoute(progress.campaign_length),
    [progress.campaign_length]
  );

  const activeStation =
    stations[Math.min(progress.active_station_index, stations.length - 1)] ||
    stations[0];

  const activeQuantity = useMemo(
    () => quantitiesBank.find((q) => q.id === activeStation?.target_quantity_id),
    [quantitiesBank, activeStation]
  );

  // Keep refs synchronized for 3D loop callbacks
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const questionsBankRef = useRef(questionsBank);
  questionsBankRef.current = questionsBank;

  // Save progress whenever it updates
  useEffect(() => {
    saveProgressSafely(progress);
  }, [progress]);

  // Open station quiz after vehicle brakes inside station_trigger_radius
  const openStationQuizForIndex = useCallback((stationIdx: number) => {
    const currentStations = stationsRef.current;
    const st = currentStations[stationIdx];
    if (!st) return;

    const stProg = progressRef.current.station_progress[st.station_id];
    const selectedQs = selectQuestionsForStationAttempt(
      st,
      questionsBankRef.current,
      stProg?.last_question_ids || [],
      stProg?.attempt_count || 0,
      progressRef.current.review_queue || []
    );

    setActiveQuizQuestions(selectedQs);
    setPhase('quiz');
    worldRef.current?.setPhase('quiz', stationIdx);
  }, []);

  // Initialize Three.js World3DEngine once in stable ref container
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const inputMgr = new InputManager();
    inputMgr.attach();
    inputManagerRef.current = inputMgr;

    const world = new World3DEngine(
      canvasMountRef.current,
      inputMgr,
      progressRef.current.map_config,
      progressRef.current.jetbot_config,
      {
        onStationTriggerReached: (stationIdx) => {
          if (phaseRef.current !== 'driving') return;
          soundEngine.playStationArrive();
          setPhase('station_brake');
          world.setPhase('station_brake', stationIdx);

          // Wait briefly for rover velocity to damp to 0, then open 10-question assessment
          window.setTimeout(() => {
            openStationQuizForIndex(stationIdx);
          }, 650);
        },
        onDrivingPenaltyTick: (penaltyDelta) => {
          setProgress((prev) => ({
            ...prev,
            driving_score: Math.max(0, prev.driving_score - penaltyDelta),
          }));
        },
        onWrongGateEntered: (wrongTitle) => {
          setStorageWarning(
            `Cổng trạm "${wrongTitle}" chưa mở khóa! Phạt kỹ năng lái -15 điểm và đưa xe về Checkpoint gần nhất.`
          );
        },
        onCollectiblePickedUp: (type, value) => {
          const showToast = (msg: string) => {
            setPickupToast(msg);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = window.setTimeout(() => {
              setPickupToast(null);
            }, 3200);
          };

          if (type === 'coin') {
            setProgress((prev) => ({
              ...prev,
              wallet: {
                ...prev.wallet,
                coins: prev.wallet.coins + value,
                totalCoinsEarned: prev.wallet.totalCoinsEarned + value,
              },
            }));
            showToast(`🪙 Nhặt Đồng Xu Lượng Tử: +${value} Xu & +10% Nitro!`);
          } else if (type === 'boost_pad') {
            setProgress((prev) => ({
              ...prev,
              wallet: {
                ...prev.wallet,
                coins: prev.wallet.coins + value,
                totalCoinsEarned: prev.wallet.totalCoinsEarned + value,
              },
            }));
            showToast(`⚡ Đệm Tăng Tốc Năng Lượng: Bứt tốc Nitro +${value} Xu!`);
          } else if (type === 'gift_box') {
            setProgress((prev) => {
              const allQIds = quantitiesBank.map((q) => q.id);
              const lockedQIds = allQIds.filter(
                (id) => !prev.wallet.unlockedKnowledgeCards.includes(id)
              );

              const nextWallet = {
                ...prev.wallet,
                coins: prev.wallet.coins + value,
                totalCoinsEarned: prev.wallet.totalCoinsEarned + value,
                giftsOpened: prev.wallet.giftsOpened + 1,
              };

              const roll = Math.random();
              if (lockedQIds.length > 0 && roll < 0.45) {
                const pickedCardId =
                  lockedQIds[Math.floor(Math.random() * lockedQIds.length)];
                const pickedCardName =
                  quantitiesBank.find((q) => q.id === pickedCardId)?.name_vi ||
                  pickedCardId;
                nextWallet.unlockedKnowledgeCards = [
                  ...prev.wallet.unlockedKnowledgeCards,
                  pickedCardId,
                ];
                showToast(
                  `🎁 Mở Hộp Quà Bí Ẩn: +${value} Xu & Mở khóa Thẻ Tri Thức "${pickedCardName}"!`
                );
              } else if (roll < 0.72) {
                nextWallet.hint5050Charges += 1;
                showToast(
                  `🎁 Mở Hộp Quà Bí Ẩn: +${value} Xu & +1 Thẻ Radar Loại Trừ 50/50!`
                );
              } else if (roll < 0.9) {
                nextWallet.aiHintCharges += 1;
                showToast(
                  `🎁 Mở Hộp Quà Bí Ẩn: +${value} Xu & +1 Thẻ Cố Vấn Công Thức SGK!`
                );
              } else {
                nextWallet.streakShieldCharges += 1;
                showToast(
                  `🎁 Mở Hộp Quà Bí Ẩn: +${value} Xu & +1 Khiên Bảo Toàn Chuỗi Combo!`
                );
              }

              return {
                ...prev,
                wallet: nextWallet,
              };
            });
          }
        },
        onM01BonusCoins: (coins, messageVi) => {
          setProgress((prev) => ({
            ...prev,
            wallet: {
              ...prev.wallet,
              coins: prev.wallet.coins + coins,
              totalCoinsEarned: prev.wallet.totalCoinsEarned + coins,
            },
          }));
          setPickupToast(messageVi);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => {
            setPickupToast(null);
          }, 3600);
        },
        onM01HudUpdate: (snapshot) => {
          setM01Hud(snapshot);
        },
        onUniversalBonusCoins: (coins, messageVi) => {
          setProgress((prev) => ({
            ...prev,
            wallet: {
              ...prev.wallet,
              coins: prev.wallet.coins + coins,
            },
          }));
          setPickupToast(`+${coins} Xu: ${messageVi}`);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => {
            setPickupToast(null);
          }, 3600);
        },
        onUniversalHudUpdate: (snapshot) => {
          setUniversalHud(snapshot);
        },
        onTelemetryUpdate: (tel, mPath, sCoords) => {
          setTelemetry(tel);
          setMinimapPath((prev) => (prev.length === mPath.length ? prev : mPath));
          setStationCoords((prev) =>
            prev.length === sCoords.length ? prev : sCoords
          );
        },
        onPauseRequested: () => {
          if (phaseRef.current === 'driving') {
            setPhase('paused');
            world.setPhase('paused', progressRef.current.active_station_index);
          } else if (phaseRef.current === 'paused') {
            setPhase('driving');
            world.setPhase('driving', progressRef.current.active_station_index);
          }
        },
        onCheckpointResetRequested: () => {
          const cpIdx = progressRef.current.last_cleared_checkpoint_index;
          world.teleportToStationOrStart(cpIdx);
        },
      }
    );

    worldRef.current = world;
    world.rebuildWorld(
      stationsRef.current,
      progressRef.current.map_config,
      progressRef.current.jetbot_config,
      progressRef.current.station_progress
    );
    world.setMagnetLevel(progressRef.current.wallet.upgrades.magnetLevel);
    world.setM01DifficultyAndTier(
      progressRef.current.difficulty_layer || 'ROOKIE',
      progressRef.current.performance_tier || 'HIGH'
    );
    world.setPhase('menu', progressRef.current.active_station_index);

    return () => {
      inputMgr.detach();
      world.dispose();
      worldRef.current = null;
    };
  }, [openStationQuizForIndex, quantitiesBank]);

  // Keep 3D magnet attraction radius and driving score synced
  useEffect(() => {
    worldRef.current?.setMagnetLevel(progress.wallet.upgrades.magnetLevel);
  }, [progress.wallet.upgrades.magnetLevel]);

  useEffect(() => {
    worldRef.current?.setDrivingScoreForHud(progress.driving_score);
  }, [progress.driving_score]);

  // Sync phase changes to 3D world
  const handleChangePhase = useCallback((nextPhase: GameStatePhase) => {
    soundEngine.playStepClick();
    setPhase(nextPhase);
    worldRef.current?.setPhase(
      nextPhase,
      progressRef.current.active_station_index
    );
  }, []);

  // Update MapSetupConfig & rebuild 3D road/environment if geometry parameters changed
  const handleUpdateMapConfig = useCallback((partial: Partial<MapSetupConfig>) => {
    setProgress((prev) => {
      const nextMapConfig = { ...prev.map_config, ...partial };
      const nextProg = { ...prev, map_config: nextMapConfig };

      const geometryChanged =
        partial.laneWidthMultiplier !== undefined ||
        partial.curveScale !== undefined ||
        partial.obstacleDensity !== undefined;

      if (worldRef.current) {
        if (geometryChanged) {
          worldRef.current.rebuildWorld(
            stationsRef.current,
            nextMapConfig,
            prev.jetbot_config,
            prev.station_progress
          );
        } else {
          worldRef.current.updateStageVisibility(nextMapConfig);
        }
      }
      return nextProg;
    });
  }, []);

  // Update JetBotConfig
  const handleUpdateJetBotConfig = useCallback(
    (partial: Partial<JetBotConfig>) => {
      setProgress((prev) => {
        const nextJetbot = { ...prev.jetbot_config, ...partial };
        worldRef.current?.updateJetBotAppearance(nextJetbot);
        return { ...prev, jetbot_config: nextJetbot };
      });
    },
    []
  );

  // Switch campaign length (10 / 15 / 20 / 30)
  const handleSelectCampaignLength = useCallback((len: CampaignLength) => {
    soundEngine.playStepClick();
    const fresh = createInitialProgress(len);
    const nextRoute = buildCampaignRoute(len);
    setProgress(fresh);
    if (worldRef.current) {
      worldRef.current.rebuildWorld(
        nextRoute,
        fresh.map_config,
        fresh.jetbot_config,
        fresh.station_progress
      );
    }
  }, []);

  // Start driving mission (opens M01 Briefing first when at Station 0)
  const handleStartMission = useCallback(() => {
    soundEngine.playStepClick();
    setProgress((prev) => {
      const fullVisibleConfig: MapSetupConfig = {
        ...prev.map_config,
        mapConstructed: true,
        stationsPlaced: true,
        jetbotReady: true,
      };
      worldRef.current?.updateStageVisibility(fullVisibleConfig);
      worldRef.current?.updateStationUnlockVisuals(
        prev.station_progress,
        prev.active_station_index
      );
      worldRef.current?.teleportToStationOrStart(prev.active_station_index);
      const nextPhase: GameStatePhase =
        prev.active_station_index === 0 ? 'briefing' : 'driving';
      worldRef.current?.setPhase(nextPhase, prev.active_station_index);
      setPhase(nextPhase);
      return { ...prev, map_config: fullVisibleConfig };
    });
  }, []);

  const handleLaunchDrivingFromBriefing = useCallback(() => {
    soundEngine.playStepClick();
    worldRef.current?.setPhase('driving', progressRef.current.active_station_index);
    setPhase('driving');
  }, []);

  const handleChangeDifficulty = useCallback((difficulty: DifficultyLayer) => {
    soundEngine.playStepClick();
    setProgress((prev) => {
      const tier = prev.performance_tier || 'HIGH';
      worldRef.current?.setM01DifficultyAndTier(difficulty, tier);
      return { ...prev, difficulty_layer: difficulty };
    });
  }, []);

  const handleChangePerformanceTier = useCallback((tier: PerformanceTier) => {
    soundEngine.playStepClick();
    setProgress((prev) => {
      const diff = prev.difficulty_layer || 'ROOKIE';
      worldRef.current?.setM01DifficultyAndTier(diff, tier);
      return { ...prev, performance_tier: tier };
    });
  }, []);

  // Complete 10-question quiz at current station
  const handleCompleteQuiz = useCallback(
    (
      score: number,
      wrongQuestionIds: string[],
      weakObjectives: string[],
      durationSeconds: number,
      firstTryByLevel: Record<
        'know' | 'understand' | 'apply',
        { correct: number; total: number }
      >,
      firstTryByQuantity: Record<string, { correct: number; total: number }>,
      confusedUnitsDelta: Record<string, number>
    ) => {
      const stars = computeStarsFromScore(score);
      const passed = score >= activeStation.pass_score;

      if (passed) {
        soundEngine.playStationPass(stars);
      } else {
        soundEngine.playWrongAnswer();
      }

      const attemptRecord: StationAttemptRecord = {
        attempt_id: `ATT_${activeStation.station_id}_${Date.now()}`,
        station_id: activeStation.station_id,
        question_set_id: `SET_${Date.now()}`,
        score_0_10: score,
        stars,
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        wrong_question_ids: wrongQuestionIds,
        weak_objectives: weakObjectives,
      };

      setLastAttemptRecord(attemptRecord);

      setProgress((prev) => {
        const prevSt = prev.station_progress[activeStation.station_id] || {
          station_id: activeStation.station_id,
          unlocked: true,
          completed: false,
          best_score: 0,
          best_stars: 0,
          attempt_count: 0,
          last_question_ids: [],
        };

        const isFirstTry = prevSt.attempt_count === 0;
        const newBestScore = Math.max(prevSt.best_score, score);
        const newBestStars = Math.max(prevSt.best_stars, stars) as 0 | 1 | 2 | 3;
        const nowCompleted = prevSt.completed || passed;

        const updatedStationProgress = {
          ...prev.station_progress,
          [activeStation.station_id]: {
            ...prevSt,
            completed: nowCompleted,
            best_score: newBestScore,
            best_stars: newBestStars,
            attempt_count: prevSt.attempt_count + 1,
            last_question_ids: activeQuizQuestions.map((q) => q.question_id),
          },
        };

        // Unlock next station ONLY if passed (score >= 5)
        const nextIdx = prev.active_station_index + 1;
        if (passed && stations[nextIdx]) {
          const nextStId = stations[nextIdx].station_id;
          if (updatedStationProgress[nextStId]) {
            updatedStationProgress[nextStId] = {
              ...updatedStationProgress[nextStId],
              unlocked: true,
            };
          }
        }

        // Update last_cleared_checkpoint_index when passing a station
        const nextClearedCheckpoint = passed
          ? Math.max(prev.last_cleared_checkpoint_index, prev.active_station_index + 1)
          : prev.last_cleared_checkpoint_index;

        // Update all 5 Teacher Analytics metrics (02_PEDAGOGY_AND_STATION_ROUTE.md Section 9)
        const nextByLevel = { ...prev.analytics.first_try_by_level };
        const nextByQuantity = { ...prev.analytics.first_try_by_quantity };
        if (isFirstTry) {
          (['know', 'understand', 'apply'] as const).forEach((lvl) => {
            nextByLevel[lvl] = {
              correct:
                (nextByLevel[lvl]?.correct || 0) + firstTryByLevel[lvl].correct,
              total: (nextByLevel[lvl]?.total || 0) + firstTryByLevel[lvl].total,
            };
          });
          Object.entries(firstTryByQuantity).forEach(([qId, qStat]) => {
            nextByQuantity[qId] = {
              correct: (nextByQuantity[qId]?.correct || 0) + qStat.correct,
              total: (nextByQuantity[qId]?.total || 0) + qStat.total,
            };
          });
        }

        const nextConfused = { ...prev.analytics.confused_units_count };
        Object.entries(confusedUnitsDelta).forEach(([k, v]) => {
          nextConfused[k] = (nextConfused[k] || 0) + v;
        });

        const existingImpIdx = prev.analytics.retry_improvements.findIndex(
          (item) => item.station_id === activeStation.station_id
        );
        const nextRetryImprovements = [...prev.analytics.retry_improvements];
        if (existingImpIdx >= 0) {
          nextRetryImprovements[existingImpIdx] = {
            ...nextRetryImprovements[existingImpIdx],
            best_score: Math.max(
              nextRetryImprovements[existingImpIdx].best_score,
              score
            ),
          };
        } else {
          nextRetryImprovements.push({
            station_id: activeStation.station_id,
            first_score: score,
            best_score: score,
          });
        }

        const mergedReviewQueue = Array.from(
          new Set([...prev.review_queue, ...wrongQuestionIds])
        );

        const latestM01Evidence =
          prev.active_station_index === 0 && worldRef.current
            ? {
                ...worldRef.current.m01Vault.getHudSnapshot(prev.driving_score)
                  .evidence,
                knowledgeScore: score,
              }
            : null;

        const nextState: CampaignProgress = {
          ...prev,
          last_cleared_checkpoint_index: nextClearedCheckpoint,
          station_progress: updatedStationProgress,
          attempt_history: [attemptRecord, ...prev.attempt_history].slice(0, 50),
          review_queue: mergedReviewQueue,
          wrong_question_ids: wrongQuestionIds,
          m01_runs: latestM01Evidence
            ? [latestM01Evidence, ...(prev.m01_runs || [])].slice(0, 20)
            : prev.m01_runs || [],
          analytics: {
            ...prev.analytics,
            first_try_by_level: nextByLevel,
            first_try_by_quantity: nextByQuantity,
            confused_units_count: nextConfused,
            retry_improvements: nextRetryImprovements,
            total_quiz_time_seconds:
              prev.analytics.total_quiz_time_seconds + durationSeconds,
          },
        };

        worldRef.current?.updateStationUnlockVisuals(
          updatedStationProgress,
          prev.active_station_index
        );
        return nextState;
      });

      setPhase('station_result');
      worldRef.current?.setPhase('station_result', progress.active_station_index);
    },
    [activeQuizQuestions, activeStation, progress.active_station_index, stations]
  );

  // Retry current station with a brand-new equivalent 10-question set
  const handleRetryNewEquivalentSet = useCallback(() => {
    soundEngine.playStepClick();
    openStationQuizForIndex(progress.active_station_index);
  }, [openStationQuizForIndex, progress.active_station_index]);

  // Continue driving to next unlocked station
  const handleContinueNextStation = useCallback(() => {
    soundEngine.playStepClick();
    const nextIdx = progress.active_station_index + 1;
    if (nextIdx >= stations.length) {
      setPhase('campaign_result');
      worldRef.current?.setPhase('campaign_result', progress.active_station_index);
      return;
    }

    setProgress((prev) => {
      worldRef.current?.updateStationUnlockVisuals(
        prev.station_progress,
        nextIdx
      );
      worldRef.current?.teleportToStationOrStart(nextIdx);
      worldRef.current?.setPhase('driving', nextIdx);
      return {
        ...prev,
        active_station_index: nextIdx,
      };
    });
    setPhase('driving');
  }, [progress.active_station_index, stations.length]);

  // Return to last cleared checkpoint on failure (without erasing unlocked stations or stars!)
  const handleReturnToCheckpoint = useCallback(() => {
    soundEngine.playStepClick();
    const cpIdx = progress.last_cleared_checkpoint_index;
    worldRef.current?.teleportToStationOrStart(cpIdx);
    worldRef.current?.setPhase('driving', progress.active_station_index);
    setPhase('driving');
  }, [progress.active_station_index, progress.last_cleared_checkpoint_index]);

  // Teacher question approval toggle
  const handleToggleQuestionApproval = useCallback(
    (questionId: string, approved: boolean) => {
      setQuestionsBank((prev) => {
        const updated = prev.map((q) =>
          q.question_id === questionId
            ? {
                ...q,
                teacher_approved: approved,
                source_status: (approved ? 'approved' : 'teacher_review') as
                  | 'approved'
                  | 'teacher_review',
              }
            : q
        );
        saveQuestionsBankSafely(updated);
        return updated;
      });
    },
    []
  );

  const handleAddDraftQuestion = useCallback((newQ: QuestionRecord) => {
    setQuestionsBank((prev) => {
      const updated = [newQ, ...prev];
      saveQuestionsBankSafely(updated);
      return updated;
    });
  }, []);

  const handleUpdateQuestionPrompt = useCallback(
    (questionId: string, newPrompt: string, newExplanation: string) => {
      setQuestionsBank((prev) => {
        const updated = prev.map((q) =>
          q.question_id === questionId
            ? { ...q, prompt: newPrompt, explanation_vi: newExplanation }
            : q
        );
        saveQuestionsBankSafely(updated);
        return updated;
      });
    },
    []
  );

  // Spend coins or charges on quiz power-ups
  const handleUseQuizPowerUp = useCallback(
    (type: 'hint5050' | 'aiHint' | 'streakShield'): boolean => {
      const w = progressRef.current.wallet;
      if (type === 'hint5050') {
        if (w.hint5050Charges > 0) {
          setProgress((prev) => ({
            ...prev,
            wallet: {
              ...prev.wallet,
              hint5050Charges: Math.max(0, prev.wallet.hint5050Charges - 1),
            },
          }));
          return true;
        }
        if (w.coins >= 35) {
          setProgress((prev) => ({
            ...prev,
            wallet: {
              ...prev.wallet,
              coins: prev.wallet.coins - 35,
            },
          }));
          return true;
        }
        return false;
      }

      if (type === 'aiHint') {
        if (w.aiHintCharges > 0) {
          setProgress((prev) => ({
            ...prev,
            wallet: {
              ...prev.wallet,
              aiHintCharges: Math.max(0, prev.wallet.aiHintCharges - 1),
            },
          }));
          return true;
        }
        if (w.coins >= 25) {
          setProgress((prev) => ({
            ...prev,
            wallet: {
              ...prev.wallet,
              coins: prev.wallet.coins - 25,
            },
          }));
          return true;
        }
        return false;
      }

      if (type === 'streakShield') {
        if (w.streakShieldCharges > 0) {
          setProgress((prev) => ({
            ...prev,
            wallet: {
              ...prev.wallet,
              streakShieldCharges: Math.max(
                0,
                prev.wallet.streakShieldCharges - 1
              ),
            },
          }));
          return true;
        }
        return false;
      }

      return false;
    },
    []
  );

  const handleAwardQuizCoins = useCallback((coinsDelta: number) => {
    setProgress((prev) => ({
      ...prev,
      wallet: {
        ...prev.wallet,
        coins: prev.wallet.coins + coinsDelta,
        totalCoinsEarned: prev.wallet.totalCoinsEarned + coinsDelta,
      },
    }));
  }, []);

  const handleSpendCoinsForItem = useCallback(
    (
      itemType:
        | 'hint5050'
        | 'aiHint'
        | 'streakShield'
        | 'upgrade_magnet'
        | 'upgrade_nitro'
        | 'upgrade_scanner'
        | 'unlock_card',
      cost: number,
      cardId?: string
    ) => {
      setProgress((prev) => {
        if (prev.wallet.coins < cost) return prev;
        const nextWallet = {
          ...prev.wallet,
          coins: prev.wallet.coins - cost,
          upgrades: { ...prev.wallet.upgrades },
        };

        if (itemType === 'hint5050') nextWallet.hint5050Charges += 1;
        else if (itemType === 'aiHint') nextWallet.aiHintCharges += 1;
        else if (itemType === 'streakShield') nextWallet.streakShieldCharges += 1;
        else if (itemType === 'upgrade_magnet')
          nextWallet.upgrades.magnetLevel = Math.min(
            3,
            nextWallet.upgrades.magnetLevel + 1
          );
        else if (itemType === 'upgrade_nitro')
          nextWallet.upgrades.nitroLevel = Math.min(
            3,
            nextWallet.upgrades.nitroLevel + 1
          );
        else if (itemType === 'upgrade_scanner')
          nextWallet.upgrades.scannerLevel = Math.min(
            3,
            nextWallet.upgrades.scannerLevel + 1
          );
        else if (itemType === 'unlock_card' && cardId) {
          nextWallet.unlockedKnowledgeCards = Array.from(
            new Set([...nextWallet.unlockedKnowledgeCards, cardId])
          );
        }

        return {
          ...prev,
          wallet: nextWallet,
        };
      });
    },
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090d16] select-none">
      {/* Isolated Three.js WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-screen h-screen z-0"
      />

      {/* Storage recovery toast if needed */}
      {storageWarning && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-950 border border-amber-500 text-amber-200 px-4 py-2 rounded-xl text-xs flex items-center gap-3 shadow-xl">
          <span>{storageWarning}</span>
          <button
            onClick={() => setStorageWarning(null)}
            className="text-amber-400 font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Setup & Menu Screens (Menu / Step 1 Map / Step 2 Station / Step 3 JetBot AI) */}
      {(phase === 'menu' ||
        phase === 'map_setup' ||
        phase === 'station_setup' ||
        phase === 'jetbot_setup') && (
        <SetupWizardOverlay
          phase={phase}
          mapConfig={progress.map_config}
          jetbotConfig={progress.jetbot_config}
          stations={stations}
          stationProgress={progress.station_progress}
          questionsBank={questionsBank}
          walletCoins={progress.wallet.coins}
          onChangePhase={handleChangePhase}
          onUpdateMapConfig={handleUpdateMapConfig}
          onUpdateJetBotConfig={handleUpdateJetBotConfig}
          onSelectCampaignLength={handleSelectCampaignLength}
          onStartMission={handleStartMission}
          onOpenTeacherModal={() => setTeacherModalOpen(true)}
          onOpenPronunciationModal={() => setPronunciationModalOpen(true)}
          onOpenKnowledgeMapModal={() => setKnowledgeMapModalOpen(true)}
          onResetCampaign={() =>
            handleSelectCampaignLength(progress.campaign_length)
          }
        />
      )}

      {/* M01 — THE MASS VAULT Briefing Overlay */}
      {phase === 'briefing' && (
        <MissionBriefingOverlay
          difficulty={progress.difficulty_layer || 'ROOKIE'}
          performanceTier={progress.performance_tier || 'HIGH'}
          onChangeDifficulty={handleChangeDifficulty}
          onChangePerformanceTier={handleChangePerformanceTier}
          onStartM01Mission={handleLaunchDrivingFromBriefing}
          onSkipBriefingToDrive={handleLaunchDrivingFromBriefing}
        />
      )}

      {/* Active Driving & Station Braking HUD */}
      {(phase === 'driving' || phase === 'station_brake') && activeStation && (
        <>
          <DrivingHudOverlay
            activeStation={activeStation}
            activeStationIndex={progress.active_station_index}
            totalStations={stations.length}
            targetQuantity={activeQuantity}
            drivingScore={progress.driving_score}
            wallet={progress.wallet}
            pickupToast={pickupToast}
            telemetry={telemetry}
            minimapPath={minimapPath}
            stationCoords={stationCoords}
            stationProgress={progress.station_progress}
            jetbotConfig={progress.jetbot_config}
            isMuted={isMuted}
            isBrakingAtStation={phase === 'station_brake'}
            onToggleAutopilot={() =>
              handleUpdateJetBotConfig({
                driveMode:
                  progress.jetbot_config.driveMode === 'ai_autopilot'
                    ? 'manual'
                    : 'ai_autopilot',
              })
            }
            onPause={() => handleChangePhase('paused')}
            onResetCheckpoint={handleReturnToCheckpoint}
            onToggleMute={() => setIsMuted(soundEngine.toggleMute())}
            onOpenTeacherModal={() => setTeacherModalOpen(true)}
            onOpenPronunciationModal={() => setPronunciationModalOpen(true)}
            onOpenKnowledgeMapModal={() => setKnowledgeMapModalOpen(true)}
            onOpenSetupWizard={() => handleChangePhase('map_setup')}
            onTouchControl={(dir, active) =>
              inputManagerRef.current?.setTouchControl(dir, active)
            }
          />

          {/* M01 Interactive FPS Scanner & Electronic Balance HUD */}
          {progress.active_station_index === 0 && m01Hud && (
            <FpsScannerHudOverlay
              snapshot={m01Hud}
              onSwitchCameraMode={(mode) =>
                worldRef.current?.cycleCameraMode(mode)
              }
              onTriggerSciencePulse={() =>
                worldRef.current?.m01Vault.triggerSciencePulseOnAimed()
              }
              onTriggerLoadCrate={() =>
                worldRef.current?.m01Vault.interactWithAimedCrate(
                  (coins, msgVi) => {
                    setProgress((prev) => ({
                      ...prev,
                      wallet: {
                        ...prev.wallet,
                        coins: prev.wallet.coins + coins,
                        totalCoinsEarned: prev.wallet.totalCoinsEarned + coins,
                      },
                    }));
                    setPickupToast(msgVi);
                  }
                )
              }
              onSelectCrateById={(crateId) =>
                worldRef.current?.m01Vault.selectAndInspectCrateById(crateId)
              }
              onProceedToQuizNow={() => {
                soundEngine.playStationArrive();
                openStationQuizForIndex(0);
              }}
            />
          )}

          {/* M02-M15 & B01-B03 Universal Mission HUD Overlay */}
          {progress.active_station_index > 0 && universalHud && (
            <UniversalMissionHudOverlay
              snapshot={universalHud}
              onSwitchCameraMode={(mode) =>
                worldRef.current?.cycleCameraMode(mode)
              }
              onTriggerSciencePulse={() =>
                worldRef.current?.missionDispatcher
                  .getActiveController()
                  ?.triggerSciencePulseOnAimed()
              }
              onTriggerInteract={() =>
                worldRef.current?.missionDispatcher
                  .getActiveController()
                  ?.interactWithAimed((coins, msgVi) => {
                    setProgress((prev) => ({
                      ...prev,
                      wallet: {
                        ...prev.wallet,
                        coins: prev.wallet.coins + coins,
                        totalCoinsEarned: prev.wallet.totalCoinsEarned + coins,
                      },
                    }));
                    setPickupToast(msgVi);
                  })
              }
              onSelectTargetById={(targetId) =>
                worldRef.current?.missionDispatcher
                  .getActiveController()
                  ?.selectTargetById(targetId)
              }
              onProceedToQuizNow={() => {
                soundEngine.playStationArrive();
                openStationQuizForIndex(progress.active_station_index);
              }}
            />
          )}
        </>
      )}

      {/* Pause Modal */}
      {phase === 'paused' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto">
          <div className="w-full max-w-md bg-[#0b1322] border border-slate-800 rounded-2xl p-6 text-center shadow-2xl space-y-4">
            <div className="text-xs font-mono text-sky-400">TRẠNG THÁI TẠM DỪNG</div>
            <h2 className="text-xl font-bold text-white">Đã Tạm Dừng Hành Trình</h2>
            <p className="text-xs text-slate-400">
              Tiến độ học tập, số sao và các trạm đã mở khóa của bạn được lưu tự động.
            </p>
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => handleChangePhase('driving')}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Tiếp tục Lái (Esc)</span>
              </button>
              <button
                onClick={handleReturnToCheckpoint}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Quay về Checkpoint gần nhất</span>
              </button>
              <button
                onClick={() => handleChangePhase('menu')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 cursor-pointer"
              >
                Về Màn hình chính & Thiết lập Bản đồ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10-Question Station Assessment Modal */}
      {phase === 'quiz' && activeStation && (
        <StationQuizModal
          station={activeStation}
          quantity={activeQuantity}
          questions={activeQuizQuestions}
          wallet={progress.wallet}
          onUseQuizPowerUp={handleUseQuizPowerUp}
          onAwardQuizCoins={handleAwardQuizCoins}
          onOpenPronunciationModal={() => setPronunciationModalOpen(true)}
          onCompleteQuiz={handleCompleteQuiz}
        />
      )}

      {/* Station Result Modal */}
      {phase === 'station_result' && activeStation && lastAttemptRecord && (
        <StationResultModal
          station={activeStation}
          quantity={activeQuantity}
          lastAttempt={lastAttemptRecord}
          stationState={
            progress.station_progress[activeStation.station_id] || {
              station_id: activeStation.station_id,
              unlocked: true,
              completed: false,
              best_score: lastAttemptRecord.score_0_10,
              best_stars: lastAttemptRecord.stars,
              attempt_count: 1,
              last_question_ids: [],
            }
          }
          drivingScore={progress.driving_score}
          m01Evidence={
            progress.active_station_index === 0
              ? progress.m01_runs?.[0] || m01Hud?.evidence || null
              : null
          }
          isLastStationInCampaign={
            progress.active_station_index + 1 >= stations.length
          }
          campaignStations={stations}
          stationProgress={progress.station_progress}
          onRetryNewEquivalentSet={handleRetryNewEquivalentSet}
          onContinueNextStation={handleContinueNextStation}
          onReturnToCheckpoint={handleReturnToCheckpoint}
          onBackToMenu={() => handleChangePhase('campaign_result')}
        />
      )}

      {/* Campaign Victory Summary Modal */}
      {phase === 'campaign_result' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/90 pointer-events-auto">
          <div className="w-full max-w-xl bg-[#0b1322] border border-slate-800 rounded-2xl p-7 text-center shadow-2xl space-y-5">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
            <div>
              <div className="text-xs font-mono text-emerald-400">
                HOÀN THÀNH CHIẾN DỊCH KHTN 8
              </div>
              <h2 className="text-2xl font-extrabold text-white mt-1">
                Chúc mừng! JetBot AI đã vượt toàn tuyến {progress.campaign_length} trạm
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 tabular-nums">
              <div>
                <div className="text-xs text-slate-400">Điểm dừng đã vượt</div>
                <div className="text-lg font-extrabold text-emerald-400">
                  {
                    Object.values(progress.station_progress).filter(
                      (s) => s.completed
                    ).length
                  }{' '}
                  / {stations.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Tổng sao tích lũy</div>
                <div className="text-lg font-extrabold text-amber-400 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>
                    {Object.values(progress.station_progress).reduce(
                      (acc, s) => acc + (s.best_stars || 0),
                      0
                    )}{' '}
                    / {stations.length * 3}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Điểm lái riêng</div>
                <div className="text-lg font-extrabold text-sky-400">
                  {progress.driving_score}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleChangePhase('menu')}
                className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer"
              >
                Về Màn hình chính / Chọn Chiến dịch khác (10/15/20/30)
              </button>
              <button
                onClick={() => setTeacherModalOpen(true)}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 cursor-pointer"
              >
                Mở Bảng Giáo Viên & Thống Kê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Review & Acceptance Audit Modal */}
      {teacherModalOpen && (
        <TeacherReviewModal
          quantities={quantitiesBank}
          stations={stations}
          questions={questionsBank}
          stationProgress={progress.station_progress}
          analytics={progress.analytics}
          onToggleQuestionApproval={handleToggleQuestionApproval}
          onAddDraftQuestion={handleAddDraftQuestion}
          onUpdateQuestionPrompt={handleUpdateQuestionPrompt}
          onClose={() => setTeacherModalOpen(false)}
        />
      )}

      {/* International English Web Speech API Pronunciation Modal (Chemistry Elements & Compounds • Physics SI • Biology) */}
      {pronunciationModalOpen && (
        <ElementsCompoundsModal
          onClose={() => setPronunciationModalOpen(false)}
        />
      )}

      {/* Interactive Knowledge Map & JetBot Tech Upgrades Modal */}
      {knowledgeMapModalOpen && (
        <KnowledgeMapModal
          quantities={quantitiesBank}
          stations={stations}
          stationProgress={progress.station_progress}
          analytics={progress.analytics}
          wallet={progress.wallet}
          onSpendCoinsForItem={handleSpendCoinsForItem}
          onTeleportToStation={(targetStationIdx) => {
            setProgress((prev) => {
              const targetSt = stations[targetStationIdx];
              const updatedStProg = { ...prev.station_progress };
              if (targetSt && updatedStProg[targetSt.station_id]) {
                updatedStProg[targetSt.station_id] = {
                  ...updatedStProg[targetSt.station_id],
                  unlocked: true,
                };
              }
              worldRef.current?.updateStationUnlockVisuals(
                updatedStProg,
                targetStationIdx
              );
              worldRef.current?.teleportToStationOrStart(targetStationIdx);
              worldRef.current?.setPhase('driving', targetStationIdx);
              return {
                ...prev,
                active_station_index: targetStationIdx,
                station_progress: updatedStProg,
              };
            });
            setPhase('driving');
          }}
          onClose={() => setKnowledgeMapModalOpen(false)}
        />
      )}
    </div>
  );
}
