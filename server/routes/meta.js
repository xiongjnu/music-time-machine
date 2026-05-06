const express = require('express');
const router = express.Router();

/**
 * 元数据路由 — 年代/地区/风格列表
 */

const ERAS = ['1970', '1980', '1990', '2000', '2010', '2020'];

const REGIONS = [
  { id: 'western', name: '欧美' },
  { id: 'hk', name: '香港' },
  { id: 'mainland', name: '大陆' },
  { id: 'taiwan', name: '台湾' },
  { id: 'japan', name: '日本' },
  { id: 'korea', name: '韩国' },
];

const GENRES = [
  { id: 'mix', name: 'Mix', icon: '🎲' },
  { id: 'rock', name: '摇滚', icon: '🎸' },
  { id: 'folk', name: '民谣', icon: '🎻' },
  { id: 'pop', name: '流行', icon: '🎤' },
  { id: 'rnb', name: 'R&B', icon: '🎶' },
  { id: 'electronic', name: '电子', icon: '🎹' },
  { id: 'classical', name: '古典', icon: '🎼' },
  { id: 'hiphop', name: '嘻哈', icon: '🎧' },
  { id: 'jazz', name: '爵士', icon: '🎺' },
];

router.get('/eras', (req, res) => {
  res.json({ code: 200, data: ERAS });
});

router.get('/regions', (req, res) => {
  res.json({ code: 200, data: REGIONS });
});

router.get('/genres', (req, res) => {
  res.json({ code: 200, data: GENRES });
});

module.exports = router;
