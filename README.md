# Talk2

React Native Android communication app with Java device integrations and an optional Node.js backend. Sage green, warm orange, comfortable cards and clear status messages.

**Read [docs/STATUS.md](docs/STATUS.md) before treating this as a production-ready app.** This source package is a working implementation to build and validate, not a claim of verified ten-language translation or tested radio behavior on physical phones. Model weights are downloaded separately.

## What is included

- React Native/TypeScript interface: onboarding, profile name, speech packs, Talk, Radar, Alerts, History, Settings, diagnostics and optional GPT.
- Java Android integrations: Wi-Fi Direct TCP, Bluetooth Classic RFCOMM, P-256 pairing, HKDF-SHA256, directional AES-256-GCM, replay protection, microphone capture, CPU ONNX inference, audio playback, compass/rotation-vector sensors and GPS.
- Ten speech-pack choices: Hindi, Tamil, Bengali, Gujarati, Marathi, Kannada, Malayalam, Telugu, Odia and English.
- Verified download metadata for the public upstream release; resumable HTTPS downloads with exact size and SHA-256 checks. The upstream release excludes Hindi weights.
- One active speech language per phone. Incoming speech is translated on receive; same-language messages skip translation. General offline translation is conservatively gated to Hindi/Marathi.
- Five localized alerts in all ten languages, custom typed/spoken alerts, transcript review, half-duplex microphone floor requests, persisted 30-day text history, delivery ACKs and manual queued-message retry.
- GPS-based peer bearings relative to compass heading. Radio discovery without coordinates is listed separately. GPS sharing is an explicit switch.
- Node.js service for health, model manifest and authenticated optional GPT requests. The offline radio/speech path does not need this server.

## Downloaded binaries

This archive includes `dist/Talk2-arm64-test.apk` (standalone, test-signed) and `dist/Talk2-arm64-unsigned.aab` (requires your own release signing key). They were built successfully and checked for archive integrity, embedded JS/native files and APK signature. They have not been run on physical phones here. See [docs/BUILD_RESULT.md](docs/BUILD_RESULT.md) and [dist/README.md](dist/README.md).

## Quick start

Install Node.js 22, JDK 17 and Android Studio with Android SDK Platform 35, Build Tools 35.0.0 and NDK 26.1.10909125. Set `ANDROID_HOME` and `JAVA_HOME` normally for your machine.

From this directory:

```sh
npm ci
npm run check
npm start
```

In a second terminal:

```sh
npm run android
```

For a standalone debug APK that does not depend on Metro, use the `standalone` Android build type described in [docs/BUILD.md](docs/BUILD.md). Ordinary debug builds use Metro during development.

The checked-in Gradle wrapper downloads Gradle 8.13 and verifies its checksum. Android Studio can also open `mobile/android`.

## Models

Leave the manifest URL blank to use the built-in upstream release. Open Settings → Language packs, download a pack and choose **Use language**. English menus require no English speech model. No language is falsely reported installed before its files pass verification.

Hindi is selected initially to match the original flow, but its weights are not in the upstream release. Supply its four files through your own manifest or select another downloaded language. The full GitHub Releases and Google Drive guidance is in [docs/MODEL_HOSTING.md](docs/MODEL_HOSTING.md).

## Two-phone usage

1. Install Talk2 on both Android phones, keep the apps open, and enable Wi-Fi or Bluetooth.
2. Tap Connect. Choose Host Wi-Fi on one phone and Scan/Join Wi-Fi on the other, or Host Bluetooth and Scan/Join Bluetooth. Android may request Bluetooth pairing or discoverability.
3. Compare the six-digit code on both phones; confirm only if they match. Both confirmations are required.
4. Hold the microphone button, release to transcribe, review the text, and tap Send. Text can also be typed. Without a connection, Save for later stores text locally.
5. Pending/queued messages have an explicit **Retry to paired peer** action. Receiving a queued message stores it without automatic speech. The receiver can tap Play.
6. For radar, start GPS/compass and enable location sharing on both phones. Keep the phone flat. Coordinates older than 15 seconds stop producing a marker. Distance uncertainty reflects both GPS fixes.

## Optional Node.js GPT backend

```sh
cp server/.env.example server/.env
# Edit .env: set a random access token, your OpenAI API key and a model available to your account.
npm run server
```

Expose the service behind HTTPS. Set its HTTPS URL in mobile Settings. Enter the server access token in Ask GPT. Only explicitly submitted text goes online. API keys remain on the server. See [docs/BACKEND.md](docs/BACKEND.md).

## Structure

| Directory | Purpose |
|---|---|
| `mobile/` | React Native UI and Java Android app |
| `shared/` | Language registry, alerts, radar and message rules |
| `server/` | Optional Node.js HTTP service |
| `model-host/` | Verified upstream model manifest |
| `scripts/` | Model inspection, export and manifest generation |
| `tests/` | Core/backend and standalone Java crypto checks |
| `docs/` | Build, hosting, architecture, source review and validation status |

No `.kt` or `.kts` source files are included in this project's ZIP. Native integrations are Java and Gradle files use Groovy. React Native's third-party dependencies and build tooling can internally contain Kotlin; they are installed by npm/Gradle and are not copied into this repository. Do not commit `node_modules` or build outputs.
