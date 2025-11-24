#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test API shipper trực tiếp để xem lỗi
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from orders.views import ShipperViewSet

User = get_user_model()

def test_api():
    print("=" * 60)
    print("TEST API SHIPPER TRỰC TIẾP")
    print("=" * 60)
    print()
    
    try:
        # Lấy shipper
        shipper = User.objects.get(username='shipper_1763976955')
        print(f"✅ Tìm thấy shipper: {shipper.username}")
        print()
        
        # Tạo request factory
        factory = APIRequestFactory()
        
        # Test API
        print("Test 1: Gọi API với GPS từ query params")
        request = factory.get('/api/shipper/', {
            'lat': '11.310897',
            'lng': '106.050406',
            'radius': '20'
        })
        force_authenticate(request, user=shipper)
        
        viewset = ShipperViewSet()
        viewset.action = 'list'
        
        try:
            response = viewset.list(request)
            print(f"   Status: {response.status_code}")
            print(f"   Data: {response.data}")
            print(f"   Số đơn hàng: {len(response.data) if isinstance(response.data, list) else 'N/A'}")
        except Exception as e:
            print(f"   ❌ Lỗi: {e}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_api()

