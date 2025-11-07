# core/settings/prod.py

from .base import * # Import tất cả từ base

# Thiết lập DEBUG là False cho Production
DEBUG = False

# Lấy SECRET_KEY từ biến môi trường
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable not set.")

# Render set ALLOWED_HOSTS tự động qua biến môi trường
ALLOWED_HOSTS = [os.environ.get('RENDER_EXTERNAL_HOSTNAME')]
if not ALLOWED_HOSTS[0]:
    ALLOWED_HOSTS = ['127.0.0.1', 'localhost'] # Fallback nếu không có RENDER_EXTERNAL_HOSTNAME

# Cấu hình Database cho Render (sử dụng dj-database-url)
# Render tự động cung cấp DATABASE_URL
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        # QUAN TRỌNG: Cần thiết lập SSL cho Render PostgreSQL
        conn_health_checks=True,
        # Nếu gặp lỗi SSL, hãy thử thêm ssl_require
        # options={'sslmode': 'require'}, 
    )
}

# Cấu hình Static Files (Quan trọng cho Render)
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Thiết lập bảo mật
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'
# Có thể thêm SECURE_HSTS_SECONDS nếu cần

# Ghi log lỗi
LOGGING = {
    # ... cấu hình logging của bạn ...
}