@echo off
echo ================================
echo   Claude AI Clone - 启动脚本
echo ================================
echo.

:: 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js！
    echo.
    echo 请先安装 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/4] 检查 Node.js... OK
echo.

:: 检查是否已安装依赖
if not exist "node_modules\" (
    echo [2/4] 安装依赖包...
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败！
        pause
        exit /b 1
    )
) else (
    echo [2/4] 依赖包已存在... OK
)
echo.

:: 检查 API Key
if "%ANTHROPIC_API_KEY%"=="" (
    echo [警告] 未设置 ANTHROPIC_API_KEY 环境变量！
    echo.
    echo 请按以下步骤设置：
    echo 1. 访问 https://console.anthropic.com/settings/keys
    echo 2. 复制您的 API Key
    echo 3. 运行: set ANTHROPIC_API_KEY=your-api-key-here
    echo.
    echo 或者直接编辑 server.js 文件第 13 行
    echo.
    set /p continue="是否继续启动服务器？(y/n): "
    if /i not "%continue%"=="y" exit /b 0
)

echo [3/4] 启动服务器...
echo.
echo ================================
echo   服务器正在运行！
echo   访问: http://localhost:3000
echo   按 Ctrl+C 停止服务器
echo ================================
echo.

:: 启动服务器
node server.js

