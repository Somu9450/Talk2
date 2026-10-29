/**
 * Official PS 26173 language set: nine Indian languages plus English.
 * Direct React Native / TypeScript equivalent of `in.gov.itantra.core.Language`.
 */
export interface LanguageInfo {
  readonly code: string;
  readonly bcp47: string;
  readonly endonym: string;
  readonly englishName: string;
  readonly wire: number;
  readonly blockBase: number | null;
}

export enum LanguageCode {
  HINDI = 'hi',
  TAMIL = 'ta',
  BENGALI = 'bn',
  GUJARATI = 'gu',
  MARATHI = 'mr',
  KANNADA = 'kn',
  MALAYALAM = 'ml',
  TELUGU = 'te',
  ODIA = 'or',
  ENGLISH = 'en',
}

export const LANGUAGES: Record<LanguageCode, LanguageInfo> = {
  [LanguageCode.HINDI]: {
    code: 'hi',
    bcp47: 'hi-IN',
    endonym: 'हिन्दी',
    englishName: 'Hindi',
    wire: 0x01,
    blockBase: 0x0900,
  },
  [LanguageCode.TAMIL]: {
    code: 'ta',
    bcp47: 'ta-IN',
    endonym: 'தமிழ்',
    englishName: 'Tamil',
    wire: 0x02,
    blockBase: 0x0b80,
  },
  [LanguageCode.BENGALI]: {
    code: 'bn',
    bcp47: 'bn-IN',
    endonym: 'বাংলা',
    englishName: 'Bengali',
    wire: 0x03,
    blockBase: 0x0980,
  },
  [LanguageCode.GUJARATI]: {
    code: 'gu',
    bcp47: 'gu-IN',
    endonym: 'ગુજરાતી',
    englishName: 'Gujarati',
    wire: 0x04,
    blockBase: 0x0a80,
  },
  [LanguageCode.MARATHI]: {
    code: 'mr',
    bcp47: 'mr-IN',
    endonym: 'मराठी',
    englishName: 'Marathi',
    wire: 0x05,
    blockBase: 0x0900,
  },
  [LanguageCode.KANNADA]: {
    code: 'kn',
    bcp47: 'kn-IN',
    endonym: 'ಕನ್ನಡ',
    englishName: 'Kannada',
    wire: 0x06,
    blockBase: 0x0c80,
  },
  [LanguageCode.MALAYALAM]: {
    code: 'ml',
    bcp47: 'ml-IN',
    endonym: 'മലയാളം',
    englishName: 'Malayalam',
    wire: 0x07,
    blockBase: 0x0d00,
  },
  [LanguageCode.TELUGU]: {
    code: 'te',
    bcp47: 'te-IN',
    endonym: 'తెలుగు',
    englishName: 'Telugu',
    wire: 0x08,
    blockBase: 0x0c00,
  },
  [LanguageCode.ODIA]: {
    code: 'or',
    bcp47: 'or-IN',
    endonym: 'ଓଡ଼ିଆ',
    englishName: 'Odia',
    wire: 0x09,
    blockBase: 0x0b00,
  },
  [LanguageCode.ENGLISH]: {
    code: 'en',
    bcp47: 'en-IN',
    endonym: 'English',
    englishName: 'English',
    wire: 0x0a,
    blockBase: null,
  },
};

export const DEFAULT_LANGUAGE: LanguageInfo = LANGUAGES[LanguageCode.HINDI];

export function languageFromCode(code: string): LanguageInfo | undefined {
  const normalized = code.toLowerCase() as LanguageCode;
  return LANGUAGES[normalized];
}

export function languageFromWire(wire: number): LanguageInfo | undefined {
  return Object.values(LANGUAGES).find(lang => lang.wire === (wire & 0xff));
}

export function requireLanguageFromWire(wire: number): LanguageInfo {
  const found = languageFromWire(wire);
  if (!found) {
    throw new Error(`Unknown language wire code 0x${(wire & 0xff).toString(16)}`);
  }
  return found;
}
