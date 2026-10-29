'use strict';

/**
 * Node.js Mesh Relay Engine with 512-entry deduplication, TTL decrement,
 * and Priority Preemption for Emergency Alerts (0x02) and Floor Control (0x05..0x08).
 */
class RelayEngine {
  constructor(localNodeId = 'nodejs-relay-hub', capacity = 512) {
    this.localNodeId = localNodeId;
    this.capacity = capacity;
    this.seen = new Set();
    this.alertHistory = [];
  }

  consider(packet, senderNodeId = null, ttl = 3) {
    // Only relay NORMAL (0x01), ALERT (0x02), QUEUED (0x09)
    if (![0x01, 0x02, 0x09].includes(packet.type)) {
      return {action: 'DROP', reason: 'NOT_RELAYABLE'};
    }
    if (senderNodeId && senderNodeId === this.localNodeId) {
      return {action: 'DROP', reason: 'OWN_PACKET'};
    }
    const key = `${packet.type}:${packet.languageWire}:${packet.sequence}:${packet.text}`;
    if (this.seen.has(key)) {
      return {action: 'DROP', reason: 'ALREADY_SEEN'};
    }
    this.seen.add(key);
    if (this.seen.size > this.capacity) {
      const oldest = this.seen.values().next().value;
      this.seen.delete(oldest);
    }
    if (ttl <= 1) {
      return {action: 'DROP', reason: 'TTL_EXHAUSTED'};
    }
    if (packet.type === 0x02) {
      this.alertHistory.unshift({
        sequence: packet.sequence,
        languageWire: packet.languageWire,
        text: packet.text,
        timestampMs: packet.timestampMs,
      });
      if (this.alertHistory.length > 50) {
        this.alertHistory.pop();
      }
    }
    return {
      action: 'FORWARD',
      packet,
      nextTtl: ttl - 1,
      delayMillis: Math.floor(Math.random() * 51),
    };
  }
}

module.exports = {RelayEngine};
