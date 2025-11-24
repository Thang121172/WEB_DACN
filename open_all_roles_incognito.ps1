# Script để mở 3 tab trình duyệt ẩn danh cho 3 role (Customer, Merchant, Shipper)
# Sử dụng: .\open_all_roles_incognito.ps1

Write-Host "🚀 Đang mở 3 cửa sổ ẩn danh cho 3 role..." -ForegroundColor Green
Write-Host ""

# URL base
$baseUrl = "http://localhost:5173"

# Các URL cho từng role
$customerUrl = "$baseUrl/customer"
$merchantUrl = "$baseUrl/merchant/dashboard"
$shipperUrl = "$baseUrl/shipper"

# Tự động phát hiện trình duyệt
$browser = "chrome.exe"
$incognitoFlag = "--incognito"

# Kiểm tra trình duyệt có sẵn
if (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
    $browser = "C:\Program Files\Google\Chrome\Application\chrome.exe"
} elseif (Test-Path "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") {
    $browser = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
} elseif (Get-Command "msedge.exe" -ErrorAction SilentlyContinue) {
    $browser = "msedge.exe"
    $incognitoFlag = "-inprivate"
} else {
    Write-Host "⚠️ Không tìm thấy Chrome hoặc Edge. Sử dụng trình duyệt mặc định..." -ForegroundColor Yellow
    $browser = "chrome.exe"
}

# Mở 3 cửa sổ ẩn danh
Write-Host "📱 Mở cửa sổ ẩn danh Customer..." -ForegroundColor Cyan
Start-Process $browser -ArgumentList $incognitoFlag, "--new-window", $customerUrl
Start-Sleep -Seconds 1

Write-Host "🏪 Mở cửa sổ ẩn danh Merchant..." -ForegroundColor Cyan
Start-Process $browser -ArgumentList $incognitoFlag, "--new-window", $merchantUrl
Start-Sleep -Seconds 1

Write-Host "🚚 Mở cửa sổ ẩn danh Shipper..." -ForegroundColor Cyan
Start-Process $browser -ArgumentList $incognitoFlag, "--new-window", $shipperUrl
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "✅ Đã mở 3 cửa sổ ẩn danh!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Hướng dẫn:" -ForegroundColor Yellow
Write-Host "   1. Cửa sổ 1: Đăng nhập với tài khoản Customer" -ForegroundColor White
Write-Host "   2. Cửa sổ 2: Đăng nhập với tài khoản Merchant" -ForegroundColor White
Write-Host "   3. Cửa sổ 3: Đăng nhập với tài khoản Shipper" -ForegroundColor White
Write-Host ""
Write-Host "💡 Mỗi cửa sổ ẩn danh có session riêng, không ảnh hưởng lẫn nhau!" -ForegroundColor Cyan

