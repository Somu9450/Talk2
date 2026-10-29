'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  LANGUAGES_BY_WIRE,
  AesGcmSessionCrypto,
  encodePacket,
  decodeFrameBody,
} = require('./protocol/packetCodec');
const {RelayEngine} = require('./relay/relayEngine');
const MODEL_MANIFEST = require('./modelManifest.json');

const MODEL_HOST_DIR = path.resolve(__dirname, '../../model-host');
const relayEngine = new RelayEngine('talk2-node-backend');
const telemetrySnapshots = [];

function createAppServer() {
  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // 0. Interactive Talk2 Simulator UI at http://localhost:8080/
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/preview')) {
      const previewPath = path.resolve(__dirname, '../../preview.html');
      if (fs.existsSync(previewPath)) {
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        return res.end(fs.readFileSync(previewPath));
      }
    }

    // 1. Health & Manifest Summary
    if (req.method === 'GET' && url.pathname === '/api/v1/health') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      return res.end(
        JSON.stringify({
          service: 'Talk2 Node.js Backend & Model Pack Host',
          version: '3.0.0',
          supportedLanguages: Object.values(LANGUAGES_BY_WIRE),
          modelPackV1AssetCount: MODEL_MANIFEST.length,
          seenRelayPackets: relayEngine.seen.size,
        }),
      );
    }

    // 2. Full 41-Asset Manifest (`model-pack-v1`) with SHA-256 & Download Links
    if (req.method === 'GET' && url.pathname === '/api/v1/packs') {
      const githubBase =
        process.env.GITHUB_RELEASE_BASE_URL ||
        'https://github.com/Sanchit-044/iTantra/releases/download/model-pack-v1';
      const packs = MODEL_MANIFEST.map(asset => {
        const localFile = path.join(MODEL_HOST_DIR, asset.name);
        const presentLocally = fs.existsSync(localFile);
        return {
          ...asset,
          presentLocally,
          downloadUrl: presentLocally
            ? `/models/${asset.name}`
            : `${githubBase}/${asset.name}`,
        };
      });
      res.writeHead(200, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({packs}));
    }

    // 3. Serve Local Model / Vocab or Redirect to GitHub Release / Google Drive
    if (req.method === 'GET' && url.pathname.startsWith('/models/')) {
      const filename = path.basename(url.pathname);
      const filePath = path.join(MODEL_HOST_DIR, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        const sha256 = crypto.createHash('sha256').update(content).digest('hex');
        res.writeHead(200, {
          'Content-Type': filename.endsWith('.json')
            ? 'application/json'
            : 'application/octet-stream',
          'Content-Length': content.length,
          'X-Model-SHA256': sha256,
        });
        return res.end(content);
      }
      // Redirect seamlessly to GitHub Release asset if not stored locally
      const githubBase =
        process.env.GITHUB_RELEASE_BASE_URL ||
        'https://github.com/Sanchit-044/iTantra/releases/download/model-pack-v1';
      res.writeHead(302, {Location: `${githubBase}/${filename}`});
      return res.end();
    }

    // 4. Mesh Relay Packet Submission (`POST /api/v1/relay`)
    if (req.method === 'POST' && url.pathname === '/api/v1/relay') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const decision = relayEngine.consider(
            {
              type: data.type ?? 0x01,
              languageWire: data.languageWire ?? 0x01,
              sequence: data.sequence ?? 1,
              text: data.text ?? '',
              timestampMs: data.timestampMs ?? Date.now(),
            },
            data.senderNodeId,
            data.ttl ?? 3,
          );
          res.writeHead(200, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify(decision));
        } catch (err) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({error: err.message}));
        }
      });
      return;
    }

    // 5. Diagnostics & WER Telemetry
    if (url.pathname === '/api/v1/diagnostics') {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', () => {
          const snap = JSON.parse(body || '{}');
          telemetrySnapshots.push({...snap, receivedAtMs: Date.now()});
          res.writeHead(201, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({status: 'recorded', count: telemetrySnapshots.length}));
        });
        return;
      }
      res.writeHead(200, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({snapshots: telemetrySnapshots}));
    }

    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Not Found'}));
  });
}

if (require.main === module) {
  const port = process.env.PORT || 8080;
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`Talk2 Node.js Backend listening on http://0.0.0.0:${port}`);
  });
}

module.exports = {createAppServer, AesGcmSessionCrypto, encodePacket, decodeFrameBody};
