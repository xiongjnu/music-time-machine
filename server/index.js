const express = require('express');
const path = require('path');
const { NeteaseAdapter } = require('./sources/netease');
const { rateLimitMiddleware } = require('./utils/rateLimiter');
const { logger } = require('./utils/logger');
const { Curator } = require('./services/curator');
const { Cache } = require('./services/cache');

const PORT = process.env.PORT || 3000;

/**
 * 创建 Express 应用实例（可测试，无副作用）
 */
async function createApp({ adapter, curator, cache } = {}) {
  const netease = adapter || new NeteaseAdapter();
  const cur = curator || new Curator();
  const cch = cache || new Cache();

  // 初始化策展数据（仅当尚未初始化时）
  if (!cur.data) {
    try {
      await cur.init(null);
      logger.info('index', '策展数据加载完成');
    } catch (err) {
      logger.warn('index', `策展数据待填充: ${err.message}`);
    }
  }

  const app = express();
  app.use(express.json());
  app.use(rateLimitMiddleware(60));

  // 静态文件 — 前端
  app.use(express.static(path.join(__dirname, '..', 'client')));

  // 挂载路由
  app.use('/api/auth', require('./routes/auth')(netease));
  app.use('/api/songs', require('./routes/songs')(cur));
  app.use('/api/play', require('./routes/play')(netease, cch));
  app.use('/api', require('./routes/meta'));

  // 前端错误上报
  app.post('/api/log', (req, res) => {
    const { level, module, message } = req.body;
    logger[level] ? logger[level](module || 'client', message) : logger.error('client', message);
    res.json({ code: 200 });
  });

  return app;
}

async function main() {
  logger.info('index', '正在初始化音源适配器...');
  const app = await createApp();
  logger.clean();

  app.listen(PORT, () => {
    console.log(`\n  🎵 音乐时光机器 v0.1.0`);
    console.log(`  ───────────────────────────────`);
    console.log(`  后端服务: http://localhost:${PORT}`);
    console.log(`  打开浏览器: http://localhost:${PORT}\n`);
  });
}

module.exports = { createApp };

// 直接运行时启动
if (require.main === module) {
  main().catch(err => {
    console.error('启动失败:', err.message);
    process.exit(1);
  });
}
