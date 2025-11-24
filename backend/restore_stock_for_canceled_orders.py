#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để restore stock cho các đơn hàng đã bị cancel
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from orders.models import Order, OrderItem
from menus.models import MenuItem
from django.db import transaction

def restore_stock_for_canceled_orders():
    """Restore stock cho tất cả đơn hàng đã bị cancel"""
    
    print("=" * 60)
    print("Restore stock cho cac don hang da bi cancel")
    print("=" * 60)
    print()
    
    # Lấy tất cả đơn hàng đã cancel
    canceled_orders = Order.objects.filter(status='CANCELED').select_related().prefetch_related('items__menu_item')
    
    print(f"Tim thay {canceled_orders.count()} don hang CANCELED")
    print()
    
    restored_count = 0
    total_restored = 0
    
    with transaction.atomic():
        for order in canceled_orders:
            for item in order.items.all():
                if item.menu_item:
                    menu_item = item.menu_item
                    old_stock = menu_item.stock
                    menu_item.stock += item.quantity
                    
                    # Nếu stock > 0, đánh dấu lại là available
                    if menu_item.stock > 0:
                        menu_item.is_available = True
                    
                    menu_item.save(update_fields=['stock', 'is_available'])
                    
                    print(f"Order {order.id}: Restore {item.quantity} {menu_item.name} (ID: {menu_item.id})")
                    print(f"  Stock: {old_stock} -> {menu_item.stock}")
                    print()
                    
                    restored_count += 1
                    total_restored += item.quantity
    
    print("=" * 60)
    print(f"Hoan tat!")
    print(f"  - Da restore {restored_count} menu items")
    print(f"  - Tong so luong da restore: {total_restored}")
    print("=" * 60)

if __name__ == '__main__':
    restore_stock_for_canceled_orders()

