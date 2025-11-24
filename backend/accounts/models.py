# backend/accounts/models.py

import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings

# LƯU Ý: Đang sử dụng settings.AUTH_USER_MODEL mặc định của Django
# Nếu bạn muốn dùng Custom User, hãy uncomment block User ở trên và cấu hình AUTH_USER_MODEL trong settings.

class Profile(models.Model):
    ROLE_CHOICES = [
        ("customer", "Customer"),
        ("merchant", "Merchant"),
        ("shipper", "Shipper"),
        ("admin", "Admin"),
    ]

    # Liên kết tới user mặc định của Django (auth.User)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="customer",
        help_text="Phân loại tài khoản để hạn chế endpoint phù hợp",
    )

    default_address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Địa chỉ giao hàng mặc định (customer)",
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Số điện thoại",
    )

    full_name = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        help_text="Họ và tên đầy đủ",
    )

    store_name = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        help_text="Tên cửa hàng/quán (merchant)",
    )

    store_address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Địa chỉ cửa hàng/quán (merchant)",
    )

    vehicle_plate = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        help_text="Biển số xe (shipper)",
    )

    is_available = models.BooleanField(
        default=True,
        help_text="Shipper đang bật chế độ nhận đơn?",
    )

    # GPS location cho shipper
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        help_text="Vĩ độ GPS của shipper (để phân luồng đơn hàng)",
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        help_text="Kinh độ GPS của shipper (để phân luồng đơn hàng)",
    )

    location_updated_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Thời điểm cập nhật vị trí GPS lần cuối",
    )

    def __str__(self):
        return f"{self.user} ({self.role})"

    @property
    def is_customer(self):
        return self.role == "customer"

    @property
    def is_merchant(self):
        return self.role == "merchant"

    @property
    def is_shipper(self):
        return self.role == "shipper"

    @property
    def is_admin_role(self):
        return self.role == "admin"


class OTPRequest(models.Model):
    # Hằng số cho mục đích sử dụng OTP (QUAN TRỌNG: CẦN DÙNG TRONG VIEWS.PY)
    PURPOSE_REGISTER = 'đăng ký tài khoản'
    PURPOSE_RESET_PASSWORD = 'khôi phục mật khẩu'
    
    PURPOSE_CHOICES = [
        (PURPOSE_REGISTER, 'Đăng ký'),
        (PURPOSE_RESET_PASSWORD, 'Khôi phục mật khẩu'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    identifier = models.CharField(
        max_length=255,
        help_text="Email (hoặc phone sau này) dùng để nhận OTP",
    )

    code = models.CharField(
        max_length=8,
        help_text="Mã OTP, ví dụ 6 chữ số",
    )

    purpose = models.CharField(
        max_length=50, 
        choices=PURPOSE_CHOICES, 
        default=PURPOSE_REGISTER,
        verbose_name="Mục đích",
        help_text="Mục đích sử dụng của mã OTP này",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    expires_at = models.DateTimeField(
        help_text="Mã OTP hết hạn sau thời điểm này",
    )

    used = models.BooleanField(
        default=False,
        help_text="Đã dùng OTP này để verify chưa",
    )

    def __str__(self):
        return f"OTP({self.identifier}, code={self.code}, purpose={self.purpose}, used={self.used})"

    def is_valid(self):
        return (not self.used) and (timezone.now() < self.expires_at)

    def mark_used(self):
        self.used = True
        self.save(update_fields=["used"])