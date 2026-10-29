import {Buffer} from 'buffer';
import {requireLanguageFromWire} from '../Language';
import {SessionCrypto} from '../crypto/SessionCrypto';
import {MessageType, Packet, messageTypeFromWire} from './Packet';

export class MalformedPacketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedPacketError';
  }
}

/**
 * Big-Endian length-prefixed binary packet codec with 16-byte AAD header.
 * Direct React Native equivalent of `in.gov.itantra.core.transport.PacketCodec`.
 */
export class PacketCodec {
  public static readonly VERSION = 0x01;
  public static readonly HEADER_LEN = 16;
  public static readonly NONCE_LEN = 12;
  public static readonly LENGTH_PREFIX_LEN = 4;
  public static readonly MAX_FRAME_LEN = 64 * 1024;

  static encode(packet: Packet, crypto: SessionCrypto): Uint8Array {
    const header = Buffer.alloc(this.HEADER_LEN);
    header.writeUInt8(this.VERSION, 0);
    header.writeUInt8(packet.type, 1);
    header.writeUInt8(packet.language.wire, 2);
    header.writeUInt8(packet.flags & 0xff, 3);
    header.writeInt32BE(packet.sequence, 4);
    header.writeBigInt64BE(BigInt(packet.timestampMs), 8);

    const sealed = crypto.seal(packet.payload, new Uint8Array(header));
    if (sealed.nonce.length !== this.NONCE_LEN) {
      throw new MalformedPacketError(
        `Expected ${this.NONCE_LEN}-byte nonce, got ${sealed.nonce.length}`,
      );
    }

    const bodyLen =
      this.HEADER_LEN + this.NONCE_LEN + 4 + sealed.ciphertext.length;
    if (bodyLen > this.MAX_FRAME_LEN) {
      throw new MalformedPacketError(
        `Frame of ${bodyLen} bytes exceeds MAX_FRAME_LEN`,
      );
    }

    const frame = Buffer.alloc(this.LENGTH_PREFIX_LEN + bodyLen);
    frame.writeInt32BE(bodyLen, 0);
    header.copy(frame, 4);
    Buffer.from(sealed.nonce).copy(frame, 4 + this.HEADER_LEN);
    frame.writeInt32BE(
      sealed.ciphertext.length,
      4 + this.HEADER_LEN + this.NONCE_LEN,
    );
    Buffer.from(sealed.ciphertext).copy(
      frame,
      4 + this.HEADER_LEN + this.NONCE_LEN + 4,
    );

    return new Uint8Array(frame);
  }

  static decodeBody(body: Uint8Array, crypto: SessionCrypto): Packet {
    if (body.length < this.HEADER_LEN + this.NONCE_LEN + 4) {
      throw new MalformedPacketError(`Frame body too short: ${body.length}`);
    }
    const buf = Buffer.from(body);
    const header = buf.subarray(0, this.HEADER_LEN);

    const version = header.readUInt8(0);
    if (version !== this.VERSION) {
      throw new MalformedPacketError(`Unsupported protocol version ${version}`);
    }

    const type = messageTypeFromWire(header.readUInt8(1));
    if (!type) {
      throw new MalformedPacketError(
        `Unknown message type ${header.readUInt8(1)}`,
      );
    }

    const language = requireLanguageFromWire(header.readUInt8(2));
    const flags = header.readUInt8(3);
    const sequence = header.readInt32BE(4);
    const timestampMs = Number(header.readBigInt64BE(8));

    const nonce = buf.subarray(
      this.HEADER_LEN,
      this.HEADER_LEN + this.NONCE_LEN,
    );
    const payloadLen = buf.readInt32BE(this.HEADER_LEN + this.NONCE_LEN);
    const cipherStart = this.HEADER_LEN + this.NONCE_LEN + 4;

    if (payloadLen < 0 || cipherStart + payloadLen > buf.length) {
      throw new MalformedPacketError(
        `Declared payload length ${payloadLen} exceeds remaining bytes`,
      );
    }

    const ciphertext = buf.subarray(cipherStart, cipherStart + payloadLen);
    const plaintext = crypto.open(
      new Uint8Array(ciphertext),
      new Uint8Array(nonce),
      new Uint8Array(header),
    );

    return new Packet(type, language, sequence, timestampMs, plaintext, flags);
  }
}

export class FrameReader {
  private buffer: Buffer = Buffer.alloc(0);

  constructor(
    private readonly maxFrameLen: number = PacketCodec.MAX_FRAME_LEN,
  ) {}

  get buffered(): number {
    return this.buffer.length;
  }

  offer(data: Uint8Array): Uint8Array[] {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(data)]);
    if (this.buffer.length > this.maxFrameLen * 2) {
      throw new MalformedPacketError('Frame reassembly buffer exceeded cap');
    }

    const frames: Uint8Array[] = [];
    let offset = 0;

    while (this.buffer.length - offset >= PacketCodec.LENGTH_PREFIX_LEN) {
      const frameLen = this.buffer.readInt32BE(offset);
      if (frameLen <= 0 || frameLen > this.maxFrameLen) {
        throw new MalformedPacketError(
          `Declared frame length ${frameLen} out of range`,
        );
      }
      if (
        this.buffer.length - offset - PacketCodec.LENGTH_PREFIX_LEN <
        frameLen
      ) {
        break;
      }
      const start = offset + PacketCodec.LENGTH_PREFIX_LEN;
      frames.push(new Uint8Array(this.buffer.subarray(start, start + frameLen)));
      offset = start + frameLen;
    }

    if (offset > 0) {
      this.buffer = this.buffer.subarray(offset);
    }
    return frames;
  }

  reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}
