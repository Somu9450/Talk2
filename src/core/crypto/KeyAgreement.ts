import {Buffer} from 'buffer';
import QuickCrypto from 'react-native-quick-crypto';

/**
 * Ephemeral P-256 ECDH Key Agreement + RFC 5869 HKDF-SHA256 + 6-digit SAS Pairing Code.
 * Direct React Native equivalent of `in.gov.itantra.core.crypto.KeyAgreement`.
 */
export class SessionKeyDerivation {
  public static readonly INFO = 'iTantra/v1/session-key/aes-256-gcm';
  private static readonly HASH_LEN = 32;

  static deriveKey(
    sharedSecret: Uint8Array,
    salt: Uint8Array,
    length: number = 32,
  ): Uint8Array {
    const prk = this.extract(salt, sharedSecret);
    return this.expand(
      prk,
      Uint8Array.from(Buffer.from(this.INFO, 'utf-8')),
      length,
    );
  }

  static transcript(
    publicKeyA: Uint8Array,
    publicKeyB: Uint8Array,
  ): Uint8Array {
    const [first, second] =
      this.compareBytes(publicKeyA, publicKeyB) <= 0
        ? [publicKeyA, publicKeyB]
        : [publicKeyB, publicKeyA];
    return new Uint8Array(
      Buffer.concat([Buffer.from(first), Buffer.from(second)]),
    );
  }

  static compareBytes(a: Uint8Array, b: Uint8Array): number {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const diff = (a[i] & 0xff) - (b[i] & 0xff);
      if (diff !== 0) {
        return diff;
      }
    }
    return a.length - b.length;
  }

  private static extract(salt: Uint8Array, ikm: Uint8Array): Buffer {
    const effectiveSalt =
      salt.length === 0 ? Buffer.alloc(this.HASH_LEN) : Buffer.from(salt);
    const hmac = QuickCrypto.createHmac('sha256', effectiveSalt);
    hmac.update(Buffer.from(ikm));
    return hmac.digest();
  }

  private static expand(
    prk: Buffer,
    info: Uint8Array,
    length: number,
  ): Uint8Array {
    const out = Buffer.alloc(length);
    let t = Buffer.alloc(0);
    let pos = 0;
    let counter = 1;
    while (pos < length) {
      const hmac = QuickCrypto.createHmac('sha256', prk);
      hmac.update(t);
      hmac.update(Buffer.from(info));
      hmac.update(Buffer.from([counter & 0xff]));
      t = hmac.digest();
      const copyLen = Math.min(t.length, length - pos);
      t.copy(out, pos, 0, copyLen);
      pos += copyLen;
      counter++;
    }
    return new Uint8Array(out);
  }
}

export class PairingCode {
  private static readonly DIGITS = 6;
  private static readonly MODULUS = 1_000_000;
  private static readonly INFO = 'iTantra/v1/pairing-sas';

  static derive(
    sharedSecret: Uint8Array,
    publicKeyA: Uint8Array,
    publicKeyB: Uint8Array,
  ): string {
    const transcript = SessionKeyDerivation.transcript(publicKeyA, publicKeyB);
    const hmac = QuickCrypto.createHmac('sha256', Buffer.from(sharedSecret));
    hmac.update(Buffer.from(this.INFO, 'utf-8'));
    hmac.update(Buffer.from(transcript));
    const digest = hmac.digest();

    const value =
      ((digest[0] & 0x7f) << 24) |
      ((digest[1] & 0xff) << 16) |
      ((digest[2] & 0xff) << 8) |
      (digest[3] & 0xff);

    return (value % this.MODULUS).toString().padStart(this.DIGITS, '0');
  }
}
