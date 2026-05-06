/**
 * search-helper.js — 歌曲ID搜索辅助脚本
 *
 * 功能：输入歌名+歌手（+可选专辑），输出网易云歌曲ID候选列表
 * 用途：半自动填充 songs.json 中的歌曲数据
 *
 * 使用方式：
 *   node scripts/search-helper.js "Bohemian Rhapsody" "Queen"
 *   node scripts/search-helper.js "Bohemian Rhapsody" "Queen" "A Night at the Opera"
 */

const { searchCandidates } = require('./core/api');
const { GENRE_TAGS } = require('./core/schema');

async function searchSong(title, artist, album) {
  const keyword = album ? `${title} ${artist} ${album}` : `${title} ${artist}`;
  console.log(`[search-helper] 搜索: "${keyword}"`);

  const candidates = await searchCandidates(title, artist, album, 20);

  if (candidates.length === 0) {
    console.log('[search-helper] 搜索结果为空');
  }

  return candidates;
}

function formatOutput(candidates) {
  for (const c of candidates) {
    const badge = c.confidence === 'high' ? '✅' : c.confidence === 'medium' ? '🟡' : c.confidence === 'low' ? '⚠️' : '❌';
    console.log(`  ${badge} [${c.confidence}] id: ${c.id}  |  ${c.title} — ${c.artist}  |  ${c.album}  |  ${(c.duration / 1000).toFixed(0)}s`);
  }
}

function toSlotEntry(candidate, genre) {
  const genreTag = genre ? GENRE_TAGS[genre] : '🎵';
  return {
    id: candidate.id,
    platform: 'netease',
    title: candidate.title,
    artist: candidate.artist,
    artistId: candidate.artistId,
    album: candidate.album,
    year: null,
    duration: candidate.duration,
    isVip: false,
    coverUrl: '',
    genreTag,
  };
}

// ── CLI 入口 ──
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('用法:');
  console.log('  node scripts/search-helper.js <歌名> <歌手> [专辑名]');
  process.exit(1);
}

(async () => {
  const [title, artist, album] = args;
  console.log('');
  const candidates = await searchSong(title, artist, album);
  if (candidates.length === 0) {
    console.log('无搜索结果');
  } else {
    formatOutput(candidates);
    console.log(`\n共 ${candidates.length} 个候选`);
  }
})();
