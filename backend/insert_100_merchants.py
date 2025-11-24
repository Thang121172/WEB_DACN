"""
Script để insert 100 cửa hàng vào database
Phân bố qua Biên Hòa, Bình Dương, TP.HCM
"""
import os
import django
import random
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from menus.models import Merchant
from accounts.models import Profile
from django.db import transaction

User = get_user_model()

# Tọa độ trung tâm các thành phố
CITIES = {
    'Biên Hòa': {
        'lat_range': (11.25, 11.40),
        'lng_range': (106.00, 106.15),
        'center_lat': 11.318067,
        'center_lng': 106.050355
    },
    'Bình Dương': {
        'lat_range': (10.90, 11.10),
        'lng_range': (106.60, 106.75),
        'center_lat': 10.980461,
        'center_lng': 106.651856
    },
    'TP.HCM': {
        'lat_range': (10.70, 10.90),
        'lng_range': (106.50, 106.80),
        'center_lat': 10.823099,
        'center_lng': 106.629664
    }
}

# Tên cửa hàng mẫu
MERCHANT_NAMES = [
    'Quán Cơm Gia Đình', 'Nhà Hàng Hải Sản', 'Quán Phở Bò', 'Bún Bò Huế',
    'Quán Bánh Mì', 'Cơm Tấm Sài Gòn', 'Quán Cháo Lòng', 'Bánh Canh Cua',
    'Quán Bún Riêu', 'Cơm Gà Nướng', 'Quán Lẩu Thái', 'Nhà Hàng BBQ',
    'Quán Bánh Xèo', 'Bún Chả Hà Nội', 'Quán Bánh Cuốn', 'Cơm Niêu',
    'Quán Bún Mắm', 'Nhà Hàng Dimsum', 'Quán Bánh Tráng', 'Cơm Chay',
    'Quán Bún Đậu', 'Nhà Hàng Hàn Quốc', 'Quán Bánh Mì Thịt Nướng',
    'Cơm Tấm Cali', 'Quán Bún Bò Nam Bộ', 'Nhà Hàng Nhật Bản',
    'Quán Bánh Mì Chảo', 'Cơm Gà Xối Mỡ', 'Quán Bún Thịt Nướng',
    'Nhà Hàng Ý', 'Quán Bánh Mì Pate', 'Cơm Tấm Sườn Bì Chả',
    'Quán Bún Mọc', 'Nhà Hàng Mỹ', 'Quán Bánh Mì Chả Cá',
    'Cơm Gà Hải Nam', 'Quán Bún Bò Giò Heo', 'Nhà Hàng Thái Lan',
    'Quán Bánh Mì Thịt Nướng', 'Cơm Tấm Sườn Nướng', 'Quán Bún Bò Huế',
    'Nhà Hàng Trung Hoa', 'Quán Bánh Mì Chả Lụa', 'Cơm Gà Nướng Muối',
    'Quán Bún Riêu Cua', 'Nhà Hàng Việt Nam', 'Quán Bánh Mì Thịt Nướng',
    'Cơm Tấm Sườn Bì Chả', 'Quán Bún Bò Nam Bộ', 'Nhà Hàng Hải Sản',
    'Quán Bánh Mì Pate', 'Cơm Gà Xối Mỡ', 'Quán Bún Thịt Nướng',
    'Nhà Hàng BBQ', 'Quán Bánh Mì Chảo', 'Cơm Tấm Cali',
    'Quán Bún Mọc', 'Nhà Hàng Dimsum', 'Quán Bánh Mì Chả Cá',
    'Cơm Gà Hải Nam', 'Quán Bún Bò Giò Heo', 'Nhà Hàng Thái Lan',
    'Quán Bánh Mì Thịt Nướng', 'Cơm Tấm Sườn Nướng', 'Quán Bún Bò Huế',
    'Nhà Hàng Trung Hoa', 'Quán Bánh Mì Chả Lụa', 'Cơm Gà Nướng Muối',
    'Quán Bún Riêu Cua', 'Nhà Hàng Việt Nam', 'Quán Bánh Mì Thịt Nướng',
    'Cơm Tấm Sườn Bì Chả', 'Quán Bún Bò Nam Bộ', 'Nhà Hàng Hải Sản',
    'Quán Bánh Mì Pate', 'Cơm Gà Xối Mỡ', 'Quán Bún Thịt Nướng',
    'Nhà Hàng BBQ', 'Quán Bánh Mì Chảo', 'Cơm Tấm Cali',
    'Quán Bún Mọc', 'Nhà Hàng Dimsum', 'Quán Bánh Mì Chả Cá',
    'Cơm Gà Hải Nam', 'Quán Bún Bò Giò Heo', 'Nhà Hàng Thái Lan',
    'Quán Bánh Mì Thịt Nướng', 'Cơm Tấm Sườn Nướng', 'Quán Bún Bò Huế',
    'Nhà Hàng Trung Hoa', 'Quán Bánh Mì Chả Lụa', 'Cơm Gà Nướng Muối',
    'Quán Bún Riêu Cua', 'Nhà Hàng Việt Nam', 'Quán Bánh Mì Thịt Nướng',
    'Cơm Tấm Sườn Bì Chả', 'Quán Bún Bò Nam Bộ', 'Nhà Hàng Hải Sản',
    'Quán Bánh Mì Pate', 'Cơm Gà Xối Mỡ', 'Quán Bún Thịt Nướng',
    'Nhà Hàng BBQ', 'Quán Bánh Mì Chảo', 'Cơm Tấm Cali',
    'Quán Bún Mọc', 'Nhà Hàng Dimsum', 'Quán Bánh Mì Chả Cá',
    'Cơm Gà Hải Nam', 'Quán Bún Bò Giò Heo', 'Nhà Hàng Thái Lan',
]

