const express = require('express');
const router = express.Router();

/**
 * 播放路由 — 获取歌曲播放URL
 * 音源链：网易云 → QQ音乐（fallback）
 */

module.exports = function (neteaseAdapter, qqAdapter, cacheService) {
  // GET /api/play/url?id=xxx&title=xxx&artist=xxx
  router.get('/url', async (req, res) => {
    try {
      const { id, title, artist } = req.query;
      if (!id) return res.status(400).json({ code: 400, message: '缺少歌曲ID' });

      // 1. 查缓存
      const cached = cacheService.getPlayUrl(id);
      if (cached) {
        return res.json({ code: 200, data: cached });
      }

      // 2. 尝试网易云
      try {
        const result = await neteaseAdapter.getPlayUrl(id);
        const data = result.data && result.data[0] ? result.data[0] : null;

        if (data && data.url && !data.freeTrialInfo) {
          const playData = {
            url: data.url,
            source: 'netease',
            isVip: false,
            br: data.br || 0,
          };
          cacheService.setPlayUrl(id, playData, 2 * 60 * 60 * 1000);
          return res.json({ code: 200, data: playData });
        }

        // VIP 歌曲 — 标记但不直接返回，尝试 QQ fallback
        if (data && data.freeTrialInfo) {
          const qqResult = await _tryQQ(id, title, artist, qqAdapter, cacheService);
          if (qqResult) return res.json({ code: 200, data: qqResult });

          // QQ 也没有，返回网易云 VIP 链接（前端会显示提示）
          const playData = {
            url: data.url,
            source: 'netease',
            isVip: true,
            br: data.br || 0,
          };
          cacheService.setPlayUrl(id, playData, 2 * 60 * 60 * 1000);
          return res.json({ code: 200, data: playData });
        }
      } catch { /* Netease failed, try QQ */ }

      // 3. 网易云无音源，尝试 QQ
      const qqResult = await _tryQQ(id, title, artist, qqAdapter, cacheService);
      if (qqResult) return res.json({ code: 200, data: qqResult });

      // 4. 所有音源失败
      res.json({ code: 404, message: '暂无音源' });
    } catch (err) {
      res.status(500).json({ code: 500, message: '获取播放URL失败' });
    }
  });

  return router;
};

async function _tryQQ(id, title, artist, qqAdapter, cacheService) {
  try {
    // 先尝试直接用 ID 搜索（如果 ID 恰好是 QQ 的 songid）
    let playData = await qqAdapter.getPlayUrl(id);
    if (playData && playData.url) {
      cacheService.setPlayUrl(id, playData, 20 * 60 * 1000); // QQ URL 20min TTL
      return playData;
    }
  } catch { /* ID search failed */ }

  // 用 title+artist 搜索 QQ Music
  if (!title) return null;
  const keyword = artist ? `${title} ${artist}` : title;

  try {
    const results = await qqAdapter.search(keyword);
    if (!results || results.length === 0) return null;

    const qqSongId = results[0].id;
    const playData = await qqAdapter.getPlayUrl(qqSongId);
    if (playData && playData.url) {
      playData.source = 'qqmusic';
      cacheService.setPlayUrl(id, playData, 20 * 60 * 1000);
      return playData;
    }
  } catch { /* QQ fallback failed */ }

  return null;
}
