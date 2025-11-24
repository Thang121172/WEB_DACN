#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để kiểm tra vấn đề stock
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from menus.models import MenuItem
from orders.models import Order, OrderItem

def check_stock_issue():
    """Kiểm tra vấn đề stock"""
    
    print("=" * 60)
    print("KIEM TRA VAN DE STOCK")
    print("=" * 60)
    print()
    
    # Kiểm tra menu item 56
    try:
        item = MenuItem.objects.get(id=56)
        print(f"Menu Item 56 - Com Nieu:")
        print(f"  Stock hien tai: {item.stock}")
        print(f"  Available: {item.is_available}")
        print()
    except MenuItem.DoesNotExist:
        print("Menu item 56 khong ton tai!")
        return
    
    # Kiểm tra các đơn hàng gần đây
    orders = Order.objects.filter(items__menu_item_id=56).order_by('-created_at')[:10]
    print(f"Danh sach {orders.count()} don hang gan nhat co Com Nieu:")
    print()
    
    total_ordered = 0
    total_canceled = 0
    
    for order in orders:
        items = order.items.filter(menu_item_id=56)
        for item_obj in items:
            total_ordered += item_obj.quantity
            if order.status == 'CANCELED':
                total_canceled += item_obj.quantity
            print(f"  Order {order.id}: Status={order.status}, Quantity={item_obj.quantity}, Created={order.created_at}")
    
    print()
    print("=" * 60)
    print(f"Tong ket:")
    print(f"  - Tong so luong da dat: {total_ordered}")
    print(f"  - Tong so luong da cancel: {total_canceled}")
    print(f"  - Stock hien tai: {item.stock}")
    print(f"  - Stock du kien (neu khong co don nao): {item.stock + total_ordered - total_canceled}")
    print("=" * 60)

if __name__ == '__main__':
    check_stock_issue()

