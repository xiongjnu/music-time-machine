const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');

describe('Routes — Play', () => {
  let app;
  let mockNetease;
  let mockCache;
  let cacheHit = null;

  beforeEach(() => {
    cacheHit = null;

    mockNetease = {
      getPlayUrl: async (id) => {
        if (id === 'vip-song') {
          return { data: [{ url: 'https://vip.example.com/song.mp3', freeTrialInfo: { start: 0, end: 60 }, br: 320 }] };
        }
        if (id === 'no-url') {
          return { data: [{ url: null }] };
        }
        return { data: [{ url: `https://music.163.com/${id}.mp3`, freeTrialInfo: null, br: 128 }] };
      },
    };

    mockCache = {
      getPlayUrl: () => (cacheHit),
      setPlayUrl: () => {},
    };

    const playFactory = require('../../server/routes/play');
    app = express();
    app.use('/api/play', playFactory(mockNetease, mockCache));
  });

  it('returns netease URL for normal song', async () => {
    const res = await request(app).get('/api/play/url?id=normal-song');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.source, 'netease');
    assert.strictEqual(res.body.data.isVip, false);
    assert.ok(res.body.data.url);
  });

  it('returns VIP URL for VIP song', async () => {
    const res = await request(app).get('/api/play/url?id=vip-song');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.source, 'netease');
    assert.strictEqual(res.body.data.isVip, true);
  });

  it('returns 404 when netease has no URL', async () => {
    const res = await request(app).get('/api/play/url?id=no-url');
    assert.strictEqual(res.body.code, 404);
  });

  it('returns 400 when id is missing', async () => {
    const res = await request(app).get('/api/play/url');
    assert.strictEqual(res.status, 400);
  });

  it('returns from cache when available', async () => {
    cacheHit = { url: 'cached-url', source: 'cache', isVip: false, br: 0 };
    const res = await request(app).get('/api/play/url?id=cached-song');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.source, 'cache');
  });
});
