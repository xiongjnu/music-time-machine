const express = require('express');
const router = express.Router();

/**
 * 歌曲列表路由 — 从策展数据返回歌曲
 */

module.exports = function (curatorService) {
  // GET /api/songs?era=1975&region=western&genre=mix[&year=1982]
  router.get('/', async (req, res) => {
    try {
      const { era, region, genre, year } = req.query;
      if (!era || !region || !genre) {
        return res.status(400).json({ code: 400, message: '缺少必要参数: era, region, genre' });
      }
      const result = curatorService.getSongs(era, region, genre);
      let songs = result.songs;
      if (year) {
        songs = songs.filter(s => s.year === parseInt(year, 10));
      }
      res.json({
        code: 200,
        data: { era, region, genre, year: year || null, songs },
      });
    } catch (err) {
      res.status(500).json({ code: 500, message: '获取歌曲列表失败' });
    }
  });

  return router;
};
