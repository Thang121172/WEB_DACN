import os
import sys
from django.core.wsgi import get_wsgi_application

# FIX QUAN TRỌNG: Thêm thư mục gốc dự án (/app) vào đường dẫn hệ thống.
# Điều này cho phép Python tìm thấy các module cấp cao nhất như 'backend' 
# và các ứng dụng khác trong khi Gunicorn đang khởi chạy.
sys.path.append('/app') 

# Thiết lập biến môi trường cho module cài đặt Django của bạn, 
# giữ nguyên 'settings' để phù hợp với Procfile.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

application = get_wsgi_application()