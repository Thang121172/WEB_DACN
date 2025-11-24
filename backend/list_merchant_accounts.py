#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để liệt kê tài khoản merchant
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from menus.models import Merchant
from django.contrib.auth import get_user_model

User = get_user_model()

def list_merchant_accounts():
    """Liệt kê tài khoản merchant"""
    
    merchants = Merchant.objects.all().select_related('owner').order_by('id')
    
    print("=" * 80)
    print("DANH SACH TAI KHOAN MERCHANT")
    print("=" * 80)
    print()
    print(f"Tong so merchant: {merchants.count()}")
    print()
    print("Tai khoan mac dinh cho tat ca merchant: Merchant123")
    print()
    print("-" * 80)
    print()
    
    for i, merchant in enumerate(merchants, 1):
        if merchant.owner:
            print(f"{i}. {merchant.name}")
            print(f"   Username: {merchant.owner.username}")
            print(f"   Email: {merchant.owner.email}")
            print(f"   Password: Merchant123")
            print(f"   Dia chi: {merchant.address or 'N/A'}")
            print()
        else:
            print(f"{i}. {merchant.name} - CHUA CO TAI KHOAN")
            print()
    
    print("=" * 80)
    print()
    print("HUONG DAN SU DUNG:")
    print("1. Dang nhap voi bat ky tai khoan merchant nao")
    print("2. Password mac dinh: Merchant123")
    print("3. Sau khi dang nhap, ban se thay dashboard merchant")
    print("4. Co the xac nhan don hang tu trang merchant dashboard")
    print()

if __name__ == '__main__':
    list_merchant_accounts()

