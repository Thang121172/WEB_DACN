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

# === SỬA LỖI JSON ARGS RECOMMENDED ===
# ENTRYPOINT: Chạy migrate trước, sau đó gọi lệnh trong CMD.
# Nó cũng xử lý đợi DB sẵn sàng.
# Chúng ta phải dùng sh -c ở đây vì chúng ta cần chạy 2 lệnh (migrate VÀ gunicorn)
ENTRYPOINT ["/usr/bin/wait-for-it", "${WAIT_HOSTS}:5432", "--timeout=60", "--", "sh", "-c"]

# CMD: Lệnh chính được thực thi sau khi ENTRYPOINT hoàn thành.
# Chúng ta vẫn cần chạy migrate trong lệnh CMD, vì migrate cần được chạy SAU KHI
# wait-for-it thành công. Vì vậy, ta phải kết hợp migrate và gunicorn trong 1 lệnh
# sh -c, nhưng cấu trúc ENTRYPOINT + CMD này được ưu tiên hơn.
CMD ["python manage.py migrate --noinput && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT"]