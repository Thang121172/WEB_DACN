#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Reset password cho shipper account
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def reset_password():
    print("=" * 60)
    print("RESET PASSWORD CHO SHIPPER")
    print("=" * 60)
    print()
    
    username = 'shipper_1763976955'
    
    try:
        user = User.objects.get(username=username)
        print(f"✅ Tìm thấy user: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Is Active: {user.is_active}")
        print()
        
        # Reset password
        new_password = 'Shipper123'
        user.set_password(new_password)
        user.save()
        
        print(f"✅ Đã reset password thành công!")
        print()
        print("📋 THÔNG TIN ĐĂNG NHẬP:")
        print(f"   👤 Username: {user.username}")
        print(f"   📧 Email: {user.email}")
        print(f"   🔑 Password: {new_password}")
        print()
        print("=" * 60)
        
    except User.DoesNotExist:
        print(f"❌ Không tìm thấy user: {username}")
    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == '__main__':
    reset_password()

