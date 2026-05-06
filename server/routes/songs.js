const express = require('express');
const router = express.Router();

/**
 * 歌曲列表路由 — 从策展数据返回歌曲
 */

module.exports = function (curatorService) {
  // GET /api/songs?era=1975&region=western&genre=mix
  router.get('/', async (req, res) => {
    try {
      const { era, region, genre } = req.query;
      if (!era || !region || !genre) {
        return res.status(400).json({ code: 400, message: '缺少必要参数: era, region, genre' });
      }
      const result = curatorService.getSongs(era, region, genre);
      res.json({
        code: 200,
        data: { era, region, genre, songs: result.songs },
      });
    } catch (err) {
      res.status(500).json({ code: 500, message: '获取歌曲列表失败' });
    }
  });

  return router;
};
