const express = require('express');
const router = express.Router();

module.exports = function (neteaseAdapter, cacheService) {
  router.get('/', async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ code: 400, message: '缺少歌曲ID' });
      }

      const cacheKey = `lyric:${id}`;
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return res.json({ code: 200, data: cached });
      }

      const body = await neteaseAdapter.getLyric(id);
      if (!body || body.nolyric || !body.lrc || !body.lrc.lyric) {
        return res.json({ code: 404, message: '暂无歌词' });
      }

      const data = {
        lyric: body.lrc ? body.lrc.lyric || '' : '',
        tlyric: body.tlyric ? body.tlyric.lyric || '' : '',
        lyricType: body.lrc && body.lrc.lyric && body.lrc.lyric.includes('[') ? 'synced' : 'plain',
      };

      cacheService.set(cacheKey, data, 6 * 60 * 60 * 1000);
      res.json({ code: 200, data });
    } catch (err) {
      res.status(500).json({ code: 500, message: '获取歌词失败' });
    }
  });

  return router;
};
