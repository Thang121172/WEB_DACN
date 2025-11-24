# Script tự động khởi động web
Write-Host "🚀 Đang kiểm tra Docker Desktop..." -ForegroundColor Cyan

$maxAttempts = 60
$attempt = 0
$dockerReady = $false

while ($attempt -lt $maxAttempts) {
    try {
        $result = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker Desktop đã sẵn sàng!" -ForegroundColor Green
            $dockerReady = $true
            break
        }
    } catch {
        # Continue waiting
    }
    $attempt++
    Write-Host "." -NoNewline -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

if (-not $dockerReady) {
    Write-Host "`n❌ Docker Desktop chưa sẵn sàng sau $($maxAttempts * 2) giây." -ForegroundColor Red
    Write-Host "Vui lòng:" -ForegroundColor Yellow
    Write-Host "1. Mở Docker Desktop" -ForegroundColor White
    Write-Host "2. Đợi đến khi Docker Desktop hiển thị 'Docker Desktop is running'" -ForegroundColor White
    Write-Host "3. Chạy lại script này hoặc chạy: docker-compose up -d" -ForegroundColor White
    exit 1
}

Write-Host "`n🛑 Đang dừng containers cũ..." -ForegroundColor Yellow
docker-compose down

Write-Host "`n🚀 Đang khởi động web..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "`n⏳ Đang đợi services khởi động..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n📊 Trạng thái containers:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n✅ Web đã được khởi động!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5174" -ForegroundColor White
Write-Host "Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "Admin: http://localhost:8000/admin" -ForegroundColor White

