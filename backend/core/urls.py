# backend/core/urls.py

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

# QUAN TRỌNG: Sửa lỗi "App Not Ready" bằng cách dùng đường dẫn tuyệt đối (backend.<app>.views)
from orders.views import (
    OrderViewSet, MerchantViewSet, ShipperViewSet, merchant_dashboard,
    ReviewViewSet, ComplaintViewSet, InventoryViewSet, MerchantOrderViewSet, AdminViewSet
)
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
router.register(r"reviews", ReviewViewSet, basename="review")
router.register(r"complaints", ComplaintViewSet, basename="complaint")
router.register(r"inventory", InventoryViewSet, basename="inventory")
router.register(r"merchant-orders", MerchantOrderViewSet, basename="merchant-order")
router.register(r"admin", AdminViewSet, basename="admin")


urlpatterns = [
    # 1. QUAN TRỌNG: Thêm đường dẫn gốc ('/') trỏ về healthcheck 
    path("", healthcheck, name="root_healthcheck"),
    
    # 2. Check server sống (dùng cho các dịch vụ khác, đã có)
    path("health/", healthcheck, name="healthcheck"),

    # Django admin
    path("admin/", admin.site.urls),

    # API REST chính (orders / merchant / shipper ...)
    path("api/", include(router.urls)),
    
    # Merchant dashboard endpoint
    path("api/merchant/dashboard/", merchant_dashboard, name="merchant-dashboard"),

    # Auth / đăng ký / đăng nhập / OTP
    # Đã chuyển sang đường dẫn tuyệt đối: "backend.accounts.urls"
    path("api/accounts/", include("accounts.urls")),

    # Các module khác tách riêng
    # Đã chuyển sang đường dẫn tuyệt đối
    path("api/menus/", include("menus.urls")), 
    path("api/payments/", include("payments.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)