# Địa chỉ mẫu theo thành phố
ADDRESS_TEMPLATES = {
    'Biên Hòa': [
        'Đường {street}, Phường {ward}, Biên Hòa, Đồng Nai',
        '{number} Đường {street}, Phường {ward}, Biên Hòa, Đồng Nai',
        'Khu {area}, Đường {street}, Phường {ward}, Biên Hòa, Đồng Nai',
    ],
    'Bình Dương': [
        'Đường {street}, Phường {ward}, Thủ Dầu Một, Bình Dương',
        '{number} Đường {street}, Phường {ward}, Thủ Dầu Một, Bình Dương',
        'Khu {area}, Đường {street}, Phường {ward}, Thủ Dầu Một, Bình Dương',
    ],
    'TP.HCM': [
        'Đường {street}, Phường {ward}, Quận {district}, TP.HCM',
        '{number} Đường {street}, Phường {ward}, Quận {district}, TP.HCM',
        'Khu {area}, Đường {street}, Phường {ward}, Quận {district}, TP.HCM',
    ]
}

STREETS = [
    'Nguyễn Văn Trị', 'Lê Lợi', 'Trần Hưng Đạo', 'Nguyễn Du', 'Lý Thường Kiệt',
    'Hoàng Văn Thụ', 'Võ Thị Sáu', 'Nguyễn Thị Minh Khai', 'Điện Biên Phủ',
    'Cách Mạng Tháng 8', 'Lê Duẩn', 'Nguyễn Trãi', 'Hai Bà Trưng', 'Bạch Đằng',
    'Nguyễn Huệ', 'Lê Thánh Tôn', 'Đồng Khởi', 'Pasteur', 'Nam Kỳ Khởi Nghĩa',
    'Võ Văn Tần', 'Nguyễn Đình Chiểu', 'Đinh Tiên Hoàng', 'Lý Tự Trọng',
    'Nguyễn Thái Học', 'Trần Quốc Toản', 'Lê Văn Sỹ', 'Nguyễn Văn Cừ',
    'Cộng Hòa', 'Lạc Long Quân', 'Hoàng Hoa Thám', 'Nguyễn Văn Linh',
]

WARDS = [
    'Trấn Biên', 'Long Bình', 'Tam Hiệp', 'Tân Hiệp', 'Tân Phong',
    'Tân Biên', 'Hố Nai', 'An Bình', 'Bình Đa', 'Bửu Long',
    'Hòa Bình', 'Long Bình Tân', 'Quang Vinh', 'Tam Hòa', 'Tân Vạn',
    'Bến Cát', 'Dầu Tiếng', 'Dĩ An', 'Tân Uyên', 'Thuận An',
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5',
    'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Bình Thạnh', 'Tân Bình', 'Tân Phú',
    'Phú Nhuận', 'Gò Vấp', 'Bình Tân', 'Thủ Đức', 'Hóc Môn',
]

DISTRICTS = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5',
    'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Bình Thạnh', 'Tân Bình', 'Tân Phú',
    'Phú Nhuận', 'Gò Vấp', 'Bình Tân', 'Thủ Đức', 'Hóc Môn',
]

