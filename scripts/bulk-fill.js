/**
 * bulk-fill.js — 批量搜索并填充 songs.json
 *
 * 读取 scripts/song-definitions.json 中定义的歌曲，逐个搜索网易云API获取ID，
 * 增量合并到 songs.json（已有数据的 slot 不覆盖，保留手动修正）。
 *
 * 使用方式：
 *   node scripts/bulk-fill.js                             # 搜索并填充所有空 slot
 *   node scripts/bulk-fill.js --slot 1975-western-rock     # 仅搜索指定 slot
 *   node scripts/bulk-fill.js --dry-run                    # 预览模式
 *   node scripts/bulk-fill.js --force                      # 强制覆盖已有 data
 */

const fs = require('fs');
const path = require('path');

const { GENRE_TAGS } = require('./core/schema');
const { DATA_PATH, readSongs, writeSongs, mergeSlots } = require('./core/store');
const { searchSong, jitteredDelay } = require('./core/api');

const DEF_PATH = path.join(__dirname, 'song-definitions.json');

async function fillSlot(slotKey, definitions, genre) {
  console.log(`\n🔍 搜索 ${slotKey} (${definitions.length} 首歌)...`);

  const genreTag = GENRE_TAGS[genre] || '🎵';
  const active = [];

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    const result = await searchSong(def.title, def.artist, def.album);
    if (result) {
      result.year = def.year;
      result.genreTag = genreTag;
      active.push(result);
      console.log(`  ✅ [${i + 1}/${definitions.length}] ${result.id}  ${result.title} — ${result.artist}`);
    } else {
      console.log(`  ❌ [${i + 1}/${definitions.length}] ${def.title} — ${def.artist}`);
    }
    if (i < definitions.length - 1) await jitteredDelay();
  }

  return active;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const targetSlot = args.includes('--slot') ? args[args.indexOf('--slot') + 1] : null;

  if (!fs.existsSync(DEF_PATH)) {
    console.error(`定义文件不存在: ${DEF_PATH}`);
    process.exit(1);
  }

  const definitions = JSON.parse(fs.readFileSync(DEF_PATH, 'utf-8'));
  const data = readSongs();

  // 过滤：只处理未填充的 slot（force 模式跳过）
  const slotsToFill = {};
  for (const [key, songDefs] of Object.entries(definitions)) {
    if (targetSlot && key !== targetSlot) continue;
    if (!songDefs || songDefs.length === 0) continue;
    if (!force && data.slots[key] && data.slots[key].active.length > 0) {
      console.log(`[bulk-fill] 跳过 ${key}（已有 ${data.slots[key].active.length} 首，使用 --force 覆盖）`);
      continue;
    }
    slotsToFill[key] = songDefs;
  }

  if (Object.keys(slotsToFill).length === 0) {
    console.log('[bulk-fill] 所有 slot 已填充，无需搜索');
    return;
  }

  console.log(`[bulk-fill] 准备搜索 ${Object.keys(slotsToFill).length} 个 slot`);

  const newSlots = {};
  for (const [key, songDefs] of Object.entries(slotsToFill)) {
    const genre = key.split('-')[2];
    const active = await fillSlot(key, songDefs, genre);

    const [era, region] = key.split('-');
    newSlots[key] = {
      era, region, genre,
      active,
      reserve: active.length > 5 ? active.slice(-3).map(s => ({ ...s })) : [],
    };
  }

  if (dryRun) {
    console.log('\n[bulk-fill] 预览模式完成，使用不带 --dry-run 参数运行以写入');
  } else {
    data.slots = mergeSlots(data.slots, newSlots, force);
    writeSongs(data);
    console.log(`\n[bulk-fill] 已写入 ${Object.keys(newSlots).length} 个 slot（旧文件已备份到 data/backups/）`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
