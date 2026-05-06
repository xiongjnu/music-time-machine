/**
 * add-weights.js — 给 songs.json 中所有歌曲添加 weight 字段
 *
 * 默认 weight: 5，已知经典歌曲可手动设定更高权重。
 * 使用方式：node scripts/add-weights.js
 */

const { readSongs, writeSongs } = require('./core/store');

// 已知经典歌曲 ID → 权重映射（基于实际 songs.json 中的 ID）
const WEIGHT_MAP = {
  // 划时代经典 (10) — 定义了该年代/风格的声音
  '1868553': 10,        // Bohemian Rhapsody - Queen
  '29719536': 10,       // Stairway to Heaven - Led Zeppelin
  '21178262': 10,       // Billie Jean - Michael Jackson
  '21178260': 10,       // Thriller - Michael Jackson
  '4336098': 10,        // Let It Be - The Beatles
  '1216195': 10,        // American Pie - Don McLean
  '2003968950': 10,     // Imagine - John Lennon
  '1482113923': 10,     // Sweet Child O' Mine - Guns N' Roses
  '21613034': 10,       // Superstition - Stevie Wonder
  '18309786': 10,       // Another Brick In The Wall - Pink Floyd

  // 极热门经典 (9)
  '1318509823': 9,      // Hotel California - Eagles
  '4237923': 9,         // Wish You Were Here - Pink Floyd
  '21393066': 9,        // Purple Rain - Prince
  '3952752': 9,         // Stayin' Alive - Bee Gees
  '3880210': 9,         // Dancing Queen - ABBA
  '3879966': 9,         // Back In Black - AC/DC
  '3950785': 9,         // Livin' On A Prayer - Bon Jovi
  '19553535': 9,        // Every Breath You Take - The Police
  '18003388': 9,        // Careless Whisper - George Michael
  '16481347': 9,        // Take On Me - a-ha
  '26292652': 9,        // With Or Without You - U2

  // 知名经典 (8)
  '16657649': 8,        // Born to Run - Bruce Springsteen
  '20506679': 8,        // Dream On - Aerosmith
  '21052194': 8,        // Free Bird - Lynyrd Skynyrd
  '20506664': 8,        // Sweet Emotion - Aerosmith
  '1312435016': 8,      // Kashmir - Led Zeppelin
  '16657645': 8,        // Thunder Road - Bruce Springsteen
  '1325847072': 8,      // Like a Virgin - Madonna
  '3880694': 8,         // You Shook Me All Night Long - AC/DC
  '574922843': 8,       // Welcome To The Jungle - Guns N' Roses
  '1375889742': 8,      // Material Girl - Madonna
  '3817527': 8,         // Wake Me Up Before You Go-Go - Wham!
  '3819770': 8,         // I Wanna Dance With Somebody - Whitney Houston
  '17550649': 8,        // Your Song - Elton John
  '21598315': 8,        // Bridge Over Troubled Water - Simon & Garfunkel
  '22003762': 8,        // Sunday Bloody Sunday - U2
  '1482114996': 8,      // Paradise City - Guns N' Roses

  // 经典香港歌曲 (9)
  '172386': 9,          // 半斤八两 - 许冠杰
  '172455': 9,          // 铁塔凌云 - 许冠杰
  '171530': 9,          // 浪子心声 - 许冠杰
  '311645': 9,          // 风雨同路 - 徐小凤
  '25638765': 9,        // 狮子山下 - 罗文
};

function addWeights() {
  const data = readSongs();
  let added = 0;
  let mapped = 0;

  for (const [key, slot] of Object.entries(data.slots)) {
    for (const song of slot.active) {
      if (song.weight === undefined) {
        song.weight = WEIGHT_MAP[song.id] || 5;
        if (WEIGHT_MAP[song.id]) mapped++;
        added++;
      }
    }
    for (const song of slot.reserve) {
      if (song.weight === undefined) {
        song.weight = WEIGHT_MAP[song.id] || 5;
        added++;
      }
    }
  }

  writeSongs(data);
  console.log(`[add-weights] 已添加 weight 字段: ${added} 首歌曲`);
  console.log(`[add-weights] 其中手动指定高权重: ${mapped} 首`);
}

addWeights();
