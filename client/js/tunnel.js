/**
 * tunnel.js — 星际隧道 Canvas 动画
 * 星空粒子 + 光带流动，颜色随年代变化
 */
class Tunnel {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'tunnel-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.brightStars = [];
    this.ribbons = [];
    this.era = '1975';
    this.animationId = null;
    this._resizeBound = this._resize.bind(this);
  }

  mount(container) {
    container.prepend(this.canvas);
    this._resize();
    window.addEventListener('resize', this._resizeBound);
    this._initStars();
    this._initRibbons();
    this._animate();
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this._resizeBound);
    this.canvas.remove();
  }

  setEra(era) {
    this.era = era;
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _initStars() {
    // 200+ 小星星
    for (let i = 0; i < 220; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        r: 0.3 + Math.random() * 1.7,
        opacity: 0.2 + Math.random() * 0.6,
        twinkleSpeed: 0.005 + Math.random() * 0.02,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    // 30+ 亮星
    for (let i = 0; i < 35; i++) {
      this.brightStars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        r: 1.5 + Math.random() * 2.5,
        opacity: 0.5 + Math.random() * 0.5,
        twinkleSpeed: 0.003 + Math.random() * 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  _initRibbons() {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.ribbons.push({
        y: this.canvas.height * (0.2 + Math.random() * 0.6),
        amplitude: 20 + Math.random() * 60,
        frequency: 0.002 + Math.random() * 0.004,
        speed: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        width: 1 + Math.random() * 2.5,
        opacity: 0.1 + Math.random() * 0.3,
      });
    }
  }

  _animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this._drawStars();
    this._drawRibbons();
    this.animationId = requestAnimationFrame(() => this._animate());
  }

  _drawStars() {
    const now = Date.now();
    // 小星星
    for (const s of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(now * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.opacity * twinkle;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      this.ctx.fill();
    }
    // 亮星（带光晕）
    for (const s of this.brightStars) {
      const twinkle = 0.6 + 0.4 * Math.sin(now * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.opacity * twinkle;
      const gradient = this.ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      gradient.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(2)})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
  }

  _drawRibbons() {
    const colors = ERA_COLORS[this.era] || ERA_COLORS['1975'];
    const now = Date.now();

    for (const r of this.ribbons) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = colors.primary;
      this.ctx.lineWidth = r.width;
      this.ctx.globalAlpha = r.opacity;

      const offset = ((now * 0.02 * r.speed) % this.canvas.width);
      for (let x = -50; x < this.canvas.width + 50; x += 3) {
        const y = r.y + Math.sin((x + offset) * r.frequency + r.phase) * r.amplitude;
        if (x === -50) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }
  }
}

const ERA_COLORS = {
  '1970': { primary: 'rgba(232,131,58,0.6)', secondary: 'rgba(139,94,60,0.4)' },
  '1975': { primary: 'rgba(198,40,40,0.6)', secondary: 'rgba(255,179,0,0.4)' },
  '1980': { primary: 'rgba(255,20,147,0.6)', secondary: 'rgba(123,104,238,0.4)' },
  '1985': { primary: 'rgba(0,191,255,0.6)', secondary: 'rgba(148,0,211,0.4)' },
  '1990': { primary: 'rgba(26,35,126,0.6)', secondary: 'rgba(0,200,83,0.4)' },
  '1995': { primary: 'rgba(144,202,249,0.6)', secondary: 'rgba(224,224,224,0.4)' },
  '2000': { primary: 'rgba(245,245,245,0.6)', secondary: 'rgba(179,229,252,0.4)' },
};
