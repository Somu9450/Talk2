# Implementation and validation status

This is a substantial source migration, not a certified complete production-equivalent replacement for every claim in the old presentation. Read the boundaries below before field use or publication.

## Implemented

React Native navigation/UI, name profile, ten speech-pack options, download management, app language/tab labels with English fallback, system/light/dark themes, Talk transcript review, text queues, ACKs, history filters, predefined/custom/spoken alerts, diagnostics, optional GPT UI and Node backend; Java Wi-Fi Direct TCP and Bluetooth RFCOMM, encrypted pairing with both-operator confirmation, replay protection and heartbeat, PTT floor protocol, 16 kHz microphone capture, ONNX CTC/MMS-VITS adapters, Hindi/Marathi IndicTrans2 adapter, compass/GPS events and explicit GPS sharing.

## Verified in the build environment

- Nine Node logic/backend tests pass.
- TypeScript checks pass.
- Production Android JavaScript bundling through Metro passes.
- Standalone Java crypto tests pass: matching SAS, bidirectional encryption, tamper/replay/reflection/wrong-session rejection.
- Desktop Java model-store tests pass: uninstalled/verified/tampered/removed states, incomplete/duplicate manifest rejection and path traversal rejection. A minimal filesystem Context stub is used; this is not an Android download integration test.
- Upstream release asset metadata was retrieved: 39 files, nine complete speech packs plus the three shared translation files, no Hindi weights.

The first implementation session also downloaded and verified the real English TTS asset SHA-256 and ran CPU ONNX inference on desktop: INT64 `text` input, output shape `(1, 30976)` for the test utterance, finite output and peak amplitude about 0.863. This validates that export's signature and basic output, not pronunciation quality or Android-device inference. That temporary model/audio is not distributed in the source package.

Native Android compilation and packaging succeeded. The included standalone ARM64 test APK passed APK signature verification; the release AAB is unsigned. Details are in `BUILD_RESULT.md`. No two-phone test has been performed in this environment.

## Remaining limitations

| Area | Boundary |
|---|---|
| General translation | Hindi/Marathi adapter implemented; no validated all-ten-language free-text translator. Other pairs error and preserve original text. |
| Hindi | Not present in upstream release; user must supply four matched files. Hindi STT checkpoint provenance is missing from the upstream export registry. |
| Speech quality | Real weights need target-device testing, WER/CER and bilingual review. Greedy CTC is used; this is not the upstream beam-search implementation. Number/abbreviation normalization is not complete; unsupported voice characters produce an error rather than silently dropping words. |
| Language ID | Script heuristic after STT, restricted to installed packs; not neural acoustic language identification. Hindi/Marathi ambiguity retains the active choice. |
| Transport | One paired peer; explicit radio selection/reconnection. No BLE GATT, mesh, multipath or seamless handoff. |
| Background | Foreground app is required. No persistent foreground service, locked-screen PTT, power-button SOS or background model-download service. |
| Alerts | Audible notification tone and localized speech at current user volume; no forced maximum-volume siren, emergency-service contact or guarantee of delivery. Alert tone is immediate; speech is serialized with inference. |
| Profile/UI | Name and initials; no avatar camera/gallery integration. Core tab labels are localized; supporting UI uses English fallback. |
| Queues | Explicit retry to current paired peer; no automatic send to a newly paired person. ACK indicates persisted text, not read/spoken. |
| Memory/performance | No proven 2 GB-phone, subsecond-latency or low-CPU guarantee. Sessions close after operations but large models still require evaluation. |
| Data at rest | App-private local state, backup disabled; no additional application-layer encryption for history. |
| Platforms | Android implementation. No iOS radio/sensor/native target is included. |

`DEVICE_TESTS.md` lists the required physical-device acceptance checks. These limits are intentionally visible rather than masked by fake data, placeholder success messages or unsupported claims.
