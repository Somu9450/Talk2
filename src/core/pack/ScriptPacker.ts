import {Buffer} from 'buffer';
import {LanguageInfo} from '../Language';

/**
 * Ultra-low-bitrate Script Packing compression (67% bandwidth reduction for Indic scripts).
 * Direct React Native equivalent of `in.gov.itantra.core.pack.ScriptPacker`.
 */
export class ScriptPacker {
  private static readonly ESCAPE = 0x1b;
  private static readonly BLOCK_START = 0x80;
  private static readonly BLOCK_SIZE = 128;

  static pack(text: string, language: LanguageInfo): Uint8Array {
    const normalised = text.normalize('NFC');
    const out: number[] = [];
    const base = language.blockBase;

    for (const ch of normalised) {
      const cp = ch.codePointAt(0)!;
      if (cp <= 0x7f && cp !== this.ESCAPE) {
        out.push(cp);
      } else if (base !== null && cp >= base && cp < base + this.BLOCK_SIZE) {
        out.push((this.BLOCK_START + (cp - base)) & 0xff);
      } else {
        out.push(this.ESCAPE);
        out.push((cp >> 16) & 0xff);
        out.push((cp >> 8) & 0xff);
        out.push(cp & 0xff);
      }
    }
    return new Uint8Array(out);
  }

  static unpack(bytes: Uint8Array, language: LanguageInfo): string {
    let out = '';
    const base = language.blockBase;
    let i = 0;

    while (i < bytes.length) {
      const b = bytes[i] & 0xff;
      if (b === this.ESCAPE) {
        if (i + 3 >= bytes.length) {
          throw new Error(`Truncated escape sequence at offset ${i}`);
        }
        const cp =
          ((bytes[i + 1] & 0xff) << 16) |
          ((bytes[i + 2] & 0xff) << 8) |
          (bytes[i + 3] & 0xff);
        out += String.fromCodePoint(cp);
        i += 4;
      } else if (b < this.BLOCK_START) {
        out += String.fromCharCode(b);
        i += 1;
      } else {
        if (base === null) {
          throw new Error(
            `Byte 0x${b.toString(16)} requires a script block, but ${language.code} has none`,
          );
        }
        out += String.fromCodePoint(base + (b - this.BLOCK_START));
        i += 1;
      }
    }
    return out;
  }

  static isWorthPacking(text: string, language: LanguageInfo): boolean {
    return (
      this.pack(text, language).length < Buffer.from(text, 'utf-8').length
    );
  }
}
