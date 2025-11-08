from celery import shared_task
from .models import Order
import time

# ----------------------------------------------------------------------
# A. TASK KIỂM TRA (DEBUG)
# Dùng để xác nhận Celery Worker đã hoạt động
# ----------------------------------------------------------------------
@shared_task
def debug_test_task(a, b):
    """
    Task đơn giản để tính tổng hai số và in ra log.
    Sử dụng để kiểm tra kết nối giữa Django và Celery.
    """
    print(f"[{time.strftime('%H:%M:%S')}] Celery Task bắt đầu xử lý...")
    
    # Giả lập công việc nặng/chậm (ví dụ: gửi email)
    time.sleep(3) 
    
    result = a + b
    print(f"[{time.strftime('%H:%M:%S')}] KẾT QUẢ TÍNH TOÁN: {a} + {b} = {result}")
    return result


# ----------------------------------------------------------------------
# B. TASK CHÍNH CỦA BẠN
# ----------------------------------------------------------------------
# @shared_task # Thêm decorator này khi bạn bắt đầu triển khai logic bên trong
def auto_update_orders():
    """
    Task placeholder: Dùng để tự động cập nhật trạng thái đơn hàng (ví dụ: sau 24h).
    """
    # Logic của bạn sẽ ở đây
    print("Running auto_update_orders placeholder.")
    pass