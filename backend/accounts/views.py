# backend/accounts/views.py

import random
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

# Cần import các Models liên quan
from .models import OTPRequest, Profile
from menus.models import Merchant, MerchantMember
# Cần import Celery Task (Phải có file accounts/tasks.py)
from .tasks import send_otp_email

# Cần import các Serializers
from .serializers import (
    RegisterSerializer,
    RegisterMerchantSerializer,
    RegisterRequestOTPSerializer,
    RegisterConfirmOTPSerializer,
    ResetPasswordConfirmSerializer,
    OTPRequestDebugSerializer,
    MeSerializer,
)

User = get_user_model()


# =========================================================
# Helper tạo mã OTP và gửi email
# =========================================================
# Lấy TTL (Time-To-Live) từ settings hoặc mặc định 5 phút
OTP_TTL_MINUTES = getattr(settings, 'OTP_TTL_MINUTES', 5)

def generate_otp_code(length: int = 6) -> str:
    """Sinh mã OTP numeric, ví dụ '384129'."""
    return "".join(random.choice("0123456789") for _ in range(length))


def _create_and_send_otp(email: str, purpose: str, ttl_minutes: int = OTP_TTL_MINUTES):
    """
    Tạo OTPRequest và cố gắng gửi email.
    Trả (otp_obj, sent_ok, debug_code)
    """
    code = generate_otp_code(6)

    identifier = email.strip().lower()

    # Đánh dấu các OTPRequest cũ là used để dọn dẹp nhẹ
    OTPRequest.objects.filter(
        identifier=identifier,
        used=False,
        expires_at__lt=timezone.now()
    ).update(used=True)


    otp_obj = OTPRequest.objects.create(
        identifier=identifier,
        code=code,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=ttl_minutes),
    )

    sent_ok = True
    debug_code = None

    try:
        # Gửi mail async (Celery task)
        send_otp_email.delay(identifier, code, purpose) 
    except Exception:
        # Celery chưa chạy hoặc lỗi SMTP (chỉ báo lỗi)
        sent_ok = False

    # Nếu DEBUG=True VÀ email không gửi được, trả code ra cho dev
    if settings.DEBUG and not sent_ok:
        debug_code = code

    return otp_obj, sent_ok, debug_code


