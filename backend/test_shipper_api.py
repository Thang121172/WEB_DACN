#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để test API shipper trực tiếp
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from django.test import RequestFactory
from orders.views import ShipperViewSet
from rest_framework.test import force_authenticate

User = get_user_model()

def test_shipper_api():
    print("=" * 60)
    print("TEST API SHIPPER")
    print("=" * 60)
    print()
    
    # Lấy shipper user
    try:
        shipper = User.objects.get(username='shipper_1763976955')
        print(f"✅ Tìm thấy shipper: {shipper.username}")
        print(f"   Profile GPS: {shipper.profile.latitude}, {shipper.profile.longitude}")
        print()
    except User.DoesNotExist:
        print("❌ Không tìm thấy shipper_1763976955")
        return
    
    # Tạo request factory
    factory = RequestFactory()
    
    # Test 1: Gọi API với GPS từ query params
    print("Test 1: Gọi API với GPS từ query params")
    request = factory.get('/api/shipper/', {
        'lat': '11.310897',
        'lng': '106.050406',
        'radius': '20'
    })
    force_authenticate(request, user=shipper)
    
    viewset = ShipperViewSet()
    viewset.action = 'list'
    response = viewset.list(request)
    
    print(f"   Status: {response.status_code}")
    print(f"   Số đơn hàng: {len(response.data)}")
    if response.data:
        for order in response.data:
            print(f"   - Order {order['id']}: {order['merchant']['name']}, Distance: {order.get('distance_to_merchant_km', 'N/A')} km")
    print()
    
    # Test 2: Gọi API không có query params (lấy từ profile)
    print("Test 2: Gọi API không có query params (lấy từ profile)")
    request2 = factory.get('/api/shipper/', {'radius': '20'})
    force_authenticate(request2, user=shipper)
    
    viewset2 = ShipperViewSet()
    viewset2.action = 'list'
    response2 = viewset2.list(request2)
    
    print(f"   Status: {response2.status_code}")
    print(f"   Số đơn hàng: {len(response2.data)}")
    if response2.data:
        for order in response2.data:
            print(f"   - Order {order['id']}: {order['merchant']['name']}, Distance: {order.get('distance_to_merchant_km', 'N/A')} km")
    print()

if __name__ == '__main__':
    test_shipper_api()

