const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const { Cache } = require('../../server/services/cache');

describe('Cache', () => {
  let cache;

  beforeEach(() => {
    cache = new Cache();
  });

  describe('set and get', () => {
    it('stores and retrieves a value', () => {
      cache.set('key1', 'value1');
      assert.strictEqual(cache.get('key1'), 'value1');
    });

    it('returns undefined for missing key', () => {
      assert.strictEqual(cache.get('missing'), undefined);
    });

    it('returns undefined for expired key', () => {
      cache.set('key1', 'value1', 1000);
      // Simulate expiration by setting Date.now into the future
      const origNow = Date.now;
      Date.now = () => origNow() + 2000;
      assert.strictEqual(cache.get('key1'), undefined);
      Date.now = origNow;
    });

    it('keeps key with ttlMs=0 forever', () => {
      cache.set('key1', 'value1', 0);
      const origNow = Date.now;
      Date.now = () => origNow() + 999999999;
      assert.strictEqual(cache.get('key1'), 'value1');
      Date.now = origNow;
    });
  });

  describe('has', () => {
    it('returns true for existing key', () => {
      cache.set('a', 1);
      assert.strictEqual(cache.has('a'), true);
    });

    it('returns false for missing key', () => {
      assert.strictEqual(cache.has('nope'), false);
    });
  });

  describe('delete', () => {
    it('removes a key', () => {
      cache.set('a', 1);
      cache.delete('a');
      assert.strictEqual(cache.has('a'), false);
    });
  });

  describe('clear', () => {
    it('removes all keys', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      assert.strictEqual(cache.size, 0);
    });
  });

  describe('size', () => {
    it('reflects number of entries', () => {
      assert.strictEqual(cache.size, 0);
      cache.set('a', 1);
      assert.strictEqual(cache.size, 1);
    });
  });

  describe('setPlayUrl / getPlayUrl', () => {
    it('prefixes key with play:', () => {
      cache.setPlayUrl('123', { url: 'test' });
      assert.deepStrictEqual(cache.getPlayUrl('123'), { url: 'test' });
      assert.deepStrictEqual(cache.get('play:123'), { url: 'test' });
    });

    it('accepts custom TTL', () => {
      cache.setPlayUrl('123', { url: 'short' }, 20 * 60 * 1000);
      assert.ok(cache.getPlayUrl('123'));
    });
  });

  describe('setSongDetail / getSongDetail', () => {
    it('prefixes key with detail:', () => {
      cache.setSongDetail('456', { name: 'test' });
      assert.deepStrictEqual(cache.getSongDetail('456'), { name: 'test' });
    });
  });
});
