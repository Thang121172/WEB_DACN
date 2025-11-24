#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để tạo tài khoản shipper với GPS location gần vị trí chỉ định
"""
import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import Profile
from django.utils import timezone

User = get_user_model()

def create_shipper_nearby(target_lat=11.318067, target_lng=106.050355, distance_km=2.0):
    """
    Tạo tài khoản shipper với GPS location gần vị trí chỉ định
    
    Args:
        target_lat: Vĩ độ mục tiêu
        target_lng: Kinh độ mục tiêu
        distance_km: Khoảng cách tối đa từ vị trí mục tiêu (km)
    """
    
    print("=" * 60)
    print("TẠO TÀI KHOẢN SHIPPER GẦN VỊ TRÍ")
    print("=" * 60)
    print(f"Vị trí mục tiêu: {target_lat}, {target_lng}")
    print(f"Khoảng cách tối đa: {distance_km} km")
    print()
    
    # Tạo tọa độ ngẫu nhiên gần vị trí mục tiêu
    # 1 độ vĩ độ ≈ 111 km
    # 1 độ kinh độ ≈ 111 km * cos(vĩ độ)
    lat_offset = (distance_km / 111.0) * random.uniform(-1, 1)
    lng_offset = (distance_km / (111.0 * abs(1 / (target_lat * 3.14159 / 180)))) * random.uniform(-1, 1)
    
    shipper_lat = target_lat + lat_offset
    shipper_lng = target_lng + lng_offset
    
    # Đảm bảo tọa độ hợp lệ cho Việt Nam
    shipper_lat = max(8.0, min(23.0, shipper_lat))  # Vĩ độ Việt Nam
    shipper_lng = max(102.0, min(110.0, shipper_lng))  # Kinh độ Việt Nam
    
    print(f"📍 Tọa độ shipper: {shipper_lat:.6f}, {shipper_lng:.6f}")
    
    # Tạo username và email
    username = f"shipper_{int(timezone.now().timestamp())}"
    email = f"{username}@fastfood.local"
    password = "Shipper123"  # Mật khẩu mặc định
    
    # Kiểm tra xem username đã tồn tại chưa
    counter = 1
    original_username = username
    while User.objects.filter(username=username).exists():
        username = f"{original_username}_{counter}"
        email = f"{username}@fastfood.local"
        counter += 1
    
    # Tạo user
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        is_active=True
    )
    print(f"✅ Đã tạo user: {username} ({email})")
    
    # Tạo profile với GPS location
    profile = Profile.objects.create(
        user=user,
        role='shipper',
        is_available=True,
        latitude=shipper_lat,
        longitude=shipper_lng,
        location_updated_at=timezone.now(),
        full_name=f"Shipper {username}",
        phone=f"0{random.randint(100000000, 999999999)}",  # Số điện thoại ngẫu nhiên
        vehicle_plate=f"{random.randint(10, 99)}{chr(random.randint(65, 90))}{random.randint(1000, 9999)}"  # Biển số xe
    )
    print(f"✅ Đã tạo profile shipper với GPS location")
    print(f"   - Latitude: {profile.latitude}")
    print(f"   - Longitude: {profile.longitude}")
    print(f"   - Phone: {profile.phone}")
    print(f"   - Vehicle Plate: {profile.vehicle_plate}")
    print()
    
    print("=" * 60)
    print("✅ HOÀN TẤT!")
    print("=" * 60)
    print()
    print("📋 THÔNG TIN ĐĂNG NHẬP:")
    print(f"   👤 Username: {username}")
    print(f"   📧 Email: {email}")
    print(f"   🔑 Password: {password}")
    print(f"   📍 GPS Location: {shipper_lat:.6f}, {shipper_lng:.6f}")
    print()
    print("💡 Bạn có thể đăng nhập với thông tin trên để test shipper dashboard")
    print("=" * 60)

if __name__ == '__main__':
    # Tọa độ mục tiêu từ người dùng
    target_lat = 11.318067
    target_lng = 106.050355
    
    # Tạo shipper gần vị trí đó (trong phạm vi 2km)
    create_shipper_nearby(target_lat, target_lng, distance_km=2.0)

