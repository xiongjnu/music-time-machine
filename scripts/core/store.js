/**
 * core/store.js — songs.json 读写（统一路径 + 写入前备份）
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'songs.json');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function readSongs() {
  if (!fs.existsSync(DATA_PATH)) {
    return { version: 1, lastUpdated: new Date().toISOString().slice(0, 10), slots: {} };
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeSongs(data) {
  ensureBackupDir();

  // 写入前备份旧文件
  if (fs.existsSync(DATA_PATH)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(BACKUP_DIR, `songs-${ts}.json`);
    fs.copyFileSync(DATA_PATH, backupPath);
    // 只保留最近10份备份
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('songs-'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .map(x => x.name);
    for (const f of backups.slice(10)) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    }
  }

  data.lastUpdated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * 增量合并 slot
 * @param {boolean} overwrite — true 时覆盖已有数据，默认仅填充空 slot
 */
function mergeSlots(existing, newSlots, overwrite = false) {
  const merged = { ...existing };
  for (const [key, slot] of Object.entries(newSlots)) {
    if (overwrite || !merged[key]?.active?.length) {
      merged[key] = slot;
    }
  }
  return merged;
}

module.exports = { DATA_PATH, readSongs, writeSongs, mergeSlots };
