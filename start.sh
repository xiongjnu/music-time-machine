#!/bin/bash
# Music Time Machine — Mac/Linux 启动脚本

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "  🎵 音乐时光机器 v0.1.0"
echo "  ───────────────────────"
echo ""

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
  echo "❌ 未找到 Node.js，请安装 Node.js 18+"
  echo "   https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 版本过低（当前: $(node -v)），需要 18+"
  exit 1
fi

echo "✅ Node.js $(node -v)"

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "⏳ 正在安装依赖..."
  npm install --silent
  echo "✅ 依赖安装完成"
fi

# 检查端口
PORT="${PORT:-3000}"
if lsof -i :"$PORT" &> /dev/null; then
  echo "⚠️  端口 $PORT 已被占用，尝试使用 3001"
  PORT=3001
fi

echo "🚀 启动后端服务 (端口: $PORT)..."
echo ""

# 启动后端
PORT=$PORT node server/index.js &
PID=$!

# 等待服务就绪
echo -n "⏳ 等待服务就绪"
for i in $(seq 1 15); do
  if curl -s "http://localhost:$PORT/api/eras" &> /dev/null; then
    echo ""
    echo "✅ 服务就绪"
    break
  fi
  echo -n "."
  sleep 0.5
done

# 打开浏览器
if command -v open &> /dev/null; then
  open "http://localhost:$PORT"
elif command -v xdg-open &> /dev/null; then
  xdg-open "http://localhost:$PORT"
fi

echo ""
echo "  ───────────────────────────────"
echo "  地址: http://localhost:$PORT"
echo "  按 Ctrl+C 停止服务"
echo ""

# 捕获退出信号
trap "kill $PID 2>/dev/null; echo ''; echo '👋 已停止'; exit 0" INT TERM

wait $PID
