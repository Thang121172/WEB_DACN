# core/settings/prod.py

from .base import * # Import tất cả từ base

# Thiết lập DEBUG là False cho Production
DEBUG = False

# Lấy SECRET_KEY từ biến môi trường
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    # Nếu SECRET_KEY không tồn tại, Django sẽ báo lỗi này
    raise ValueError("SECRET_KEY environment variable not set.")

# Render set ALLOWED_HOSTS tự động qua biến môi trường
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
ALLOWED_HOSTS = [RENDER_EXTERNAL_HOSTNAME] if RENDER_EXTERNAL_HOSTNAME else ['127.0.0.1', 'localhost']

# Cấu hình Database cho Render (sử dụng dj-database-url)
# Render tự động cung cấp DATABASE_URL
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
        # *** ĐÃ XÓA options={} khỏi đây để tránh lỗi TypeError ***
    )
}

# BẮT BUỘC CHO RENDER: Yêu cầu kết nối SSL.
# PHẢI ĐẶT SAU KHI GỌI dj_database_url.config()
if DATABASES['default'].get('ENGINE'):
    DATABASES['default']['OPTIONS'] = {'sslmode': 'require'} 


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