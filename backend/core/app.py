import os
import sys

# Thêm thư mục gốc của dự án ('backend') vào Python Path để Celery có thể import
# Các package như 'orders', 'core', 'backend.settings', v.v.
# Giả sử thư mục "backend" là thư mục chứa wsgi.py và các app con.
# /app là thư mục gốc của repository trên Render.
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

import django
from celery import Celery
from django.conf import settings

# Đặt biến môi trường Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Khởi tạo Celery
# Đoạn này sẽ gọi django.setup() và gây lỗi nếu chưa fix sys.path
celery_app = Celery('backend')

# Load cấu hình từ Django settings
celery_app.config_from_object('django.conf:settings', namespace='CELERY')

# Tự động tìm và đăng ký các task từ tất cả các ứng dụng Django
celery_app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

@celery_app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

# Đảm bảo Django được setup sau khi Celery app đã được cấu hình nếu cần
# Nhưng thông thường django.setup() được gọi trong quá trình Celery config_from_object
try:
    if not django.conf.settings.configured:
        django.setup()
except Exception:
    pass

# Đổi tên app từ celery_app thành app theo quy ước của Celery
app = celery_app