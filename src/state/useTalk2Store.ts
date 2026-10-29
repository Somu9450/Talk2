import {create} from 'zustand';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LanguageCode,
  LanguageInfo,
} from '../core/Language';
import {AlertTemplateKey, resolveAlertDisplayText} from '../core/alert/Alert';
import {SignalTrend} from '../core/discover/SignalSmoother';
import {
  DEFAULT_MODEL_HOST_CONFIG,
  LANGUAGE_PACK_SUMMARIES,
  ModelHostConfig,
} from '../core/pack/ModelAssetManifest';

export type OnboardingStep = 1 | 2 | 3 | 'DONE';
export type ChannelOption = 'HOST_WIFI' | 'JOIN_WIFI' | 'HOST_BT' | 'JOIN_BT';

export interface ChatItem {
  id: string;
  text: string;
  translatedText?: string;
  language: LanguageInfo;
  timestampMs: number;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SENT' | 'DELIVERED' | 'QUEUED' | 'FAILED' | 'RECEIVED';
  peerName: string;
  isAlert: boolean;
  distanceMeters?: number;
}

export interface RadarPeer {
  id: string;
  name: string;
  distanceMeters: number;
  rssiDbm: number;
  trend: SignalTrend;
  hasWifi: boolean;
  hasBluetooth: boolean;
  bearingDeg: number; // Geographic bearing relative to North (0..360)
  latitude: number;
  longitude: number;
}

export interface Talk2State {
  onboardingStep: OnboardingStep;
  backgroundPermissionGranted: boolean;
  operatorName: string;
  currentLanguage: LanguageInfo;
  uiLanguage: LanguageInfo;
  downloadedLanguages: Record<string, boolean>;
  downloadProgress: Record<string, number>;
  modelHostConfig: ModelHostConfig;

  connectionState: 'OFFLINE' | 'CONNECTING' | 'CONNECTED';
  selectedChannel: ChannelOption;
  showConnectSheet: boolean;
  talkingToName: string;

  isSpeaking: boolean;
  recognizedText: string;
  alertBroadcastChannel: 'ALL' | 'WIFI' | 'BLUETOOTH';
  alertComposeMode: 'TYPE' | 'SPEAK';

  compassHeadingDeg: number;
  gyroYawRate: number;
  myLatitude: number;
  myLongitude: number;
  peers: RadarPeer[];
  messages: ChatItem[];
  aiTacticalSummary: string;

  activeAlertOverlay: {
    text: string;
    senderName: string;
    channel: string;
  } | null;

  setOnboardingStep: (step: OnboardingStep) => void;
  setBackgroundPermission: (granted: boolean) => void;
  setOperatorName: (name: string) => void;
  setLanguage: (lang: LanguageInfo) => void;
  setUiLanguage: (lang: LanguageInfo) => void;
  downloadLanguagePack: (code: string) => void;
  setModelHostConfig: (partial: Partial<ModelHostConfig>) => void;

  setShowConnectSheet: (visible: boolean) => void;
  setSelectedChannel: (ch: ChannelOption) => void;
  connectChannel: () => void;
  disconnectChannel: () => void;

  setCompassHeading: (deg: number, yawRate?: number) => void;
  startPtt: () => void;
  stopPtt: (transcript?: string) => void;
  sendQuickChat: (phrase: string) => void;
  setAlertBroadcastChannel: (ch: 'ALL' | 'WIFI' | 'BLUETOOTH') => void;
  setAlertComposeMode: (mode: 'TYPE' | 'SPEAK') => void;
  sendEmergencyAlert: (templateOrText: AlertTemplateKey | string, isTemplate?: boolean) => void;
  dismissAlertOverlay: () => void;
  askAiTacticalAssistant: (prompt: string) => void;
  clearHistory: () => void;
}

