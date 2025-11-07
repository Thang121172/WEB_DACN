set -e

# 1. QUAN TRỌNG: Thiết lập biến môi trường chỉ định file settings Production.
# Đảm bảo các lệnh python chạy với cấu hình Prod (ví dụ: database SSL/SECURE_HSTS_SECONDS).
export DJANGO_SETTINGS_MODULE=core.settings.prod

# 2. Chạy Collectstatic (Thu thập các tệp tĩnh)
echo "Running collectstatic..."
python manage.py collectstatic --noinput

# 3. Chạy Database Migrations
echo "Running database migrations..."
python manage.py migrate

# 4. Khởi động Gunicorn (Server chính)
# - --bind 0.0.0.0:$PORT: Liên kết với cổng được Render cung cấp.
# - --timeout 120: Tăng thời gian chờ (120 giây) để xử lý các vấn đề khởi động chậm.
# - --workers 4: Sử dụng 4 worker để xử lý request đồng thời, tăng tính ổn định.
echo "Starting Gunicorn server with $DJANGO_SETTINGS_MODULE..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --timeout 120 \
    --workers 4