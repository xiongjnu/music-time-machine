# music-time-machine

以年代为轴的音乐时光探索器，通过滑动年代→选择地区→筛选风格，快速发现和收听每个时代的经典音乐。

## 技术栈

- 语言/框架：Node.js 18+ / Express 4.x
- 关键依赖：@neteasecloudmusicapienhanced/api
- 前端：纯 HTML/CSS/JS

## 常用命令

- 安装：`npm install`
- 运行：`./start.sh`（Mac）或 `start.bat`（Windows）
- 开发：`node server/index.js` 启动后端，浏览器打开 `client/index.html`
- 测试：`node --test test/unit/*.test.js test/integration/*.test.js`
- 覆盖率：`node --test --experimental-test-coverage test/unit/*.test.js test/integration/*.test.js`

## 部署

- PM2 生产部署：`pm2 start ecosystem.config.js`
- 开机自启：`pm2 startup` → 执行提示命令 → `pm2 save`

## 仓库

https://github.com/xiongjnu/music-time-machine

## 目录结构

```
musictm/
├── client/          # 前端（HTML/CSS/JS）
├── server/          # 后端服务
│   ├── routes/      # API路由
│   ├── services/    # 业务服务
│   ├── sources/     # 音源适配器
│   └── utils/       # 工具函数
├── data/            # 策展数据
├── scripts/         # 数据工具脚本
│   └── core/        # 核心库（schema, api, store）
├── test/            # 测试
│   ├── unit/        # 单元测试（47 tests）
│   └── integration/ # 集成测试
├── electron/        # Electron 桌面应用
└── DEVELOPMENT.md   # 完整开发文档
```
