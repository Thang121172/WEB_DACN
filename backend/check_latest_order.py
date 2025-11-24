#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để kiểm tra đơn hàng mới nhất
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from menus.models import MenuItem
from orders.models import Order, OrderItem

def check_latest_order():
    """Kiểm tra đơn hàng mới nhất"""
    
    print("=" * 60)
    print("KIEM TRA DON HANG MOI NHAT")
    print("=" * 60)
    print()
    
    # Kiểm tra menu item 56
    item = MenuItem.objects.get(id=56)
    print(f"Menu Item 56 - Com Nieu:")
    print(f"  Stock hien tai: {item.stock}")
    print(f"  Available: {item.is_available}")
    print()
    
    # Kiểm tra đơn hàng mới nhất (tất cả, không chỉ có menu item 56)
    orders = Order.objects.all().order_by('-created_at')[:5]
    print(f"5 don hang moi nhat (tat ca):")
    print()
    
    for order in orders:
        print(f"Order {order.id}:")
        print(f"  Status: {order.status}")
        print(f"  Created: {order.created_at}")
        print(f"  Items:")
        for item_obj in order.items.all():
            print(f"    - {item_obj.name_snapshot} (ID: {item_obj.menu_item_id}): {item_obj.quantity} phan")
        print()
    
    # Kiểm tra đơn hàng có menu item 56
    orders_with_56 = Order.objects.filter(items__menu_item_id=56).order_by('-created_at')[:3]
    print(f"3 don hang gan nhat co Com Nieu (ID 56):")
    print()
    for order in orders_with_56:
        items_56 = order.items.filter(menu_item_id=56)
        for item_obj in items_56:
            print(f"  Order {order.id}: Status={order.status}, Quantity={item_obj.quantity}, Created={order.created_at}")

if __name__ == '__main__':
    check_latest_order()

