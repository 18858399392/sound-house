@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 声音小屋：请保持此窗口开启。浏览器打开下方 Local 地址。
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js，请先安装 Node.js，再双击启动。
  pause
  exit /b 1
)
node server.mjs
pause
