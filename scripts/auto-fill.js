/**
 * auto-fill.js — 通过歌单搜索自动填充空 slot
 *
 * 策略：按 era+region 搜索主题歌单，提取曲目后按 genre 分类填充。
 * 比逐首搜索效率高、命中率高。
 *
 * 使用方式：
 *   node scripts/auto-fill.js               # 填充所有不足10首的slot
 *   node scripts/auto-fill.js --min 15       # 填充不足15首的slot
 *   node scripts/auto-fill.js --dry-run      # 仅显示待填充统计
 */

const { ERAS, REGIONS, GENRES, GENRE_TAGS } = require('./core/schema');
const { readSongs, writeSongs, mergeSlots } = require('./core/store');
function shortDelay() { return new Promise(r => setTimeout(r, 200 + Math.random() * 100)); }
const api = require('@neteasecloudmusicapienhanced/api');

const REGION_CN = {
  western: '欧美', hk: '香港', mainland: '大陆', taiwan: '台湾', japan: '日本', korea: '韩国',
};
const GENRE_CN = {
  rock: '摇滚', folk: '民谣', pop: '流行', rnb: 'R&B', electronic: '电子',
  classical: '古典', hiphop: '嘻哈', jazz: '爵士',
};
const ERA_CN = {
  '1970': '70年代', '1980': '80年代', '1990': '90年代', '2000': '00年代', '2010': '10年代', '2020': '20年代',
};

const PLAYLISTS_PER_SLOT = 1;
const TRACKS_PER_PLAYLIST = 15;

function buildSong(s, genre, era) {
  return {
    id: String(s.id),
    platform: 'netease',
    title: s.name,
    artist: s.ar?.[0]?.name || '',
    artistId: String(s.ar?.[0]?.id || ''),
    album: s.al?.name || '',
    year: parseInt(era) + Math.floor(Math.random() * 9),
    duration: s.dt || 0,
    isVip: false,
    coverUrl: '',
    genreTag: GENRE_TAGS[genre] || '🎵',
    weight: 5,
  };
}

async function searchPlaylists(query) {
  try {
    const res = await api.cloudsearch({ keywords: query, type: 1000, limit: 10 });
    return (res.body.result?.playlists || []).filter(p => p.trackCount >= 10);
  } catch {
    return [];
  }
}

async function fetchPlaylistTracks(playlistId) {
  try {
    const res = await api.playlist_track_all({ id: String(playlistId), limit: TRACKS_PER_PLAYLIST });
    return res.body.songs || [];
  } catch {
    return [];
  }
}

async function fillEraRegion(era, region, targetGenres) {
  const eraCN = ERA_CN[era];
  const regionCN = REGION_CN[region];
  const result = {};  // genre → songs[]

  for (const genre of targetGenres) {
    const genreCN = GENRE_CN[genre];
    const query = `${eraCN} ${regionCN} ${genreCN}`;
    const playlists = await searchPlaylists(query);
    await shortDelay();

    if (playlists.length === 0) continue;

    const songs = [];
    const seen = new Set();

    for (const pl of playlists.slice(0, PLAYLISTS_PER_SLOT)) {
      const tracks = await fetchPlaylistTracks(pl.id);
      await shortDelay();

      for (const t of tracks) {
        const sid = String(t.id);
        if (!seen.has(sid)) {
          seen.add(sid);
          songs.push(buildSong(t, genre, era));
          if (songs.length >= TRACKS_PER_PLAYLIST * PLAYLISTS_PER_SLOT) break;
        }
      }
      if (songs.length >= TRACKS_PER_PLAYLIST * PLAYLISTS_PER_SLOT) break;
    }

    if (songs.length > 0) {
      result[genre] = songs;
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const minSongs = parseInt(args.includes('--min') ? args[args.indexOf('--min') + 1] : 10);

  const data = readSongs();

  // 按 era+region 分组，收集需要的 genre
  const plan = {};  // "era-region" → Set<genre>
  let totalSlots = 0;
  for (const era of ERAS) {
    for (const region of REGIONS) {
      const key = `${era}-${region}`;
      const genres = [];
      for (const genre of GENRES) {
        const slotKey = `${key}-${genre}`;
        const existing = data.slots[slotKey]?.active?.length || 0;
        if (existing < minSongs) {
          genres.push(genre);
          totalSlots++;
        }
      }
      if (genres.length > 0) plan[key] = genres;
    }
  }

  if (dryRun) {
    console.log(`[auto-fill] ERAS: ${ERAS.join(', ')}`);
    console.log(`[auto-fill] 目标: 每slot ≥${minSongs}首`);
    console.log(`[auto-fill] 待填充: ${totalSlots} 个slot (${Object.keys(plan).length} 个 era+region 组)`);
    for (const [k, genres] of Object.entries(plan)) {
      const [era, region] = k.split('-');
      console.log(`  ${ERA_CN[era]} ${REGION_CN[region]}: ${genres.length} genres [${genres.join(', ')}]`);
    }
    return;
  }

  console.log(`[auto-fill] 开始填充 ${Object.keys(plan).length} 个 era+region 组 (共${totalSlots}个slot)\n`);

  const newSlots = {};
  let done = 0;

  for (const [erKey, genres] of Object.entries(plan)) {
    const [era, region] = erKey.split('-');
    done++;
    process.stdout.write(`[${done}/${Object.keys(plan).length}] ${ERA_CN[era]} ${REGION_CN[region]} ... `);

    const filled = await fillEraRegion(era, region, genres);
    let added = 0;
    for (const [genre, songs] of Object.entries(filled)) {
      const slotKey = `${era}-${region}-${genre}`;
      newSlots[slotKey] = {
        era, region, genre,
        active: songs,
        reserve: songs.length > 5 ? songs.slice(-3).map(s => ({ ...s })) : [],
      };
      added += songs.length;
    }
    console.log(`${Object.keys(filled).length} genres, ${added} songs`);
  }

  if (Object.keys(newSlots).length > 0) {
    data.slots = mergeSlots(data.slots, newSlots, true);
    writeSongs(data);
    console.log(`\n[auto-fill] 已写入 ${Object.keys(newSlots).length} 个slot`);
  } else {
    console.log('\n[auto-fill] 无新数据');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
