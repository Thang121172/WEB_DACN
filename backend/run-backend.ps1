# Script to run Django backend
$pythonPath = "C:\Users\ASUS\AppData\Local\Programs\Python\Python312\python.exe"

Write-Host "🚀 Starting Django Backend..." -ForegroundColor Cyan
Write-Host "Using Python: $pythonPath" -ForegroundColor Gray

# Check if Django is installed
$djangoCheck = & $pythonPath -c "import django; print(django.__version__)" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Django not found. Installing dependencies..." -ForegroundColor Yellow
    & $pythonPath -m pip install -r requirements.txt
}

# Run Django server
Write-Host "`n✅ Starting Django development server..." -ForegroundColor Green
& $pythonPath manage.py runserver

