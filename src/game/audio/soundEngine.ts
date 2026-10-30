export type MusicTrackId = 'discovery_synth' | 'energy_race' | 'lofi_lab';

export const MUSIC_TRACKS: { id: MusicTrackId; nameVi: string; bpm: number }[] = [
  { id: 'discovery_synth', nameVi: 'Giai điệu Khám phá Khoa học', bpm: 118 },
  { id: 'energy_race', nameVi: 'Nhịp điệu Đường đua Năng lượng', bpm: 132 },
  { id: 'lofi_lab', nameVi: 'Lo-Fi Phòng Thí Nghiệm Tập Trung', bpm: 92 },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmTrack: MusicTrackId = 'discovery_synth';
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;
  private activeSpeechCancel: (() => void) | null = null;
  private generatedAudioEl: HTMLAudioElement | null = null;

  constructor() {
    try {
      const savedMute = localStorage.getItem('khtn8_jetbot_muted');
      if (savedMute === 'true') this.muted = true;
    } catch {
      // ignore
    }
  }

  public playGeneratedMusicDataUrl(audioDataUrl: string) {
    this.stopBgm();
    if (this.generatedAudioEl) {
      this.generatedAudioEl.pause();
      this.generatedAudioEl = null;
    }
    if (this.muted || typeof window === 'undefined') return;
    try {
      const audio = new Audio(audioDataUrl);
      audio.loop = true;
      audio.volume = 0.45;
      this.generatedAudioEl = audio;
      this.bgmPlaying = true;
      audio.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopSpeech();
    }
    try {
      localStorage.setItem('khtn8_jetbot_muted', String(this.muted));
    } catch {
      // ignore
    }
    return this.muted;
  }

  public isBgmPlaying(): boolean {
    return this.bgmPlaying;
  }

  public getCurrentTrack(): MusicTrackId {
    return this.bgmTrack;
  }

  public setBgmTrack(track: MusicTrackId) {
    this.bgmTrack = track;
    this.bgmStep = 0;
    if (this.bgmPlaying) {
      this.stopBgm();
      this.startBgm();
    }
  }

  public toggleBgm(): boolean {
    if (this.bgmPlaying) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.bgmPlaying;
  }

  public startBgm() {
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    const trackMeta = MUSIC_TRACKS.find((t) => t.id === this.bgmTrack) || MUSIC_TRACKS[0];
    const stepMs = Math.round((60 / trackMeta.bpm / 2) * 1000); // 8th-note steps

    const tickMusic = () => {
      if (!this.bgmPlaying) return;
      if (!this.muted) {
        this.playMusicStep(this.bgmStep);
      }
      this.bgmStep = (this.bgmStep + 1) % 16;
      this.bgmTimer = window.setTimeout(tickMusic, stepMs);
    };
    tickMusic();
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.generatedAudioEl) {
      this.generatedAudioEl.pause();
      this.generatedAudioEl = null;
    }
  }

  private playMusicStep(step: number) {
    if (this.bgmTrack === 'discovery_synth') {
      const melody = [
        523.25, 0, 659.25, 783.99, 880, 0, 783.99, 659.25,
        587.33, 659.25, 783.99, 0, 659.25, 587.33, 523.25, 0,
      ];
      const bass = [130.81, 0, 130.81, 0, 174.61, 0, 174.61, 0, 196.0, 0, 196.0, 0, 130.81, 0, 164.81, 0];
      if (melody[step] > 0) {
        this.playTone(melody[step], 0.19, 'triangle', 0.032, 0);
      }
      if (bass[step] > 0) {
        this.playTone(bass[step], 0.22, 'sine', 0.04, 0);
      }
    } else if (this.bgmTrack === 'energy_race') {
      const arp = [
        440, 554.37, 659.25, 880, 440, 554.37, 659.25, 880,
        392, 493.88, 587.33, 783.99, 523.25, 659.25, 783.99, 1046.5,
      ];
      const kick = step % 2 === 0 ? 110 : 0;
      if (arp[step] > 0) {
        this.playTone(arp[step], 0.14, 'square', 0.018, 0);
      }
      if (kick > 0) {
        this.playTone(kick, 0.12, 'triangle', 0.045, 0);
      }
    } else {
      // lofi_lab
      const chords = [
        261.63, 329.63, 392.0, 493.88, 293.66, 349.23, 440.0, 523.25,
        220.0, 261.63, 329.63, 392.0, 196.0, 246.94, 293.66, 392.0,
      ];
      if (chords[step] > 0) {
        this.playTone(chords[step], 0.32, 'sine', 0.028, 0);
      }
    }
  }

  public playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playStationArrive() {
    this.playTone(523.25, 0.14, 'triangle', 0.09, 0);
    this.playTone(659.25, 0.16, 'triangle', 0.09, 0.1);
    this.playTone(783.99, 0.24, 'sine', 0.1, 0.22);
  }

  /**
   * Celebratory fanfare + voice congratulation: "Chúc mừng bạn làm tốt lắm!"
   */
  public playCorrectAnswer() {
    // Cheerful ascending fanfare arpeggio
    this.playTone(523.25, 0.11, 'triangle', 0.09, 0);
    this.playTone(659.25, 0.11, 'triangle', 0.09, 0.09);
    this.playTone(783.99, 0.12, 'triangle', 0.1, 0.18);
    this.playTone(1046.5, 0.32, 'sine', 0.12, 0.27);
    this.playTone(1318.5, 0.25, 'sine', 0.07, 0.35);

    this.speakVietnamesePhrase('Chúc mừng bạn làm tốt lắm!');
  }

  /**
   * Comical "liu riu..." descending pitch-slide sound + gentle encouragement
   */
  public playWrongAnswer() {
    const ctx = this.getContext();
    if (ctx) {
      // "Liu-riu-riu-riuuu" descending pitch bend slide
      const slides: [number, number, number, number][] = [
        [392.0, 349.23, 0, 0.18],
        [349.23, 311.13, 0.19, 0.18],
        [311.13, 261.63, 0.38, 0.2],
        [255.0, 175.0, 0.59, 0.42],
      ];
      slides.forEach(([startFreq, endFreq, delay, dur]) => {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.linearRampToValueAtTime(endFreq, now + dur);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.055, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur + 0.02);
      });
    }

    this.speakVietnamesePhrase('Liu riu, tiếc quá, bạn thử lại nhé!');
  }

  public playRewardUnlock() {
    this.playTone(587.33, 0.1, 'triangle', 0.09, 0);
    this.playTone(783.99, 0.1, 'triangle', 0.09, 0.08);
    this.playTone(987.77, 0.12, 'triangle', 0.1, 0.16);
    this.playTone(1174.66, 0.28, 'sine', 0.11, 0.25);
  }

  public playStationPass(stars: number) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i <= Math.min(stars, 3); i++) {
      this.playTone(notes[i], 0.2, 'triangle', 0.1, i * 0.11);
    }
  }

  public playOffLaneWarning() {
    this.playTone(155, 0.09, 'square', 0.035, 0);
  }

  public playStepClick() {
    this.playTone(640, 0.06, 'sine', 0.06, 0);
  }

  public playCoinPickup() {
    this.playTone(987.77, 0.07, 'sine', 0.08, 0);
    this.playTone(1318.51, 0.14, 'triangle', 0.09, 0.06);
  }

  public playGiftBoxOpen() {
    this.playTone(523.25, 0.08, 'triangle', 0.08, 0);
    this.playTone(659.25, 0.08, 'triangle', 0.08, 0.06);
    this.playTone(783.99, 0.09, 'triangle', 0.09, 0.12);
    this.playTone(1046.5, 0.12, 'sine', 0.1, 0.18);
    this.playTone(1567.98, 0.25, 'sine', 0.11, 0.25);
  }

  public playNitroBoost() {
    this.playTone(220, 0.12, 'sawtooth', 0.05, 0);
    this.playTone(330, 0.14, 'sawtooth', 0.06, 0.07);
    this.playTone(587.33, 0.22, 'triangle', 0.08, 0.14);
  }

  /**
   * Crisp 2-tone acoustic chime when student interacts with an item to trigger English Web Speech API
   */
  public playPronounceChime() {
    this.playTone(587.33, 0.07, 'sine', 0.065, 0);
    this.playTone(880.0, 0.11, 'triangle', 0.075, 0.06);
  }

  public playScanSweep() {
    this.playTone(740, 0.05, 'sine', 0.05, 0);
    this.playTone(987.77, 0.08, 'triangle', 0.06, 0.04);
  }

  public playTargetLock() {
    this.playTone(880, 0.05, 'triangle', 0.06, 0);
    this.playTone(1174.66, 0.07, 'sine', 0.07, 0.05);
  }

  public playSciencePulse() {
    this.playTone(523.25, 0.06, 'sine', 0.07, 0);
    this.playTone(1046.5, 0.12, 'triangle', 0.08, 0.04);
    this.playTone(1567.98, 0.16, 'sine', 0.06, 0.09);
  }

  public playCargoLoadSuccess() {
    this.playTone(440, 0.08, 'triangle', 0.08, 0);
    this.playTone(554.37, 0.08, 'triangle', 0.08, 0.07);
    this.playTone(659.25, 0.1, 'triangle', 0.09, 0.14);
    this.playTone(880, 0.24, 'sine', 0.11, 0.21);
  }

  public playTelegraphWarning() {
    this.playTone(311.13, 0.09, 'square', 0.035, 0);
    this.playTone(277.18, 0.11, 'square', 0.035, 0.11);
  }

  public playGateUnlock() {
    this.playTone(392.0, 0.12, 'triangle', 0.09, 0);
    this.playTone(523.25, 0.12, 'triangle', 0.09, 0.1);
    this.playTone(659.25, 0.14, 'triangle', 0.1, 0.2);
    this.playTone(1046.5, 0.35, 'sine', 0.12, 0.32);
  }

  public stopSpeech() {
    if (this.activeSpeechCancel) {
      this.activeSpeechCancel();
      this.activeSpeechCancel = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private pickInternationalEnglishVoice(lang: 'en-US' | 'en-GB' = 'en-US'): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Prefer high-clarity Google / Natural / Microsoft / Apple voice matching exact locale (en-US or en-GB)
    const exactQuality = voices.find(
      (v) =>
        v.lang.toLowerCase() === lang.toLowerCase() &&
        /Google|Natural|Online|Samantha|Daniel|Arthur|Siri|Microsoft/i.test(v.name)
    );
    if (exactQuality) return exactQuality;

    // 2. Any voice matching exact locale
    const exactLocale = voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase());
    if (exactLocale) return exactLocale;

    // 3. Fallback to any international English voice
    return voices.find((v) => v.lang.toLowerCase().startsWith('en')) || null;
  }

  public speakVietnamesePhrase(text: string) {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'vi-VN';
      utter.rate = 1.05;
      utter.pitch = 1.12;
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.toLowerCase().includes('vi'));
      if (viVoice) utter.voice = viVoice;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore if speechSynthesis blocked
    }
  }

  /**
   * Automatic 1-shot English pronunciation with sound effect when a student interacts with any
   * Element, Compound, Physics quantity, or Biology item (Web Speech API International Standard).
   */
  public speakEnglishAuto(
    englishText: string,
    options?: {
      lang?: 'en-US' | 'en-GB';
      rate?: number;
      onStart?: () => void;
      onEnd?: () => void;
    }
  ) {
    this.stopSpeech();
    if (this.muted) {
      options?.onEnd?.();
      return;
    }

    this.playPronounceChime();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options?.onEnd?.();
      return;
    }

    let cancelled = false;
    this.activeSpeechCancel = () => {
      cancelled = true;
    };

    const lang = options?.lang || 'en-US';
    const rate = options?.rate || 0.94;

    try {
      const utter = new SpeechSynthesisUtterance(englishText);
      utter.lang = lang;
      utter.rate = rate;
      utter.pitch = 1.0;

      const selectedVoice = this.pickInternationalEnglishVoice(lang);
      if (selectedVoice) utter.voice = selectedVoice;

      utter.onstart = () => {
        if (!cancelled) options?.onStart?.();
      };
      utter.onend = () => {
        if (!cancelled) options?.onEnd?.();
      };
      utter.onerror = () => {
        if (!cancelled) options?.onEnd?.();
      };

      window.speechSynthesis.speak(utter);
    } catch {
      options?.onEnd?.();
    }
  }

  /**
   * Speaks an English text N times (for intensive listening practice)
   * with live progress callback (1..repeatCount).
   */
  public speakEnglishRepeated(
    englishText: string,
    repeatCount = 3,
    onRepeatUpdate?: (currentRound: number, totalRounds: number) => void,
    onComplete?: () => void,
    rate = 0.92,
    lang: 'en-US' | 'en-GB' = 'en-US'
  ) {
    this.stopSpeech();
    if (this.muted) {
      onComplete?.();
      return;
    }

    const total = Math.max(1, repeatCount);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onComplete?.();
      return;
    }

    let cancelled = false;
    this.activeSpeechCancel = () => {
      cancelled = true;
    };

    const speakRound = (round: number) => {
      if (cancelled || round > total) {
        if (!cancelled) onComplete?.();
        return;
      }

      onRepeatUpdate?.(round, total);
      this.playTone(620 + round * 55, 0.075, 'sine', 0.05, 0);

      try {
        const utter = new SpeechSynthesisUtterance(englishText);
        utter.lang = lang;
        utter.rate = rate;
        utter.pitch = 1.0;

        const selectedVoice = this.pickInternationalEnglishVoice(lang);
        if (selectedVoice) utter.voice = selectedVoice;

        utter.onend = () => {
          if (cancelled) return;
          if (round < total) {
            window.setTimeout(() => speakRound(round + 1), 420);
          } else {
            onComplete?.();
          }
        };
        utter.onerror = () => {
          if (cancelled) return;
          if (round < total) {
            window.setTimeout(() => speakRound(round + 1), 420);
          } else {
            onComplete?.();
          }
        };

        window.speechSynthesis.speak(utter);
      } catch {
        onComplete?.();
      }
    };

    speakRound(1);
  }
}

export const soundEngine = new SoundEngine();

