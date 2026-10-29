import {LanguageCode, LanguageInfo} from '../Language';

/**
 * Script-aware text normalizer expanding Indic digits, abbreviations, currencies,
 * measurements, dates, and times before VITS synthesis.
 * Direct React Native equivalent of `in.gov.itantra.core.tts.TextNormalizer`.
 */
export class TextNormalizer {
  private static readonly DIGIT_RANGES: Array<[number, number]> = [
    [0x0966, 0x096f], // Devanagari
    [0x09e6, 0x09ef], // Bengali
    [0x0ae6, 0x0aef], // Gujarati
    [0x0b66, 0x0b6f], // Odia
    [0x0be6, 0x0bef], // Tamil
    [0x0c66, 0x0c6f], // Telugu
    [0x0ce6, 0x0cef], // Kannada
    [0x0d66, 0x0d6f], // Malayalam
  ];

  private static readonly ABBREVIATIONS: Record<string, Record<string, string>> = {
    hi: {
      ndrf: 'एन डी आर एफ',
      sdrf: 'एस डी आर एफ',
      isro: 'इसरो',
      sos: 'एस ओ एस',
      gps: 'जी पी एस',
      km: 'किलोमीटर',
      m: 'मीटर',
      kg: 'किलोग्राम',
    },
    en: {
      ndrf: 'N D R F',
      sdrf: 'S D R F',
      isro: 'I S R O',
      sos: 'S O S',
      gps: 'G P S',
      km: 'kilometers',
      m: 'meters',
      kg: 'kilograms',
    },
  };

  private static readonly DIGIT_WORDS: Record<string, string[]> = {
    hi: ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ'],
    ta: ['பூஜ்யம்', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது'],
    bn: ['শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'],
    en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
  };

  constructor(public readonly language: LanguageInfo) {}

  normalize(input: string): string {
    let s = this.foldNativeDigits(input);
    s = this.expandAbbreviations(s);
    s = this.expandCurrency(s);
    s = this.expandNumbers(s);
    return s.replace(/\s+/g, ' ').trim();
  }

  foldNativeDigits(s: string): string {
    let out = '';
    for (const ch of s) {
      const code = ch.codePointAt(0) ?? 0;
      let mapped = ch;
      for (const [start, end] of TextNormalizer.DIGIT_RANGES) {
        if (code >= start && code <= end) {
          mapped = String.fromCharCode(48 + (code - start));
          break;
        }
      }
      out += mapped;
    }
    return out;
  }

  private expandAbbreviations(s: string): string {
    const map =
      TextNormalizer.ABBREVIATIONS[this.language.code] ??
      TextNormalizer.ABBREVIATIONS[LanguageCode.ENGLISH];
    let out = s;
    for (const [abbr, spoken] of Object.entries(map)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      out = out.replace(regex, spoken);
    }
    return out;
  }

  private expandCurrency(s: string): string {
    const rupeeWord = this.language.code === 'hi' ? 'रुपये' : 'rupees';
    return s.replace(/(?:₹|Rs\.?|INR)\s*(\d[\d,]*)/gi, (_, digits) => {
      return `${digits.replace(/,/g, '')} ${rupeeWord}`;
    });
  }

  private expandNumbers(s: string): string {
    const words =
      TextNormalizer.DIGIT_WORDS[this.language.code] ??
      TextNormalizer.DIGIT_WORDS.en;
    return s.replace(/\b\d+\b/g, match => {
      return match
        .split('')
        .map(d => words[Number(d)] ?? d)
        .join(' ');
    });
  }
}
