const https = require('https');
const { SourceAdapter } = require('./base');

/**
 * QQ音乐适配器 — 直接 HTTP 调用 QQ Music Web API
 *
 * QQ Music 使用两套 ID：
 *   - songid (数字) — 搜索结果中的主键
 *   - songmid (字符串) — 获取播放 URL 所需的密钥标识
 *
 * 播放 URL 获取流程：
 *   search → 取得 songmid → getVkey(songmid) → 拼接 CDN URL → 返回
 */

const SEARCH_URL = 'https://c.y.qq.com/soso/fcgi-bin/client_search_cp';
const MUSICU_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

class QQMusicAdapter extends SourceAdapter {
  constructor() {
    super('qqmusic');
    this._guid = String(Math.floor(Math.random() * 1e9));
  }

  // ── HTTP 工具 ──

  async _get(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: { 'User-Agent': UA, 'Referer': 'https://y.qq.com' },
        timeout: 8000,
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve(body));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  // ── SourceAdapter 接口实现 ──

  async search(keyword) {
    const url = `${SEARCH_URL}?format=json&n=10&p=1&w=${encodeURIComponent(keyword)}&type=1`;
    const body = await this._get(url);
    const json = JSON.parse(body);

    if (json.code !== 0 || !json.data || !json.data.song) return [];

    const list = json.data.song.list || [];
    return list.map(s => ({
      id: String(s.id),
      mid: s.mid,
      platform: 'qqmusic',
      title: s.name || '',
      artist: (s.singer && s.singer[0] && s.singer[0].name) || '',
      album: s.albumname || '',
      duration: (s.interval || 0) * 1000, // QQ 返回秒，统一转毫秒
    }));
  }

  async getSongDetail(id) {
    // QQ Music detail 需要 songmid，用 search 间接获取
    // 这个适配器主要用于播放 fallback，detail 调用较少
    const url = `${MUSICU_URL}?format=json&data=${encodeURIComponent(JSON.stringify({
      comm: { ct: 24, cv: 0 },
      songinfo: { method: 'get_song_detail_yqq', param: { song_id: Number(id) }, module: 'music.pf_song_detail_svr' },
    }))}`;
    const body = await this._get(url);
    const json = JSON.parse(body);
    const info = json.songinfo && json.songinfo.data;
    if (!info || !info.track_info) return null;

    const t = info.track_info;
    return {
      id: String(t.id || id),
      platform: 'qqmusic',
      title: t.name || '',
      artist: (t.singer && t.singer[0] && t.singer[0].name) || '',
      album: t.album ? t.album.name : '',
      duration: (t.interval || 0) * 1000,
    };
  }

  async getPlayUrl(id) {
    try {
      // 1. 先通过 songid 搜索获取 songmid
      const searchUrl = `${SEARCH_URL}?format=json&n=1&p=1&w=${encodeURIComponent(id)}&type=1&t=0`;
      let body = await this._get(searchUrl);
      let json = JSON.parse(body);

      const songs = (json.data && json.data.song && json.data.song.list) || [];
      if (songs.length === 0) return null;

      const songmid = songs[0].mid;
      const songTitle = songs[0].name || '';

      // 2. 通过 songmid 获取 vkey
      const vkeyUrl = `${MUSICU_URL}?format=json&data=${encodeURIComponent(JSON.stringify({
        req_1: {
          module: 'vkey.GetVkeyServer',
          method: 'CgiGetVkey',
          param: {
            guid: this._guid,
            songmid: [songmid],
            songtype: [0],
            uin: '0',
            loginflag: 1,
            platform: '20',
          },
        },
      }))}`;
      body = await this._get(vkeyUrl);
      json = JSON.parse(body);

      const data = json.req_1 && json.req_1.data;
      if (!data || !data.sip || !data.midurlinfo) return null;

      const urlInfo = data.midurlinfo[0];
      if (!urlInfo || !urlInfo.purl || urlInfo.purl === '') return null;

      // 3. 拼接完整播放 URL
      const host = data.sip[0]; // 第一个通常是主 CDN
      const playUrl = host + urlInfo.purl;

      return {
        url: playUrl,
        source: 'qqmusic',
        isVip: false, // QQ Music 免费音质通常不标记 VIP
        br: 0,
      };
    } catch {
      return null;
    }
  }
}

module.exports = { QQMusicAdapter };
