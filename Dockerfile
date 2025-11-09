FROM python:3.11-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Biến môi trường
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=core.settings \
    PORT=8000

# Cài đặt hệ thống (giữ nguyên)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libpq-dev \
    zlib1g-dev \
    curl \
    && curl -L https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -o /usr/bin/wait-for-it \
    && chmod +x /usr/bin/wait-for-it \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt
COPY backend/requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip && \
    pip install -r requirements.txt

# --- PHẦN QUAN TRỌNG ĐỂ FIX ModuleNotFoundError ---
# Copy toàn bộ thư mục backend vào /app/backend
COPY backend /app/
# Cấu trúc kết quả: /app/manage.py, /app/core/, /app/accounts/, v.v.

# Expose port (Dùng cho môi trường local)
EXPOSE 8000

# === ENTRYPOINT/CMD ===
ENTRYPOINT ["/usr/bin/wait-for-it", "${WAIT_HOSTS}:5432", "--timeout=60", "--"]

# Chúng ta chạy lệnh từ /app (nơi có manage.py)
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT"]