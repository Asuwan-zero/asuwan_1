@echo off
title My Cafe - Admin Panel
color 0E

echo.
echo   ====================================
echo     🛠️  My Cafe - Admin Panel
echo   ====================================
echo.
echo   🚀 กำลังเปิด server...
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8080/admin.html"

echo   📍 หน้าร้าน:   http://127.0.0.1:8080/index.html
echo   🛠️  Admin:      http://127.0.0.1:8080/admin.html
echo   📦 ออเดอร์:    http://127.0.0.1:8080/order.html
echo.
echo   ❌ ปิด server: กด Ctrl+C หรือปิดหน้าต่างนี้
echo   ====================================
echo.

npx -y http-server . -p 8080 -c-1 --cors
