const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');

describe('Routes — Songs', () => {
  let app;
  let mockCurator;

  beforeEach(() => {
    mockCurator = {
      getSongs: (era, region, genre) => {
        if (genre === 'mix') {
          return {
            songs: [
              { id: '1', title: 'Mix1', artist: 'A', genreTag: 'rock' },
              { id: '2', title: 'Mix2', artist: 'B', genreTag: 'pop' },
              { id: '3', title: 'Mix3', artist: 'C', genreTag: 'rock' },
              { id: '4', title: 'Mix4', artist: 'D', genreTag: 'rnb' },
              { id: '5', title: 'Mix5', artist: 'E', genreTag: 'pop' },
            ],
          };
        }
        if (era === 'empty') {
          return { songs: [], dataInsufficient: true };
        }
        return {
          songs: [
            { id: '1', title: 'Song1', artist: 'Artist1', duration: 240000, year: 1990, isVip: false, genreTag: genre },
            { id: '2', title: 'Song2', artist: 'Artist2', duration: 250000, year: 1991, isVip: false, genreTag: genre },
          ],
        };
      },
    };

    const songsFactory = require('../../server/routes/songs');
    app = express();
    app.use('/api/songs', songsFactory(mockCurator));
  });

  it('returns songs for valid query', async () => {
    const res = await request(app).get('/api/songs?era=1990&region=western&genre=rock');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.songs.length, 2);
  });

  it('filters by year when provided', async () => {
    const res = await request(app).get('/api/songs?era=1990&region=western&genre=rock&year=1990');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.songs.length, 1);
    assert.strictEqual(res.body.data.songs[0].year, 1990);
  });

  it('handles mix genre', async () => {
    const res = await request(app).get('/api/songs?era=1990&region=western&genre=mix');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.songs.length, 5);
  });

  it('returns 400 for missing era parameter', async () => {
    const res = await request(app).get('/api/songs?region=western&genre=rock');
    assert.strictEqual(res.status, 400);
  });

  it('returns empty list for slots with no songs', async () => {
    const res = await request(app).get('/api/songs?era=empty&region=korea&genre=rock');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.songs.length, 0);
  });
});
