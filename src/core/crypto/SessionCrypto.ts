import {Buffer} from 'buffer';
import QuickCrypto from 'react-native-quick-crypto';

export class AuthenticationFailedError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AuthenticationFailedError';
  }
}

export interface SealedPayload {
  readonly nonce: Uint8Array;
  readonly ciphertext: Uint8Array; // Includes 16-byte GCM tag appended at the end
}

export interface SessionCrypto {
  seal(plaintext: Uint8Array, associatedData: Uint8Array): SealedPayload;
  open(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    associatedData: Uint8Array,
  ): Uint8Array;
}

/**
 * AES-256-GCM AEAD Session Cipher with 4-byte random session prefix + 64-bit counter nonce.
 * Direct React Native equivalent of `in.gov.itantra.core.crypto.AesGcmSessionCrypto`.
 */
export class AesGcmSessionCrypto implements SessionCrypto {
  public static readonly KEY_LEN = 32;
  public static readonly NONCE_LEN = 12;
  public static readonly TAG_BYTES = 16;
  public static readonly MAX_MESSAGES_PER_SESSION = 0x10000000000; // 2^40

  private readonly key: Buffer;
  private readonly noncePrefix: Buffer;
  private counter = 0n;

  constructor(keyBytes: Uint8Array) {
    if (keyBytes.length !== AesGcmSessionCrypto.KEY_LEN) {
      throw new Error(
        `AES-256-GCM requires a 32-byte key, got ${keyBytes.length}`,
      );
    }
    this.key = Buffer.from(keyBytes);
    this.noncePrefix = Buffer.from(QuickCrypto.randomBytes(4));
  }

  get sealedCount(): number {
    return Number(this.counter);
  }

  seal(plaintext: Uint8Array, associatedData: Uint8Array): SealedPayload {
    const currentCount = this.counter;
    this.counter += 1n;
    if (Number(currentCount) >= AesGcmSessionCrypto.MAX_MESSAGES_PER_SESSION) {
      throw new Error('Session nonce space exhausted; renegotiate session key');
    }

    const nonce = this.buildNonce(currentCount);
    const cipher = QuickCrypto.createCipheriv('aes-256-gcm', this.key, nonce, {
      authTagLength: AesGcmSessionCrypto.TAG_BYTES,
    });
    cipher.setAAD(Buffer.from(associatedData));
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext)),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return {
      nonce: new Uint8Array(nonce),
      ciphertext: new Uint8Array(Buffer.concat([encrypted, authTag])),
    };
  }

  open(
    ciphertextWithTag: Uint8Array,
    nonce: Uint8Array,
    associatedData: Uint8Array,
  ): Uint8Array {
    if (nonce.length !== AesGcmSessionCrypto.NONCE_LEN) {
      throw new Error(`Nonce must be 12 bytes, got ${nonce.length}`);
    }
    if (ciphertextWithTag.length < AesGcmSessionCrypto.TAG_BYTES) {
      throw new AuthenticationFailedError('Ciphertext shorter than GCM tag');
    }

    const rawBuf = Buffer.from(ciphertextWithTag);
    const encBody = rawBuf.subarray(
      0,
      rawBuf.length - AesGcmSessionCrypto.TAG_BYTES,
    );
    const authTag = rawBuf.subarray(
      rawBuf.length - AesGcmSessionCrypto.TAG_BYTES,
    );

    try {
      const decipher = QuickCrypto.createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(nonce),
        {authTagLength: AesGcmSessionCrypto.TAG_BYTES},
      );
      decipher.setAAD(Buffer.from(associatedData));
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(encBody),
        decipher.final(),
      ]);
      return new Uint8Array(decrypted);
    } catch (err) {
      throw new AuthenticationFailedError('GCM tag verification failed', err);
    }
  }

  private buildNonce(counterValue: bigint): Buffer {
    const nonce = Buffer.alloc(AesGcmSessionCrypto.NONCE_LEN);
    this.noncePrefix.copy(nonce, 0, 0, 4);
    nonce.writeBigUInt64BE(counterValue, 4);
    return nonce;
  }
}
