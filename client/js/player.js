/**
 * player.js — 音频播放引擎
 * HTML5 Audio wrapper: 播放/暂停/进度/音量/自动切歌
 */
class Player {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'none';
    this.playlist = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.currentSong = null;

    this._onEnded = this._onEnded.bind(this);
    this._onError = this._onError.bind(this);
    this._onTimeUpdate = this._onTimeUpdate.bind(this);
    this.audio.addEventListener('ended', this._onEnded);
    this.audio.addEventListener('error', this._onError);
    this.audio.addEventListener('timeupdate', this._onTimeUpdate);

    // Safari 手势解锁
    this._unlockBound = null;
  }

  onStateChange = null;   // (state) => {}
  onProgress = null;      // ({ current, duration, pct }) => {}
  onToast = null;         // (msg, duration) => {}

  /** 解锁音频（Safari要求用户手势） */
  unlock() {
    if (this._unlockBound) return;
    this._unlockBound = () => {
      this.audio.play().then(() => this.audio.pause()).catch(() => {});
      document.removeEventListener('click', this._unlockBound);
      this._unlockBound = null;
    };
    document.addEventListener('click', this._unlockBound, { once: true });
  }

  setPlaylist(songs, startIndex) {
    this.playlist = songs || [];
    this.currentIndex = startIndex >= 0 ? startIndex : 0;
  }

  async play(song) {
    if (!song) return;
    this.currentSong = song;
    try {
      const res = await fetch(`/api/play/url?id=${song.id}`);
      const data = await res.json();

      if (data.code === 404 || !data.data || !data.data.url) {
        this._toast('暂无音源，跳转下一首');
        setTimeout(() => this.next(), 1500);
        return;
      }

      if (data.data.isVip) {
        this._toast('网易云VIP歌曲');
      }

      this.audio.src = data.data.url;
      await this.audio.play();
      this.isPlaying = true;
      this._emitState();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        // Safari 阻止自动播放，静默等待用户手势
        this.isPlaying = false;
        this._emitState();
        return;
      }
      this._toast('播放失败，跳转下一首');
      setTimeout(() => this.next(), 1500);
    }
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this._emitState();
  }

  resume() {
    this.audio.play().then(() => {
      this.isPlaying = true;
      this._emitState();
    }).catch((err) => {
      if (err.name === 'NotAllowedError') {
        this._toast('请点击播放按钮开始');
      }
    });
  }

  toggle() {
    this.isPlaying ? this.pause() : this.resume();
  }

  next() {
    if (this.playlist.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.play(this.playlist[this.currentIndex]);
  }

  prev() {
    if (this.playlist.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.play(this.playlist[this.currentIndex]);
  }

  seek(pct) {
    if (this.audio.duration) {
      this.audio.currentTime = (pct / 100) * this.audio.duration;
    }
  }

  setVolume(pct) {
    this.audio.volume = Math.max(0, Math.min(1, pct / 100));
  }

  getVolume() { return this.audio.volume * 100; }
  getDuration() { return this.audio.duration || 0; }
  getCurrentTime() { return this.audio.currentTime || 0; }

  _onEnded() {
    this.isPlaying = false;
    this._emitState();
    // Safari 中 ended 事件的 play() 可能被阻止，由 next() 内部降级处理
    this.next();
  }

  _onError() {
    this.isPlaying = false;
    this._emitState();
    this._toast('播放出错');
  }

  _onTimeUpdate() {
    if (this.onProgress && this.audio.duration) {
      this.onProgress({
        current: this.audio.currentTime,
        duration: this.audio.duration,
        pct: (this.audio.currentTime / this.audio.duration) * 100,
      });
    }
  }

  _emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlaying,
        currentSong: this.currentSong,
        currentIndex: this.currentIndex,
        playlistLength: this.playlist.length,
      });
    }
  }

  _toast(msg, duration = 2000) {
    if (this.onToast) this.onToast(msg, duration);
  }
}
