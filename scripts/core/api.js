/**
 * core/api.js — 网易云 API 封装（带重试 + 限速 + 随机抖动）
 */

const api = require('@neteasecloudmusicapienhanced/api');

const BASE_DELAY = 400;
const JITTER = 200;
const MAX_RETRIES = 2;

function jitteredDelay() {
  const ms = BASE_DELAY + Math.floor(Math.random() * JITTER);
  return new Promise(r => setTimeout(r, ms));
}

async function searchCandidates(title, artist, album, limit = 10) {
  const keyword = album ? `${title} ${artist} ${album}` : `${title} ${artist}`;
  const res = await api.cloudsearch({ keywords: keyword, type: 1, limit });

  if (res.body.code !== 200) return [];
  const songs = res.body.result?.songs;
  if (!songs || songs.length === 0) return [];

  const qTitle = title.toLowerCase();
  const qArtist = artist.toLowerCase();
  const qAlbum = (album || '').toLowerCase();

  return songs.map(song => {
    const rTitle = (song.name || '').toLowerCase();
    const rArtist = ((song.artists && song.artists[0] && song.artists[0].name) || '').toLowerCase();
    const rAlbum = ((song.album && song.album.name) || '').toLowerCase();

    const titleMatch = rTitle.includes(qTitle) || qTitle.includes(rTitle);
    const artistMatch = rArtist.includes(qArtist) || qArtist.includes(rArtist);
    const albumMatch = qAlbum && (rAlbum.includes(qAlbum) || qAlbum.includes(rAlbum));

    let confidence;
    if (titleMatch && artistMatch && albumMatch) confidence = 'high';
    else if (titleMatch && artistMatch) confidence = 'medium';
    else if (titleMatch) confidence = 'low';
    else confidence = 'none';

    let score = 0;
    if (titleMatch) score += 3;
    if (artistMatch) score += 2;

    return {
      id: String(song.id),
      title: song.name,
      artist: song.artists?.[0]?.name || '',
      artistId: String(song.artists?.[0]?.id || ''),
      album: song.album?.name || '',
      duration: song.duration || 0,
      confidence,
      score,
    };
  }).sort((a, b) => b.score - a.score);
}

async function searchSong(title, artist, album, year) {
  const candidates = await searchCandidates(title, artist, album, 10);
  if (candidates.length === 0) return null;

  const best = candidates[0];
  if (best.score < 3) return null;

  return {
    id: best.id,
    platform: 'netease',
    title: best.title,
    artist: best.artist || artist,
    artistId: best.artistId,
    album: best.album,
    year: year || null,
    duration: best.duration,
    isVip: false,
    coverUrl: '',
    genreTag: '',
  };
}

async function batchValidate(songIds, batchSize = 5) {
  const results = [];
  for (let i = 0; i < songIds.length; i += batchSize) {
    const batch = songIds.slice(i, i + batchSize);
    let success = false;
    for (let attempt = 0; attempt <= MAX_RETRIES && !success; attempt++) {
      try {
        const res = await api.song_detail({ ids: batch.join(',') });
        const songs = res.body.songs || [];
        for (const id of batch) {
          const found = songs.find(s => String(s.id) === id);
          results.push({ id, valid: !!(found && found.name) });
        }
        success = true;
      } catch {
        if (attempt === MAX_RETRIES) {
          for (const id of batch) results.push({ id, valid: false });
        } else {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    if (i + batchSize < songIds.length) await jitteredDelay();
  }
  return results;
}

module.exports = { searchCandidates, searchSong, batchValidate, jitteredDelay };
