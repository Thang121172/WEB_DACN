"""
Base Django settings.
- Đọc biến môi trường từ .env (nếu có) và từ docker-compose.
- Cấu hình PostgreSQL, JWT, Celery/Redis, CORS, SMTP (Gmail OTP).
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# =========================================================
# ĐƯỜNG DẪN GỐC DỰ ÁN
# =========================================================
# base.py đang ở: backend/core/settings/base.py
# -> BASE_DIR = thư mục backend/
BASE_DIR = Path(__file__).resolve().parents[2]

# Tải biến môi trường từ backend/.env nếu tồn tại (dev local)
load_dotenv(BASE_DIR / ".env")

# =========================================================
# DEBUG / SECRET_KEY
# =========================================================
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "replace-me")

# =========================================================
# ALLOWED_HOSTS / CORS
# =========================================================
# ALLOWED_HOSTS có thể là "127.0.0.1,localhost,backend"
ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("ALLOWED_HOSTS", "127.0.0.1,localhost,backend").split(",")
    if h.strip()
]

# Cho phép Django test client trong chế độ DEBUG
if DEBUG and "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

# CORS
# Bạn có biến CORS_ORIGINS="http://localhost:5173,http://localhost:5174"
_raw_cors = os.getenv("CORS_ORIGINS", "")
if _raw_cors.strip():
    CORS_ALLOWED_ORIGINS = [
        o.strip() for o in _raw_cors.split(",") if o.strip()
    ]
else:
    # Nếu bạn chưa set CORS_ORIGINS thì mặc định cho phép frontend dev common ports
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

CORS_ALLOW_CREDENTIALS = True

# =========================================================
# ỨNG DỤNG / APP
# =========================================================
INSTALLED_APPS = [
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Bên thứ 3
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",

    "django_celery_beat",
    "django_celery_results",

    # Ứng dụng nội bộ (ĐÃ SỬA: BỎ TIỀN TỐ 'backend.')
    "accounts.app.AccountsConfig",
    "menus.apps.MenusConfig",
    "orders.apps.OrdersConfig",
    "payments.apps.PaymentsConfig",
]

MIDDLEWARE = [
    # CORS nên đặt càng cao càng tốt
    "corsheaders.middleware.CorsMiddleware",

    # optional middleware debug request body cho accounts/* (ĐÃ SỬA: BỎ TIỀN TỐ 'backend.')
    "core.middleware.request_logger.RequestLoggerMiddleware", 

    "django.middleware.security.SecurityMiddleware",

    # (sau này bạn có thể thêm WhiteNoiseMiddleware nếu muốn serve static qua Gunicorn)
    # "whitenoise.middleware.WhiteNoiseMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# =========================================================
# LOGGING
# =========================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "api": {
            "format": "[{levelname}] {asctime} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "api",
        }
    },
    "loggers": {
        # Tên logger vẫn là tên app ngắn gọn
        "django": {"handlers": ["console"], "level": "INFO"},
        "accounts": {"handlers": ["console"], "level": "INFO"},
        "orders": {"handlers": ["console"], "level": "INFO"},
        "menus": {"handlers": ["console"], "level": "INFO"},
        "payments": {"handlers": ["console"], "level": "INFO"},
        "celery": {"handlers": ["console"], "level": "INFO"},
    },
}

# =========================================================
# DATABASE (PostgreSQL)
# Các biến này đã được set trong docker-compose.yml
# =========================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "fastfood"),
        "USER": os.getenv("POSTGRES_USER", "app"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "123456"),
        "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

# =========================================================
# AUTH USER MODEL
# =========================================================
# Nếu bạn định bật, hãy nhớ sử dụng đường dẫn đầy đủ (ĐÃ SỬA: BỎ TIỀN TỐ 'backend.'):
# AUTH_USER_MODEL = "accounts.User"

# =========================================================
# MẬT KHẨU / BẢO MẬT TÀI KHOẢN
# Dùng default validator của Django
# =========================================================
AUTH_PASSWORD_VALIDATORS = [
    {
        "name": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        # có thể thêm OPTIONS nếu muốn min_length
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# =========================================================
# PHIÊN BẢN ID
# =========================================================
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =========================================================
# TIMEZONE / LOCALIZATION
# =========================================================
LANGUAGE_CODE = "vi"
TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_I18N = True

# Với app giao đồ ăn nội địa, thường dùng giờ VN trực tiếp,
# không convert timezone nữa.
USE_TZ = False

# =========================================================
# STATIC / MEDIA
# =========================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Nếu sau này bạn dùng whitenoise, bạn có thể bật:
# STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],  # tạo thư mục backend/templates nếu cần custom email
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# =========================================================
# URL / GATEWAY
# =========================================================
# ĐÃ SỬA: BỎ TIỀN TỐ 'backend.'
ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application" # chuẩn bị sẵn cho realtime sau này

# =========================================================
# DRF + JWT
# =========================================================
REST_FRAMEWORK = {
    # render JSON-only là hợp lý cho API
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    # JWT Bearer Authentication
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # Bạn có thể siết quyền mặc định tại đây (AllowAny, IsAuthenticated,...)
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
}

# Thời gian sống token JWT
from rest_framework.settings import api_settings  # noqa (giữ import để DRF không complain unused)
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),  # token đăng nhập dùng cho frontend
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# =========================================================
# EMAIL (Gửi OTP qua Gmail SMTP)
# docker-compose backend & celery_worker đã export các biến EMAIL_*
# =========================================================
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    "FastFood <no-reply@fastfood.local>",
)

# =========================================================
# CELERY / REDIS
# dùng để chạy tác vụ nền: gửi OTP, trừ kho khi đơn CONFIRM, v.v.
# Các biến này cũng đã được set trong docker-compose.yml
# =========================================================
CELERY_BROKER_URL = os.getenv(
    "CELERY_BROKER_URL",
    "redis://redis:6379/1",
)
CELERY_RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND",
    os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/2"),
)
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = False
CELERY_RESULT_EXTENDED = True  # để celery lưu kết quả chi tiết hơn trong django_celery_results