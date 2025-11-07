#!/usr/bin/env bash

# Thoát ngay lập tức nếu bất kỳ lệnh nào thất bại
set -e

# Chạy Collectstatic (Thu thập các tệp tĩnh)
echo "Running collectstatic..."
python manage.py collectstatic --noinput

# Chạy Database Migrations
echo "Running database migrations..."
python manage.py migrate

# Khởi động Gunicorn (Server chính)
# Sử dụng biến môi trường $PORT của Render thay vì 8000
echo "Starting Gunicorn server..."
exec gunicorn core.wsgi:application --bind 0.0.0.0:$PORT