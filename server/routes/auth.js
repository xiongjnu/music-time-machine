const express = require('express');
const router = express.Router();

/**
 * 认证路由 — 二维码扫码登录
 * Cookie存储在内存中，仅会话期间有效
 */
module.exports = function (neteaseAdapter) {
  // 登录状态缓存
  let loginState = { isLogin: false, profile: null };
  let currentQrKey = null;

  // POST /api/auth/qrcode/key — 获取二维码Key
  router.post('/qrcode/key', async (req, res) => {
    try {
      const key = await neteaseAdapter.getQrKey();
      currentQrKey = key;
      res.json({ code: 200, data: { unikey: key } });
    } catch (err) {
      res.status(500).json({ code: 500, message: '获取二维码Key失败' });
    }
  });

  // POST /api/auth/qrcode/create — 生成二维码图片
  router.post('/qrcode/create', async (req, res) => {
    try {
      const key = req.body.key || currentQrKey;
      if (!key) return res.status(400).json({ code: 400, message: '缺少二维码Key' });
      const qrimg = await neteaseAdapter.createQrImage(key);
      res.json({ code: 200, data: { qrimg } });
    } catch (err) {
      res.status(500).json({ code: 500, message: '生成二维码失败' });
    }
  });

  // POST /api/auth/qrcode/check — 检查扫码状态
  // 800=过期, 801=等待扫码, 802=待确认, 803=登录成功
  router.post('/qrcode/check', async (req, res) => {
    try {
      const key = req.body.key || currentQrKey;
      if (!key) return res.status(400).json({ code: 400, message: '缺少二维码Key' });
      const result = await neteaseAdapter.checkQrStatus(key);
      if (result.code === 803) {
        loginState = { isLogin: true, profile: result.cookie ? 'logged_in' : null };
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ code: 500, message: '检查扫码状态失败' });
    }
  });

  // GET /api/auth/status — 检查登录状态
  router.get('/status', async (req, res) => {
    try {
      const status = await neteaseAdapter.getLoginStatus();
      const profile = status.data && status.data.profile ? status.data.profile : null;
      loginState = {
        isLogin: !!(profile && profile.userId),
        profile: profile ? { userId: profile.userId, nickname: profile.nickname, avatarUrl: profile.avatarUrl } : null,
      };
      res.json({ code: 200, data: loginState });
    } catch (err) {
      res.status(500).json({ code: 500, message: '检查登录状态失败' });
    }
  });

  // POST /api/auth/logout — 退出登录
  router.post('/logout', async (req, res) => {
    try {
      await neteaseAdapter.logout();
      loginState = { isLogin: false, profile: null };
      currentQrKey = null;
      res.json({ code: 200, message: '已退出' });
    } catch (err) {
      loginState = { isLogin: false, profile: null };
      res.json({ code: 200, message: '已退出' });
    }
  });

  return router;
};
