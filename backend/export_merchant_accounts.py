#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script để xuất danh sách tài khoản merchant theo khu vực ra file txt
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from menus.models import Merchant
from django.contrib.auth import get_user_model

User = get_user_model()

def export_merchant_accounts():
    """Xuất danh sách tài khoản merchant theo khu vực"""
    
    merchants = Merchant.objects.all().select_related('owner').order_by('id')
    
    # Phân loại merchant theo khu vực
    dong_nai_merchants = []
    binh_duong_merchants = []
    tphcm_merchants = []
    
    for merchant in merchants:
        address = (merchant.address or "").lower()
        name = (merchant.name or "").lower()
        
        # Phân loại dựa trên địa chỉ hoặc tên
        if "biên hòa" in address or "đồng nai" in address or "biên hòa" in name:
            dong_nai_merchants.append(merchant)
        elif "bình dương" in address or "thủ dầu một" in address or "bình dương" in name:
            binh_duong_merchants.append(merchant)
        elif "tp.hcm" in address or "hồ chí minh" in address or "tphcm" in address or "quận" in address:
            tphcm_merchants.append(merchant)
        else:
            # Nếu không xác định được, dựa vào tên
            if "biên hòa" in name:
                dong_nai_merchants.append(merchant)
            elif "bình dương" in name:
                binh_duong_merchants.append(merchant)
            elif "tp.hcm" in name or "tphcm" in name:
                tphcm_merchants.append(merchant)
            else:
                # Mặc định là TP.HCM nếu không xác định được
                tphcm_merchants.append(merchant)
    
    # Hàm để tạo nội dung file
    def create_file_content(merchants_list, region_name):
        content = []
        content.append("=" * 80)
        content.append(f"DANH SACH TAI KHOAN CUA HANG - {region_name.upper()}")
        content.append("=" * 80)
        content.append("")
        content.append(f"Tong so cua hang: {len(merchants_list)}")
        content.append("")
        content.append("Tai khoan mac dinh cho tat ca merchant: Merchant123")
        content.append("")
        content.append("-" * 80)
        content.append("")
        
        for i, merchant in enumerate(merchants_list, 1):
            if merchant.owner:
                content.append(f"{i}. {merchant.name}")
                content.append(f"   Username: {merchant.owner.username}")
                content.append(f"   Email: {merchant.owner.email}")
                content.append(f"   Password: Merchant123")
                content.append(f"   Dia chi: {merchant.address or 'N/A'}")
                content.append(f"   So dien thoai: {merchant.phone or 'N/A'}")
                content.append("")
            else:
                content.append(f"{i}. {merchant.name} - CHUA CO TAI KHOAN")
                content.append("")
        
        content.append("=" * 80)
        content.append("")
        content.append("HUONG DAN SU DUNG:")
        content.append("1. Dang nhap voi bat ky tai khoan merchant nao trong danh sach")
        content.append("2. Password mac dinh: Merchant123")
        content.append("3. Sau khi dang nhap, ban se thay dashboard merchant")
        content.append("4. Co the xac nhan don hang tu trang merchant dashboard")
        content.append("")
        
        return "\n".join(content)
    
    # Tạo file cho Đồng Nai
    if dong_nai_merchants:
        dong_nai_content = create_file_content(dong_nai_merchants, "DONG NAI (BIEN HOA)")
        with open("tai_khoan_cua_hang_dong_nai.txt", "w", encoding="utf-8") as f:
            f.write(dong_nai_content)
        print(f"✅ Da tao file: tai_khoan_cua_hang_dong_nai.txt ({len(dong_nai_merchants)} cua hang)")
    
    # Tạo file cho Bình Dương
    if binh_duong_merchants:
        binh_duong_content = create_file_content(binh_duong_merchants, "BINH DUONG")
        with open("tai_khoan_cua_hang_binh_duong.txt", "w", encoding="utf-8") as f:
            f.write(binh_duong_content)
        print(f"✅ Da tao file: tai_khoan_cua_hang_binh_duong.txt ({len(binh_duong_merchants)} cua hang)")
    
    # Tạo file cho TP.HCM
    if tphcm_merchants:
        tphcm_content = create_file_content(tphcm_merchants, "TP.HCM")
        with open("tai_khoan_cua_hang_tphcm.txt", "w", encoding="utf-8") as f:
            f.write(tphcm_content)
        print(f"✅ Da tao file: tai_khoan_cua_hang_tphcm.txt ({len(tphcm_merchants)} cua hang)")
    
    print()
    print("=" * 80)
    print("TONG KET:")
    print(f"  - Dong Nai (Bien Hoa): {len(dong_nai_merchants)} cua hang")
    print(f"  - Binh Duong: {len(binh_duong_merchants)} cua hang")
    print(f"  - TP.HCM: {len(tphcm_merchants)} cua hang")
    print(f"  - Tong cong: {len(dong_nai_merchants) + len(binh_duong_merchants) + len(tphcm_merchants)} cua hang")
    print("=" * 80)

if __name__ == '__main__':
    export_merchant_accounts()

