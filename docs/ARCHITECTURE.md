# Talk2 architecture

React Native owns navigation, settings, text queues and transcript review. Java owns Android radios, crypto, model storage, inference, microphone, speaker and sensors. Node.js is optional and handles explicitly online GPT requests and manifest serving.

## Voice path

Sender: hold PTT → obtain floor if paired → 16 kHz PCM capture → release → normalized Wav2Vec2/IndicWav2Vec ONNX CTC decode → script refinement restricted to installed languages → review transcript → encrypt original text and source language → send.

Receiver: decrypt/authenticate → validate envelope → persist text → ACK → if live, translate only when source and active language differ → synthesize through the target MMS/VITS ONNX voice → play. Queued messages are stored without automatic playback. The user chooses Play.

Sessions are serialized in one inference executor and closed after each operation, avoiding simultaneous residency of all speech models. Translation holds an encoder and decoder during its own operation. This does not establish a measured low-RAM guarantee; hundreds-of-MB models can require much more runtime RAM than their on-disk weight size. Start testing on a capable ARM64 phone.

## Radios

Wi-Fi Direct establishes a group and carries a TCP stream on port 47773. Bluetooth Classic uses secure RFCOMM with service UUID `3218ca90-2a22-4c40-bb66-9b15c5558210`. Both use the same Talk2 protocol. Discovery can scan both, but there is one active peer/session and one transport at a time. Transport switching requires explicit reconnection and pairing. There is no BLE GATT transport, mesh relay or automatic multipath handoff in this implementation.

## Wire/security

Talk2 uses its own protocol and requires Talk2 at both ends. The handshake exchanges magic `0x54325031`, length-prefixed X.509 P-256 public keys and derives keys through ECDH/HKDF-SHA256. The public-key transcript is hashed in stable sorted order. Independent directional encryption keys prevent reflected frames from authenticating in the reverse direction.

Operators compare a six-digit short authentication string and confirm on both phones before application content is accepted. AES-256-GCM authenticates each encrypted UTF-8 JSON envelope with the handshake transcript as AAD. A frame carries a 12-byte nonce followed by ciphertext and a 16-byte tag. Nonces contain a random four-byte prefix and a monotonic eight-byte counter. The receiver validates the session prefix and high-water mark after tag verification. Frames are bounded in size. Fresh ECDH keys are generated for every connection. A heartbeat detects an unresponsive confirmed peer.

ACKs mean the receiver persisted the text. They do not mean it played successfully or was read. Retries preserve message IDs and suppress duplicate incoming history entries within the retained history window. Queue/history retention is capped at 500 messages and 30 days. If a user explicitly clears history, its duplicate records are cleared too. There is no exactly-once delivery guarantee across history deletion or storage corruption.

History/settings use Android private SharedPreferences with Android backup disabled. They are not separately application-encrypted at rest. Phone storage encryption and the device lock remain relevant. Audio capture remains in memory and is not transmitted or saved as a recording. API keys are never stored in the APK.

## Floor control

Paired PTT sends a floor request and waits up to five seconds for grant/deny. Simultaneous requests use device-ID ordering as a tie-break. Releasing PTT releases the floor after recognition; transcript review and sending are separate UI actions. Offline PTT skips remote floor acquisition. This is a transcript-review messaging mode, not continuous voice calling.

## Radar

Android's rotation-vector sensor fuses available orientation sensors, typically including accelerometer, gyroscope and magnetometer. GPS plus geomagnetic declination converts magnetic heading to true heading when a fix is available. A peer sends coordinates only when its user enables sharing; if sharing is already enabled, pairing starts GPS and publishes the latest fix immediately. Haversine distance and geodesic initial bearing are rotated by the local heading. Fixes older than 15 seconds are excluded. Accuracy is shown as combined GPS uncertainty. When fresh fixes place peers within 20 metres, each phone sounds an optional local alarm. Radio RSSI is not treated as a direction sensor.

Discovery advertises and queries the Talk2 Bluetooth RFCOMM UUID and Wi-Fi Direct DNS-SD service instead of displaying arbitrary nearby Bluetooth or Wi-Fi devices. A phone must have Talk2's service advertisement active to appear in the filtered list.

## Optional online path

Settings → Ask GPT posts only the entered text to the configured HTTPS Node service. The service checks a bearer token, applies body/length/rate limits, calls OpenAI's Responses API using a server-side key, and returns text. This flow is separate from offline messaging and cannot directly operate radios or disclose GPS.
