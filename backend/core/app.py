import os
from celery import Celery
from django.conf import settings # Import settings
import django # Import django

# Đặt biến môi trường cho Celery (Cũng nên đặt ở đây cho an toàn)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Khởi tạo Celery App
# Giả sử instance Celery của bạn tên là 'app'
app = Celery('backend')

# Cấu hình Celery bằng cách sử dụng các hằng số cấu hình Django.
# (Bạn cần đảm bảo CELERY_BROKER_URL, v.v. đã được định nghĩa trong settings.py)
app.config_from_object('django.conf:settings', namespace='CELERY')

# RẤT QUAN TRỌNG: Thiết lập môi trường Django
django.setup() 

# Khám phá các tác vụ tự động từ tất cả các ứng dụng Django đã cài đặt
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

# ... (các tác vụ khác nếu có)