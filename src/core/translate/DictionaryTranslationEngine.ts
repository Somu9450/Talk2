import {LanguageCode, LanguageInfo} from '../Language';

/**
 * Offline Emergency & Tactical Phrase Dictionary covering all 10 Indic languages.
 * Direct React Native equivalent of `in.gov.itantra.core.translate.DictionaryTranslationEngine`.
 */
const CONCEPTS: Array<Record<LanguageCode, string>> = [
  {
    hi: 'मुझे मदद चाहिए',
    ta: 'எனக்கு உதவி வேண்டும்',
    bn: 'আমার সাহায্য দরকার',
    gu: 'મને મદદ જોઈએ છે',
    mr: 'मला मदतीची गरज आहे',
    kn: 'ನನಗೆ ಸಹಾಯ ಬೇಕು',
    ml: 'എനിക്ക് സഹായം വേണം',
    te: 'నాకు సహాయం కావాలి',
    or: 'ମୋତେ ସାହାଯ୍ୟ ଦରକାର',
    en: 'I need help',
  },
  {
    hi: 'पानी बढ़ रहा है',
    ta: 'தண்ணீர் உயர்கிறது',
    bn: 'জল বাড়ছে',
    gu: 'પાણી વધી રહ્યું છે',
    mr: 'पाणी वाढत आहे',
    kn: 'ನೀರು ಏರುತ್ತಿದೆ',
    ml: 'വെള്ളം പൊങ്ങുന്നു',
    te: 'నీరు పెరుగుతోంది',
    or: 'ପାଣି ବଢୁଛି',
    en: 'The water is rising',
  },
  {
    hi: 'सब लोग सुरक्षित हैं',
    ta: 'அனைவரும் பாதுகாப்பாக உள்ளனர்',
    bn: 'সবাই নিরাপদ',
    gu: 'બધા સલામત છે',
    mr: 'सर्वजण सुरक्षित आहेत',
    kn: 'ಎಲ್ಲರೂ ಸುರಕ್ಷಿತವಾಗಿದ್ದಾರೆ',
    ml: 'എല്ലാവരും സുരക്ഷിതരാണ്',
    te: 'అందరూ సురక్షితంగా ఉన్నారు',
    or: 'ସମସ୍ତେ ସୁରକ୍ଷିତ ଅଛନ୍ତି',
    en: 'Everyone is safe',
  },
  {
    hi: 'तुरंत बाहर निकलें',
    ta: 'உடனடியாக வெளியேறவும்',
    bn: 'অবিলম্বে খালি করুন',
    gu: 'તરત જ બહાર નીકળો',
    mr: 'त्वरित बाहेर पडा',
    kn: 'ತಕ್ಷಣವೇ ತೆರವುಗೊಳಿಸಿ',
    ml: 'ഉടൻ ഒഴിയുക',
    te: 'వెంటనే ఖాళీ చేయండి',
    or: 'ତୁରନ୍ତ ଖାଲି କରନ୍ତୁ',
    en: 'Evacuate immediately',
  },
  {
    hi: 'चिकित्सा सहायता चाहिए',
    ta: 'மருத்துவ உதவி தேவை',
    bn: 'চিকিৎসা সাহায্য দরকার',
    gu: 'તબીબી મદદ જોઈએ છે',
    mr: 'वैद्यकीय मदत हवी आहे',
    kn: 'ವೈದ್ಯಕೀಯ ನೆರವು ಬೇಕಾಗಿದೆ',
    ml: 'വൈദ്യസഹായം വേണം',
    te: 'వైద్య సహాయం కావాలి',
    or: 'ଡାକ୍ତରୀ ସାହାଯ୍ୟ ଦରକାର',
    en: 'Medical help needed',
  },
  {
    hi: 'रास्ता बंद है',
    ta: 'பாதை அடைக்கப்பட்டுள்ளது',
    bn: 'রাস্তা বন্ধ',
    gu: 'રસ્તો બંધ છે',
    mr: 'रस्ता बंद आहे',
    kn: 'ರಸ್ತೆ ಮುಚ್ಚಲಾಗಿದೆ',
    ml: 'വഴി അടച്ചിരിക്കുന്നു',
    te: 'దారి మూసివేయబడింది',
    or: 'ରାସ୍ତା ବନ୍ଦ ଅଛି',
    en: 'Road is blocked',
  },
  {
    hi: 'हम आ रहे हैं',
    ta: 'நாங்கள் வருகிறோம்',
    bn: 'আমরা আসছি',
    gu: 'અમે આવી રહ્યા છીએ',
    mr: 'आम्ही येत आहोत',
    kn: 'ನಾವು ಬರುತ್ತಿದ್ದೇವೆ',
    ml: 'ഞങ്ങൾ വരുന്നു',
    te: 'మేము వస్తున్నాము',
    or: 'ଆମେ ଆସୁଛୁ',
    en: 'We are coming',
  },
];

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[।.,!?"'()\-:;]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class DictionaryTranslationEngine {
  private readonly lookup = new Map<string, string>();

  constructor() {
    for (const concept of CONCEPTS) {
      const entries = Object.entries(concept) as Array<[LanguageCode, string]>;
      for (const [srcLang, srcText] of entries) {
        for (const [tgtLang, tgtText] of entries) {
          if (srcLang !== tgtLang) {
            this.lookup.set(
              `${srcLang}:${tgtLang}:${normalizeKey(srcText)}`,
              tgtText,
            );
          }
        }
      }
    }
  }

  translate(
    text: string,
    source: LanguageInfo,
    target: LanguageInfo,
  ): string | null {
    if (source.code === target.code) {
      return text;
    }
    return (
      this.lookup.get(`${source.code}:${target.code}:${normalizeKey(text)}`) ??
      null
    );
  }
}
