import {LanguageCode, LanguageInfo} from '../Language';

/**
 * Five F-07 Emergency Alert Templates across all 10 Indic languages.
 * Direct React Native equivalent of `in.gov.itantra.core.alert.AlertTemplate`.
 */
export enum AlertTemplateKey {
  EMERGENCY_ASSISTANCE = 'emergency',
  ALL_CLEAR = 'all_clear',
  EVACUATE_IMMEDIATELY = 'evacuate',
  STAY_IN_POSITION = 'stay_position',
  MEDICAL_HELP = 'medical',
}

export const ALERT_PHRASES: Record<
  AlertTemplateKey,
  Record<LanguageCode, string>
> = {
  [AlertTemplateKey.EMERGENCY_ASSISTANCE]: {
    hi: 'आपातकाल — सहायता चाहिए',
    ta: 'அவசரம் — உதவி தேவை',
    bn: 'জরুরি — সাহায্য চাই',
    gu: 'કટોકટી — મદદ જોઈએ છે',
    mr: 'आणीबाणी — मदत हवी आहे',
    kn: 'ತುರ್ತು ಪರಿಸ್ಥಿತಿ — ಸಹಾಯ ಬೇಕಾಗಿದೆ',
    ml: 'അടിയന്തിരാവസ്ഥ — സഹായം വേണം',
    te: 'అత్యవసర పరిస్థితి — సహాయం కావాలి',
    or: 'ଜରୁରୀକାଳୀନ — ସାହାଯ୍ୟ ଦରକାର',
    en: 'Emergency — Assistance needed',
  },
  [AlertTemplateKey.ALL_CLEAR]: {
    hi: 'सब ठीक है',
    ta: 'அனைத்தும் பாதுகாப்பு',
    bn: 'সব ঠিক আছে',
    gu: 'બધું સુરક્ષિત છે',
    mr: 'सर्व काही सुरक्षित आहे',
    kn: 'ಎಲ್ಲವೂ ಸುರಕ್ಷಿತವಾಗಿದೆ',
    ml: 'എല്ലാം സുരക്ഷിതമാണ്',
    te: 'అంతా సురక్షితం',
    or: 'ସବୁ ସୁରକ୍ଷିତ ଅଛି',
    en: 'All clear',
  },
  [AlertTemplateKey.EVACUATE_IMMEDIATELY]: {
    hi: 'तुरंत निकलें',
    ta: 'உடனடியாக வெளியேறுங்கள்',
    bn: 'অবিলম্বে সরিয়ে যান',
    gu: 'તરત જ બહાર નીકળો',
    mr: 'तातडीने बाहेर पडा',
    kn: 'ತಕ್ಷಣವೇ ತೆರವುಗೊಳಿಸಿ',
    ml: 'ഉടൻ പുറത്തുകടക്കുക',
    te: 'వెంటనే ఖాళీ చేయండి',
    or: 'ତୁରନ୍ତ ଖାଲି କରନ୍ତୁ',
    en: 'Evacuate immediately',
  },
  [AlertTemplateKey.STAY_IN_POSITION]: {
    hi: 'अपनी जगह पर रहें',
    ta: 'இருக்கும் இடத்தில் இருங்கள்',
    bn: 'অবস্থানে থাকুন',
    gu: 'તમારી જગ્યા પર રહો',
    mr: 'आपल्या जागी राहा',
    kn: 'ನಿಮ್ಮ ಸ್ಥಾನದಲ್ಲೇ ಇರಿ',
    ml: 'നിങ്ങളുടെ സ്ഥാനത്ത് തുടരുക',
    te: 'మీ స్థానంలోనే ఉండండి',
    or: 'ନିଜ ସ୍ଥାନରେ ରୁହନ୍ତୁ',
    en: 'Stay in position',
  },
  [AlertTemplateKey.MEDICAL_HELP]: {
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
};

export const WIRE_PREFIX = 'tpl:';

export function resolveAlertDisplayText(
  wireOrRawText: string,
  language: LanguageInfo,
): string {
  const trimmed = wireOrRawText.trim();
  if (trimmed.startsWith(WIRE_PREFIX)) {
    const key = trimmed.slice(WIRE_PREFIX.length) as AlertTemplateKey;
    const map = ALERT_PHRASES[key];
    if (map) {
      return map[language.code as LanguageCode] ?? map.en;
    }
  }
  return wireOrRawText;
}
