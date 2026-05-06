/**
 * validate.js — 数据验证脚本
 *
 * 功能：检查 songs.json 的结构完整性 + 验证歌曲有效性
 * 用途：开发阶段手动校验
 *
 * 使用方式：
 *   node scripts/validate.js                    # 检查JSON结构
 *   node scripts/validate.js --check-online     # 结构+在线验证歌曲
 */

const { REQUIRED_FIELDS, parseSlotKey } = require('./core/schema');
const { readSongs } = require('./core/store');
const { batchValidate } = require('./core/api');

function validateStructure() {
  const errors = [];
  const warnings = [];

  let data;
  try {
    data = readSongs();
  } catch (err) {
    console.error(`[validate] 读取或解析失败: ${err.message}`);
    process.exit(1);
  }

  if (!data.version) errors.push('缺少 version 字段');
  if (!data.slots || typeof data.slots !== 'object') errors.push('缺少 slots 对象');

  let slotCount = 0;
  let totalActive = 0;
  let totalReserve = 0;

  for (const [key, slot] of Object.entries(data.slots)) {
    slotCount++;

    const parsed = parseSlotKey(key);
    if (!parsed) {
      errors.push(`[${key}] key格式错误，应为 era-region-genre`);
      continue;
    }

    const { era: keyEra, region: keyRegion, genre: keyGenre } = parsed;
    if (slot.era !== keyEra) errors.push(`[${key}] era不一致: key=${keyEra}, slot=${slot.era}`);
    if (slot.region !== keyRegion) errors.push(`[${key}] region不一致: key=${keyRegion}, slot=${slot.region}`);
    if (slot.genre !== keyGenre) errors.push(`[${key}] genre不一致: key=${keyGenre}, slot=${slot.genre}`);

    if (!Array.isArray(slot.active)) {
      errors.push(`[${key}] active 不是数组`);
    } else {
      for (let i = 0; i < slot.active.length; i++) {
        checkSongFields(key, `active[${i}]`, slot.active[i], errors);
      }
      totalActive += slot.active.length;
    }

    if (!Array.isArray(slot.reserve)) {
      errors.push(`[${key}] reserve 不是数组`);
    } else {
      for (let i = 0; i < slot.reserve.length; i++) {
        checkSongFields(key, `reserve[${i}]`, slot.reserve[i], errors);
      }
      totalReserve += slot.reserve.length;
    }

    if (slot.active.length < 5 && slot.reserve.length === 0) {
      warnings.push(`[${key}] active不足5首且无reserve候补`);
    }
  }

  console.log(`\n═══ 结构校验结果 ═══\n`);
  console.log(`格子数: ${slotCount}`);
  console.log(`active歌曲: ${totalActive}`);
  console.log(`reserve歌曲: ${totalReserve}`);
  console.log(`错误: ${errors.length}  警告: ${warnings.length}\n`);

  if (errors.length > 0) {
    console.log('--- 错误 ---');
    errors.forEach(e => console.log(`  ❌ ${e}`));
  }
  if (warnings.length > 0) {
    console.log('--- 警告 ---');
    warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  }
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 所有检查通过');
  }

  return { errors, warnings, data, slotCount, totalActive };
}

function checkSongFields(slotKey, location, song, errors) {
  if (!song || typeof song !== 'object') {
    errors.push(`[${slotKey}] ${location}: 不是有效对象`);
    return;
  }
  for (const field of REQUIRED_FIELDS) {
    if (!song[field]) errors.push(`[${slotKey}] ${location}.${field}: 缺失`);
  }
  if (song.id && !/^\d+$/.test(song.id)) {
    errors.push(`[${slotKey}] ${location}.id: "${song.id}" 不是纯数字`);
  }
  if (song.platform && !['netease', 'qqmusic'].includes(song.platform)) {
    errors.push(`[${slotKey}] ${location}.platform: "${song.platform}" 无效`);
  }
}

async function validateOnline() {
  const { errors, data } = validateStructure();
  if (errors.length > 0) {
    console.log('\n[validate] 结构校验有错误，跳过在线验证');
    return;
  }

  console.log('\n[*] 开始在线验证...');
  const allIds = [];
  for (const [key, slot] of Object.entries(data.slots)) {
    for (const song of slot.active) {
      allIds.push({ key, id: song.id, title: song.title });
    }
  }

  if (allIds.length === 0) {
    console.log('无歌曲需要验证');
    return;
  }

  const ids = allIds.map(x => x.id);
  const results = await batchValidate(ids);
  const idMap = new Map(allIds.map(x => [x.id, x]));

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const item = idMap.get(r.id);
    if (r.valid) {
      passed++;
    } else {
      failed++;
      console.log(`  ❌ [${item.key}] ${item.id} "${item.title}" — 歌曲不存在或已下架`);
    }
  }

  console.log(`\n═══ 在线验证结果 ═══`);
  console.log(`通过: ${passed}  失效: ${failed}`);
  if (failed > 0) {
    console.log(`\n建议重新填充失效歌曲或更新 reserve 候补池`);
  }
}

const args = process.argv.slice(2);
if (args.includes('--check-online')) {
  validateOnline().catch(err => { console.error(err); process.exit(1); });
} else {
  validateStructure();
}
