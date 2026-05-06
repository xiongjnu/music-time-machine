const api = require('@neteasecloudmusicapienhanced/api');
const { SourceAdapter } = require('./base');

/**
 * 网易云音乐适配器
 * 封装 NeteaseCloudMusicApiEnhanced 的核心API
 */
class NeteaseAdapter extends SourceAdapter {
  constructor() {
    super('netease');
    this.cookie = '';
  }

  async getQrKey() {
    const res = await api.login_qr_key();
    if (res.body.code !== 200) throw new Error(`获取QR Key失败: ${JSON.stringify(res.body)}`);
    return res.body.data.unikey;
  }

  async createQrImage(key) {
    const res = await api.login_qr_create({ key, qrimg: true });
    if (res.body.code !== 200) throw new Error(`生成二维码失败: ${JSON.stringify(res.body)}`);
    return res.body.data.qrimg;
  }

  async checkQrStatus(key) {
    const res = await api.login_qr_check({ key });
    if (res.body.code === 803 && res.body.cookie) {
      this.cookie = res.body.cookie;
    }
    return res.body;
  }

  async getLoginStatus() {
    const res = await api.login_status({ cookie: this.cookie });
    return res.body;
  }

  async logout() {
    const res = await api.logout();
    this.cookie = '';
    return res.body;
  }

  async search(keyword) {
    const res = await api.cloudsearch({ keywords: keyword, type: 1, limit: 30 });
    return res.body;
  }

  async getSongDetail(ids) {
    const idStr = Array.isArray(ids) ? ids.join(',') : String(ids);
    const res = await api.song_detail({ ids: idStr });
    return res.body;
  }

  async getPlayUrl(id) {
    const res = await api.song_url_v1({ id: String(id), level: 'exhigh', cookie: this.cookie });
    return res.body;
  }
}

module.exports = { NeteaseAdapter };
