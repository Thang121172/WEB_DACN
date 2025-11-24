from __future__ import annotations
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile, OTPRequest
# ĐÃ SỬA: Giữ import ngắn gọn, sử dụng tên App (menus)
from menus.models import Merchant, MerchantMember 

User = get_user_model()


# =========================================================
# Helper: tạo JWT tokens từ user
# =========================================================
def generate_tokens_for_user(user: "User"):
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
# 2. Đăng ký Merchant (tạo user/convert user thành merchant)
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
                    {"detail": "username & password required for new user"}
                )

            if User.objects.filter(username__iexact=data["username"]).exists():
                raise serializers.ValidationError({"username": "taken"})

            email = (data.get("email") or "").strip().lower()
            if email and User.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "used"})

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

        # 5. TRẢ VỀ USER VÀ MERCHANT
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
    Nếu OTP còn hạn -> tạo User + Profile -> trả token JWT.
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

        # Kiểm tra hạn dùng OTP
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
            username=email,    # dùng email làm username mặc định
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
    # Nhận cả username hoặc email (linh hoạt)
    username = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        # Lấy username hoặc email (ưu tiên username nếu có)
        username = attrs.get("username") or ""
        email = attrs.get("email") or ""
        username_or_email = (username.strip() if username else "") or (email.strip().lower() if email else "")
        password = attrs.get("password", "")

        if not username_or_email:
            raise serializers.ValidationError({"detail": "Vui lòng nhập email hoặc username."})
        
        if not password:
            raise serializers.ValidationError({"detail": "Vui lòng nhập mật khẩu."})

        # Thử authenticate với username trước
        user = authenticate(username=username_or_email, password=password)
        
        # Nếu không tìm thấy, thử tìm user theo email rồi authenticate với username thật
        if not user:
            try:
                # Tìm user theo email (case-insensitive)
                user_by_email = User.objects.filter(email__iexact=username_or_email).first()
                if user_by_email:
                    # Authenticate với username thật của user
                    user = authenticate(username=user_by_email.username, password=password)
            except Exception:
                pass
        
        if not user:
            # Kiểm tra xem email/username có tồn tại không (không cần password)
            user_exists = User.objects.filter(
                Q(username__iexact=username_or_email) | 
                Q(email__iexact=username_or_email)
            ).exists()
            
            if not user_exists:
                raise serializers.ValidationError({
                    "detail": "Email/username không tồn tại trong hệ thống. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới."
                })
            else:
                raise serializers.ValidationError({"detail": "Sai email/username hoặc mật khẩu."})
        
        if not user.is_active:
            raise serializers.ValidationError({"detail": "Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt tài khoản."})

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
    default_address = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    location_updated_at = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "default_address",
            "phone",
            "full_name",
            "latitude",
            "longitude",
            "location_updated_at",
        ]

    def get_role(self, obj):
        try:
            return obj.profile.role
        except Profile.DoesNotExist:
            return None

    def get_default_address(self, obj):
        try:
            return obj.profile.default_address
        except Profile.DoesNotExist:
            return None

    def get_phone(self, obj):
        try:
            return obj.profile.phone
        except Profile.DoesNotExist:
            return None

    def get_full_name(self, obj):
        try:
            return obj.profile.full_name
        except Profile.DoesNotExist:
            return None

    def get_latitude(self, obj):
        try:
            return float(obj.profile.latitude) if obj.profile.latitude else None
        except Profile.DoesNotExist:
            return None

    def get_longitude(self, obj):
        try:
            return float(obj.profile.longitude) if obj.profile.longitude else None
        except Profile.DoesNotExist:
            return None

    def get_location_updated_at(self, obj):
        try:
            return obj.profile.location_updated_at.isoformat() if obj.profile.location_updated_at else None
        except Profile.DoesNotExist:
            return None


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer để GET/PUT profile information"""
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Profile
        fields = [
            'id',
            'username',
            'email',
            'role',
            'default_address',
            'phone',
            'full_name',
            'store_name',
            'store_address',
            'vehicle_plate',
            'is_available',
        ]
        read_only_fields = ['id', 'role', 'store_name', 'store_address', 'vehicle_plate', 'is_available']

    def update(self, instance, validated_data):
        # Chỉ cho phép update default_address, phone, full_name cho customer
        if instance.role == 'customer':
            if 'default_address' in validated_data:
                instance.default_address = validated_data['default_address']
            if 'phone' in validated_data:
                instance.phone = validated_data['phone']
            if 'full_name' in validated_data:
                instance.full_name = validated_data['full_name']
            instance.save()
        return instance


class ProfileUpdateSerializer(serializers.Serializer):
    """Serializer để cập nhật thông tin profile"""
    default_address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def update(self, instance, validated_data):
        profile, created = Profile.objects.get_or_create(user=instance)
        for attr, value in validated_data.items():
            setattr(profile, attr, value or None)
        profile.save()
        return instance


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

        data["otp_obj"] = otp_obj
        data["email_normalized"] = email
        return data

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email_normalized"]
        new_password = validated_data["new_password"]
        otp_obj = validated_data["otp_obj"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "Tài khoản không tồn tại."})

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