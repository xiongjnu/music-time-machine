/**
 * curator.js — 策展数据服务
 *
 * 职责：
 *   1. 加载 data/songs.json 到内存
 *   2. 启动时验证歌曲有效性，自动替补
 *   3. 提供按 era/region/genre 查询歌曲的接口
 *   4. Mix模式组合逻辑
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'songs.json');
const BATCH_SIZE = 5;
const BATCH_INTERVAL = 500;

class Curator {
  constructor() {
    this.data = null;
    this.cache = {};
    this.invalidSongs = [];
  }

  /**
   * 加载策展数据并执行启动验证
   * @param {Function} songValidator — async (id) => { valid: bool }
   */
  async init(songValidator) {
    this.data = this._loadJson();
    if (!this.data) {
      throw new Error(`策展数据加载失败: ${DATA_PATH}`);
    }

    for (const [key, slot] of Object.entries(this.data.slots)) {
      this.cache[key] = {
        active: [...slot.active],
        reserve: [...slot.reserve],
        dataInsufficient: false,
      };
    }

    if (songValidator) {
      await this._validateAndRepair(songValidator);
    }

    console.log(`[curator] 加载完成: ${Object.keys(this.data.slots).length} 个格子`);
    console.log(`[curator] 失效歌曲: ${this.invalidSongs.length} 首`);
  }

  getSongs(era, region, genre) {
    if (genre === 'mix') {
      return this._generateMix(era, region);
    }
    const key = `${era}-${region}-${genre}`;
    const slot = this.cache[key];
    if (!slot) return { songs: [], dataInsufficient: true };
    return { songs: slot.active, dataInsufficient: slot.dataInsufficient };
  }

  _generateMix(era, region) {
    const allSongs = [];
    for (const [key, slot] of Object.entries(this.cache)) {
      if (key.startsWith(`${era}-${region}-`) && slot.active.length > 0) {
        const genre = key.split('-')[2];
        allSongs.push(...slot.active.map(s => ({ ...s, genre })));
      }
    }

    const byGenre = {};
    for (const song of allSongs) {
      if (!byGenre[song.genre]) byGenre[song.genre] = [];
      byGenre[song.genre].push(song);
    }

    const selected = [];
    for (const [, songs] of Object.entries(byGenre)) {
      selected.push(...songs.slice(0, 2));
    }

    if (selected.length < 10) {
      const selectedIds = new Set(selected.map(s => s.id));
      const remaining = allSongs.filter(s => !selectedIds.has(s.id));
      selected.push(...remaining.slice(0, 10 - selected.length));
    }

    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    return { songs: selected.slice(0, 10), dataInsufficient: selected.length < 5 };
  }

  /**
   * 启动验证：批量检查歌曲有效性，自动替补
   */
  async _validateAndRepair(songValidator) {
    const allIds = [];
    for (const [key, slot] of Object.entries(this.cache)) {
      for (const song of slot.active) {
        allIds.push({ key, id: song.id });
      }
    }

    if (allIds.length === 0) return;

    // 分批验证
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(item => songValidator(item.id))
      );

      for (let j = 0; j < batch.length; j++) {
        const { key, id } = batch[j];
        const result = results[j];
        const isValid = result.status === 'fulfilled' && result.value && result.value.valid;

        if (!isValid) {
          this.invalidSongs.push({ key, id, reason: result.status === 'rejected' ? result.reason.message : '歌曲失效' });
          this._replaceInvalidSong(key, id);
        }
      }

      if (i + BATCH_SIZE < allIds.length) {
        await new Promise(r => setTimeout(r, BATCH_INTERVAL));
      }
    }

    // 更新内存缓存（不修改JSON文件）
    this._updateCacheAfterValidation();
  }

  /**
   * 从reserve中取一首替补顶入active
   */
  _replaceInvalidSong(slotKey, invalidId) {
    const slot = this.cache[slotKey];
    if (!slot) return;

    // 从active中移除失效歌曲
    slot.active = slot.active.filter(s => s.id !== invalidId);

    // 从reserve取候补顶入
    if (slot.reserve.length > 0) {
      const replacement = slot.reserve.shift();
      slot.active.push(replacement);
    }
  }

  _updateCacheAfterValidation() {
    for (const [key, slot] of Object.entries(this.cache)) {
      if (slot.active.length === 0 && slot.reserve.length === 0) {
        slot.dataInsufficient = true;
      }
    }
  }

  _loadJson() {
    try {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[curator] 读取失败: ${err.message}`);
      return null;
    }
  }
}

module.exports = { Curator };
