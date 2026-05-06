const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { Curator } = require('../../server/services/curator');

function makeSong(id, title, artist, genreTag, year, weight) {
  return { id, platform: 'netease', title, artist, genreTag, year: year || 1990, weight: weight || 5, duration: 240000, isVip: false, coverUrl: '', album: '' };
}

describe('Curator', () => {
  let curator;

  beforeEach(() => {
    curator = new Curator();
    curator.data = { version: 1, lastUpdated: '2026-01-01', slots: {} };
    curator.cache = {};
  });

  describe('getSongs', () => {
    it('returns up to 30 songs for a valid slot', () => {
      const songs = Array.from({ length: 50 }, (_, i) =>
        makeSong(`${i}`, `Song${i}`, `Artist${i % 25}`, 'rock', 1990 + (i % 5), 5));
      curator.cache['1990-western-rock'] = { active: songs, reserve: [] };
      const result = curator.getSongs('1990', 'western', 'rock');
      assert.ok(result.songs.length <= 30);
      assert.ok(result.songs.length > 0);
    });

    it('returns all songs when pool is smaller than 30', () => {
      curator.cache['1990-western-rock'] = {
        active: [makeSong('1', 'Song A', 'Artist A', 'rock'), makeSong('2', 'Song B', 'Artist B', 'rock')],
        reserve: [],
      };
      const result = curator.getSongs('1990', 'western', 'rock');
      assert.strictEqual(result.songs.length, 2);
    });

    it('returns empty for non-existent slot', () => {
      const result = curator.getSongs('1970', 'korea', 'rock');
      assert.strictEqual(result.songs.length, 0);
      assert.strictEqual(result.dataInsufficient, true);
    });

    it('returns dataInsufficient when pool < 10', () => {
      curator.cache['1990-western-rock'] = {
        active: [makeSong('1', 'Song A', 'Artist A', 'rock')],
        reserve: [],
      };
      const result = curator.getSongs('1990', 'western', 'rock');
      assert.strictEqual(result.dataInsufficient, true);
    });

    it('no artist appears more than twice', () => {
      const songs = [];
      for (let i = 0; i < 50; i++) {
        songs.push(makeSong(`${i}`, `Song${i}`, 'SameArtist', 'rock', 1990 + (i % 5), 5));
      }
      curator.cache['1990-western-rock'] = { active: songs, reserve: [] };
      const result = curator.getSongs('1990', 'western', 'rock');
      const counts = {};
      result.songs.forEach(s => { counts[s.artist] = (counts[s.artist] || 0) + 1; });
      for (const artist of Object.keys(counts)) {
        assert.ok(counts[artist] <= 2, `${artist} appears ${counts[artist]} times`);
      }
    });
  });

  describe('_generateMix', () => {
    it('collects songs from all genres for an era+region', () => {
      curator.cache['1990-western-rock'] = {
        active: [makeSong('r1', 'Rock1', 'Artist1', 'rock'), makeSong('r2', 'Rock2', 'Artist2', 'rock')],
      };
      curator.cache['1990-western-pop'] = {
        active: [makeSong('p1', 'Pop1', 'Artist3', 'pop')],
      };
      curator.cache['1990-western-jazz'] = {
        active: [makeSong('j1', 'Jazz1', 'Artist4', 'jazz')],
      };
      const result = curator._generateMix('1990', 'western');
      assert.strictEqual(result.songs.length, 4);
    });

    it('caps per-genre selection at 4', () => {
      const genres = ['rock', 'folk', 'pop', 'rnb', 'electronic', 'classical', 'hiphop', 'jazz'];
      genres.forEach((g) => {
        curator.cache[`1990-western-${g}`] = {
          active: Array.from({ length: 6 }, (_, i) =>
            makeSong(`${g}${i}`, `${g}Song${i}`, `Artist${i}`, g)),
        };
      });
      const result = curator._generateMix('1990', 'western');
      const counts = {};
      result.songs.forEach(s => { counts[s.genreTag] = (counts[s.genreTag] || 0) + 1; });
      for (const genre of Object.keys(counts)) {
        assert.ok(counts[genre] <= 4, `${genre} has ${counts[genre]}, expected <= 4`);
      }
    });

    it('returns at most 30 songs', () => {
      const genres = ['rock', 'folk', 'pop', 'rnb', 'electronic', 'classical', 'hiphop', 'jazz'];
      genres.forEach((g) => {
        curator.cache[`1990-western-${g}`] = {
          active: Array.from({ length: 10 }, (_, i) =>
            makeSong(`${g}${i}`, `${g}Song${i}`, `Artist${i}`, g)),
        };
      });
      const result = curator._generateMix('1990', 'western');
      assert.ok(result.songs.length <= 30);
    });

    it('marks dataInsufficient when fewer than 10 songs total', () => {
      curator.cache['1990-western-rock'] = {
        active: [makeSong('r1', 'Rock1', 'Artist', 'rock')],
      };
      const result = curator._generateMix('1990', 'western');
      assert.strictEqual(result.dataInsufficient, true);
    });

    it('returns empty when no genres available', () => {
      const result = curator._generateMix('1970', 'korea');
      assert.strictEqual(result.songs.length, 0);
      assert.strictEqual(result.dataInsufficient, true);
    });
  });

  describe('_weightedRandomSelect', () => {
    it('returns expected count when pool is large enough', () => {
      const pool = Array.from({ length: 50 }, (_, i) =>
        makeSong(`${i}`, `Song${i}`, `Artist${i}`, 'rock', 1990, 5));
      const result = curator._weightedRandomSelect(pool, 10);
      assert.strictEqual(result.length, 10);
    });

    it('returns all when pool is smaller than count', () => {
      const pool = [makeSong('1', 'S1', 'A1', 'rock'), makeSong('2', 'S2', 'A2', 'rock')];
      const result = curator._weightedRandomSelect(pool, 10);
      assert.strictEqual(result.length, 2);
    });

    it('returns empty for empty pool', () => {
      const result = curator._weightedRandomSelect([], 10);
      assert.strictEqual(result.length, 0);
    });

    it('higher weight songs appear more frequently', () => {
      const pool = [
        makeSong('high', 'High', 'Artist', 'rock', 1990, 10),
        makeSong('low1', 'Low1', 'Artist', 'rock', 1990, 1),
        makeSong('low2', 'Low2', 'Artist', 'rock', 1990, 1),
        makeSong('low3', 'Low3', 'Artist', 'rock', 1990, 1),
        makeSong('low4', 'Low4', 'Artist', 'rock', 1990, 1),
      ];
      // Run many times to verify statistical weight preference
      let highCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = curator._weightedRandomSelect(pool, 3);
        if (result.some(s => s.id === 'high')) highCount++;
      }
      // weight 10 vs 4x weight 1: P(high) = 10/(10+4) ≈ 71%
      assert.ok(highCount > 40, `high weight song selected ${highCount}/100 times`);
    });
  });

  describe('_shuffle', () => {
    it('preserves all elements after shuffle', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const copy = [...arr];
      curator._shuffle(copy);
      assert.strictEqual(copy.length, arr.length);
      assert.deepStrictEqual(copy.sort((a, b) => a - b), arr);
    });
  });
});
