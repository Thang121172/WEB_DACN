#!/usr/bin/env python
"""
Script để kiểm tra tài khoản user trong database
Sử dụng: docker-compose exec backend python check_user.py <username>
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
sys.path.insert(0, '/app/backend')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import Profile

User = get_user_model()

def check_user(username):
    try:
        user = User.objects.get(username=username)
        print(f"\n{'='*60}")
        print(f"✅ TÌM THẤY USER: {username}")
        print(f"{'='*60}")
        print(f"\n📋 THÔNG TIN TỪ BẢNG auth_user:")
        print(f"   - ID: {user.id}")
        print(f"   - Username: {user.username}")
        print(f"   - Email: {user.email}")
        print(f"   - Active: {user.is_active}")
        print(f"   - Staff: {user.is_staff}")
        print(f"   - Superuser: {user.is_superuser}")
        print(f"   - Date Joined: {user.date_joined}")
        print(f"   - Last Login: {user.last_login or 'Chưa đăng nhập'}")

        # Kiểm tra profile
        try:
            profile = Profile.objects.get(user=user)
            print(f"\n📋 THÔNG TIN TỪ BẢNG accounts_profile:")
            print(f"   - Profile ID: {profile.id}")
            print(f"   - User ID: {profile.user_id}")
            print(f"   - Role: {profile.role}")
            print(f"   - Full Name: {profile.full_name or '(Chưa có)'}")
            print(f"   - Phone: {profile.phone or '(Chưa có)'}")
            print(f"   - Default Address: {profile.default_address or '(Chưa có)'}")
        except Profile.DoesNotExist:
            print(f"\n⚠️  CHƯA CÓ PROFILE trong bảng accounts_profile")
            print(f"   (Profile sẽ được tạo tự động khi cần)")

        print(f"\n{'='*60}\n")
    except User.DoesNotExist:
        print(f"\n❌ KHÔNG TÌM THẤY USER: {username}")
        print(f"\n📊 Danh sách 10 user mới nhất:")
        users = User.objects.all().order_by('-id')[:10]
        for u in users:
            print(f"   - {u.username} ({u.email})")
        print()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Sử dụng: python check_user.py <username>")
        print("\nVí dụ: python check_user.py testuser")
        sys.exit(1)
    
    username = sys.argv[1]
    check_user(username)

