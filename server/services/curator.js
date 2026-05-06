/**
 * curator.js — 策展数据服务
 *
 * 职责：
 *   1. 加载 data/songs.json 到内存
 *   2. 启动时验证歌曲有效性，自动替补
 *   3. 提供按 era/region/genre 查询歌曲的接口
 *   4. Mix模式组合逻辑 + 加权随机算法
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'songs.json');
const BATCH_SIZE = 5;
const BATCH_INTERVAL = 500;
const MAX_SONGS = 30;

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
    if (!slot || slot.active.length === 0) {
      return { songs: [], dataInsufficient: true };
    }
    const selected = this._weightedRandomSelect(slot.active, MAX_SONGS, {
      maxPerArtist: 2,
      minYearSpread: 3,
    });
    return { songs: selected, dataInsufficient: slot.active.length < 10 };
  }

  _generateMix(era, region) {
    const byGenre = {};
    for (const [key, slot] of Object.entries(this.cache)) {
      if (key.startsWith(`${era}-${region}-`) && slot.active.length > 0) {
        const genre = key.split('-')[2];
        if (!byGenre[genre]) byGenre[genre] = [];
        byGenre[genre].push(...slot.active.map(s => ({ ...s, genre })));
      }
    }

    if (Object.keys(byGenre).length === 0) {
      return { songs: [], dataInsufficient: true };
    }

    // 每风格随机抽最多4首（保证风格多样性）
    const perGenre = [];
    for (const [, songs] of Object.entries(byGenre)) {
      const picked = this._weightedRandomSelect(songs, Math.min(songs.length, 4), {
        maxPerArtist: 2,
      });
      perGenre.push(...picked);
    }

    // 从跨风格组合池加权随机抽 30 首
    const result = this._weightedRandomSelect(perGenre, MAX_SONGS, {
      maxPerArtist: 2,
      minYearSpread: 3,
    });

    return { songs: result, dataInsufficient: result.length < 10 };
  }

  /**
   * 加权随机选择
   *
   * @param {Array} pool      - 歌曲候选池
   * @param {number} count    - 目标选取数量
   * @param {Object} constraints
   * @param {number} constraints.maxPerArtist - 同一歌手最多出现次数 (默认2)
   * @param {number} constraints.minYearSpread - 最少覆盖不同年份数 (默认1)
   * @returns {Array} 打乱顺序的结果数组
   */
  _weightedRandomSelect(pool, count, { maxPerArtist = 2, minYearSpread = 1 } = {}) {
    if (pool.length === 0) return [];
    if (pool.length <= count) {
      const result = [...pool];
      this._shuffle(result);
      return result;
    }

    // 构建加权抽奖池: 每首歌按 weight 值重复出现
    const lottery = [];
    for (const song of pool) {
      const w = song.weight || 5;
      for (let i = 0; i < w; i++) lottery.push(song);
    }

    const selected = [];
    const artistCount = {};
    const years = new Set();
    const usedIds = new Set();
    const maxAttempts = count * 5;

    for (let attempt = 0; attempt < maxAttempts && selected.length < count; attempt++) {
      const idx = Math.floor(Math.random() * lottery.length);
      const candidate = lottery[idx];

      if (usedIds.has(candidate.id)) continue;

      const artist = candidate.artist;
      if ((artistCount[artist] || 0) >= maxPerArtist) continue;

      selected.push(candidate);
      usedIds.add(candidate.id);
      artistCount[artist] = (artistCount[artist] || 0) + 1;
      if (candidate.year) years.add(candidate.year);
    }

    // 后处理：尽量满足年份分散约束
    if (years.size < minYearSpread && pool.length > count) {
      const allYears = new Set();
      for (const s of pool) { if (s.year) allYears.add(s.year); }

      for (let i = 0; i < selected.length && years.size < minYearSpread; i++) {
        const s = selected[i];
        if ((artistCount[s.artist] || 0) <= 1) continue; // 已经是唯一的歌手，不换

        for (const y of allYears) {
          if (years.has(y)) continue;
          const replacement = pool.find(r =>
            !usedIds.has(r.id) &&
            r.year === y &&
            (artistCount[r.artist] || 0) < maxPerArtist
          );
          if (replacement) {
            usedIds.delete(s.id);
            usedIds.add(replacement.id);
            artistCount[s.artist]--;
            artistCount[replacement.artist] = (artistCount[replacement.artist] || 0) + 1;
            selected[i] = replacement;
            years.add(y);
            break;
          }
        }
      }
    }

    this._shuffle(selected);
    return selected;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
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

    this._updateCacheAfterValidation();
  }

  _replaceInvalidSong(slotKey, invalidId) {
    const slot = this.cache[slotKey];
    if (!slot) return;
    slot.active = slot.active.filter(s => s.id !== invalidId);
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
