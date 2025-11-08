@echo off

:: 1. Thiết lập PYTHONPATH trỏ đến thư mục hiện tại (T:\FASTFOOD\WEB).
:: Lệnh này cho phép Python/Celery tìm thấy các gói (package) như 'backend'.
set PYTHONPATH=%cd%

:: 2. Hiển thị thông báo bắt đầu
echo Starting Celery Worker for backend.core.app...

:: 3. Khởi động Celery Worker
:: -A: Trỏ đến Celery App (backend.core.app)
:: -l info: Log level info
:: --pool=solo: Dùng pool solo, khuyến nghị cho môi trường dev Windows
celery -A backend.core.app worker --loglevel=info --pool=solo

@echo on