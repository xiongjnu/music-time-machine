const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { Curator } = require('../../server/services/curator');

function makeSong(id, title, artist, genreTag, year) {
  return { id, platform: 'netease', title, artist, genreTag, year: year || 1990, duration: 240000, isVip: false, coverUrl: '', album: '' };
}

describe('Curator', () => {
  let curator;

  beforeEach(() => {
    curator = new Curator();
    // Build a minimal in-memory data set without touching filesystem
    curator.data = { version: 1, lastUpdated: '2026-01-01', slots: {} };
    curator.cache = {};
  });

  describe('getSongs', () => {
    it('returns songs for a valid slot', () => {
      curator.cache['1990-western-rock'] = {
        active: [makeSong('1', 'Song A', 'Artist A', 'rock'), makeSong('2', 'Song B', 'Artist B', 'rock')],
        reserve: [],
      };
      const result = curator.getSongs('1990', 'western', 'rock');
      assert.strictEqual(result.songs.length, 2);
      assert.strictEqual(result.songs[0].title, 'Song A');
    });

    it('returns empty for non-existent slot', () => {
      const result = curator.getSongs('1970', 'korea', 'rock');
      assert.strictEqual(result.songs.length, 0);
      assert.strictEqual(result.dataInsufficient, true);
    });

    it('includes genreTag when present', () => {
      curator.cache['1990-western-rock'] = {
        active: [makeSong('1', 'Title', 'Artist', 'guitar')],
        reserve: [],
      };
      const result = curator.getSongs('1990', 'western', 'rock');
      assert.ok(result.songs[0].genreTag);
    });
  });

  describe('_generateMix', () => {
    it('collects songs from all genres for an era+region', () => {
      curator.cache['1990-western-rock'] = {
        active: [
          makeSong('r1', 'Rock1', 'Artist', 'rock'),
          makeSong('r2', 'Rock2', 'Artist', 'rock'),
          makeSong('r3', 'Rock3', 'Artist', 'rock'),
        ],
      };
      curator.cache['1990-western-pop'] = {
        active: [
          makeSong('p1', 'Pop1', 'Artist', 'pop'),
          makeSong('p2', 'Pop2', 'Artist', 'pop'),
        ],
      };
      curator.cache['1990-western-jazz'] = {
        active: [makeSong('j1', 'Jazz1', 'Artist', 'jazz')],
      };

      const result = curator._generateMix('1990', 'western');
      assert.strictEqual(result.songs.length, 6);
    });

    it('caps initial selection at 2 per genre', () => {
      // With many genres, each providing 3 songs, the initial round picks ≤2 each
      // and total caps at 10 — so no single genre should dominate
      const genres = ['rock', 'folk', 'pop', 'rnb', 'electronic', 'classical', 'hiphop', 'jazz'];
      genres.forEach((g) => {
        curator.cache[`1990-western-${g}`] = {
          active: Array.from({ length: 3 }, (_, i) =>
            makeSong(`${g}${i}`, `${g}Song${i}`, 'Artist', g)),
        };
      });
      const result = curator._generateMix('1990', 'western');
      // With max 2 per genre and 8 genres, there are plenty of songs — no fill step needed
      const counts = {};
      result.songs.forEach(s => { counts[s.genreTag] = (counts[s.genreTag] || 0) + 1; });
      for (const genre of Object.keys(counts)) {
        assert.ok(counts[genre] <= 2, `${genre} has ${counts[genre]}, expected <= 2`);
      }
      assert.ok(Object.keys(counts).length >= 5, 'expected songs from at least 5 genres');
    });

    it('returns at most 10 songs', () => {
      const genres = ['rock', 'folk', 'pop', 'rnb', 'electronic', 'classical', 'hiphop', 'jazz'];
      genres.forEach((g) => {
        curator.cache[`1990-western-${g}`] = {
          active: Array.from({ length: 3 }, (_, i) =>
            makeSong(`${g}${i}`, `${g}Song${i}`, 'Artist', g)),
        };
      });
      const result = curator._generateMix('1990', 'western');
      assert.ok(result.songs.length <= 10);
    });

    it('marks dataInsufficient when fewer than 5 songs total', () => {
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
});
