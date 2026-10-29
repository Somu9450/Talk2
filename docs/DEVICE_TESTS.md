# Physical-device acceptance checklist

Run on two real Android phones. Record OS versions, models, installed packs and release URLs. Do not declare production readiness until these checks pass on target hardware.

| Check | Expected result |
|---|---|
| Fresh install/profile | No false installed packs; setup persists on restart |
| Permissions denied | Clear actionable error, no fake connection or recording |
| Download/restart/resume | Interrupted file resumes; no ready marker for partial files |
| Tampered weight/vocab | Checksum failure; pack cannot be activated as verified |
| All ten pack rows | Correct native/English names; Hindi download needs a supplied manifest |
| Model signature | STT outputs matching vocab dimension; MMS TTS input is INT64 text |
| Same-language speech | Recognized text reviewed; peer speaks using its active pack |
| Hindi/Marathi translation | Compare output against bilingual references; wrong/missing pack errors preserve original |
| Unsupported language pair | Clear error; source-language text never sent to a wrong target voice |
| Wi-Fi Direct | Host/join, matching SAS on both phones, messages and ACKs |
| Bluetooth RFCOMM | Discoverable host, Android pairing where prompted, join and matching SAS |
| Wrong SAS/cancel | Disconnect; no application messages accepted |
| Simultaneous PTT | One obtains floor; the other gets busy/retry |
| Link loss | Disconnected status; retained pending messages; manual retry after repairing |
| Offline queue | Text persists; explicit retry sends to paired peer; no automatic queued TTS |
| Duplicate retry | One incoming history item; receiver re-ACKs |
| Alerts | No offline queue; confirmation before send; receiver tone, message and localized speech if pack present |
| History | In/out/status filters; clear confirmation; capacity/TTL behavior |
| GPS sharing off | No coordinates transmitted by that phone |
| Radar outdoors | Phone rotation moves peer-relative marker; stale GPS hides it; accuracy visible |
| GPS unavailable/indoors | No invented peer bearing; clear waiting/unavailable state |
| Background/return | Capture and sensors stop; resume explicitly; validate OEM behavior |
| GPT disabled/offline | Core radio/text path remains independent; GPT reports connection/configuration error |
| GPT configured | Token checked; only submitted prompt goes to backend; key absent from app bundle |
| Reopen app | Settings/history persist, no false active session |

Measure real memory, battery, STT WER/CER, inference RTF and latency separately. The diagnostics screen reports only values it can observe; it does not manufacture speech accuracy or CPU percentages.

Known production work includes foreground-service/background lifecycle support, complete validated translation/preprocessing, robust reconnect across OEM Wi-Fi implementations, multilingual UI completion, target-device benchmarking and release hardening. See STATUS.md.
