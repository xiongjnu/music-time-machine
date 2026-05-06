# 🎵 音乐时光机器 / Music Time Machine

以年代为轴的音乐时光探索器 — 滑动年代、选择地区、筛选风格，快速发现和收听每个时代的经典音乐。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动（自动打开浏览器）
./start.sh          # macOS / Linux
start.bat           # Windows

# 或者手动启动
node server/index.js
# 然后浏览器打开 http://localhost:3000
```

**要求**：Node.js 18+

## 功能

- **年代滑块** — 1970~2000，5年一格
- **地区切换** — 欧美 / 香港 / 大陆
- **风格筛选** — Mix混合 / 摇滚 / 民谣 / 流行 / R&B / 电子
- **Mix模式** — 跨风格随机组合，每类最多2首
- **扫码登录** — 网易云音乐APP扫码，Cookie仅存内存
- **点击即播** — HTML5 Audio，自动播放下一首
- **VIP降级** — VIP歌曲自动提示并切换音源
- **星际隧道视觉** — Canvas星空粒子+流动光带，颜色随年代变化

## 技术架构

```
client/                    服务端
├── index.html             Express (localhost:3000)
├── css/style.css          ├── /api/auth/*    登录
└── js/                    ├── /api/songs/*   歌曲列表
    ├── app.js             ├── /api/play/*    播放URL
    ├── player.js          └── /api/meta      年代/地区/风格
    └── tunnel.js
                           data/
                           └── songs.json     策展歌曲数据(13格×130首)
```

- **后端**: Node.js + Express + NeteaseCloudMusicApiEnhanced
- **前端**: 纯 HTML/CSS/JS，零构建依赖
- **播放**: HTML5 Audio API
- **动画**: Canvas 2D API

## 项目结构

```
musictm/
├── client/                 # 前端
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js          # 主逻辑（认证+UI+列表）
│       ├── player.js       # 播放引擎
│       └── tunnel.js       # Canvas动画
├── server/                 # 后端
│   ├── index.js            # 入口
│   ├── routes/             # API路由
│   ├── services/           # 策展数据+缓存
│   ├── sources/            # 音源适配器
│   └── utils/              # 日志+限速
├── data/                   # 策展数据
│   ├── songs.json          # 歌曲数据集
│   └── backups/            # 自动备份
├── scripts/                # 数据工具
│   ├── core/               # 共享模块
│   ├── bulk-fill.js        # 批量搜索填充
│   ├── validate.js         # 数据校验
│   ├── fill-template.js    # 格子生成
│   └── search-helper.js    # 交互式搜索
├── DEVELOPMENT.md          # 完整开发文档
├── start.sh / start.bat    # 启动脚本
└── CLAUDE.md
```

## 开发

```bash
# 验证数据
node scripts/validate.js
node scripts/validate.js --check-online

# 搜索歌曲
node scripts/search-helper.js "歌名" "歌手"

# 批量填充
node scripts/bulk-fill.js --slot 1975-western-rock --force

# 扩展格子
node scripts/fill-template.js --missing --write
```

## 安全说明

- 本项目为网易云音乐第三方客户端，登录使用二维码扫码方式
- Cookie 仅存储于浏览器内存，关闭即失效
- 正常听歌行为属于低风险，但极小概率可能触发平台风控

## License

MIT
