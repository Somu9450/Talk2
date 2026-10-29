import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, {Circle, G, Line, Polygon, Text as SvgText} from 'react-native-svg';
import {Talk2Palette as C} from './src/theme/Talk2Theme';
import {useTalk2Store} from './src/state/useTalk2Store';
import {LANGUAGE_PACK_SUMMARIES} from './src/core/pack/ModelAssetManifest';
import {LANGUAGES, LanguageCode} from './src/core/Language';
import {getQuickChatPhrases} from './src/core/chat/QuickChat';
import {ALERT_PHRASES, AlertTemplateKey} from './src/core/alert/Alert';
import {CompassGyroTracker} from './src/platform/sensors/CompassGyroTracker';

type Tab = 'TALK' | 'RADAR' | 'ALERT' | 'HISTORY' | 'SETTINGS';

export default function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('TALK');
  const [customAlertText, setCustomAlertText] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const store = useTalk2Store();

  // Render 3-Step Onboarding if active
  if (store.onboardingStep !== 'DONE') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.onboardHeader}>
          <Text style={styles.brandTitle}>Talk2</Text>
          <Text style={styles.stepIndicator}>
            Step {store.onboardingStep} of 3
          </Text>
        </View>
        <View style={styles.progressBarRow}>
          {[1, 2, 3].map(s => (
            <View
              key={s}
              style={[
                styles.progressSegment,
                Number(store.onboardingStep) >= s && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>

        {store.onboardingStep === 1 && (
          <View style={styles.onboardBody}>
            <Text style={styles.onboardH1}>Your profile</Text>
            <View style={styles.avatarCircle}>
              <Text style={{fontSize: 42}}>👤</Text>
              <View style={styles.cameraBadge}>
                <Text style={{fontSize: 14}}>📷</Text>
              </View>
            </View>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              value={store.operatorName}
              onChangeText={store.setOperatorName}
              placeholder="Enter operator callsign / name"
              placeholderTextColor={C.textMuted}
              style={styles.textInput}
            />
            <Pressable
              style={styles.primaryBtn}
              onPress={() => store.setOnboardingStep(2)}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </Pressable>
          </View>
        )}

        {store.onboardingStep === 2 && (
          <ScrollView style={styles.onboardBody}>
            <Text style={styles.onboardH1}>Choose your languages</Text>
            <Text style={styles.onboardSub}>
              The same language is used for speaking and listening. Hindi is
              selected by default. Only the languages you tick are kept on this
              phone.
            </Text>
            {LANGUAGE_PACK_SUMMARIES.map(pack => {
              const isDownloaded = Boolean(store.downloadedLanguages[pack.code]);
              return (
                <Pressable
                  key={pack.code}
                  onPress={() => store.downloadLanguagePack(pack.code)}
                  style={[
                    styles.packCard,
                    isDownloaded && styles.packCardSelected,
                  ]}>
                  <View style={styles.glyphBadge}>
                    <Text style={styles.glyphText}>{pack.glyph}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.packEndonym}>{pack.endonym}</Text>
                    <Text style={styles.packMeta}>{pack.englishName}</Text>
                    <Text style={styles.packMeta}>
                      {pack.displaySizeMb} ·{' '}
                      {isDownloaded ? 'Downloaded ✓' : 'Not downloaded'}
                    </Text>
                  </View>
                  <Text style={styles.cloudIcon}>
                    {isDownloaded ? '✅' : '☁️⬇'}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={[styles.primaryBtn, {marginVertical: 18}]}
              onPress={() => store.setOnboardingStep(3)}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </Pressable>
          </ScrollView>
        )}

        {store.onboardingStep === 3 && (
          <View style={styles.onboardBody}>
            <Text style={styles.onboardH1}>Show the app in</Text>
            <Text style={styles.onboardSub}>
              Menus and buttons use this language. Speaking still uses Active.
              English does not need a speech pack.
            </Text>
            {[LANGUAGES.en, LANGUAGES.hi].map(l => {
              const active = store.uiLanguage.code === l.code;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => store.setUiLanguage(l)}
                  style={[styles.packCard, active && styles.packCardSelected]}>
                  <View style={styles.glyphBadge}>
                    <Text style={styles.glyphText}>
                      {l.code === 'en' ? 'E' : 'ह'}
                    </Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.packEndonym}>{l.endonym}</Text>
                    <Text style={styles.packMeta}>{l.englishName}</Text>
                  </View>
                  <Text style={styles.cloudIcon}>{active ? '🔘' : '⚪'}</Text>
                </Pressable>
              );
            })}
            <Pressable
              style={[styles.primaryBtn, {marginTop: 24}]}
              onPress={() => store.setOnboardingStep('DONE')}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const quickChats = getQuickChatPhrases(store.currentLanguage);
  const cardinal = CompassGyroTracker.toCardinal(store.compassHeadingDeg);

  return (
    <SafeAreaView style={styles.root}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.brandTitle}>Talk2</Text>
        <View style={styles.topRight}>
          <Pressable
            onPress={() => setTab('SETTINGS')}
            style={styles.langPill}>
            <Text style={styles.langPillText}>
              🌐 {store.currentLanguage.endonym}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => store.setOnboardingStep(1)}
            style={styles.profileIconBtn}>
            <Text>👤</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <View style={{flex: 1}}>
        {tab === 'TALK' && (
          <View style={styles.screenPad}>
            {/* Link Status Card */}
            <View style={styles.connectCard}>
              <View style={styles.wifiBadge}>
                <Text style={{fontSize: 18}}>📶</Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.connStatusTitle}>
                  {store.connectionState === 'CONNECTED'
                    ? `${store.talkingToName} (${store.selectedChannel})`
                    : 'Offline'}
                </Text>
                <Text style={styles.packMeta}>
                  Wi-Fi Direct · Bluetooth · Gyro/Compass Ready
                </Text>
              </View>
              <Pressable
                style={styles.connectBtn}
                onPress={() =>
                  store.connectionState === 'CONNECTED'
                    ? store.disconnectChannel()
                    : store.setShowConnectSheet(true)
                }>
                <Text style={styles.connectBtnText}>
                  {store.connectionState === 'CONNECTED'
                    ? 'Disconnect'
                    : 'Connect'}
                </Text>
              </Pressable>
            </View>

            {/* Quick Chat Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{maxHeight: 44, marginVertical: 8}}>
              {quickChats.map(phrase => (
                <Pressable
                  key={phrase}
                  onPress={() => store.sendQuickChat(phrase)}
                  style={styles.quickChip}>
                  <Text style={styles.quickChipText}>💬 {phrase}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Chat Feed */}
            <ScrollView style={{flex: 1}}>
              {store.messages.map(m => (
                <View
                  key={m.id}
                  style={[
                    styles.chatBubble,
                    m.direction === 'OUTBOUND'
                      ? styles.chatOut
                      : styles.chatIn,
                    m.isAlert && styles.chatAlert,
                  ]}>
                  <Text style={styles.chatText}>{m.text}</Text>
                  {m.translatedText ? (
                    <Text style={styles.chatSub}>{m.translatedText}</Text>
                  ) : null}
                  <Text style={styles.chatMeta}>
                    {m.peerName} · {m.status} · 🔊
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Bottom PTT Dock */}
            <View style={styles.pttContainer}>
              <Text style={styles.pttHint}>
                {store.recognizedText ||
                  (store.connectionState === 'CONNECTED'
                    ? `Connected to ${store.talkingToName} — Hold Mic to Talk`
                    : 'Not connected - PTT will save and send later')}
              </Text>
              <Pressable
                onPressIn={() => store.startPtt()}
                onPressOut={() => store.stopPtt()}
                style={[
                  styles.micCircle,
                  store.isSpeaking && styles.micCircleActive,
                ]}>
                <Text style={{fontSize: 30}}>🎤</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === 'RADAR' && (
          <ScrollView style={styles.screenPad}>
            {/* GPS + Compass + Gyroscope Sensor Fusion Header */}
            <View style={styles.connectCard}>
              <View style={{flex: 1}}>
                <Text style={styles.connStatusTitle}>
                  🧭 Compass: {store.compassHeadingDeg}° {cardinal} · Gyro:{' '}
                  {store.gyroYawRate}°/s
                </Text>
                <Text style={styles.packMeta}>
                  📍 GPS: {store.myLatitude.toFixed(4)}° N,{' '}
                  {store.myLongitude.toFixed(4)}° E · {store.peers.length} Peers
                </Text>
              </View>
              <View style={{flexDirection: 'row', gap: 6}}>
                <Pressable
                  style={styles.smallOrangeBtn}
                  onPress={() =>
                    store.setCompassHeading(store.compassHeadingDeg - 15, -12.5)
                  }>
                  <Text style={styles.connectBtnText}>↺ -15°</Text>
                </Pressable>
                <Pressable
                  style={styles.smallOrangeBtn}
                  onPress={() =>
                    store.setCompassHeading(store.compassHeadingDeg + 15, 12.5)
                  }>
                  <Text style={styles.connectBtnText}>↻ +15°</Text>
                </Pressable>
              </View>
            </View>

            {/* Rotating Compass & Peer Direction Radar SVG */}
            <View style={styles.radarCard}>
              <Svg width={290} height={290} viewBox="0 0 290 290">
                {[0.22, 0.48, 0.74, 0.95].map((f, idx) => (
                  <Circle
                    key={idx}
                    cx={145}
                    cy={145}
                    r={130 * f}
                    stroke={C.borderSubtle}
                    strokeWidth="1.2"
                    fill="none"
                  />
                ))}
                <Line
                  x1={15}
                  y1={145}
                  x2={275}
                  y2={145}
                  stroke={C.borderSubtle}
                />
                <Line
                  x1={145}
                  y1={15}
                  x2={145}
                  y2={275}
                  stroke={C.borderSubtle}
                />

                {/* Rotating Compass Dial driven by Magnetometer + Gyroscope */}
                <G
                  rotation={-store.compassHeadingDeg}
                  origin="145, 145">
                  <SvgText
                    x={145}
                    y={28}
                    fill={C.accentOrange}
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle">
                    N
                  </SvgText>
                  <SvgText
                    x={264}
                    y={149}
                    fill={C.textSecondary}
                    fontSize="12"
                    textAnchor="middle">
                    E
                  </SvgText>
                  <SvgText
                    x={145}
                    y={270}
                    fill={C.textSecondary}
                    fontSize="12"
                    textAnchor="middle">
                    S
                  </SvgText>
                  <SvgText
                    x={26}
                    y={149}
                    fill={C.textSecondary}
                    fontSize="12"
                    textAnchor="middle">
                    W
                  </SvgText>

                  {store.peers.map(peer => {
                    const rad = ((peer.bearingDeg - 90) * Math.PI) / 180;
                    const r = Math.min(120, (peer.distanceMeters / 40) * 120);
                    const x = 145 + r * Math.cos(rad);
                    const y = 145 + r * Math.sin(rad);
                    return (
                      <G key={peer.id}>
                        <Circle
                          cx={x}
                          cy={y}
                          r={8}
                          fill={
                            peer.id === "peer-dev-f34"
                              ? C.accentOrange
                              : C.accentGreen
                          }
                        />
                        <SvgText
                          x={x}
                          y={y + 18}
                          fill={C.textPrimary}
                          fontSize="10"
                          textAnchor="middle">
                          {`${peer.name} (${peer.bearingDeg}°)`}
                        </SvgText>
                      </G>
                    );
                  })}
                </G>

                {/* Center Device Heading Pointer */}
                <Polygon
                  points="145,131 138,152 152,152"
                  fill={C.accentGreen}
                />
              </Svg>
            </View>

            {/* AI / GPT Tactical Sensor-Fusion Copilot */}
            <View style={styles.packCard}>
              <View style={{flex: 1}}>
                <Text style={styles.packEndonym}>
                  🤖 GPT / Tactical Mesh Copilot
                </Text>
                <Text style={styles.packMeta}>{store.aiTacticalSummary}</Text>
                <View style={{flexDirection: 'row', gap: 8, marginTop: 8}}>
                  <TextInput
                    value={aiQuery}
                    onChangeText={setAiQuery}
                    placeholder="Ask AI about peer directions, signal or translation..."
                    placeholderTextColor={C.textMuted}
                    style={[styles.textInput, {flex: 1, marginBottom: 0}]}
                  />
                  <Pressable
                    style={styles.connectBtn}
                    onPress={() => {
                      if (aiQuery.trim()) {
                        store.askAiTacticalAssistant(aiQuery.trim());
                        setAiQuery('');
                      }
                    }}>
                    <Text style={styles.connectBtnText}>Ask AI</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Peer Direction Cards */}
            {store.peers.map(p => {
              const relAngle =
                (p.bearingDeg - store.compassHeadingDeg + 360) % 360;
              const dirWord = CompassGyroTracker.toCardinal(p.bearingDeg);
              return (
                <View key={p.id} style={styles.packCard}>
                  <View style={styles.glyphBadge}>
                    <Text style={styles.glyphText}>{dirWord}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.packEndonym}>
                      {p.name} · ~{p.distanceMeters}m
                    </Text>
                    <Text style={styles.packMeta}>
                      Compass: {p.bearingDeg}° {dirWord} (Relative: {relAngle}°)
                      · {p.hasWifi ? 'Wi-Fi ' : ''}
                      {p.hasBluetooth ? 'BT/BLE' : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {tab === 'ALERT' && (
          <ScrollView style={styles.screenPad}>
            <Text style={styles.sectionLabel}>Broadcast channel</Text>
            <View style={styles.segmentedRow}>
              {(['ALL', 'WIFI', 'BLUETOOTH'] as const).map(ch => (
                <Pressable
                  key={ch}
                  onPress={() => store.setAlertBroadcastChannel(ch)}
                  style={[
                    styles.segmentBtn,
                    store.alertBroadcastChannel === ch &&
                      styles.segmentBtnActive,
                  ]}>
                  <Text style={styles.segmentText}>{ch}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Quick alerts</Text>
            {[
              {
                key: AlertTemplateKey.EMERGENCY_ASSISTANCE,
                en: 'Emergency SOS',
                icon: '⚠️',
              },
              {
                key: AlertTemplateKey.MEDICAL_HELP,
                en: 'Medical Help',
                icon: '🧰',
              },
              {
                key: AlertTemplateKey.EVACUATE_IMMEDIATELY,
                en: 'Evacuate Now',
                icon: '🏃',
              },
              {
                key: AlertTemplateKey.STAY_IN_POSITION,
                en: 'Hold Position',
                icon: '🛡️',
              },
              {key: AlertTemplateKey.ALL_CLEAR, en: 'All Clear', icon: '✅'},
            ].map(item => (
              <Pressable
                key={item.key}
                onPress={() => store.sendEmergencyAlert(item.key, true)}
                style={styles.packCard}>
                <View style={styles.glyphBadge}>
                  <Text style={{fontSize: 18}}>{item.icon}</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.packEndonym}>
                    {
                      ALERT_PHRASES[item.key][
                        store.currentLanguage.code as LanguageCode
                      ]
                    }
                  </Text>
                  <Text style={styles.packMeta}>{item.en}</Text>
                </View>
                <Text style={{color: C.accentOrange, fontSize: 18}}>➤</Text>
              </Pressable>
            ))}

            <Text style={styles.sectionLabel}>Custom message</Text>
            <View style={styles.customAlertBox}>
              <TextInput
                value={customAlertText}
                onChangeText={setCustomAlertText}
                placeholder="Free text (0 / 200)"
                placeholderTextColor={C.textMuted}
                style={styles.textInput}
                multiline
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{marginBottom: 10}}>
                {[
                  'Need Water & Food',
                  'Road Blocked',
                  'Injured Person',
                  'Safe at Base',
                ].map(tag => (
                  <Pressable
                    key={tag}
                    onPress={() =>
                      setCustomAlertText(prev =>
                        prev ? `${prev} ${tag}` : tag,
                      )
                    }
                    style={styles.quickChip}>
                    <Text style={styles.quickChipText}>{tag}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                style={styles.orangeActionBtn}
                onPress={() => {
                  if (customAlertText.trim()) {
                    store.sendEmergencyAlert(customAlertText.trim(), false);
                    setCustomAlertText('');
                  }
                }}>
                <Text style={styles.primaryBtnText}>➤ Send typed alert</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {tab === 'HISTORY' && (
          <ScrollView style={styles.screenPad}>
            {store.messages.map(m => (
              <View key={m.id} style={styles.packCard}>
                <View style={{flex: 1}}>
                  <Text style={styles.packEndonym}>{m.text}</Text>
                  <Text style={styles.packMeta}>
                    {m.direction} · {m.peerName} · {m.status}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {tab === 'SETTINGS' && (
          <ScrollView style={styles.screenPad}>
            <View style={{alignItems: 'center', marginVertical: 12}}>
              <View style={styles.avatarCircle}>
                <Text style={{fontSize: 36}}>👤</Text>
              </View>
              <Text style={styles.onboardH1}>{store.operatorName}</Text>
            </View>

            <Text style={styles.sectionLabel}>
              GITHUB RELEASE / GOOGLE DRIVE MODEL HOST URL
            </Text>
            <View style={styles.customAlertBox}>
              <Text style={styles.packMeta}>
                Point Talk2 to your GitHub Release (`model-pack-v1`) or Node.js
                / Google Drive host to download all 41 ONNX + Vocab files:
              </Text>
              <TextInput
                value={store.modelHostConfig.githubReleaseBaseUrl}
                onChangeText={url =>
                  store.setModelHostConfig({githubReleaseBaseUrl: url})
                }
                style={[styles.textInput, {marginTop: 8}]}
              />
            </View>

            <Text style={styles.sectionLabel}>
              SPEECH & LANGUAGES (10 INDIC PACKS)
            </Text>
            {LANGUAGE_PACK_SUMMARIES.map(pack => {
              const installed = Boolean(store.downloadedLanguages[pack.code]);
              const isCurrent = store.currentLanguage.code === pack.code;
              return (
                <Pressable
                  key={pack.code}
                  onPress={() => {
                    store.downloadLanguagePack(pack.code);
                    const langObj =
                      LANGUAGES[pack.code as LanguageCode] ?? LANGUAGES.hi;
                    store.setLanguage(langObj);
                  }}
                  style={[
                    styles.packCard,
                    isCurrent && styles.packCardSelected,
                  ]}>
                  <View style={styles.glyphBadge}>
                    <Text style={styles.glyphText}>{pack.glyph}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.packEndonym}>
                      {pack.endonym} ({pack.englishName})
                    </Text>
                    <Text style={styles.packMeta}>
                      {pack.displaySizeMb} ·{' '}
                      {installed ? 'Installed Offline' : 'Tap to Download'}
                    </Text>
                  </View>
                  <Text style={styles.cloudIcon}>
                    {isCurrent ? 'ACTIVE' : installed ? '✅' : '☁️⬇'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Connect to a channel Modal Bottom Sheet (matching Screenshot 6) */}
      <Modal
        visible={store.showConnectSheet}
        transparent
        animationType="slide"
        onRequestClose={() => store.setShowConnectSheet(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContainer}>
            <Text style={styles.onboardH1}>Connect to a channel</Text>
            <Text style={styles.sectionLabel}>Wi-Fi Direct</Text>
            <View style={styles.channelGridRow}>
              {(
                [
                  ['HOST_WIFI', '📶 Host Wi-Fi'],
                  ['JOIN_WIFI', '📶 Join Wi-Fi'],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => store.setSelectedChannel(key)}
                  style={[
                    styles.channelTile,
                    store.selectedChannel === key && styles.channelTileSelected,
                  ]}>
                  <Text style={styles.packEndonym}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Bluetooth</Text>
            <View style={styles.channelGridRow}>
              {(
                [
                  ['HOST_BT', 'ᛒ Host BT'],
                  ['JOIN_BT', 'ᛒ Join BT'],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => store.setSelectedChannel(key)}
                  style={[
                    styles.channelTile,
                    store.selectedChannel === key && styles.channelTileSelected,
                  ]}>
                  <Text style={styles.packEndonym}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.primaryBtn, {marginTop: 18}]}
              onPress={() => store.connectChannel()}>
              <Text style={styles.primaryBtnText}>Connect</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Bottom 5-Tab Navigation Bar */}
      <View style={styles.bottomBar}>
        {(['TALK', 'RADAR', 'ALERT', 'HISTORY', 'SETTINGS'] as const).map(t => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.navTab,
              t === 'ALERT' && styles.navAlertFab,
              tab === t && t !== 'ALERT' && styles.navTabActive,
            ]}>
            <Text
              style={[
                styles.navTabText,
                t === 'ALERT' && {color: '#FFF', fontWeight: '900'},
              ]}>
              {t === 'ALERT' ? '⚠️ Alert' : t}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: C.bgPrimary},
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
  },
  brandTitle: {color: C.accentGreen, fontSize: 20, fontWeight: '900'},
  topRight: {flexDirection: 'row', alignItems: 'center', gap: 10},
  langPill: {
    backgroundColor: C.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.accentGreen,
  },
  langPillText: {color: C.textPrimary, fontSize: 12, fontWeight: '700'},
  profileIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenPad: {flex: 1, padding: 14},
  connectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    gap: 12,
  },
  wifiBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connStatusTitle: {color: C.textPrimary, fontSize: 15, fontWeight: '800'},
  connectBtn: {
    backgroundColor: C.accentGreen,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallOrangeBtn: {
    backgroundColor: C.accentOrangeDeep,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  connectBtnText: {color: '#062219', fontWeight: '800', fontSize: 13},
  quickChip: {
    backgroundColor: C.bgSurface,
    borderColor: C.borderSubtle,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickChipText: {color: C.textPrimary, fontSize: 13, fontWeight: '600'},
  chatBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 14,
    marginVertical: 5,
  },
  chatIn: {alignSelf: 'flex-start', backgroundColor: C.bgSurface},
  chatOut: {alignSelf: 'flex-end', backgroundColor: C.accentGreenDark},
  chatAlert: {backgroundColor: '#7F1D1D', borderColor: C.alertRed, borderWidth: 1},
  chatText: {color: C.textPrimary, fontSize: 15},
  chatSub: {color: C.textSecondary, fontSize: 12, marginTop: 4},
  chatMeta: {color: C.textMuted, fontSize: 10, marginTop: 4, textAlign: 'right'},
  pttContainer: {
    backgroundColor: C.bgSurface,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  pttHint: {color: C.textSecondary, fontSize: 13, marginBottom: 14},
  micCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: C.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircleActive: {backgroundColor: C.accentOrange},
  radarCard: {
    backgroundColor: C.bgSurface,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  sectionLabel: {
    color: C.accentOrange,
    fontSize: 13,
    fontWeight: '800',
    marginVertical: 8,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: C.bgSurface,
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
  },
  segmentBtnActive: {backgroundColor: C.accentGreen},
  segmentText: {color: C.textPrimary, fontWeight: '700', fontSize: 12},
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    marginBottom: 10,
    gap: 12,
  },
  packCardSelected: {borderColor: C.accentGreen, borderWidth: 2},
  glyphBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: {color: C.accentOrange, fontSize: 17, fontWeight: '800'},
  packEndonym: {color: C.textPrimary, fontSize: 15, fontWeight: '700'},
  packMeta: {color: C.textSecondary, fontSize: 12, marginTop: 2},
  cloudIcon: {color: C.accentGreen, fontSize: 14, fontWeight: '800'},
  customAlertBox: {
    backgroundColor: C.bgSurface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: C.bgPrimary,
    color: C.textPrimary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: C.accentGreen,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  orangeActionBtn: {
    backgroundColor: C.accentOrangeDeep,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {color: '#041E15', fontWeight: '900', fontSize: 15},
  onboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  stepIndicator: {color: C.textSecondary, fontSize: 14},
  progressBarRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: C.bgElevated,
    borderRadius: 2,
  },
  progressSegmentActive: {backgroundColor: C.accentGreen},
  onboardBody: {flex: 1, paddingHorizontal: 16},
  onboardH1: {
    color: C.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  onboardSub: {color: C.textSecondary, fontSize: 13, marginBottom: 16},
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: C.bgSurface,
    borderWidth: 2.5,
    borderColor: C.accentGreen,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: C.accentOrange,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {color: C.textSecondary, fontSize: 13, marginBottom: 6},
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: C.bgSurface,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  channelGridRow: {flexDirection: 'row', gap: 10, marginBottom: 10},
  channelTile: {
    flex: 1,
    padding: 18,
    borderRadius: 14,
    backgroundColor: C.bgElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  channelTileSelected: {borderColor: C.accentOrange, borderWidth: 2},
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.borderSubtle,
  },
  navTab: {paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12},
  navTabActive: {backgroundColor: C.bgElevated},
  navAlertFab: {
    backgroundColor: C.accentOrangeDeep,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  navTabText: {color: C.textSecondary, fontSize: 11, fontWeight: '700'},
});
