# backend/accounts/serializers.py

from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

# Import model
from .models import Profile, OTPRequest
# Import Merchant models
from menus.models import Merchant, MerchantMember

User = get_user_model()


# =========================================================
# Helper: tạo JWT tokens từ user
# =========================================================
def generate_tokens_for_user(user: User):
    """
    Trả về access / refresh JWT cho user sau khi login hoặc xác thực OTP.
    """
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# =========================================================
# 1. Đăng ký user cơ bản (dành cho customer)
# =========================================================
class RegisterSerializer(serializers.Serializer):
    """
    Đăng ký tài khoản cơ bản (mặc định role=customer).
    Flow này không dùng OTP, chủ yếu để dev test nhanh.
    """
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        username = data.get("username", "").strip()
        email = (data.get("email") or "").strip().lower()

        errors = {}
        if username and User.objects.filter(username__iexact=username).exists():
            errors["username"] = "This username is already taken."
        if email and User.objects.filter(email__iexact=email).exists():
            errors["email"] = "This email is already used."
        if errors:
            raise serializers.ValidationError(errors)
        return data

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            email=validated_data.get("email") or "",
        )
        # đảm bảo có Profile với role mặc định = "customer"
        Profile.objects.get_or_create(user=user, defaults={"role": "customer"})
        return user


# =========================================================
# 2. Đăng ký Merchant (tạo user hoặc convert user hiện tại)
# =========================================================
class RegisterMerchantSerializer(serializers.Serializer):
    """
    Cho phép tạo merchant mới.
    - Nếu đang đăng nhập = user hiện tại được nâng role thành merchant.
    - Nếu CHƯA đăng nhập = tạo user mới + merchant mới.
    """
    # Nếu chưa đăng nhập → cần các field user
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    # Thông tin cửa hàng
    name = serializers.CharField()
    address = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        req = self.context.get("request")
        u = req.user if req else None

        # Trường hợp tạo merchant kèm tạo user mới
        if not u or not u.is_authenticated:
            if not data.get("username") or not data.get("password"):
                raise serializers.ValidationError(
                    {"detail": "Username và mật khẩu là bắt buộc cho tài khoản mới."}
                )

            # Kiểm tra trùng lặp
            if User.objects.filter(username__iexact=data["username"]).exists():
                raise serializers.ValidationError({"username": "Tên đăng nhập đã được dùng."})

            email = (data.get("email") or "").strip().lower()
            if email and User.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "Email đã được dùng."})

        # Kiểm tra tên Merchant duy nhất
        if Merchant.objects.filter(name__iexact=data["name"]).exists():
             raise serializers.ValidationError({"name": "Tên cửa hàng này đã tồn tại."})
             
        return data

    @transaction.atomic
    def create(self, validated):
        req = self.context.get("request")
        current_user = req.user if req and req.user.is_authenticated else None

        # 1. Lấy hoặc tạo user
        if current_user:
            user = current_user
        else:
            user = User.objects.create_user(
                username=validated["username"],
                password=validated["password"],
                email=(validated.get("email") or "").strip().lower(),
                is_active=True,
            )

        # 2. Gắn / cập nhật profile.role = "merchant"
        profile, _ = Profile.objects.get_or_create(user=user)
        # Cập nhật profile nếu user chưa phải là merchant
        if profile.role != "merchant":
            profile.role = "merchant"
            profile.store_name = validated.get("name", "")
            profile.store_address = validated.get("address", "")
            profile.save(update_fields=["role", "store_name", "store_address"])

        # 3. Tạo merchant record
        merchant = Merchant.objects.create(
            owner=user,
            name=validated["name"],
            address=validated.get("address", ""),
            phone=validated.get("phone", ""),
        )

        # 4. Thêm user đó làm owner trong MerchantMember
        MerchantMember.objects.create(user=user, merchant=merchant, role="owner")

        # Trả về user và merchant vừa tạo
        return user, merchant


# =========================================================
# 3. OTP Register (flow production)
# =========================================================

