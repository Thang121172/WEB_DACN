# Script để mở 3 tab trình duyệt cho 3 role (Customer, Merchant, Shipper)
# Sử dụng: .\open_all_roles.ps1

Write-Host "🚀 Đang mở 3 tab trình duyệt cho 3 role..." -ForegroundColor Green
Write-Host ""

# URL base
$baseUrl = "http://localhost:5173"

# Các URL cho từng role
$customerUrl = "$baseUrl/customer"
$merchantUrl = "$baseUrl/merchant/dashboard"
$shipperUrl = "$baseUrl/shipper"

# Mở 3 tab trình duyệt
Write-Host "📱 Mở tab Customer..." -ForegroundColor Cyan
Start-Process "chrome.exe" -ArgumentList "--new-window", $customerUrl
Start-Sleep -Seconds 1

Write-Host "🏪 Mở tab Merchant..." -ForegroundColor Cyan
Start-Process "chrome.exe" -ArgumentList "--new-window", $merchantUrl
Start-Sleep -Seconds 1

Write-Host "🚚 Mở tab Shipper..." -ForegroundColor Cyan
Start-Process "chrome.exe" -ArgumentList "--new-window", $shipperUrl
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "✅ Đã mở 3 tab trình duyệt!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Hướng dẫn:" -ForegroundColor Yellow
Write-Host "   1. Tab 1: Đăng nhập với tài khoản Customer" -ForegroundColor White
Write-Host "   2. Tab 2: Đăng nhập với tài khoản Merchant" -ForegroundColor White
Write-Host "   3. Tab 3: Đăng nhập với tài khoản Shipper" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Bạn có thể sử dụng chế độ ẩn danh (Incognito) để dễ quản lý session" -ForegroundColor Cyan

