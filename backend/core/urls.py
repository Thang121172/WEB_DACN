# backend/core/urls.py

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# QUAN TRỌNG: Sửa lỗi "App Not Ready" bằng cách dùng đường dẫn tuyệt đối (backend.<app>.views)
from orders.views import OrderViewSet, MerchantViewSet, ShipperViewSet
# Khi có thêm viewset khác (InventoryViewSet, v.v.) bạn có thể register thêm ở đây

# ----- Healthcheck đơn giản cho container -----
def healthcheck(_request):
    """
    Endpoint đơn giản để kiểm tra trạng thái hoạt động của service.
    """
    return JsonResponse({"status": "ok", "message": "API is operational"})
    # Đã bổ sung thêm message để dễ theo dõi hơn

# ----- DRF Router -----
router = DefaultRouter()
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"merchant", MerchantViewSet, basename="merchant")
router.register(r"shipper", ShipperViewSet, basename="shipper")
# ví dụ sau này:
# router.register(r"inventory", InventoryViewSet, basename="inventory")


urlpatterns = [
    # 1. QUAN TRỌNG: Thêm đường dẫn gốc ('/') trỏ về healthcheck 
    path("", healthcheck, name="root_healthcheck"),
    
    # 2. Check server sống (dùng cho các dịch vụ khác, đã có)
    path("health/", healthcheck, name="healthcheck"),

    # Django admin
    path("admin/", admin.site.urls),

    # API REST chính (orders / merchant / shipper ...)
    path("api/", include(router.urls)),

    # Auth / đăng ký / đăng nhập / OTP
    # Đã chuyển sang đường dẫn tuyệt đối: "backend.accounts.urls"
    path("api/accounts/", include("backend.accounts.urls")),

    # Các module khác tách riêng
    # Đã chuyển sang đường dẫn tuyệt đối
    path("api/menus/", include("backend.menus.urls")), 
    path("api/payments/", include("backend.payments.urls")),
]