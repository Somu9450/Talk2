# Talk2 — Reverse-Engineered Multilingual Neural Transceiver (React Native & Node.js Edition)

**Indian Multilingual TTS & STT Aided Neural Transceiver — Radio Access for Low-Bitrate Links**  
*Built from scratch in React Native (TypeScript) + Node.js Backend + Python ONNX Tooling with a comfortable Light-Green (`#34D399`) & Warm-Orange (`#FB923C`) Tactical UI*

---

## 1. What Is Included in `Talk2`

1. **Exact Reverse-Engineered User Flow from Your APK Screenshots & SIH Presentation (`neuromonk Ps01.pdf`)**:
   - **Step 1 of 3 (`Your profile`)**: Operator callsign/name setup, avatar camera picker, and the **"Let app always run in background?"** permission dialog.
   - **Step 2 of 3 (`Choose your languages`)**: All 10 Indic languages (`हिन्दी 78 MB`, `தமிழ் 82 MB`, `বাংলা 80 MB`, `ગુજરાતી 79 MB`, `मराठी 81 MB`, `ಕನ್ನಡ 80 MB`, `മലയാളം 81 MB`, `తెలుగు 80 MB`, `ଓଡ଼ିଆ 79 MB`, `English 45 MB`) with cloud download buttons, SHA-256 verification, and offline caching.
   - **Step 3 of 3 (`Show the app in`)**: Display language selector (`English` / `हिन्दी`).
   - **Talk Screen & `Connect to a channel` Bottom Sheet**: Modal selector for **Wi-Fi Direct (`Host Wi-Fi`, `Join Wi-Fi`)** and **Bluetooth (`Host BT`, `Join BT`)**, quick-chat chips, chat bubbles, and PTT floor dock.
   - **Compass + Gyroscope + GPS + Wi-Fi/BLE + GPT Copilot Radar (`RadarScreen.tsx` & `CompassGyroTracker.ts`)**: Uses magnetometer + gyroscope complementary filtering (`react-native-sensors`) and GPS Haversine bearing (`react-native-geolocation-service`) so the radar dial rotates live with your phone's compass heading (`0°–360° N/NE/E/SE/S/SW/W/NW`) and shows the exact direction and distance of every nearby device, plus an integrated **GPT / Tactical Mesh Copilot**.
   - **Alert Screen**: `All | Wi-Fi | Bluetooth` broadcast channel selector, the 5 one-tap Quick Alerts (`Emergency SOS`, `Medical Help`, `Evacuate Now`, `Hold Position`, `All Clear`), and the `Type | Speak` custom message composer with quick-tag pills (`Need Water & Food`, `Road Blocked`, `Injured Person`).

---

## 2. How to Host All 41 ONNX & Vocab Assets in Your GitHub Repo or Google Drive and Connect Them to the APK

All 41 assets from `model-pack-v1` (with their exact SHA-256 hashes and byte sizes) are registered in **`src/core/pack/ModelAssetManifest.ts`** and **`backend/src/modelManifest.json`**.

### Option A: Host on Your Own GitHub Repository Releases (Recommended — Fast, Free, Unlimited Bandwidth)

GitHub normal commits block files over 100 MB, **but GitHub Releases allow files up to 2 GB each** (your largest ONNX file is `377 MB`).

