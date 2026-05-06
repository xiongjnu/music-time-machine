const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');
const metaRouter = require('../../server/routes/meta');

describe('Routes — Meta', () => {
  let app;

  // Meta router is self-contained, just mount it
  app = express();
  app.use('/api', metaRouter);

  it('GET /api/eras returns 7 eras', async () => {
    const res = await request(app).get('/api/eras');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.code, 200);
    assert.strictEqual(res.body.data.length, 7);
    assert.ok(res.body.data.includes('1970'));
    assert.ok(res.body.data.includes('2000'));
  });

  it('GET /api/regions returns 6 regions including new ones', async () => {
    const res = await request(app).get('/api/regions');
    assert.strictEqual(res.status, 200);
    const ids = res.body.data.map(r => r.id);
    assert.ok(ids.includes('western'));
    assert.ok(ids.includes('taiwan'));
    assert.ok(ids.includes('japan'));
    assert.ok(ids.includes('korea'));
    assert.strictEqual(res.body.data.length, 6);
  });

  it('GET /api/genres returns 9 genres including new ones', async () => {
    const res = await request(app).get('/api/genres');
    assert.strictEqual(res.status, 200);
    const ids = res.body.data.map(g => g.id);
    assert.ok(ids.includes('mix'));
    assert.ok(ids.includes('classical'));
    assert.ok(ids.includes('hiphop'));
    assert.ok(ids.includes('jazz'));
    assert.strictEqual(res.body.data.length, 9);
  });
});
