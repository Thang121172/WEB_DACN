import os
import sys
from django.core.wsgi import get_wsgi_application

# --- FIX QUAN TRỌNG CHO LỖI IMPORT ---
# Lấy đường dẫn tuyệt đối của thư mục chứa wsgi.py (thường là /app)
# và thêm nó vào sys.path. Điều này giúp Python tìm thấy các module 
# cấp cao nhất như 'backend', 'orders', và 'core'.
current_directory = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_directory)
# --------------------------------------

# Thiết lập biến môi trường cho module cài đặt Django của bạn.
# Giữ nguyên 'settings' theo cấu hình Procfile của bạn.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

application = get_wsgi_application()