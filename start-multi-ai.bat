@echo off
chcp 65001 >nul
echo ========================================
echo   🤖 Multi-AI Platform - 启动脚本
echo ========================================
echo.
echo 支持的 AI 提供商：
echo   ✅ Claude (Anthropic)
echo   ✅ OpenAI (ChatGPT)
echo   ✅ Google Gemini
echo   ✅ 自定义 API
echo.

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js！
    echo 请先安装: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] 检查 Node.js... ✅
echo.

:: 安装依赖
if not exist "node_modules\" (
    echo [2/3] 安装依赖包（包含多个AI SDK）...
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败！
        pause
        exit /b 1
    )
) else (
    echo [2/3] 依赖包已存在... ✅
)
echo.

echo [3/3] 启动服务器...
echo.
echo ========================================
echo   🎉 服务器正在运行！
echo.
echo   📍 配置页面: http://localhost:3000
echo   💬 聊天界面: http://localhost:3000/chat
echo.
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

:: 启动多AI服务器
node server-multi-ai.js

