@echo off
chcp 65001 >nul
echo ========================================
echo    后台管理系统启动脚本
echo ========================================
echo.

echo 正在检查依赖...
if not exist "node_modules\" (
    echo 首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo.
        echo 依赖安装失败！
        echo 请手动运行: npm install
        pause
        exit /b 1
    )
)

echo.
echo 正在启动服务器...
echo.
echo ========================================
echo  聊天界面: http://localhost:3000
echo  后台管理: http://localhost:3000/admin
echo ========================================
echo  默认账户: admin / admin123
echo  请立即修改密码！
echo ========================================
echo.

node server-admin.js

pause

