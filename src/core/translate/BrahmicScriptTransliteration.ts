import {LanguageCode, LanguageInfo} from '../Language';

/**
 * Bidirectional Brahmic Script Transliterator pivoting via Devanagari (0x0900).
 * Direct React Native equivalent of `in.gov.itantra.core.translate.BrahmicScriptTransliteration`.
 */
export class BrahmicScriptTransliteration {
  static isBrahmic(language: LanguageInfo): boolean {
    return language.blockBase !== null;
  }

  static toDevanagari(text: string, sourceLanguage: LanguageInfo): string {
    const base = sourceLanguage.blockBase;
    if (base === null || base === 0x0900) {
      return text;
    }
    let out = '';
    for (const ch of text) {
      const code = ch.codePointAt(0)!;
      if (code >= base && code <= base + 0x7f) {
        out += String.fromCodePoint(0x0900 + (code - base));
      } else {
        out += ch;
      }
    }
    return out;
  }

  static fromDevanagari(
    devanagariText: string,
    targetLanguage: LanguageInfo,
  ): string {
    const targetBase = targetLanguage.blockBase;
    if (targetBase === null || targetBase === 0x0900) {
      return devanagariText;
    }
    let out = '';
    for (const ch of devanagariText) {
      const code = ch.codePointAt(0)!;
      if (code >= 0x0900 && code <= 0x097f) {
        const offset = code - 0x0900;
        const mapped = this.mapOffset(offset, targetLanguage, targetBase);
        out += String.fromCodePoint(mapped);
      } else {
        out += ch;
      }
    }
    return out;
  }

  private static mapOffset(
    offset: number,
    targetLanguage: LanguageInfo,
    targetBase: number,
  ): number {
    if (targetLanguage.code === LanguageCode.TAMIL) {
      let mapped = offset;
      if ([0x16, 0x17, 0x18].includes(offset)) mapped = 0x15;
      else if ([0x1b, 0x1c, 0x1d].includes(offset)) mapped = 0x1a;
      else if ([0x20, 0x21, 0x22].includes(offset)) mapped = 0x1f;
      else if ([0x25, 0x26, 0x27].includes(offset)) mapped = 0x24;
      else if ([0x2b, 0x2c, 0x2d].includes(offset)) mapped = 0x2a;
      else if (offset === 0x36) mapped = 0x38;
      else if (offset === 0x31) mapped = 0x29;
      return targetBase + mapped;
    }
    if (targetLanguage.code === LanguageCode.BENGALI && offset === 0x35) {
      return targetBase + 0x2c;
    }
    return targetBase + offset;
  }
}
