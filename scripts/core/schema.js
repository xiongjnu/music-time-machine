/**
 * core/schema.js — 共享常量与字段定义（唯一来源）
 */

// 元数据常量
const ERAS = ['1970', '1980', '1990', '2000', '2010', '2020'];
const REGIONS = ['western', 'hk', 'mainland', 'taiwan', 'japan', 'korea'];
const GENRES = ['rock', 'folk', 'pop', 'rnb', 'electronic', 'classical', 'hiphop', 'jazz'];

// slot key 格式: {era}-{region}-{genre}（由常量动态生成）
const SLOT_KEY_RE = new RegExp(`^(\\d{4})-(${REGIONS.join('|')})-(${GENRES.join('|')})$`);

function parseSlotKey(key) {
  const m = key.match(SLOT_KEY_RE);
  if (!m) return null;
  return { era: m[1], region: m[2], genre: m[3] };
}

function formatSlotKey(era, region, genre) {
  return `${era}-${region}-${genre}`;
}

// 唯一 emoji 映射来源
const GENRE_TAGS = {
  rock: '🎸',
  folk: '🎻',
  pop: '🎤',
  rnb: '🎶',
  electronic: '🎹',
  classical: '🎼',
  hiphop: '🎧',
  jazz: '🎺',
};

// 歌曲必填字段
const REQUIRED_FIELDS = ['id', 'platform', 'title', 'artist', 'genreTag', 'weight'];

module.exports = {
  SLOT_KEY_RE,
  parseSlotKey,
  formatSlotKey,
  GENRE_TAGS,
  ERAS,
  REGIONS,
  GENRES,
  REQUIRED_FIELDS,
};
