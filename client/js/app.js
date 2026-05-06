/**
 * app.js — 应用主逻辑
 * 认证 + UI控制 + 列表渲染 + 状态管理
 */
(function () {
  'use strict';

  // ── 状态 ──
  const state = {
    era: '1975',
    region: 'western',
    genre: 'mix',
    songs: [],
    currentSong: null,
    year: null,
    isPlaying: false,
    isLoggedIn: false,
    profile: null,
    qrKey: null,
    pollTimer: null,
  };

  // ── DOM 引用 ──
  let $loginPage, $mainPage, $qrImg, $qrStatus, $slider, $eraLabel;
  let $regions, $genres, $songList, $progressBar, $progressFill, $timeCurrent, $timeDuration;
  let $volSlider, $btnPrev, $btnNext, $btnPlay, $btnLogout, $userInfo;
  let $songTitle, $songArtist, $yearSelector;

  const player = new Player();
  let tunnel;

  // ── 初始化 ──
  async function init() {
    tunnel = new Tunnel();
    tunnel.mount(document.body);

    cacheDom();
    bindEvents();
    setEraUI(state.era);

    player.unlock();
    player.onStateChange = onPlayerStateChange;
    player.onProgress = onPlayerProgress;
    player.onToast = showToast;

    // 超时处理：10秒无响应则显示离线提示
    const timeout = setTimeout(() => {
      const loading = document.getElementById('loading-overlay');
      if (loading) {
        loading.querySelector('.loading-text').textContent = '服务启动中，请稍候...';
      }
    }, 10000);

    // 检查登录状态（带重试）
    let connected = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        connected = true;
        clearTimeout(timeout);

        if (data.code === 200 && data.data.isLogin) {
          state.isLoggedIn = true;
          state.profile = data.data.profile;
          showMainPage();
        } else {
          showLoginPage();
        }
        break;
      } catch {
        if (attempt < 2) await sleep(1000);
      }
    }

    if (!connected) {
      clearTimeout(timeout);
      const loading = document.getElementById('loading-overlay');
      if (loading) {
        loading.querySelector('.loading-spinner').style.display = 'none';
        loading.querySelector('.loading-text').textContent = '无法连接后端服务，请确认服务已启动';
      }
    }

    // 隐藏加载遮罩
    const loading = document.getElementById('loading-overlay');
    if (loading) { loading.style.opacity = '0'; setTimeout(() => loading.remove(), 500); }
  }

  function cacheDom() {
    $loginPage = document.getElementById('login-page');
    $mainPage = document.getElementById('main-page');
    $qrImg = document.getElementById('qr-img');
    $qrStatus = document.getElementById('qr-status');
    $slider = document.getElementById('era-slider');
    $eraLabel = document.getElementById('era-label');
    $yearSelector = document.getElementById('year-selector');
    $regions = document.getElementById('regions');
    $genres = document.getElementById('genres');
    $songList = document.getElementById('song-list');
    $progressBar = document.getElementById('progress-bar');
    $progressFill = document.getElementById('progress-fill');
    $timeCurrent = document.getElementById('time-current');
    $timeDuration = document.getElementById('time-duration');
    $volSlider = document.getElementById('vol-slider');
    $btnPrev = document.getElementById('btn-prev');
    $btnNext = document.getElementById('btn-next');
    $btnPlay = document.getElementById('btn-play');
    $btnLogout = document.getElementById('btn-logout');
    $userInfo = document.getElementById('user-info');
    $songTitle = document.getElementById('now-title');
    $songArtist = document.getElementById('now-artist');
  }

  function bindEvents() {
    $slider.addEventListener('input', onSliderChange);
    $regions.addEventListener('click', onRegionClick);
    $genres.addEventListener('click', onGenreClick);
    $yearSelector.addEventListener('click', onYearClick);
    $songList.addEventListener('click', onSongClick);
    $progressBar.addEventListener('click', onProgressClick);
    $volSlider.addEventListener('input', onVolumeChange);
    $btnPrev.addEventListener('click', () => player.prev());
    $btnNext.addEventListener('click', () => player.next());
    $btnPlay.addEventListener('click', () => player.toggle());
    $btnLogout.addEventListener('click', onLogout);
  }

  // ── 登录页 ──
  function showLoginPage() {
    $loginPage.style.display = 'flex';
    $mainPage.style.display = 'none';
    startQrFlow();
  }

  function showMainPage() {
    $loginPage.style.display = 'none';
    $mainPage.style.display = 'flex';
    if (state.profile) {
      $userInfo.textContent = state.profile.nickname || '已登录';
    }
    renderYearButtons(state.era);
    loadSongs();
  }

  async function startQrFlow() {
    try {
      // 获取key
      const keyRes = await fetch('/api/auth/qrcode/key', { method: 'POST' });
      const keyData = await keyRes.json();
      if (keyData.code !== 200) { showQrError(); return; }
      state.qrKey = keyData.data.unikey;

      // 创建二维码
      const qrRes = await fetch('/api/auth/qrcode/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: state.qrKey }),
      });
      const qrData = await qrRes.json();
      if (qrData.code !== 200) { showQrError(); return; }

      $qrImg.src = qrData.data.qrimg;
      $qrStatus.textContent = '请打开网易云音乐APP扫码登录';

      // 开始轮询
      pollQrStatus();
    } catch {
      showQrError();
    }
  }

  function pollQrStatus() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/qrcode/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: state.qrKey }),
        });
        const data = await res.json();

        switch (data.code) {
          case 800:
            $qrStatus.textContent = '二维码已过期，正在刷新...';
            clearInterval(state.pollTimer);
            setTimeout(startQrFlow, 1000);
            break;
          case 801:
            $qrStatus.textContent = '等待扫码...';
            break;
          case 802:
            $qrStatus.textContent = '请在手机上确认登录';
            break;
          case 803:
            clearInterval(state.pollTimer);
            state.isLoggedIn = true;
            $qrStatus.textContent = '登录成功！';
            setTimeout(showMainPage, 500);
            break;
        }
      } catch { /* retry next poll */ }
    }, 2000);
  }

  function showQrError() {
    $qrStatus.textContent = '二维码加载失败，请刷新重试';
  }

  // ── 登出 ──
  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    state.isLoggedIn = false;
    state.profile = null;
    showLoginPage();
  }

  // ── 歌曲列表加载 ──
  let _loadRetries = 0;

  async function loadSongs() {
    const params = new URLSearchParams({ era: state.era, region: state.region, genre: state.genre });
    if (state.year) params.set('year', state.year);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`/api/songs?${params}`);
        const data = await res.json();
        if (data.code === 200) {
          state.songs = data.data.songs;
          _loadRetries = 0;
          renderSongList();
          player.setPlaylist(state.songs, 0);
          return;
        }
      } catch { /* retry once */ }
      if (attempt === 0) await sleep(600);
    }
    _loadRetries++;
    showToast(_loadRetries >= 3 ? '后端服务异常，请检查服务状态' : '歌曲加载失败，重试中...');
  }

  function renderSongList() {
    const currentId = player.currentSong ? player.currentSong.id : null;
    $songList.innerHTML = '';
    if (state.songs.length === 0) {
      $songList.innerHTML = '<div class="song-empty">该年代暂无歌曲</div>';
      return;
    }
    state.songs.forEach((song, i) => {
      const row = document.createElement('div');
      row.className = 'song-row' + (song.id === currentId ? ' playing' : '');
      row.dataset.index = i;
      row.innerHTML = `
        <span class="song-idx">${i + 1}</span>
        <span class="song-info">
          <span class="song-title">${escHtml(song.title)}${song.isVip ? ' <span class="vip-badge" title="VIP">👑</span>' : ''}</span>
          <span class="song-artist">${escHtml(song.artist)}</span>
        </span>
        ${state.genre === 'mix' ? `<span class="song-genre-tag">${song.genreTag || ''}</span>` : ''}
        <span class="song-duration">${fmtDuration(song.duration)}</span>
      `;
      $songList.appendChild(row);
    });
  }

  // ── 滑块 ──
  function onSliderChange() {
    state.era = $slider.value;
    setEraUI(state.era);
    tunnel.setEra(state.era);
    renderYearButtons(state.era);
    loadSongs();
  }

  function setEraUI(era) {
    $slider.value = era;
    $eraLabel.textContent = era;
    const colors = {
      '1970': '#E8833A', '1975': '#C62828', '1980': '#FF1493', '1985': '#00BFFF',
      '1990': '#1A237E', '1995': '#90CAF9', '2000': '#F5F5F5',
    };
    document.documentElement.style.setProperty('--era-primary', colors[era] || '#C62828');
  }

  // ── 年份二级选择器 ──
  function renderYearButtons(era) {
    const base = parseInt(era, 10);
    $yearSelector.innerHTML = '';
    for (let y = base; y < base + 5; y++) {
      const btn = document.createElement('button');
      btn.className = 'year-btn';
      btn.textContent = y;
      btn.dataset.year = y;
      if (state.year === y || (state.year === null && y === base)) {
        btn.classList.add('active');
        state.year = y;
      }
      $yearSelector.appendChild(btn);
    }
    $yearSelector.style.display = 'flex';
  }

  function onYearClick(e) {
    const btn = e.target.closest('.year-btn');
    if (!btn) return;
    state.year = parseInt(btn.dataset.year, 10);
    $yearSelector.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadSongs();
  }

  // ── 地区/风格 ──
  function onRegionClick(e) {
    const btn = e.target.closest('.region-btn');
    if (!btn) return;
    state.region = btn.dataset.region;
    $regions.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadSongs();
  }

  function onGenreClick(e) {
    const btn = e.target.closest('.genre-chip');
    if (!btn) return;
    state.genre = btn.dataset.genre;
    $genres.querySelectorAll('.genre-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadSongs();
  }

  // ── 歌曲点击播放 ──
  function onSongClick(e) {
    const row = e.target.closest('.song-row');
    if (!row) return;
    const idx = parseInt(row.dataset.index);
    const song = state.songs[idx];
    if (!song) return;
    player.setPlaylist(state.songs, idx);
    player.play(song);
  }

  // ── 播放器进度 ──
  function onProgressClick(e) {
    const rect = $progressBar.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    player.seek(pct);
  }

  function onVolumeChange() {
    player.setVolume(parseInt($volSlider.value));
  }

  function onPlayerStateChange(ps) {
    state.isPlaying = ps.isPlaying;
    state.currentSong = ps.currentSong;
    $btnPlay.textContent = ps.isPlaying ? '⏸' : '▶';

    if (ps.currentSong) {
      $songTitle.textContent = ps.currentSong.title;
      $songArtist.textContent = ps.currentSong.artist;
    }

    // 更新列表播放高亮
    const rows = $songList.querySelectorAll('.song-row');
    rows.forEach(r => {
      const idx = parseInt(r.dataset.index);
      r.classList.toggle('playing', idx === ps.currentIndex);
    });
  }

  function onPlayerProgress(p) {
    $progressFill.style.width = p.pct + '%';
    $timeCurrent.textContent = fmtTime(p.current);
    if (p.duration) $timeDuration.textContent = fmtTime(p.duration);
  }

  // ── Toast ──
  function showToast(msg, duration = 2000) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ── 工具 ──
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function fmtDuration(ms) {
    if (!ms || ms <= 0) return '';
    return fmtTime(ms / 1000);
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  // ── 启动 ──
  init();

})();
