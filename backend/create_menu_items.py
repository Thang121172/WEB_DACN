"""
Script để tạo menu items cho tất cả các cửa hàng
"""
import os
import django
import random
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from menus.models import Merchant, MenuItem, Category
from django.db import transaction

# Menu items mẫu theo loại cửa hàng
MENU_ITEMS = {
    'default': [
        {'name': 'Cơm Sườn Nướng', 'description': 'Cơm với sườn nướng thơm lừng', 'price': 45000, 'stock': 50},
        {'name': 'Cơm Gà Nướng', 'description': 'Cơm với gà nướng mật ong', 'price': 50000, 'stock': 40},
        {'name': 'Cơm Tấm Sườn Bì Chả', 'description': 'Cơm tấm đầy đủ sườn, bì, chả', 'price': 55000, 'stock': 60},
        {'name': 'Canh Chua Cá', 'description': 'Canh chua cá lóc nấu dứa', 'price': 60000, 'stock': 30},
        {'name': 'Bún Bò Huế', 'description': 'Bún bò Huế đậm đà', 'price': 50000, 'stock': 35},
        {'name': 'Phở Bò', 'description': 'Phở bò truyền thống', 'price': 55000, 'stock': 45},
        {'name': 'Bánh Mì Thịt Nướng', 'description': 'Bánh mì với thịt nướng thơm ngon', 'price': 30000, 'stock': 80},
        {'name': 'Bánh Mì Pate', 'description': 'Bánh mì pate đặc biệt', 'price': 25000, 'stock': 70},
        {'name': 'Bún Chả', 'description': 'Bún chả Hà Nội', 'price': 50000, 'stock': 40},
        {'name': 'Bún Riêu Cua', 'description': 'Bún riêu cua đậm đà', 'price': 50000, 'stock': 35},
    ],
    'bun': [
        {'name': 'Bún Bò Huế', 'description': 'Bún bò Huế đậm đà', 'price': 50000, 'stock': 35},
        {'name': 'Bún Chả', 'description': 'Bún chả Hà Nội', 'price': 50000, 'stock': 40},
        {'name': 'Bún Riêu Cua', 'description': 'Bún riêu cua đậm đà', 'price': 50000, 'stock': 35},
        {'name': 'Bún Thịt Nướng', 'description': 'Bún thịt nướng thơm ngon', 'price': 45000, 'stock': 50},
        {'name': 'Bún Mọc', 'description': 'Bún mọc giò heo', 'price': 45000, 'stock': 40},
    ],
    'com': [
        {'name': 'Cơm Sườn Nướng', 'description': 'Cơm với sườn nướng thơm lừng', 'price': 45000, 'stock': 50},
        {'name': 'Cơm Gà Nướng', 'description': 'Cơm với gà nướng mật ong', 'price': 50000, 'stock': 40},
        {'name': 'Cơm Tấm Sườn Bì Chả', 'description': 'Cơm tấm đầy đủ sườn, bì, chả', 'price': 55000, 'stock': 60},
        {'name': 'Cơm Gà Xối Mỡ', 'description': 'Cơm gà xối mỡ giòn tan', 'price': 50000, 'stock': 45},
        {'name': 'Cơm Niêu', 'description': 'Cơm niêu đất nung', 'price': 60000, 'stock': 30},
    ],
    'banh_mi': [
        {'name': 'Bánh Mì Thịt Nướng', 'description': 'Bánh mì với thịt nướng thơm ngon', 'price': 30000, 'stock': 80},
        {'name': 'Bánh Mì Pate', 'description': 'Bánh mì pate đặc biệt', 'price': 25000, 'stock': 70},
        {'name': 'Bánh Mì Chả Cá', 'description': 'Bánh mì chả cá', 'price': 35000, 'stock': 60},
        {'name': 'Bánh Mì Chả Lụa', 'description': 'Bánh mì chả lụa', 'price': 30000, 'stock': 65},
    ],
    'pho': [
        {'name': 'Phở Bò', 'description': 'Phở bò truyền thống', 'price': 55000, 'stock': 45},
        {'name': 'Phở Gà', 'description': 'Phở gà thơm ngon', 'price': 50000, 'stock': 40},
        {'name': 'Phở Tái', 'description': 'Phở tái chín', 'price': 55000, 'stock': 45},
    ],
}

IMAGE_URLS = [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1552569973-ffb40c0b0c8e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
]

def get_menu_type(name):
    """Xác định loại menu dựa trên tên cửa hàng"""
    name_lower = name.lower()
    if 'bún' in name_lower:
        return 'bun'
    elif 'cơm' in name_lower:
        return 'com'
    elif 'bánh mì' in name_lower:
        return 'banh_mi'
    elif 'phở' in name_lower:
        return 'pho'
    else:
        return 'default'

@transaction.atomic
def create_menu_items():
    """Tạo menu items cho tất cả các cửa hàng"""
    print("🚀 Bắt đầu tạo menu items cho các cửa hàng...")
    
    merchants = Merchant.objects.filter(is_active=True)
    total_items = 0
    
    for merchant in merchants:
        menu_type = get_menu_type(merchant.name)
        items = MENU_ITEMS.get(menu_type, MENU_ITEMS['default'])
        
        # Tạo 5-8 món ngẫu nhiên cho mỗi cửa hàng
        num_items = random.randint(5, 8)
        selected_items = random.sample(items, min(num_items, len(items)))
        
        items_to_create = []
        for item_data in selected_items:
            menu_item = MenuItem(
                merchant=merchant,
                name=item_data['name'],
                description=item_data['description'],
                price=Decimal(str(item_data['price'])),
                stock=item_data['stock'],
                image_url=random.choice(IMAGE_URLS),
                is_available=True
            )
            items_to_create.append(menu_item)
        
        # Bulk create cho merchant này
        MenuItem.objects.bulk_create(items_to_create)
        total_items += len(items_to_create)
        print(f"✅ Đã tạo {len(items_to_create)} món cho {merchant.name}")
    
    print(f"\n✅ Đã tạo thành công {total_items} menu items cho {merchants.count()} cửa hàng!")
    
    # Thống kê
    total = MenuItem.objects.count()
    print(f"\n📈 Tổng số menu items trong database: {total}")

if __name__ == '__main__':
    create_menu_items()

