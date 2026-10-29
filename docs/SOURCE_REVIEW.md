# Source review and migration decisions

Inputs: the uploaded main, Tarun, i18n, map-6, profile, translation, dark/light, and pack-readiness/Marathi branches; `neuromonk Ps01.pdf`; the screenshot set in the request; and the public repository/release links. `source-inventory.json` records branch file counts and document hashes for reproducibility.

The presentation describes the intended low-bitrate offline pipeline: speech → text → encryption → local radio → decryption → speech. References include Vosk, sherpa-onnx and AI4Bharat. The inspected source's actual shipping direction differs: Vosk was dropped; ONNX CTC and MMS/VITS are used. The Android application is Compose/native, despite some older READMEs claiming no UI. The user referred to it as Flutter, but the uploaded implementation is not a Flutter project.

The current branch's agent/project notes warn that several documents are stale. Some marketing/readme tables claim tested subsecond latency, tiny resident RAM and full translation. The measurements/project notes explain that no corresponding target-device measurements are available. Talk2 therefore does not repeat those claims as proven.

The source's official language registry contains ten languages with Hindi/Tamil/Bengali wire codes 1/2/3. One active language is used for speaking and listening. UI language is separate. Translation occurs on receive and is skipped when source equals target. Quick alert templates are localized independently of neural translation. These product rules inform Talk2.

The original model host uses a flat release URL scheme and separates speech from shared translation files. The 39 public release assets include nine sets of four speech files and three translation files. Hindi is excluded. The branch ZIPs contain vocabularies and export code but no ONNX weights. The built-in Talk2 manifest was regenerated from release metadata, retaining exact bytes/checksums rather than screenshot sizes.

The latest branch adds a Unicode-block transliteration helper, while nearby documentation still describes Hindi/Marathi-only translation. Plain Unicode offsets do not provide a validated replacement for IndicTrans's preprocessing across all scripts. Talk2 conservatively enables its supplied dual-vocab/BPE ONNX translator for Hindi/Marathi; all other free-text cross-language pairs return an explicit error. Completing reliable translation requires model-specific preprocessing/tokenizer parity and bilingual evaluation; English pairs also need appropriate separate model families.

The source's STT exporter lists Hindi and several other checkpoint IDs as missing (`None`). A bundled Hindi vocabulary cannot recover an acoustic model's weights or reliably identify its checkpoint. The adapted exporter retains that gap instead of silently inventing a source checkpoint.

Talk2 is a new React Native UI and Java implementation; it does not copy the old Android source tree. The protocol is new and requires Talk2 at both ends. Existing iTantra APKs will not pair with it. Python exporters and localized alert text are adapted from supplied materials with attribution in NOTICE. See STATUS.md for scope and validation limits.

Reference links:

- https://github.com/Sanchit-044/iTantra
- https://github.com/Sanchit-044/iTantra/releases/tag/model-pack-v1
- https://github.com/alphacep/vosk-api
- https://github.com/k2-fsa/sherpa-onnx
- https://github.com/AI4Bharat/IndicTrans2
- https://developer.android.com/develop/connectivity/wifi/wifi-direct
- https://developer.android.com/develop/sensors-and-location/sensors/sensors_position
- https://reactnative.dev/docs/native-modules-android
- https://developers.openai.com/api/reference/resources/responses/methods/create
