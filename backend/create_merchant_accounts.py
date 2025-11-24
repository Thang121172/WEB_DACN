#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để tạo tài khoản merchant cho các cửa hàng đã có trong database
"""
import os
import sys
import django

# Fix encoding cho Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from menus.models import Merchant, MerchantMember
from accounts.models import Profile

User = get_user_model()

def create_merchant_accounts():
    """Tạo tài khoản merchant cho các cửa hàng chưa có owner hoặc owner chưa có profile merchant"""
    
    print("=" * 60)
    print("Kiem tra va tao tai khoan merchant cho cac cua hang")
    print("=" * 60)
    print()
    
    merchants = Merchant.objects.all()
    print(f"Tong so merchant trong database: {merchants.count()}")
    print()
    
    # Kiểm tra xem có merchant nào dùng chung tài khoản merchant_default không
    default_user = User.objects.filter(username='merchant_default').first()
    if default_user:
        shared_merchants = Merchant.objects.filter(owner=default_user)
        if shared_merchants.exists():
            print(f"[!] Phat hien {shared_merchants.count()} merchant dung chung tai khoan 'merchant_default'")
            print(f"   Dang tao tai khoan rieng cho tung merchant...")
            print()
    
    created_count = 0
    updated_count = 0
    
    for merchant in merchants:
        print(f"Merchant: {merchant.name} (ID: {merchant.id})")
        
        # Kiểm tra xem merchant đã có owner chưa, và owner có phải là merchant_default không
        if merchant.owner and merchant.owner.username != 'merchant_default':
            owner = merchant.owner
            print(f"   [+] Da co owner: {owner.email} (ID: {owner.id})")
            
            # Kiểm tra profile
            try:
                profile = owner.profile
                if profile.role != 'merchant':
                    print(f"   [!] Profile role hien tai: {profile.role}, dang cap nhat thanh merchant...")
                    profile.role = 'merchant'
                    profile.store_name = merchant.name
                    profile.store_address = merchant.address or ""
                    profile.save(update_fields=['role', 'store_name', 'store_address'])
                    updated_count += 1
                    print(f"   [+] Da cap nhat profile thanh merchant")
                else:
                    print(f"   [+] Profile da la merchant")
            except Profile.DoesNotExist:
                print(f"   [!] Chua co profile, dang tao...")
                Profile.objects.create(
                    user=owner,
                    role='merchant',
                    store_name=merchant.name,
                    store_address=merchant.address or ""
                )
                updated_count += 1
                print(f"   [+] Da tao profile merchant")
            
            # Kiểm tra MerchantMember
            if not MerchantMember.objects.filter(merchant=merchant, user=owner).exists():
                print(f"   [!] Chua co MerchantMember, dang tao...")
                MerchantMember.objects.create(
                    merchant=merchant,
                    user=owner,
                    role='owner'
                )
                print(f"   [+] Da tao MerchantMember")
        else:
            # Tạo tài khoản mới cho merchant (chưa có owner hoặc owner là merchant_default)
            if merchant.owner and merchant.owner.username == 'merchant_default':
                print(f"   [!] Đang tạo tài khoản riêng (hiện đang dùng merchant_default)...")
            else:
                print(f"   [!] Chưa có owner, đang tạo tài khoản mới...")
            
            # Tạo username và email từ tên merchant
            base_name = merchant.name.lower()
            # Chuyển đổi tiếng Việt có dấu sang không dấu
            vietnamese_map = {
                'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
                'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
                'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
                'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
                'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
                'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
                'đ': 'd'
            }
            for vn_char, en_char in vietnamese_map.items():
                base_name = base_name.replace(vn_char, en_char)
            
            # Loại bỏ ký tự đặc biệt, chỉ giữ chữ và số
            base_name = ''.join(c for c in base_name if c.isalnum())[:15]
            if not base_name:
                base_name = f"merchant{merchant.id}"
            
            username = f"merchant_{merchant.id}_{base_name}"
            email = f"{username}@fastfood.local"
            password = "Merchant123"  # Mật khẩu mặc định
            
            # Kiểm tra xem username đã tồn tại chưa
            counter = 1
            original_username = username
            while User.objects.filter(username=username).exists():
                username = f"{original_username}{counter}"
                email = f"{username}@fastfood.local"
                counter += 1
            
            # Tạo user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=True
            )
            print(f"   [+] Da tao user: {username} ({email})")
            
            # Tạo profile
            Profile.objects.create(
                user=user,
                role='merchant',
                store_name=merchant.name,
                store_address=merchant.address or "",
                phone=merchant.phone or ""
            )
            print(f"   [+] Da tao profile merchant")
            
            # Cập nhật merchant owner
            merchant.owner = user
            merchant.save(update_fields=['owner'])
            print(f"   [+] Da gan owner cho merchant")
            
            # Tạo MerchantMember
            MerchantMember.objects.create(
                merchant=merchant,
                user=user,
                role='owner'
            )
            print(f"   [+] Da tao MerchantMember")
            
            created_count += 1
        
        print()
    
    print("=" * 60)
    print(f"[+] Hoan tat!")
    print(f"   - Da tao moi: {created_count} tai khoan")
    print(f"   - Da cap nhat: {updated_count} tai khoan")
    print("=" * 60)
    print()
    print("Danh sach tai khoan merchant (10 dau tien):")
    print()
    
    # In danh sách tài khoản (10 đầu tiên)
    for merchant in Merchant.objects.all().select_related('owner')[:10]:
        if merchant.owner:
            try:
                profile = merchant.owner.profile
                print(f"Merchant: {merchant.name}")
                print(f"   Username: {merchant.owner.username}")
                print(f"   Email: {merchant.owner.email}")
                print(f"   Password: Merchant123 (mac dinh)")
                print(f"   Dia chi: {merchant.address or 'N/A'}")
                print()
            except Profile.DoesNotExist:
                print(f"Merchant: {merchant.name} - [!] Chua co profile")
                print()
    
    if merchants.count() > 10:
        print(f"... va {merchants.count() - 10} merchant khac")
        print()

if __name__ == '__main__':
    create_merchant_accounts()

