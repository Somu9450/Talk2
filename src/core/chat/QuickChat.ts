import {LanguageCode, LanguageInfo} from '../Language';

export enum QuickChatKey {
  YES = 'YES',
  NO = 'NO',
  OKAY = 'OKAY',
  NEED_HELP = 'NEED_HELP',
  WAIT = 'WAIT',
}

export const QUICK_CHAT_PHRASES: Record<
  QuickChatKey,
  Record<LanguageCode, string>
> = {
  [QuickChatKey.YES]: {
    hi: 'हाँ',
    ta: 'ஆம்',
    bn: 'হ্যাঁ',
    gu: 'હા',
    mr: 'हो',
    kn: 'ಹೌದು',
    ml: 'അതെ',
    te: 'అవును',
    or: 'ହଁ',
    en: 'Yes',
  },
  [QuickChatKey.NO]: {
    hi: 'नहीं',
    ta: 'இல்லை',
    bn: 'না',
    gu: 'ના',
    mr: 'नाही',
    kn: 'ಇಲ್ಲ',
    ml: 'ഇല്ല',
    te: 'కాదు',
    or: 'ନା',
    en: 'No',
  },
  [QuickChatKey.OKAY]: {
    hi: 'ठीक है',
    ta: 'சரி',
    bn: 'ঠিক আছে',
    gu: 'બરાબર',
    mr: 'ठीक आहे',
    kn: 'ಸರಿ',
    ml: 'ശരി',
    te: 'సరే',
    or: 'ଠିକ୍ ଅଛି',
    en: 'Okay',
  },
  [QuickChatKey.NEED_HELP]: {
    hi: 'मदद चाहिए',
    ta: 'உதவி வேண்டும்',
    bn: 'সাহায্য দরকার',
    gu: 'મદદ જોઈએ છે',
    mr: 'मदत हवी आहे',
    kn: 'ಸಹಾಯ ಬೇಕಾಗಿದೆ',
    ml: 'സഹായം വേണം',
    te: 'సహాయం కావాలి',
    or: 'ସାହାଯ୍ୟ ଦରକାର',
    en: 'Need help',
  },
  [QuickChatKey.WAIT]: {
    hi: 'रुकिए',
    ta: 'காத்திருங்கள்',
    bn: 'অপেক্ষা করুন',
    gu: 'રાહ જુઓ',
    mr: 'थांबा',
    kn: 'ಕಾಯಿರಿ',
    ml: 'കാത്തിരിക്കൂ',
    te: 'వేచి ఉండండి',
    or: 'ଅପେକ୍ଷା କରନ୍ତୁ',
    en: 'Wait',
  },
};

export function getQuickChatPhrases(language: LanguageInfo): string[] {
  const code = language.code as LanguageCode;
  return Object.values(QuickChatKey).map(
    key => QUICK_CHAT_PHRASES[key][code] ?? QUICK_CHAT_PHRASES[key].en,
  );
}
