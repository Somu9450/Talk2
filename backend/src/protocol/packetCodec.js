'use strict';

const crypto = require('crypto');

const VERSION = 0x01;
const HEADER_LEN = 16;
const NONCE_LEN = 12;
const TAG_LEN = 16;
const LENGTH_PREFIX_LEN = 4;
const MAX_FRAME_LEN = 64 * 1024;

const LANGUAGES_BY_WIRE = {
  0x01: {code: 'hi', name: 'Hindi', blockBase: 0x0900},
  0x02: {code: 'ta', name: 'Tamil', blockBase: 0x0b80},
  0x03: {code: 'bn', name: 'Bengali', blockBase: 0x0980},
  0x04: {code: 'gu', name: 'Gujarati', blockBase: 0x0a80},
  0x05: {code: 'mr', name: 'Marathi', blockBase: 0x0900},
  0x06: {code: 'kn', name: 'Kannada', blockBase: 0x0c80},
  0x07: {code: 'ml', name: 'Malayalam', blockBase: 0x0d00},
  0x08: {code: 'te', name: 'Telugu', blockBase: 0x0c00},
  0x09: {code: 'or', name: 'Odia', blockBase: 0x0b00},
  0x0a: {code: 'en', name: 'English', blockBase: null},
};

class AesGcmSessionCrypto {
  constructor(keyBuffer) {
    if (!Buffer.isBuffer(keyBuffer) || keyBuffer.length !== 32) {
      throw new Error('AES-256-GCM requires a 32-byte key Buffer');
    }
    this.key = keyBuffer;
    this.noncePrefix = crypto.randomBytes(4);
    this.counter = 0n;
  }

  seal(plaintextBuf, aadBuf) {
    const nonce = Buffer.alloc(NONCE_LEN);
    this.noncePrefix.copy(nonce, 0, 0, 4);
    nonce.writeBigUInt64BE(this.counter++, 4);

    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, nonce, {
      authTagLength: TAG_LEN,
    });
    cipher.setAAD(aadBuf);
    const enc = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {nonce, ciphertext: Buffer.concat([enc, tag])};
  }

  open(ciphertextWithTag, nonce, aadBuf) {
    if (ciphertextWithTag.length < TAG_LEN) {
      throw new Error('Ciphertext shorter than GCM authentication tag');
    }
    const enc = ciphertextWithTag.subarray(0, ciphertextWithTag.length - TAG_LEN);
    const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - TAG_LEN);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, nonce, {
      authTagLength: TAG_LEN,
    });
    decipher.setAAD(aadBuf);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]);
  }
}

function encodePacket(packet, sessionCrypto) {
  const header = Buffer.alloc(HEADER_LEN);
  header.writeUInt8(VERSION, 0);
  header.writeUInt8(packet.type, 1);
  header.writeUInt8(packet.languageWire, 2);
  header.writeUInt8(packet.flags || 0, 3);
  header.writeInt32BE(packet.sequence, 4);
  header.writeBigInt64BE(BigInt(packet.timestampMs || Date.now()), 8);

  const payloadBuf = Buffer.isBuffer(packet.payload)
    ? packet.payload
    : Buffer.from(String(packet.payload), 'utf8');

  const sealed = sessionCrypto.seal(payloadBuf, header);
  const bodyLen = HEADER_LEN + NONCE_LEN + 4 + sealed.ciphertext.length;
  if (bodyLen > MAX_FRAME_LEN) {
    throw new Error(`Frame exceeds MAX_FRAME_LEN (${bodyLen})`);
  }

  const frame = Buffer.alloc(LENGTH_PREFIX_LEN + bodyLen);
  frame.writeInt32BE(bodyLen, 0);
  header.copy(frame, 4);
  sealed.nonce.copy(frame, 4 + HEADER_LEN);
  frame.writeInt32BE(sealed.ciphertext.length, 4 + HEADER_LEN + NONCE_LEN);
  sealed.ciphertext.copy(frame, 4 + HEADER_LEN + NONCE_LEN + 4);
  return frame;
}

function decodeFrameBody(bodyBuf, sessionCrypto) {
  if (bodyBuf.length < HEADER_LEN + NONCE_LEN + 4) {
    throw new Error('Frame body too short');
  }
  const header = bodyBuf.subarray(0, HEADER_LEN);
  const version = header.readUInt8(0);
  if (version !== VERSION) {
    throw new Error(`Unsupported version ${version}`);
  }
  const type = header.readUInt8(1);
  const languageWire = header.readUInt8(2);
  const flags = header.readUInt8(3);
  const sequence = header.readInt32BE(4);
  const timestampMs = Number(header.readBigInt64BE(8));

  const nonce = bodyBuf.subarray(HEADER_LEN, HEADER_LEN + NONCE_LEN);
  const payloadLen = bodyBuf.readInt32BE(HEADER_LEN + NONCE_LEN);
  const cipherStart = HEADER_LEN + NONCE_LEN + 4;
  const ciphertext = bodyBuf.subarray(cipherStart, cipherStart + payloadLen);

  const plaintext = sessionCrypto.open(ciphertext, nonce, header);
  return {
    type,
    languageWire,
    language: LANGUAGES_BY_WIRE[languageWire] || null,
    flags,
    sequence,
    timestampMs,
    payload: plaintext,
    text: plaintext.toString('utf8'),
  };
}

module.exports = {
  VERSION,
  LANGUAGES_BY_WIRE,
  AesGcmSessionCrypto,
  encodePacket,
  decodeFrameBody,
};
