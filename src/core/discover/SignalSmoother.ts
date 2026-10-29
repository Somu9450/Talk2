export enum SignalTrend {
  CLOSING = 'CLOSING',
  FURTHER = 'FURTHER',
  STEADY = 'STEADY',
}

/**
 * 2-Stage RSSI Signal Smoother (Median Filter + Exponential Decay) and Path-Loss Distance Estimator.
 * Direct React Native equivalent of `in.gov.itantra.core.discover.SignalSmoother`.
 */
export class SignalSmoother {
  public static readonly MEDIAN_WINDOW = 5;
  public static readonly SMOOTHING_SECONDS = 0.6;
  public static readonly BIG_STEP_DB = 8.0;
  public static readonly BIG_STEP_ALPHA = 0.5;
  public static readonly RSSI_AT_ONE_METRE = -59.0;
  public static readonly PATH_LOSS_EXPONENT = 2.6;
  public static readonly DEFAULT_DISTANCE_METERS = 3.5;
  public static readonly TREND_WINDOW_MILLIS = 3000;
  public static readonly TREND_DB = 2.5;

  private readonly window: number[] = [];
  private smoothed: number | null = null;
  private lastAtMillis = 0;
  private readonly trail: Array<{atMillis: number; rssi: number}> = [];

  offer(rssi: number, atMillis: number = Date.now()): number {
    this.window.push(rssi);
    while (this.window.length > SignalSmoother.MEDIAN_WINDOW) {
      this.window.shift();
    }
    const sorted = [...this.window].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    let next: number;
    if (this.smoothed === null || this.lastAtMillis === 0) {
      next = median;
    } else {
      const dt = Math.max(0, atMillis - this.lastAtMillis) / 1000.0;
      let alpha = 1.0 - Math.exp(-dt / SignalSmoother.SMOOTHING_SECONDS);
      if (Math.abs(median - this.smoothed) > SignalSmoother.BIG_STEP_DB) {
        alpha = Math.max(alpha, SignalSmoother.BIG_STEP_ALPHA);
      }
      next = this.smoothed + (median - this.smoothed) * alpha;
    }

    this.smoothed = next;
    this.lastAtMillis = atMillis;
    this.trail.push({atMillis, rssi: next});
    while (
      this.trail.length > 0 &&
      atMillis - this.trail[0].atMillis >
        SignalSmoother.TREND_WINDOW_MILLIS + 1000
    ) {
      this.trail.shift();
    }
    return next;
  }

  trend(nowMs: number = Date.now()): SignalTrend {
    if (this.trail.length < 2) {
      return SignalTrend.STEADY;
    }
    const latest = this.trail[this.trail.length - 1];
    const earlier = this.trail.find(
      t => nowMs - t.atMillis <= SignalSmoother.TREND_WINDOW_MILLIS,
    );
    if (
      !earlier ||
      latest.atMillis - earlier.atMillis <
        SignalSmoother.TREND_WINDOW_MILLIS / 2
    ) {
      return SignalTrend.STEADY;
    }
    const delta = latest.rssi - earlier.rssi;
    if (delta >= SignalSmoother.TREND_DB) {
      return SignalTrend.CLOSING;
    }
    if (delta <= -SignalSmoother.TREND_DB) {
      return SignalTrend.FURTHER;
    }
    return SignalTrend.STEADY;
  }

  estimateDistanceMeters(
    referenceDbm: number = SignalSmoother.RSSI_AT_ONE_METRE,
    exponent: number = SignalSmoother.PATH_LOSS_EXPONENT,
  ): number {
    if (this.smoothed === null) {
      return SignalSmoother.DEFAULT_DISTANCE_METERS;
    }
    const exponentTerm = (referenceDbm - this.smoothed) / (10.0 * exponent);
    const d = Math.pow(10.0, exponentTerm);
    return Math.max(0.5, Math.min(60.0, Number(d.toFixed(1))));
  }
}