# =========================================================
# 1. Non-OTP Auth Flow (Cơ bản/Dev Only)
# =========================================================
class RegisterView(APIView):
    """Đăng ký không OTP (dev/test)."""
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request):
        s = self.serializer_class(data=request.data)
        s.is_valid(raise_exception=True)

        user = s.create(s.validated_data)
        user.is_active = True
        user.save(update_fields=['is_active'])

        payload = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': getattr(getattr(user, 'profile', None), 'role', 'customer'),
        }

        try:
            refresh = RefreshToken.for_user(user)
            payload.update({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        except Exception:
            pass 

        return Response(payload, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """
    /api/accounts/login/ → access/refresh. 
    Sử dụng SimpleJWT's TokenObtainPairView.
    """
    permission_classes = [AllowAny]


class MeView(APIView):
    """Thông tin user hiện tại + role từ Profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get(self, request):
        serializer = self.serializer_class(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# =========================================================
# 2. OTP Register Flow
# =========================================================
class RegisterRequestOTPView(APIView):
    """
    Bước 1: Xin OTP để đăng ký tài khoản mới.
    """
    permission_classes = [AllowAny]
    serializer_class = RegisterRequestOTPSerializer

    def post(self, request):
        ser = self.serializer_class(data=request.data)
        ser.is_valid(raise_exception=True)

        email = ser.validated_data["email"].strip().lower()

        # Tạo + gửi OTP
        otp_obj, sent_ok, debug_code = _create_and_send_otp(
            email=email,
            purpose=OTPRequest.PURPOSE_REGISTER,
        )

        resp = {
            "detail": f"OTP đăng ký đã được gửi tới {email}.",
            "expires_at": otp_obj.expires_at,
        }
        if debug_code:
            resp["debug_otp"] = debug_code   # DEV ONLY

        return Response(resp, status=status.HTTP_200_OK)


class RegisterConfirmOTPView(APIView):
    """
    Bước 2: Xác nhận OTP và hoàn tất đăng ký user mới.
    """
    permission_classes = [AllowAny]
    serializer_class = RegisterConfirmOTPSerializer

    def post(self, request):
        ser = self.serializer_class(data=request.data)
        ser.is_valid(raise_exception=True)
        
        # Logic tạo user, profile, đánh dấu OTP used, và tạo token nằm trong serializer.save()
        created_payload = ser.save()
        return Response(created_payload, status=status.HTTP_201_CREATED)


# =========================================================
# 3. Forgot/Reset Password Flow
# =========================================================
class ForgotPasswordRequestOTPView(APIView):
    """
    Bước 1: Xin OTP để khôi phục mật khẩu (chỉ nếu email tồn tại).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email_raw = request.data.get("email", "")
        email = (email_raw or "").strip().lower()

        debug_code = None
        expires_at = None

        # Chỉ tạo OTP nếu user tồn tại (tránh lộ thông tin user)
        if email and User.objects.filter(email__iexact=email).exists():
            otp_obj, sent_ok, debug_code = _create_and_send_otp(
                email=email,
                purpose=OTPRequest.PURPOSE_RESET_PASSWORD,
            )
            expires_at = otp_obj.expires_at

        # Luôn trả 200 để tránh lộ thông tin user
        resp = {
            "detail": "Nếu email tồn tại, OTP khôi phục mật khẩu đã được gửi.",
            "expires_at": expires_at,
        }
        if debug_code:
            resp["debug_otp"] = debug_code  # DEV ONLY

        return Response(resp, status=status.HTTP_200_OK)


class ResetPasswordConfirmView(APIView):
    """
    Bước 2: Xác nhận OTP và đặt lại mật khẩu cho user đã tồn tại.
    """
    permission_classes = [AllowAny]
    serializer_class = ResetPasswordConfirmSerializer

    def post(self, request):
        ser = self.serializer_class(data=request.data)
        ser.is_valid(raise_exception=True)
        
        # Logic set password mới và đánh dấu OTP used nằm trong serializer.save()
        result = ser.save()
        return Response(result, status=status.HTTP_200_OK)


# =========================================================
# 4. Merchant Flow
# =========================================================
class RegisterMerchantView(APIView):
    """Đăng ký tài khoản merchant (tạo user/convert user)."""
    permission_classes = [AllowAny]
    serializer_class = RegisterMerchantSerializer

    def post(self, request):
        # Truyền request vào context để xử lý logic user đã đăng nhập/chưa đăng nhập
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Serializer trả về user object (đã được nâng role)
        user, merchant = serializer.save() 
        
        # Lấy tokens và thông tin merchant
        tokens = RefreshToken.for_user(user)
        
        response_data = {
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.profile.role,
                "tokens": {
                    "access": str(tokens.access_token),
                    "refresh": str(tokens),
                }
            },
            "merchant": {
                "id": merchant.id,
                "name": merchant.name,
                "phone": getattr(merchant, "phone", ""),
            }
        }
        return Response(response_data, status=status.HTTP_201_CREATED)


class MyMerchantsView(APIView):
    """Danh sách merchant mà user hiện tại thuộc về (merchant/admin)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Lấy danh sách Merchant mà user là thành viên thông qua MerchantMember
        qs = Merchant.objects.filter(members__user=request.user).distinct()
        data = [{"id": m.id, "name": m.name} for m in qs]
        return Response(data, status=status.HTTP_200_OK)


# =========================================================
# 5. Debug Endpoints (Chỉ dành cho môi trường Dev)
# =========================================================
class OTPDebugListView(generics.ListAPIView):
    """
    [DEBUG ONLY] Xem danh sách các yêu cầu OTP gần đây. 
    Chỉ chạy khi settings.DEBUG = True.
    """
    permission_classes = [AllowAny]
    serializer_class = OTPRequestDebugSerializer

    def get(self, request, *args, **kwargs):
        if not settings.DEBUG:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        
        self.queryset = OTPRequest.objects.all().order_by('-created_at')[:20]
        
        return super().get(request, *args, **kwargs)
