import {Buffer} from 'buffer';
import {LanguageInfo} from '../Language';

/**
 * Wire message types. Direct equivalent of `in.gov.itantra.core.transport.MessageType`.
 */
export enum MessageType {
  NORMAL = 0x01,
  ALERT = 0x02,
  HEARTBEAT = 0x03,
  ACK = 0x04,
  FLOOR_REQUEST = 0x05,
  FLOOR_GRANT = 0x06,
  FLOOR_DENY = 0x07,
  FLOOR_RELEASE = 0x08,
  QUEUED = 0x09,
  PROFILE = 0x0a,
}

export function isFloorControlMessage(type: MessageType): boolean {
  return (
    type === MessageType.FLOOR_REQUEST ||
    type === MessageType.FLOOR_GRANT ||
    type === MessageType.FLOOR_DENY ||
    type === MessageType.FLOOR_RELEASE
  );
}

export function messageTypeFromWire(byteVal: number): MessageType | undefined {
  const masked = byteVal & 0xff;
  if (Object.values(MessageType).includes(masked as MessageType)) {
    return masked as MessageType;
  }
  return undefined;
}

export const FLAG_REQUIRES_ACK = 0x01;

export class Packet {
  constructor(
    public readonly type: MessageType,
    public readonly language: LanguageInfo,
    public readonly sequence: number,
    public readonly timestampMs: number,
    public readonly payload: Uint8Array,
    public readonly flags: number = 0,
  ) {}

  get text(): string {
    return Buffer.from(this.payload).toString('utf-8');
  }

  get isAlert(): boolean {
    return this.type === MessageType.ALERT;
  }

  get isPriority(): boolean {
    return this.isAlert || isFloorControlMessage(this.type);
  }

  get isQueued(): boolean {
    return this.type === MessageType.QUEUED;
  }

  get requiresAck(): boolean {
    return (this.flags & FLAG_REQUIRES_ACK) !== 0;
  }

  static fromText(
    type: MessageType,
    language: LanguageInfo,
    sequence: number,
    text: string,
    timestampMs: number = Date.now(),
    flags: number = 0,
  ): Packet {
    return new Packet(
      type,
      language,
      sequence,
      timestampMs,
       Uint8Array.from(Buffer.from(text, 'utf-8')),
      flags,
    );
  }
}
