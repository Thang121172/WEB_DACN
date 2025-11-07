FROM python:3.11-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Biến môi trường
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on

# Cài đặt các gói hệ thống cần thiết (build-essential, libpq-dev, zlib1g-dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libpq-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt Python dependencies
# Cần đảm bảo file requirements.txt nằm trong thư mục gốc của context build
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy toàn bộ source code backend vào container
# Dấu chấm '.' ở đây đại diện cho thư mục 'backend/' của bạn
COPY . /app/

# Expose port (8000 là default, nhưng Gunicorn sẽ dùng biến $PORT của Render)
EXPOSE 8000

# Lệnh Production mặc định (Sử dụng Gunicorn)
# Lệnh này sẽ chạy nếu Procfile không được sử dụng.
# Trỏ đến WSGI module: core.wsgi:application
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]