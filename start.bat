@echo off
chcp 65001 >nul
echo.
echo   🎵 音乐时光机器 v0.1.0
echo   ───────────────────────
echo.

rem 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ 未找到 Node.js，请安装 Node.js 18+
  echo    https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
echo ✅ Node.js 已安装

rem 检查依赖
if not exist "node_modules" (
  echo ⏳ 正在安装依赖...
  call npm install --silent
  echo ✅ 依赖安装完成
)

rem 启动
set PORT=3000
echo 🚀 启动后端服务 (端口: %PORT%)...
start http://localhost:%PORT%
node server\index.js
pause