export const useTalk2Store = create<Talk2State>((set, get) => ({
  onboardingStep: 'DONE', // Can also be toggled to 1 to preview 3-step onboarding
  backgroundPermissionGranted: true,
  operatorName: 'Siddhi',
  currentLanguage: DEFAULT_LANGUAGE,
  uiLanguage: LANGUAGES[LanguageCode.ENGLISH],
  downloadedLanguages: {hi: true, ta: true, en: true},
  downloadProgress: {},
  modelHostConfig: DEFAULT_MODEL_HOST_CONFIG,

  connectionState: 'OFFLINE',
  selectedChannel: 'HOST_WIFI',
  showConnectSheet: false,
  talkingToName: "Dev's F34",

  isSpeaking: false,
  recognizedText: '',
  alertBroadcastChannel: 'ALL',
  alertComposeMode: 'TYPE',

  compassHeadingDeg: 38,
  gyroYawRate: 0.4,
  myLatitude: 28.6139,
  myLongitude: 77.2090,
  peers: [
    {
      id: 'peer-dev-f34',
      name: "Dev's F34",
      distanceMeters: 6.4,
      rssiDbm: -61,
      trend: SignalTrend.CLOSING,
      hasWifi: true,
      hasBluetooth: true,
      bearingDeg: 45,
      latitude: 28.6144,
      longitude: 77.2095,
    },
    {
      id: 'peer-ndrf-02',
      name: 'NDRF-Relay-02',
      distanceMeters: 18.5,
      rssiDbm: -74,
      trend: SignalTrend.STEADY,
      hasWifi: true,
      hasBluetooth: false,
      bearingDeg: 130,
      latitude: 28.6128,
      longitude: 77.2106,
    },
    {
      id: 'peer-med-09',
      name: 'Med-Unit-09',
      distanceMeters: 31.0,
      rssiDbm: -82,
      trend: SignalTrend.FURTHER,
      hasWifi: false,
      hasBluetooth: true,
      bearingDeg: 285,
      latitude: 28.6149,
      longitude: 77.2062,
    },
  ],
  messages: [
    {
      id: 'm-1',
      text: 'एन्क्लेव सेक्टर 4 में पानी बढ़ रहा है, नाव भेजें।',
      translatedText: 'Water is rising in Enclave Sector 4, send a boat.',
      language: LANGUAGES[LanguageCode.HINDI],
      timestampMs: Date.now() - 120000,
      direction: 'INBOUND',
      status: 'RECEIVED',
      peerName: "Dev's F34",
      isAlert: false,
      distanceMeters: 6.4,
    },
  ],
  aiTacticalSummary:
    'AI Tactical Mesh: 3 peers detected via Wi-Fi Direct + BLE. Nearest unit is Dev\'s F34 at 45° NE (6.4m, closing). Recommended channel: Host Wi-Fi Direct.',
  activeAlertOverlay: null,

  setOnboardingStep: step => set({onboardingStep: step}),
  setBackgroundPermission: granted => set({backgroundPermissionGranted: granted}),
  setOperatorName: name => set({operatorName: name}),
  setLanguage: lang => set({currentLanguage: lang}),
  setUiLanguage: lang => set({uiLanguage: lang}),

  downloadLanguagePack: code => {
    set(s => ({downloadProgress: {...s.downloadProgress, [code]: 0.35}}));
    setTimeout(() => {
      set(s => ({
        downloadProgress: {...s.downloadProgress, [code]: 1.0},
        downloadedLanguages: {...s.downloadedLanguages, [code]: true},
      }));
    }, 600);
  },

  setModelHostConfig: partial =>
    set(s => ({modelHostConfig: {...s.modelHostConfig, ...partial}})),

  setShowConnectSheet: visible => set({showConnectSheet: visible}),
  setSelectedChannel: ch => set({selectedChannel: ch}),
  connectChannel: () =>
    set({
      connectionState: 'CONNECTED',
      showConnectSheet: false,
    }),
  disconnectChannel: () => set({connectionState: 'OFFLINE'}),

  setCompassHeading: (deg, yawRate = 0) =>
    set({compassHeadingDeg: (deg + 360) % 360, gyroYawRate: yawRate}),

  startPtt: () =>
    set({
      isSpeaking: true,
      recognizedText: 'Listening (16kHz PCM → IndicWav2Vec INT8)...',
    }),

  stopPtt: transcript => {
    const s = get();
    const text = transcript?.trim() || 'हम सुरक्षित हैं, मेडिकल टीम हमारे साथ है।';
    const msg: ChatItem = {
      id: `m-${Date.now()}`,
      text,
      language: s.currentLanguage,
      timestampMs: Date.now(),
      direction: 'OUTBOUND',
      status: s.connectionState === 'CONNECTED' ? 'DELIVERED' : 'QUEUED',
      peerName: s.talkingToName,
      isAlert: false,
    };
    set({
      isSpeaking: false,
      recognizedText: text,
      messages: [...s.messages, msg],
    });
  },

  sendQuickChat: phrase => {
    const s = get();
    const msg: ChatItem = {
      id: `m-${Date.now()}`,
      text: phrase,
      language: s.currentLanguage,
      timestampMs: Date.now(),
      direction: 'OUTBOUND',
      status: s.connectionState === 'CONNECTED' ? 'DELIVERED' : 'QUEUED',
      peerName: s.talkingToName,
      isAlert: false,
    };
    set({messages: [...s.messages, msg]});
  },

  setAlertBroadcastChannel: ch => set({alertBroadcastChannel: ch}),
  setAlertComposeMode: mode => set({alertComposeMode: mode}),

  sendEmergencyAlert: (templateOrText, isTemplate = true) => {
    const s = get();
    const wire = isTemplate ? `tpl:${templateOrText}` : templateOrText;
    const text = resolveAlertDisplayText(wire, s.currentLanguage);
    const msg: ChatItem = {
      id: `alert-${Date.now()}`,
      text,
      language: s.currentLanguage,
      timestampMs: Date.now(),
      direction: 'OUTBOUND',
      status: 'DELIVERED',
      peerName: `Broadcast (${s.alertBroadcastChannel})`,
      isAlert: true,
    };
    set({
      messages: [...s.messages, msg],
      activeAlertOverlay: {
        text,
        senderName: s.operatorName,
        channel: s.alertBroadcastChannel,
      },
    });
  },

  dismissAlertOverlay: () => set({activeAlertOverlay: null}),

  askAiTacticalAssistant: prompt => {
    const s = get();
    const nearest = s.peers[0];
    const reply = `GPT/Offline Tactical Copilot: For "${prompt}" — ${nearest.name} is ${nearest.distanceMeters}m away at bearing ${nearest.bearingDeg}° (${nearest.hasWifi ? 'Wi-Fi Direct' : 'BLE'}). Encrypted 52B packet queued.`;
    set({aiTacticalSummary: reply});
  },

  clearHistory: () => set({messages: []}),
}));
