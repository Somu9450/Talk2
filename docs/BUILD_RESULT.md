# Observed build result

Prepared 30 October 2026 (Asia/Kolkata).

**Successful native Android build:**

```sh
./gradlew :app:assembleStandalone :app:bundleRelease -PreactNativeArchitectures=arm64-v8a
```

The final run completed with `BUILD SUCCESSFUL` and 108 actionable tasks (12 executed, 96 up to date). Native Java compilation, Android resource/manifest processing, Metro bundling, Hermes bytecode generation, DEX generation and packaging completed.

Included binaries:

| File | Bytes | Result |
|---|---:|---|
| `dist/Talk2-arm64-test.apk` | 33713796 | Standalone test-signed APK; APK Signature Scheme v2 verification passed |
| `dist/Talk2-arm64-unsigned.aab` | 20681521 | Unsigned release App Bundle; requires your signing key |

Both archives were checked for ZIP integrity, contain only ARM64 native libraries, and include their compiled `index.android.bundle` assets. The APK has one test signer. The AAB contains no signing-certificate block. Hashes are in `dist/SHA256SUMS.txt`.

Additional checks:

- Nine Node core/backend tests passed.
- TypeScript compilation checks passed.
- Metro production bundling passed.
- Standalone Java crypto tests passed (SAS, both directions, replay, reflection, tamper, wrong session).
- Java model-store integrity tests passed (verified/incomplete/tampered/removed packs, duplicates, path traversal).
- Python export/inspection scripts passed syntax compilation; replacement Hindi model export was not executed.
- The source archive contains no `.kt` or `.kts` files and excludes installed third-party dependencies, build caches and keystores.

**Not performed:** physical-device installation, two-phone radio/permission testing, on-device model quality/performance testing, or complete visual UI verification. Desktop browser visual capture was unavailable under the execution environment's process restrictions. Do not equate the successful build with production readiness. Follow `STATUS.md` and `DEVICE_TESTS.md`.
