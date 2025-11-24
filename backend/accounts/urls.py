# backend/accounts/urls.py
from django.urls import path

from .views import (
    RegisterView,
    RegisterRequestOTPView,
    RegisterConfirmOTPView,
    LoginView,
    MeView,
    ProfileUpdateView,
    RegisterMerchantView,
    MyMerchantsView,
    ForgotPasswordRequestOTPView,
    ResetPasswordConfirmView,
    OTPDebugListView,
)

urlpatterns = [
    # 1. Auth cơ bản (Non-OTP)
    path('register/', RegisterView.as_view(), name='register_basic'),
    path('login/', LoginView.as_view(), name='login'), # SimpleJWT's TokenObtainPairView
    
    # 2. OTP Register Flow
    path('register/request-otp/', RegisterRequestOTPView.as_view(), name='register_request_otp'),
    path('register/confirm/', RegisterConfirmOTPView.as_view(), name='register_confirm'),

    # 3. Forgot/Reset Password Flow
    path('forgot/request-otp/', ForgotPasswordRequestOTPView.as_view(), name='password_forgot_request_otp'),
    path('reset-password/confirm/', ResetPasswordConfirmView.as_view(), name='password_reset_confirm'),

    # 4. User/Me & Merchant
    path('me/', MeView.as_view(), name='me'),
    path('profile/', ProfileUpdateView.as_view(), name='profile_update'),
    path('register-merchant/', RegisterMerchantView.as_view(), name='register_merchant'),
    path('my-merchants/', MyMerchantsView.as_view(), name='my_merchants'),
    
    # 5. Debug (Chỉ dùng trong DEV)
    path('otp/debug/', OTPDebugListView.as_view(), name='otp_debug_list'),
]