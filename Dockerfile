FROM python:3.11-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Biến môi trường
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=on \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=core.settings \
    PORT=8000

# Cài đặt hệ thống và công cụ wait-for-it
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libpq-dev \
    zlib1g-dev \
    curl \
    # Tải và cấp quyền cho wait-for-it.sh
    && curl -L https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -o /usr/bin/wait-for-it \
    && chmod +x /usr/bin/wait-for-it \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt
# Copy requirements.txt từ thư mục backend
COPY backend/requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip && \
    pip install -r requirements.txt

# --- COPY MÃ NGUỒN BACKEND ---
# Copy toàn bộ mã nguồn backend (chứa manage.py, core, accounts, v.v.) vào /app
COPY backend /app/

# Expose port (Dùng cho môi trường local)
EXPOSE 8000

# === CMD TỐI GIẢN ===
# Lệnh này sẽ được ghi đè bởi "Docker Command" trên Render,
# nhưng chúng ta vẫn khai báo để đảm bảo tính đầy đủ.
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]