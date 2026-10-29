'use strict';

const assert = require('assert');
const crypto = require('crypto');
const {
  AesGcmSessionCrypto,
  encodePacket,
  decodeFrameBody,
} = require('../src/protocol/packetCodec');
const {RelayEngine} = require('../src/relay/relayEngine');
const {createAppServer} = require('../src/server');

async function runTests() {
  console.log('1. Testing AES-256-GCM AEAD PacketCodec round-trip & AAD anti-tampering...');
  const key = crypto.randomBytes(32);
  const senderCrypto = new AesGcmSessionCrypto(key);
  const receiverCrypto = new AesGcmSessionCrypto(key);

  const frame = encodePacket(
    {
      type: 0x02, // ALERT
      languageWire: 0x01, // Hindi
      flags: 0x01,
      sequence: 42,
      timestampMs: 1730000000000,
      payload: 'tpl:emergency',
    },
    senderCrypto,
  );

  const body = frame.subarray(4);
  const decoded = decodeFrameBody(body, receiverCrypto);
  assert.strictEqual(decoded.type, 0x02);
  assert.strictEqual(decoded.languageWire, 0x01);
  assert.strictEqual(decoded.sequence, 42);
  assert.strictEqual(decoded.text, 'tpl:emergency');

  // Verify AAD header tampering fails closed
  const tamperedBody = Buffer.from(body);
  tamperedBody[1] = 0x01; // Flip ALERT to NORMAL in header
  assert.throws(() => {
    decodeFrameBody(tamperedBody, receiverCrypto);
  }, /Unsupported state or unable to authenticate data/);

  console.log('2. Testing RelayEngine deduplication & TTL decrement...');
  const relay = new RelayEngine('node-1');
  const first = relay.consider(decoded, 'peer-A', 3);
  assert.strictEqual(first.action, 'FORWARD');
  assert.strictEqual(first.nextTtl, 2);

  const duplicate = relay.consider(decoded, 'peer-B', 3);
  assert.strictEqual(duplicate.action, 'DROP');
  assert.strictEqual(duplicate.reason, 'ALREADY_SEEN');

  console.log('3. Testing Node.js HTTP Model Host & Health API...');
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const healthRes = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
  const healthJson = await healthRes.json();
  assert.strictEqual(healthJson.version, '3.0.0');
  assert.strictEqual(healthJson.supportedLanguages.length, 10);

  const packsRes = await fetch(`http://127.0.0.1:${port}/api/v1/packs`);
  const packsJson = await packsRes.json();
  assert.ok(packsJson.packs.length >= 20, 'Expected at least 20 vocab JSON files in model-host');

  server.close();
  console.log('✅ All PayFree V 3.0 Node.js Backend & Wire Protocol tests passed!');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
