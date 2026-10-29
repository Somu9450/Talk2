import {MessageType, isFloorControlMessage} from './Packet';

export enum FloorState {
  IDLE = 'IDLE',
  REQUESTING = 'REQUESTING',
  HOLDING = 'HOLDING',
  PEER_HOLDING = 'PEER_HOLDING',
}

export interface FloorListener {
  onGranted?: () => void;
  onDenied?: (reason: string) => void;
  onPeerHolding?: () => void;
  onIdle?: () => void;
}

/**
 * Half-duplex PTT Floor Controller.
 * Direct React Native equivalent of `in.gov.itantra.core.transport.FloorController`.
 */
export class FloorController {
  public static readonly DEFAULT_GRANT_TIMEOUT_MS = 5000;
  public static readonly DEFAULT_MAX_HOLD_MS = 45000;
  public static readonly BUSY = 'channel busy';
  public static readonly TIMEOUT = 'no floor grant';
  public static readonly HOLD_TIMEOUT = 'max talk time exceeded';

  private state: FloorState = FloorState.IDLE;
  private pendingToken: string | null = null;
  private tokenSeq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  public listener: FloorListener | null = null;

  constructor(
    private readonly send: (type: MessageType, token: string) => void,
    private readonly winsTies: boolean,
    private readonly grantTimeoutMs: number = FloorController.DEFAULT_GRANT_TIMEOUT_MS,
    private readonly maxHoldMs: number = FloorController.DEFAULT_MAX_HOLD_MS,
  ) {}

  get current(): FloorState {
    return this.state;
  }

  get hasFloor(): boolean {
    return this.state === FloorState.HOLDING;
  }

  get peerHolds(): boolean {
    return this.state === FloorState.PEER_HOLDING;
  }

  requestLocal(): void {
    switch (this.state) {
      case FloorState.IDLE: {
        const token = `${Date.now()}-${++this.tokenSeq}`;
        this.pendingToken = token;
        this.enterState(FloorState.REQUESTING);
        this.scheduleGrantTimeout();
        this.send(MessageType.FLOOR_REQUEST, token);
        break;
      }
      case FloorState.REQUESTING:
        break;
      case FloorState.HOLDING:
        this.listener?.onGranted?.();
        break;
      case FloorState.PEER_HOLDING:
        this.listener?.onDenied?.(FloorController.BUSY);
        break;
    }
  }

  releaseLocal(): void {
    if (
      this.state !== FloorState.HOLDING &&
      this.state !== FloorState.REQUESTING
    ) {
      return;
    }
    this.pendingToken = null;
    this.enterState(FloorState.IDLE);
    this.send(MessageType.FLOOR_RELEASE, '');
    this.listener?.onIdle?.();
  }

  onRemote(type: MessageType, token: string): void {
    if (!isFloorControlMessage(type)) {
      return;
    }
    switch (type) {
      case MessageType.FLOOR_REQUEST:
        this.onRemoteRequest(token);
        break;
      case MessageType.FLOOR_GRANT:
        if (
          this.state === FloorState.REQUESTING &&
          token === this.pendingToken
        ) {
          this.enterState(FloorState.HOLDING);
          this.scheduleHoldTimeout();
          this.listener?.onGranted?.();
        }
        break;
      case MessageType.FLOOR_DENY:
        if (
          this.state === FloorState.REQUESTING &&
          token === this.pendingToken
        ) {
          this.enterState(FloorState.IDLE);
          this.listener?.onDenied?.(FloorController.BUSY);
        }
        break;
      case MessageType.FLOOR_RELEASE:
        if (this.state === FloorState.PEER_HOLDING) {
          this.enterState(FloorState.IDLE);
          this.listener?.onIdle?.();
        }
        break;
    }
  }

  reset(): void {
    this.pendingToken = null;
    this.enterState(FloorState.IDLE);
    this.listener?.onIdle?.();
  }

  private onRemoteRequest(token: string): void {
    if (this.state === FloorState.IDLE) {
      this.enterState(FloorState.PEER_HOLDING);
      this.scheduleHoldTimeout();
      this.send(MessageType.FLOOR_GRANT, token);
      this.listener?.onPeerHolding?.();
    } else if (this.state === FloorState.REQUESTING) {
      if (this.winsTies) {
        this.enterState(FloorState.HOLDING);
        this.scheduleHoldTimeout();
        this.send(MessageType.FLOOR_DENY, token);
        this.listener?.onGranted?.();
      } else {
        this.enterState(FloorState.PEER_HOLDING);
        this.scheduleHoldTimeout();
        this.send(MessageType.FLOOR_GRANT, token);
        this.listener?.onDenied?.(FloorController.BUSY);
      }
    } else {
      this.send(MessageType.FLOOR_DENY, token);
    }
  }

  private enterState(next: FloorState): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state = next;
  }

  private scheduleGrantTimeout(): void {
    this.timer = setTimeout(() => {
      if (this.state === FloorState.REQUESTING) {
        this.pendingToken = null;
        this.enterState(FloorState.IDLE);
        this.listener?.onDenied?.(FloorController.TIMEOUT);
      }
    }, this.grantTimeoutMs);
  }

  private scheduleHoldTimeout(): void {
    const activeState = this.state;
    this.timer = setTimeout(() => {
      if (this.state !== activeState) {
        return;
      }
      this.enterState(FloorState.IDLE);
      if (activeState === FloorState.HOLDING) {
        this.send(MessageType.FLOOR_RELEASE, '');
        this.listener?.onDenied?.(FloorController.HOLD_TIMEOUT);
      } else if (activeState === FloorState.PEER_HOLDING) {
        this.listener?.onIdle?.();
      }
    }, this.maxHoldMs);
  }
}
