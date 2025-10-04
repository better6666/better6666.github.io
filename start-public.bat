@echo off
chcp 65001 >nul
echo ========================================
echo 🌐 启动公网访问服务
echo ========================================
echo.
echo 正在启动内网穿透...
echo.
start /b lt --port 3000
timeout /t 3 >nul
echo.
echo ✅ 内网穿透已启动！
echo.
echo 📝 请查看上方显示的公网地址（类似 https://xxxxx.loca.lt）
echo.
echo 📱 在任何设备的浏览器中访问：
echo    https://你的地址.loca.lt/chat.html
echo.
echo ⚠️  注意：首次访问可能需要点击 "Click to Continue" 按钮
echo.
echo ❌ 关闭内网穿透：关闭此窗口
echo ========================================
pause

