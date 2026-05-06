const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');

describe('Routes — Lyric', () => {
  let app;
  let mockNetease;
  let mockCache;
  let cacheStore;

  beforeEach(() => {
    cacheStore = {};

    mockNetease = {
      getLyric: async (id) => {
        if (id === 'synced-song') {
          return {
            lrc: { lyric: '[00:01.00]第一行歌词\n[00:05.00]第二行歌词\n[00:10.00]第三行歌词' },
            tlyric: { lyric: '[00:01.00]First line\n[00:05.00]Second line' },
          };
        }
        if (id === 'plain-song') {
          return {
            lrc: { lyric: '纯文本歌词行1\n纯文本歌词行2' },
          };
        }
        if (id === 'no-lyric') {
          return { nolyric: true };
        }
        if (id === 'error-song') {
          throw new Error('API failure');
        }
        return null;
      },
    };

    mockCache = {
      get: (key) => cacheStore[key] || undefined,
      set: (key, value, ttl) => { cacheStore[key] = value; },
    };

    const lyricFactory = require('../../server/routes/lyric');
    app = express();
    app.use('/api/lyric', lyricFactory(mockNetease, mockCache));
  });

  it('returns synced lyrics for a song', async () => {
    const res = await request(app).get('/api/lyric?id=synced-song');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.lyricType, 'synced');
    assert.ok(res.body.data.lyric.includes('[00:01.00]'));
    assert.ok(res.body.data.tlyric.includes('First line'));
  });

  it('returns plain lyrics for a song without timestamps', async () => {
    const res = await request(app).get('/api/lyric?id=plain-song');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.lyricType, 'plain');
  });

  it('returns 404 when no lyrics available', async () => {
    const res = await request(app).get('/api/lyric?id=no-lyric');
    assert.strictEqual(res.body.code, 404);
  });

  it('returns 400 when id is missing', async () => {
    const res = await request(app).get('/api/lyric');
    assert.strictEqual(res.status, 400);
  });

  it('returns from cache on second request', async () => {
    await request(app).get('/api/lyric?id=synced-song');
    // Override mock to verify cache is used (mock returns null on second call)
    mockNetease.getLyric = async () => { throw new Error('should not be called'); };
    const res = await request(app).get('/api/lyric?id=synced-song');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.lyricType, 'synced');
  });

  it('returns 500 on API error', async () => {
    const res = await request(app).get('/api/lyric?id=error-song');
    assert.strictEqual(res.status, 500);
  });
});
