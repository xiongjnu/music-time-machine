/**
 * cache.js — 内存缓存服务
 *
 * 职责：
 *   1. 策展数据验证结果缓存（curator验证后写入）
 *   2. 播放URL缓存（减少重复请求）
 *   3. 缓存过期管理
 */

class Cache {
  constructor() {
    this._store = new Map();
  }

  /**
   * 设置缓存
   * @param {string} key
   * @param {*} value
   * @param {number} ttlMs - 过期时间(ms)，0表示永不过期
   */
  set(key, value, ttlMs = 0) {
    this._store.set(key, {
      value,
      expiry: ttlMs > 0 ? Date.now() + ttlMs : 0
    });
  }

  /**
   * 获取缓存
   * @returns {*} 缓存值，过期或不存在返回undefined
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (entry.expiry > 0 && Date.now() > entry.expiry) {
      this._store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * 删除缓存
   */
  delete(key) {
    this._store.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this._store.clear();
  }

  /**
   * 获取缓存条目数量
   */
  get size() {
    return this._store.size;
  }

  // ── 便捷方法 ──

  /**
   * 缓存播放URL（2小时过期）
   */
  setPlayUrl(songId, urlData, ttlMs) {
    this.set(`play:${songId}`, urlData, ttlMs || 2 * 60 * 60 * 1000);
  }

  /**
   * 获取播放URL缓存
   */
  getPlayUrl(songId) {
    return this.get(`play:${songId}`);
  }

  /**
   * 缓存歌曲详情（24小时过期）
   */
  setSongDetail(songId, detail) {
    this.set(`detail:${songId}`, detail, 24 * 60 * 60 * 1000);
  }

  /**
   * 获取歌曲详情缓存
   */
  getSongDetail(songId) {
    return this.get(`detail:${songId}`);
  }
}

module.exports = { Cache };
