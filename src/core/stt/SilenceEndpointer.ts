/**
 * Energy-based Voice Activity Detector (VAD) and Utterance Endpointer.
 * Direct React Native equivalent of `in.gov.itantra.core.stt.SilenceEndpointer`.
 */
export enum EndpointEvent {
  NONE = 'NONE',
  SPEECH_STARTED = 'SPEECH_STARTED',
  ENDPOINT = 'ENDPOINT',
}

export class SilenceEndpointer {
  public static readonly DEFAULT_SILENCE_TIMEOUT_MS = 1500;
  private static readonly INITIAL_NOISE_FLOOR_DB = -60.0;
  private static readonly RISE_ALPHA = 0.15;
  private static readonly DECAY_ALPHA = 0.02;
  private static readonly FULL_SCALE = 32768.0;

  private noiseFloorDb = SilenceEndpointer.INITIAL_NOISE_FLOOR_DB;
  private speechStarted = false;
  private consecutiveSpeechMs = 0;
  private consecutiveSilenceMs = 0;
  private endpointFired = false;

  constructor(
    public readonly silenceTimeoutMs: number = SilenceEndpointer.DEFAULT_SILENCE_TIMEOUT_MS,
    private readonly frameMs: number = 20,
    private readonly speechMarginDb: number = 6.0,
    private readonly minSpeechLevelDb: number = -52.0,
    private readonly minSpeechMs: number = 80,
  ) {}

  get hasSpeech(): boolean {
    return this.speechStarted;
  }

  get noiseFloor(): number {
    return this.noiseFloorDb;
  }

  get speechThresholdDb(): number {
    return Math.max(this.minSpeechLevelDb, this.noiseFloorDb + this.speechMarginDb);
  }

  get trailingSilenceMs(): number {
    return this.consecutiveSilenceMs;
  }

  reset(): void {
    this.speechStarted = false;
    this.consecutiveSpeechMs = 0;
    this.consecutiveSilenceMs = 0;
    this.endpointFired = false;
  }

  resetIncludingNoiseFloor(): void {
    this.reset();
    this.noiseFloorDb = SilenceEndpointer.INITIAL_NOISE_FLOOR_DB;
  }

  onFrame(pcm: Int16Array, offset: number = 0, count: number = pcm.length - offset): EndpointEvent {
    return this.onFrameDb(SilenceEndpointer.rmsDb(pcm, offset, count));
  }

  onFrameDb(db: number): EndpointEvent {
    const isSpeech = db > this.speechThresholdDb;
    if (isSpeech) {
      this.consecutiveSilenceMs = 0;
      this.consecutiveSpeechMs += this.frameMs;
    } else {
      this.consecutiveSpeechMs = 0;
      this.consecutiveSilenceMs += this.frameMs;
      this.adaptNoiseFloor(db);
    }

    if (!this.speechStarted) {
      if (this.consecutiveSpeechMs >= this.minSpeechMs) {
        this.speechStarted = true;
        return EndpointEvent.SPEECH_STARTED;
      }
      return EndpointEvent.NONE;
    }

    if (!this.endpointFired && this.consecutiveSilenceMs >= this.silenceTimeoutMs) {
      this.endpointFired = true;
      return EndpointEvent.ENDPOINT;
    }
    return EndpointEvent.NONE;
  }

  private adaptNoiseFloor(db: number): void {
    const alpha =
      db > this.noiseFloorDb
        ? SilenceEndpointer.RISE_ALPHA
        : SilenceEndpointer.DECAY_ALPHA;
    this.noiseFloorDb += alpha * (db - this.noiseFloorDb);
    this.noiseFloorDb = Math.max(-80.0, Math.min(0.0, this.noiseFloorDb));
  }

  static rmsDb(
    pcm: Int16Array,
    offset: number = 0,
    count: number = pcm.length - offset,
  ): number {
    if (count <= 0) {
      return -100.0;
    }
    const end = Math.min(offset + count, pcm.length);
    let acc = 0.0;
    for (let i = offset; i < end; i++) {
      const v = pcm[i] / this.FULL_SCALE;
      acc += v * v;
    }
    const n = Math.max(1, end - offset);
    const rms = Math.sqrt(acc / n);
    if (rms <= 1e-9) {
      return -100.0;
    }
    return 20.0 * Math.log10(rms);
  }
}
