import {Packet} from './Packet';

export interface ChannelArbiterListener {
  onBusyChanged?: (busy: boolean) => void;
  onSendFailed?: (packet: Packet, reason: string) => void;
  onSendDeferred?: (packet: Packet, attempt: number) => void;
}

interface PendingPacket {
  packet: Packet;
  attempts: number;
}

/**
 * Half-duplex channel arbitration with Emergency Alert & Floor Control head-of-queue preemption.
 * Direct React Native equivalent of `in.gov.itantra.core.transport.ChannelArbiter`.
 */
export class ChannelArbiter {
  public static readonly DEFAULT_RETRY_DELAY_MS = 1000;
  public static readonly DEFAULT_MAX_ATTEMPTS = 3;
  public static readonly DEFAULT_MAX_QUEUE_DEPTH = 32;

  private readonly queue: PendingPacket[] = [];
  private receiving = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  public listener: ChannelArbiterListener | null = null;

  constructor(
    private readonly deliver: (packet: Packet) => boolean,
    private readonly retryDelayMs: number = ChannelArbiter.DEFAULT_RETRY_DELAY_MS,
    private readonly maxAttempts: number = ChannelArbiter.DEFAULT_MAX_ATTEMPTS,
    private readonly maxQueueDepth: number = ChannelArbiter.DEFAULT_MAX_QUEUE_DEPTH,
  ) {}

  get isBusy(): boolean {
    return this.receiving;
  }

  get queueDepth(): number {
    return this.queue.length;
  }

  onReceiveStarted(): void {
    if (!this.receiving) {
      this.receiving = true;
      this.listener?.onBusyChanged?.(true);
    }
  }

  onReceiveFinished(): void {
    if (this.receiving) {
      this.receiving = false;
      this.listener?.onBusyChanged?.(false);
    }
    this.pump();
  }

  submit(packet: Packet): void {
    if (this.queue.length >= this.maxQueueDepth) {
      const victimIdx = this.queue.findIndex(item => !item.packet.isPriority);
      if (victimIdx === -1) {
        this.listener?.onSendFailed?.(
          packet,
          'Send queue full and all queued packets are priority',
        );
        return;
      }
      const [victim] = this.queue.splice(victimIdx, 1);
      this.listener?.onSendFailed?.(victim.packet, 'Evicted: send queue full');
    }

    const pending: PendingPacket = {packet, attempts: 0};
    if (packet.isPriority) {
      this.queue.unshift(pending);
    } else {
      this.queue.push(pending);
    }
    this.pump();
  }

  pump(): void {
    while (this.queue.length > 0) {
      if (this.receiving) {
        this.scheduleRetry();
        return;
      }
      const pending = this.queue[0];
      let delivered = false;
      try {
        delivered = this.deliver(pending.packet);
      } catch {
        delivered = false;
      }

      if (delivered) {
        this.queue.shift();
      } else {
        pending.attempts += 1;
        if (pending.attempts >= this.maxAttempts) {
          this.queue.shift();
          this.listener?.onSendFailed?.(
            pending.packet,
            `Delivery failed after ${pending.attempts} attempts`,
          );
        } else {
          this.listener?.onSendDeferred?.(pending.packet, pending.attempts);
          this.scheduleRetry();
          return;
        }
      }
    }
  }

  reset(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.queue.length = 0;
    if (this.receiving) {
      this.receiving = false;
      this.listener?.onBusyChanged?.(false);
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer || this.queue.length === 0) {
      return;
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.pump();
    }, this.retryDelayMs);
  }
}
