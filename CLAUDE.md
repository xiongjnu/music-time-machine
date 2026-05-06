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
└── DEVELOPMENT.md   # 完整开发文档
```