1. **Download the 41 assets** from the original release (`model-pack-v1`) into a folder on your PC (e.g., `D:\model-pack-assets\`).
2. **Create a Release in Your Own GitHub Repo**:
   - Install [GitHub CLI](https://cli.github.com/) (`winget install GitHub.cli`) and run:
     ```powershell
     gh auth login
     gh release create model-pack-v1 D:\model-pack-assets\*.onnx D:\model-pack-assets\*.json --repo <YOUR_GITHUB_USERNAME>/Talk2 --title "Talk2 Model Pack v1"
     ```
   - Or on the GitHub website: Go to your repo **`https://github.com/<YOUR_GITHUB_USERNAME>/Talk2`** ➔ click **Releases** (right sidebar) ➔ **Draft a new release** ➔ type tag **`model-pack-v1`** ➔ drag and drop all 41 `.onnx` and `.json` files into the attachments box ➔ click **Publish release**.
3. **Connect Your GitHub Release Link to the Talk2 APK**:
   - Open **`src/core/pack/ModelAssetManifest.ts`** in VS Code and set `githubReleaseBaseUrl`:
     ```ts
     export const DEFAULT_MODEL_HOST_CONFIG: ModelHostConfig = {
       mode: 'GITHUB_RELEASE',
       githubReleaseBaseUrl: 'https://github.com/<YOUR_GITHUB_USERNAME>/Talk2/releases/download/model-pack-v1',
       nodeBackendBaseUrl: 'http://10.0.2.2:8080/models',
       googleDriveFileMap: {},
     };
     ```
   - You can also paste or change this URL live inside the app under **Settings ➔ GitHub Release / Google Drive Model Host Link** without rebuilding the APK!

### Option B: Host on Google Drive and Connect to the Talk2 APK

1. Upload the `.onnx` and `-vocab.json` files to a folder in your **Google Drive**.
2. Right-click each file (or the folder) ➔ **Share** ➔ change General Access to **Anyone with the link (Viewer)**.
3. Copy the File ID from each Google Drive share link (for `https://drive.google.com/file/d/1wvzTOUYhF_iaT6VPFYv1XlYWl5VviMEQ/view`, the File ID is `1wvzTOUYhF_iaT6VPFYv1XlYWl5VviMEQ`).
4. Open **`src/core/pack/ModelAssetManifest.ts`** and paste your File IDs into `googleDriveFileMap` with `mode: 'GOOGLE_DRIVE'`:
   ```ts
   export const DEFAULT_MODEL_HOST_CONFIG: ModelHostConfig = {
     mode: 'GOOGLE_DRIVE',
     githubReleaseBaseUrl: '',
     nodeBackendBaseUrl: '',
     googleDriveFileMap: {
       'indicwav2vec-ta-int8.onnx': 'YOUR_DRIVE_FILE_ID_1',
       'indicwav2vec-ta-vocab.json': 'YOUR_DRIVE_FILE_ID_2',
       'vits-ta-int8.onnx': 'YOUR_DRIVE_FILE_ID_3',
       'vits-ta-vocab.json': 'YOUR_DRIVE_FILE_ID_4',
     },
   };
   ```
   - `resolveAssetDownloadUrl()` automatically formats Google Drive links as `https://drive.usercontent.google.com/download?id=<FILE_ID>&export=download&confirm=t` so large `.onnx` files bypass Google Drive's virus-scan warning page and download straight into the APK's internal storage (`RNFS.DocumentDirectoryPath/models/`).

### Option C: Host on the Included Node.js Backend (`backend/src/server.js`)

1. Drop any `.onnx` and `.json` files into **`Talk2/model-host/`**.
2. Start the Node.js server:
   ```powershell
   cd backend
   npm start
   ```
3. Any file present in `model-host/` is served directly from `http://<YOUR_LAPTOP_LAN_IP>:8080/models/<filename>` with an `X-Model-SHA256` verification header, and any missing file automatically redirects (`HTTP 302`) to the GitHub Release URL!

---

## 3. How to Install & Launch `Talk2` (Zero-Error Setup)

### Fastest Way to See & Use `Talk2` on Your Screen (5 Seconds)
1. Open the **`Talk2`** folder in **VS Code** or **Antigravity IDE**.
2. Double-click **`preview.html`** in File Explorer (or run `node backend/src/server.js` and open **`http://localhost:8080`**).
3. Click **"✨ Preview 3-Step Onboarding"** at the top to step through the exact APK setup screens, or test **Talk, Connect Sheet, Compass/Gyro Radar, and Emergency Alerts** in the new Light-Green & Warm-Orange UI.

### Full React Native Android Build
```powershell
cd Talk2
npm install --legacy-peer-deps
npx react-native run-android
```
