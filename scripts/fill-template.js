/**
 * fill-template.js — 空格子模板生成器
 *
 * 功能：根据年代×地区×风格矩阵，生成待填格子的JSON骨架
 * 用途：批量扩展 songs.json 中的格子
 *
 * 使用方式：
 *   node scripts/fill-template.js                    # 预览所有空格子
 *   node scripts/fill-template.js --write            # 写入 songs.json
 *   node scripts/fill-template.js --missing --write  # 仅写入不存在的格子
 *   node scripts/fill-template.js --era 1970 --write # 仅生成1970年代
 */

const path = require('path');
const { ERAS, REGIONS, GENRES } = require('./core/schema');
const { DATA_PATH, readSongs, writeSongs, mergeSlots } = require('./core/store');

function generateSlots(filters) {
  const { era: filterEra, region: filterRegion, missingOnly } = filters;

  let existingKeys = new Set();
  if (missingOnly) {
    const data = readSongs();
    existingKeys = new Set(Object.keys(data.slots));
  }

  const newSlots = {};
  for (const era of ERAS) {
    if (filterEra && era !== filterEra) continue;
    for (const region of REGIONS) {
      if (filterRegion && region !== filterRegion) continue;
      for (const genre of GENRES) {
        const key = `${era}-${region}-${genre}`;
        if (missingOnly && existingKeys.has(key)) continue;
        newSlots[key] = { era, region, genre, active: [], reserve: [] };
      }
    }
  }

  return newSlots;
}

function doWrite(newSlots) {
  const data = readSongs();
  data.slots = mergeSlots(data.slots, newSlots);
  writeSongs(data);
  console.log(`[fill-template] 已写入 ${Object.keys(newSlots).length} 个格子（旧文件已备份）`);
}

// CLI 入口
const args = process.argv.slice(2);
const filters = {
  era: null,
  region: null,
  missingOnly: args.includes('--missing'),
};
const shouldWrite = args.includes('--write');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--era' && args[i + 1]) filters.era = args[i + 1];
  if (args[i] === '--region' && args[i + 1]) filters.region = args[i + 1];
}

const newSlots = generateSlots(filters);
const count = Object.keys(newSlots).length;

if (count === 0) {
  console.log('[fill-template] 无新格子需要生成');
} else {
  console.log(`[fill-template] 生成 ${count} 个空格子:`);
  for (const key of Object.keys(newSlots)) {
    console.log(`  - ${key}`);
  }

  if (shouldWrite) {
    doWrite(newSlots);
  } else {
    console.log(`\n[fill-template] 预览模式。使用 --write 写入 ${path.basename(DATA_PATH)}`);
  }
}
