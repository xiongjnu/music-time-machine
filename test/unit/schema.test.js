const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  SLOT_KEY_RE, parseSlotKey, formatSlotKey,
  GENRE_TAGS, ERAS, REGIONS, GENRES, REQUIRED_FIELDS,
} = require('../../scripts/core/schema');

describe('schema', () => {
  describe('parseSlotKey', () => {
    it('parses a valid slot key', () => {
      const result = parseSlotKey('1975-western-rock');
      assert.deepStrictEqual(result, { era: '1975', region: 'western', genre: 'rock' });
    });

    it('parses newly added regions and genres', () => {
      assert.ok(parseSlotKey('1990-taiwan-pop'));
      assert.ok(parseSlotKey('2000-japan-jazz'));
      assert.ok(parseSlotKey('1985-korea-hiphop'));
      assert.ok(parseSlotKey('1975-western-classical'));
    });

    it('returns null for invalid key', () => {
      assert.strictEqual(parseSlotKey('invalid'), null);
      assert.strictEqual(parseSlotKey('1975-unknown-rock'), null);
      assert.strictEqual(parseSlotKey(''), null);
      assert.strictEqual(parseSlotKey('1975-western-unknown'), null);
    });
  });

  describe('formatSlotKey', () => {
    it('formats era, region, genre into a slot key', () => {
      assert.strictEqual(formatSlotKey('1980', 'hk', 'pop'), '1980-hk-pop');
      assert.strictEqual(formatSlotKey('1995', 'japan', 'rock'), '1995-japan-rock');
    });
  });

  describe('SLOT_KEY_RE', () => {
    it('matches all current regions and genres', () => {
      for (const era of ERAS) {
        for (const region of REGIONS) {
          for (const genre of GENRES) {
            const key = `${era}-${region}-${genre}`;
            assert.ok(SLOT_KEY_RE.test(key), `should match: ${key}`);
          }
        }
      }
    });
  });

  describe('GENRE_TAGS', () => {
    it('has entries for all genres', () => {
      for (const genre of GENRES) {
        assert.ok(GENRE_TAGS[genre], `genre tag missing for: ${genre}`);
      }
    });
  });

  describe('constants', () => {
    it('ERAS has 7 entries', () => assert.strictEqual(ERAS.length, 7));
    it('REGIONS has 6 entries', () => assert.strictEqual(REGIONS.length, 6));
    it('GENRES has 8 entries', () => assert.strictEqual(GENRES.length, 8));
    it('REQUIRED_FIELDS includes id, platform, title, artist, genreTag', () => {
      assert.ok(REQUIRED_FIELDS.includes('id'));
      assert.ok(REQUIRED_FIELDS.includes('platform'));
      assert.ok(REQUIRED_FIELDS.includes('title'));
      assert.ok(REQUIRED_FIELDS.includes('artist'));
      assert.ok(REQUIRED_FIELDS.includes('genreTag'));
    });
  });
});
