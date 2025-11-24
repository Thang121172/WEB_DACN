#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để kiểm tra khoảng cách từ shipper đến merchant
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from menus.utils import haversine_distance

def check_distances():
    print("=" * 60)
    print("KIEM TRA KHOANG CACH TU SHIPPER DEN MERCHANT")
    print("=" * 60)
    print()
    
    # Shipper GPS
    shipper_lat = 11.310897
    shipper_lng = 106.050406
    
    print(f"📍 Shipper GPS: {shipper_lat}, {shipper_lng}")
    print()
    
    # Order 12: READY_FOR_PICKUP
    merchant1_lat = 11.332101
    merchant1_lng = 106.076425
    distance1 = haversine_distance(shipper_lat, shipper_lng, merchant1_lat, merchant1_lng)
    
    print(f"Order 12 (READY_FOR_PICKUP):")
    print(f"  Merchant GPS: {merchant1_lat}, {merchant1_lng}")
    print(f"  Khoảng cách: {distance1:.2f} km")
    print(f"  Trong bán kính 20km? {'✅ CÓ' if distance1 <= 20 else '❌ KHÔNG'}")
    print()
    
    # Order 1: PENDING
    merchant2_lat = 11.363428
    merchant2_lng = 106.036392
    distance2 = haversine_distance(shipper_lat, shipper_lng, merchant2_lat, merchant2_lng)
    
    print(f"Order 1 (PENDING):")
    print(f"  Merchant GPS: {merchant2_lat}, {merchant2_lng}")
    print(f"  Khoảng cách: {distance2:.2f} km")
    print(f"  Trong bán kính 20km? {'✅ CÓ' if distance2 <= 20 else '❌ KHÔNG'}")
    print()

if __name__ == '__main__':
    check_distances()

