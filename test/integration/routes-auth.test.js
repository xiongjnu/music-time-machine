const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');

describe('Routes — Auth', () => {
  let app;
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      getQrKey: async () => 'mock-unikey-123',
      createQrImage: async (key) => `https://qrcode.example.com/${key}`,
      checkQrStatus: async (key) => {
        if (key === 'expired-key') return { code: 800 };
        if (key === 'scanned-key') return { code: 802 };
        if (key === 'confirmed-key') return { code: 803 };
        return { code: 801 };
      },
      getLoginStatus: async () => ({ code: 200, data: { isLogin: false } }),
      logout: async () => ({ code: 200 }),
    };

    const authFactory = require('../../server/routes/auth');
    app = express();
    app.use(express.json());
    app.use('/api/auth', authFactory(mockAdapter));
  });

  it('POST /qrcode/key returns unikey', async () => {
    const res = await request(app).post('/api/auth/qrcode/key');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.code, 200);
    assert.strictEqual(res.body.data.unikey, 'mock-unikey-123');
  });

  it('POST /qrcode/create returns qrimg', async () => {
    const res = await request(app)
      .post('/api/auth/qrcode/create')
      .send({ key: 'test-key' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.qrimg.includes('test-key'));
  });

  it('POST /qrcode/check returns 800 for expired key', async () => {
    // First create a QR
    await request(app).post('/api/auth/qrcode/create').send({ key: 'expired-key' });
    const res = await request(app)
      .post('/api/auth/qrcode/check')
      .send({ key: 'expired-key' });
    assert.strictEqual(res.body.code, 800);
  });

  it('POST /qrcode/check returns 803 for confirmed login', async () => {
    await request(app).post('/api/auth/qrcode/create').send({ key: 'confirmed-key' });
    const res = await request(app)
      .post('/api/auth/qrcode/check')
      .send({ key: 'confirmed-key' });
    assert.strictEqual(res.body.code, 803);
  });

  it('GET /status returns logged-out state initially', async () => {
    const res = await request(app).get('/api/auth/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.isLogin, false);
  });
});
