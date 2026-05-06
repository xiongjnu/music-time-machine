const express = require('express');
const router = express.Router();

/**
 * 播放路由 — 获取歌曲播放URL
 * 音源：网易云音乐
 */

module.exports = function (neteaseAdapter, cacheService) {
  // GET /api/play/url?id=xxx
  router.get('/url', async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ code: 400, message: '缺少歌曲ID' });

      // 1. 查缓存
      const cached = cacheService.getPlayUrl(id);
      if (cached) {
        return res.json({ code: 200, data: cached });
      }

      // 2. 获取网易云播放URL
      const result = await neteaseAdapter.getPlayUrl(id);
      const data = result.data && result.data[0] ? result.data[0] : null;

      if (data && data.url) {
        const playData = {
          url: data.url,
          source: 'netease',
          isVip: !!data.freeTrialInfo,
          br: data.br || 0,
        };
        cacheService.setPlayUrl(id, playData, 2 * 60 * 60 * 1000);
        return res.json({ code: 200, data: playData });
      }

      // 3. 无音源
      res.json({ code: 404, message: '暂无音源' });
    } catch {
      res.status(500).json({ code: 500, message: '获取播放URL失败' });
    }
  });

  return router;
};
