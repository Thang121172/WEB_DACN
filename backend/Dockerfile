FROM python:3.11-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Biến môi trường
# RẤT QUAN TRỌNG: Đặt biến DJANGO_SETTINGS_MODULE để Django/Celery tìm thấy cài đặt.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=backend.settings

# Cài đặt các gói hệ thống cần thiết và công cụ wait-for-it
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libpq-dev \
    zlib1g-dev \
    curl \
    # === THÊM CÔNG CỤ WAIT-FOR-IT ===
    && curl -L https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -o /usr/bin/wait-for-it \
    && chmod +x /usr/bin/wait-for-it \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy toàn bộ source code
COPY . /app/

# Expose port (Dùng cho môi trường local)
EXPOSE 8000

# Lệnh Production cuối cùng (WEB SERVICE):
# Gunicorn sử dụng đường dẫn đầy đủ.
CMD ["/usr/bin/wait-for-it", "${WAIT_HOSTS}:5432", "--timeout=60", "--", "sh", "-c", \
      "python manage.py migrate --noinput && \
      gunicorn **backend.core.wsgi:application** --bind 0.0.0.0:$PORT"]