DESCRIPTIONS = [
    'Quán ăn gia đình với các món ăn Việt Nam truyền thống',
    'Nhà hàng chuyên các món ăn đặc sản địa phương',
    'Quán ăn nhanh với giá cả hợp lý',
    'Nhà hàng sang trọng phục vụ các món ăn cao cấp',
    'Quán ăn vặt với nhiều món ngon',
    'Nhà hàng buffet với nhiều lựa chọn',
    'Quán ăn chay với thực đơn đa dạng',
    'Nhà hàng hải sản tươi sống',
    'Quán ăn đêm với không gian ấm cúng',
    'Nhà hàng BBQ với thịt nướng thơm ngon',
]

IMAGE_URLS = [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1552569973-ffb40c0b0c8e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop',
]

def generate_phone():
    """Tạo số điện thoại ngẫu nhiên"""
    prefixes = ['0251', '0274', '028']
    prefix = random.choice(prefixes)
    number = ''.join([str(random.randint(0, 9)) for _ in range(7)])
    return f'{prefix}{number}'

def generate_address(city):
    """Tạo địa chỉ ngẫu nhiên cho thành phố"""
    template = random.choice(ADDRESS_TEMPLATES[city])
    street = random.choice(STREETS)
    ward = random.choice(WARDS)
    number = random.randint(1, 999)
    area = random.choice(['A', 'B', 'C', '1', '2', '3'])
    
    if city == 'TP.HCM':
        district = random.choice(DISTRICTS)
        return template.format(street=street, ward=ward, district=district, number=number, area=area)
    else:
        return template.format(street=street, ward=ward, number=number, area=area)

def generate_coordinates(city):
    """Tạo tọa độ ngẫu nhiên trong phạm vi thành phố"""
    city_data = CITIES[city]
    lat = random.uniform(*city_data['lat_range'])
    lng = random.uniform(*city_data['lng_range'])
    return Decimal(str(round(lat, 6))), Decimal(str(round(lng, 6)))

@transaction.atomic
def create_merchants():
    """Tạo 100 cửa hàng"""
    print("🚀 Bắt đầu tạo 100 cửa hàng...")
    
    # Lấy hoặc tạo user merchant mặc định
    default_user, created = User.objects.get_or_create(
        username='merchant_default',
        defaults={
            'email': 'merchant@fastfood.com',
            'is_active': True
        }
    )
    if created:
        default_user.set_password('merchant123')
        default_user.save()
        # Tạo profile
        Profile.objects.create(user=default_user, role='merchant')
        print(f"✅ Đã tạo user mặc định: {default_user.username}")
    
    # Phân bố 100 cửa hàng: 34 Biên Hòa, 33 Bình Dương, 33 TP.HCM
    distribution = {
        'Biên Hòa': 34,
        'Bình Dương': 33,
        'TP.HCM': 33
    }
    
    merchants_to_create = []
    used_names = set()
    
    for city, count in distribution.items():
        print(f"\n📍 Đang tạo {count} cửa hàng ở {city}...")
        
        for i in range(count):
            # Tạo tên cửa hàng unique
            name = random.choice(MERCHANT_NAMES)
            counter = 1
            while name in used_names:
                name = f"{random.choice(MERCHANT_NAMES)} {counter}"
                counter += 1
            used_names.add(name)
            
            # Tạo dữ liệu
            lat, lng = generate_coordinates(city)
            address = generate_address(city)
            phone = generate_phone()
            description = random.choice(DESCRIPTIONS)
            image_url = random.choice(IMAGE_URLS)
            
            merchant = Merchant(
                owner=default_user,
                name=f"{name} - {city}",
                description=description,
                address=address,
                phone=phone,
                latitude=lat,
                longitude=lng,
                image_url=image_url,
                is_active=True
            )
            merchants_to_create.append(merchant)
    
    # Bulk create để insert nhanh
    print(f"\n💾 Đang insert {len(merchants_to_create)} cửa hàng vào database...")
    Merchant.objects.bulk_create(merchants_to_create, batch_size=50)
    
    print(f"\n✅ Đã tạo thành công {len(merchants_to_create)} cửa hàng!")
    print(f"\n📊 Phân bố:")
    for city, count in distribution.items():
        print(f"   - {city}: {count} cửa hàng")
    
    # Thống kê
    total = Merchant.objects.count()
    print(f"\n📈 Tổng số cửa hàng trong database: {total}")

if __name__ == '__main__':
    create_merchants()