class RegisterRequestOTPSerializer(serializers.Serializer):
    """
    Người dùng nhập email + password + role để xin OTP.
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(
        choices=[c[0] for c in Profile.ROLE_CHOICES],
        default="customer",
    )

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email này đã được dùng.")
        return value


class RegisterConfirmOTPSerializer(serializers.Serializer):
    """
    Người dùng nhập email + otp + password (+ role).
    Nếu OTP còn hạn -> tạo User + Profile, trả token JWT.
    """
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=8)
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(
        choices=[c[0] for c in Profile.ROLE_CHOICES],
        default="customer",
    )

    def validate(self, data):
        email = data["email"].strip().lower()
        otp_code = data["otp"]

        try:
            # Lấy OTP gần nhất, chưa dùng, khớp email và code
            otp_obj = (
                OTPRequest.objects.filter(
                    identifier=email,
                    code=otp_code,
                    used=False,
                )
                .latest("created_at")
            )
        except OTPRequest.DoesNotExist:
            raise serializers.ValidationError({"otp": "OTP không hợp lệ."})

        # Kiểm tra hạn dùng OTP (is_valid() là phương thức trong OTPRequest model)
        if not otp_obj.is_valid():
            raise serializers.ValidationError({"otp": "OTP đã hết hạn hoặc đã dùng."})

        data["otp_obj"] = otp_obj
        data["email_normalized"] = email
        return data

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email_normalized"]
        password = validated_data["password"]
        role = validated_data["role"]
        otp_obj = validated_data["otp_obj"]

        # 1. tạo user
        user = User.objects.create_user(
            username=email,      # dùng email làm username mặc định
            email=email,
            password=password,
            is_active=True,
        )

        # 2. tạo profile kèm role
        Profile.objects.create(
            user=user,
            role=role,
        )

        # 3. OTP đánh dấu used
        otp_obj.used = True
        otp_obj.save(update_fields=["used"])

        # 4. sinh JWT token
        tokens = generate_tokens_for_user(user)

        return {
            "user_id": user.id,
            "email": user.email,
            "role": role,
            "tokens": tokens,
        }


# =========================================================
# 4. Đăng nhập (email + password) -> trả JWT
# =========================================================
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")

        # Do chúng ta tạo user với username=email, nên dùng email để authenticate
        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Sai email hoặc mật khẩu.")

        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        user = validated_data["user"]
        tokens = generate_tokens_for_user(user)

        # lấy role từ profile nếu có
        role = None
        try:
            role = user.profile.role
        except Profile.DoesNotExist:
            role = None

        return {
            "user_id": user.id,
            "email": user.email,
            "role": role,
            "tokens": tokens,
        }


# =========================================================
# 5. /api/accounts/me/ -> thông tin user hiện tại
# =========================================================
class MeSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
        ]

    def get_role(self, obj):
        try:
            return obj.profile.role
        except Profile.DoesNotExist:
            return None


# =========================================================
# 6. Đặt lại mật khẩu bằng OTP (quên mật khẩu)
# =========================================================
class ResetPasswordConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=8)
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate(self, data):
        email = data["email"].strip().lower()
        otp_code = data["otp"]

        try:
            # Lấy OTP gần nhất, chưa dùng, khớp email và code
            otp_obj = (
                OTPRequest.objects.filter(
                    identifier=email,
                    code=otp_code,
                    used=False,
                )
                .latest("created_at")
            )
        except OTPRequest.DoesNotExist:
            raise serializers.ValidationError({"otp": "OTP không hợp lệ."})

        if not otp_obj.is_valid():
            raise serializers.ValidationError({"otp": "OTP đã hết hạn hoặc đã dùng."})

        # Kiểm tra user có tồn tại để reset không
        if not User.objects.filter(email=email).exists():
             raise serializers.ValidationError({"email": "Tài khoản không tồn tại."})
             
        data["otp_obj"] = otp_obj
        data["email_normalized"] = email
        return data

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email_normalized"]
        new_password = validated_data["new_password"]
        otp_obj = validated_data["otp_obj"]

        user = User.objects.get(email=email) # Đã check tồn tại ở validate()

        user.set_password(new_password)
        user.save(update_fields=["password"])

        otp_obj.used = True
        otp_obj.save(update_fields=["used"])

        return {"detail": "Đặt lại mật khẩu thành công."}


# =========================================================
# (Optional) Debug OTP trong dev
# =========================================================
class OTPRequestDebugSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPRequest
        fields = [
            "id",
            "identifier",
            "code",
            "created_at",
            "expires_at",
            "used",
        ]