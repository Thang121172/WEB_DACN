#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để kiểm tra đơn hàng sẵn sàng cho shipper
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from orders.models import Order

def check_orders():
    print("=" * 60)
    print("KIEM TRA DON HANG SAN SANG CHO SHIPPER")
    print("=" * 60)
    print()
    
    # Lấy tất cả đơn hàng
    all_orders = Order.objects.all().order_by('-created_at')[:10]
    print(f"10 don hang moi nhat:")
    for o in all_orders:
        print(f"  Order {o.id}: Status={o.status}, Merchant={o.merchant.name}, Created={o.created_at.strftime('%H:%M:%S')}, Shipper={o.shipper.username if o.shipper else 'None'}")
    
    print()
    
    # Lấy đơn hàng sẵn sàng
    ready_orders = Order.objects.filter(
        status__in=['PENDING', 'READY_FOR_PICKUP'],
        shipper__isnull=True
    ).select_related('merchant', 'customer')
    
    print(f"Don hang san sang (PENDING/READY_FOR_PICKUP, chua co shipper): {ready_orders.count()}")
    print()
    
    for o in ready_orders[:10]:
        print(f"  Order {o.id}:")
        print(f"    Status: {o.status}")
        print(f"    Merchant: {o.merchant.name} (ID: {o.merchant.id})")
        print(f"    Merchant GPS: {o.merchant.latitude}, {o.merchant.longitude}")
        print(f"    Customer: {o.customer.username}")
        print(f"    Total: {o.total_amount}")
        print(f"    Created: {o.created_at}")
        print()

if __name__ == '__main__':
    check_orders()

