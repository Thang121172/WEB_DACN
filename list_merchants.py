#!/usr/bin/env python
"""
Script để liệt kê thông tin đăng nhập của các cửa hàng
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
sys.path.insert(0, '/app/backend')
django.setup()

from django.contrib.auth import get_user_model
from menus.models import Merchant

User = get_user_model()

# Danh sách các cửa hàng cần kiểm tra
merchants_info = [
    ('Cà Phê Sáng', 'cafe_bienhoa'),
    ('Quán Cơm Gia Đình', 'quancom_bienhoa'),
    ('Pizza & Pasta House', 'pizza_bienhoa'),
    ('Gà Rán KFC Style', 'chicken_bienhoa'),
    ('Bún Thịt Nướng Cô Ba', 'bunthitnuong_bienhoa'),
    ('Phở Gia Truyền', 'pho_bienhoa'),
    ('Bánh Mì Sài Gòn', 'banhmi_bienhoa'),
    ('Cơm Tấm Cali', 'comtam_bienhoa'),
    ('Cơm Tấm Tân Phong', 'comtam_tanphong'),
    ('Bún Bò Hiệp Hòa', 'bunbo_hiephoa'),
]

print('=' * 70)
print('THÔNG TIN ĐĂNG NHẬP CÁC CỬA HÀNG ĐỂ TEST')
print('=' * 70)
print()

for name, username in merchants_info:
    try:
        user = User.objects.get(username=username)
        try:
            merchant = Merchant.objects.get(owner=user)
            print(f'📌 {name}')
            print(f'   Username: {username}')
            print(f'   Password: Password123')
            print(f'   Email: {user.email}')
            print(f'   Merchant ID: {merchant.id}')
            print(f'   Địa chỉ: {merchant.address}')
            print()
        except Merchant.DoesNotExist:
            print(f'⚠️  {name} ({username}): User tồn tại nhưng chưa có Merchant')
            print()
    except User.DoesNotExist:
        print(f'❌ {name} ({username}): User không tồn tại')
        print()

print('=' * 70)
print('HƯỚNG DẪN TEST:')
print('1. Đăng nhập với một trong các tài khoản trên')
print('2. Vào /merchant/dashboard để xem tổng quan cửa hàng')
print('3. Vào /merchant/menu để quản lý menu')
print('4. Test luồng: Customer đặt hàng -> Merchant xác nhận')
print('=' * 70)

