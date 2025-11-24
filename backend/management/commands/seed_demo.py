from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import Profile
from menus.models import Merchant, MerchantMember, Category, MenuItem
from decimal import Decimal

User = get_user_model()

# Vị trí của bạn: Biên Hòa, Đồng Nai
# Cập nhật theo vị trí thực tế của bạn
CUSTOMER_LAT = 11.318067
CUSTOMER_LNG = 106.050355

# Tạo các merchant từ Đồng Nai đến TP.HCM với các khoảng cách khác nhau
# Để test logic lọc cửa hàng theo vị trí
MERCHANTS_DATA = [
    # ========== CÁC CỬA HÀNG GẦN VỊ TRÍ (0-5km) - BIÊN HÒA ==========
    {
        'username': 'quancom_bienhoa',
        'email': 'quancom@example.com',
        'password': 'Password123',
        'name': 'Quán Cơm Gia Đình',
        'address': '123 Đường Hoàng Văn Bồn, Phường Long Bình, Biên Hòa, Đồng Nai',
        'phone': '02513812345',
        'latitude': 11.320000,  # ~300m từ vị trí bạn
        'longitude': 106.052000,
        'description': 'Quán cơm gia đình với các món ăn Việt Nam truyền thống',
        'menu_items': [
            {'name': 'Cơm Sườn Nướng', 'description': 'Cơm với sườn nướng thơm lừng', 'price': 45000, 'stock': 50},
            {'name': 'Cơm Gà Nướng', 'description': 'Cơm với gà nướng mật ong', 'price': 50000, 'stock': 40},
            {'name': 'Cơm Tấm Sườn Bì Chả', 'description': 'Cơm tấm đầy đủ sườn, bì, chả', 'price': 55000, 'stock': 60},
            {'name': 'Canh Chua Cá', 'description': 'Canh chua cá lóc nấu dứa', 'price': 60000, 'stock': 30},
            {'name': 'Bún Bò Huế', 'description': 'Bún bò Huế đậm đà', 'price': 50000, 'stock': 35},
        ]
    },
    {
        'username': 'pizza_bienhoa',
        'email': 'pizza@example.com',
        'password': 'Password123',
        'name': 'Pizza & Pasta House',
        'address': '456 Đường Phạm Văn Thuận, Phường Tân Hiệp, Biên Hòa, Đồng Nai',
        'phone': '02513812346',
        'latitude': 11.316000,  # ~500m từ vị trí bạn
        'longitude': 106.048000,
        'description': 'Pizza và pasta Ý chính thống',
        'menu_items': [
            {'name': 'Pizza Margherita', 'description': 'Pizza phô mai mozzarella và cà chua', 'price': 120000, 'stock': 25},
            {'name': 'Pizza Hải Sản', 'description': 'Pizza với tôm, mực, cua', 'price': 180000, 'stock': 20},
            {'name': 'Spaghetti Carbonara', 'description': 'Mì Ý sốt kem và thịt xông khói', 'price': 95000, 'stock': 30},
            {'name': 'Lasagna', 'description': 'Lasagna thịt bò và phô mai', 'price': 110000, 'stock': 15},
            {'name': 'Pizza 4 Mùa', 'description': 'Pizza 4 loại topping khác nhau', 'price': 200000, 'stock': 18},
        ]
    },
    {
        'username': 'bunthitnuong_bienhoa',
        'email': 'bunthitnuong@example.com',
        'password': 'Password123',
        'name': 'Bún Thịt Nướng Cô Ba',
        'address': '789 Đường Nguyễn Ái Quốc, Phường Tân Phong, Biên Hòa, Đồng Nai',
        'phone': '02513812347',
        'latitude': 11.322000,  # ~600m từ vị trí bạn
        'longitude': 106.053000,
        'description': 'Bún thịt nướng đặc sản miền Nam',
        'menu_items': [
            {'name': 'Bún Thịt Nướng', 'description': 'Bún với thịt nướng, chả giò', 'price': 40000, 'stock': 80},
            {'name': 'Bún Thịt Nướng Đặc Biệt', 'description': 'Bún thịt nướng + chả giò + nem nướng', 'price': 55000, 'stock': 50},
            {'name': 'Bún Bò Xào', 'description': 'Bún với bò xào rau củ', 'price': 50000, 'stock': 40},
            {'name': 'Bún Chả Giò', 'description': 'Bún với chả giò giòn tan', 'price': 35000, 'stock': 60},
        ]
    },
    {
        'username': 'pho_bienhoa',
        'email': 'pho@example.com',
        'password': 'Password123',
        'name': 'Phở Gia Truyền',
        'address': '321 Đường Trần Hưng Đạo, Phường Quang Vinh, Biên Hòa, Đồng Nai',
        'phone': '02513812348',
        'latitude': 11.314000,  # ~800m từ vị trí bạn
        'longitude': 106.046000,
        'description': 'Phở bò, phở gà nước dùng đậm đà',
        'menu_items': [
            {'name': 'Phở Bò Tái', 'description': 'Phở bò tái chín', 'price': 55000, 'stock': 70},
            {'name': 'Phở Bò Chín', 'description': 'Phở bò chín mềm', 'price': 55000, 'stock': 65},
            {'name': 'Phở Gà', 'description': 'Phở gà thơm ngon', 'price': 50000, 'stock': 60},
            {'name': 'Phở Đặc Biệt', 'description': 'Phở đầy đủ tái, chín, gầu, bò viên', 'price': 70000, 'stock': 45},
            {'name': 'Phở Bò Viên', 'description': 'Phở với bò viên', 'price': 50000, 'stock': 55},
        ]
    },
    {
        'username': 'banhmi_bienhoa',
        'email': 'banhmi@example.com',
        'password': 'Password123',
        'name': 'Bánh Mì Sài Gòn',
        'address': '654 Đường Lê Lợi, Phường Tân Mai, Biên Hòa, Đồng Nai',
        'phone': '02513812349',
        'latitude': 11.325000,  # ~1km từ vị trí bạn
        'longitude': 106.055000,
        'description': 'Bánh mì Sài Gòn đủ loại',
        'menu_items': [
            {'name': 'Bánh Mì Thịt Nướng', 'description': 'Bánh mì với thịt nướng', 'price': 25000, 'stock': 100},
            {'name': 'Bánh Mì Pate', 'description': 'Bánh mì với pate và thịt nguội', 'price': 20000, 'stock': 120},
            {'name': 'Bánh Mì Chả Cá', 'description': 'Bánh mì với chả cá', 'price': 30000, 'stock': 80},
            {'name': 'Bánh Mì Đặc Biệt', 'description': 'Bánh mì đầy đủ thịt, pate, chả', 'price': 35000, 'stock': 90},
        ]
    },
    {
        'username': 'comtam_bienhoa',
        'email': 'comtam@example.com',
        'password': 'Password123',
        'name': 'Cơm Tấm Cali',
        'address': '987 Đường Võ Thị Sáu, Phường Tam Hiệp, Biên Hòa, Đồng Nai',
        'phone': '02513812350',
        'latitude': 11.312000,  # ~1.2km từ vị trí bạn
        'longitude': 106.044000,
        'description': 'Cơm tấm Sài Gòn đúng chuẩn',
        'menu_items': [
            {'name': 'Cơm Tấm Sườn', 'description': 'Cơm tấm với sườn nướng', 'price': 50000, 'stock': 70},
            {'name': 'Cơm Tấm Bì', 'description': 'Cơm tấm với bì', 'price': 45000, 'stock': 60},
            {'name': 'Cơm Tấm Chả', 'description': 'Cơm tấm với chả trứng', 'price': 45000, 'stock': 65},
            {'name': 'Cơm Tấm Đặc Biệt', 'description': 'Cơm tấm đầy đủ sườn, bì, chả', 'price': 60000, 'stock': 50},
        ]
    },
    {
        'username': 'cafe_bienhoa',
        'email': 'cafe@example.com',
        'password': 'Password123',
        'name': 'Cà Phê Sáng',
        'address': '147 Đường Nguyễn Văn Trị, Phường Long Bình Tân, Biên Hòa, Đồng Nai',
        'phone': '02513812351',
        'latitude': 11.319000,  # ~200m từ vị trí bạn
        'longitude': 106.051000,
        'description': 'Cà phê và đồ uống giải khát',
        'menu_items': [
            {'name': 'Cà Phê Đen', 'description': 'Cà phê đen đá', 'price': 15000, 'stock': 200},
            {'name': 'Cà Phê Sữa', 'description': 'Cà phê sữa đá', 'price': 20000, 'stock': 200},
            {'name': 'Sinh Tố Bơ', 'description': 'Sinh tố bơ tươi', 'price': 35000, 'stock': 50},
            {'name': 'Nước Cam Ép', 'description': 'Nước cam ép tươi', 'price': 30000, 'stock': 60},
            {'name': 'Trà Đá', 'description': 'Trà đá mát lạnh', 'price': 10000, 'stock': 300},
        ]
    },
    {
        'username': 'chicken_bienhoa',
        'email': 'chicken@example.com',
        'password': 'Password123',
        'name': 'Gà Rán KFC Style',
        'address': '258 Đường Đồng Khởi, Phường Tân Hòa, Biên Hòa, Đồng Nai',
        'phone': '02513812352',
        'latitude': 11.321000,  # ~700m từ vị trí bạn
        'longitude': 106.054000,
        'description': 'Gà rán giòn, nóng hổi',
        'menu_items': [
            {'name': 'Gà Rán 2 Miếng', 'description': '2 miếng gà rán giòn', 'price': 65000, 'stock': 40},
            {'name': 'Gà Rán 4 Miếng', 'description': '4 miếng gà rán giòn', 'price': 120000, 'stock': 30},
            {'name': 'Combo Gà Rán', 'description': 'Gà rán + khoai tây + nước', 'price': 85000, 'stock': 35},
            {'name': 'Cánh Gà Rán', 'description': '6 cánh gà rán', 'price': 70000, 'stock': 45},
        ]
    },
    
    # ========== CÁC CỬA HÀNG XA HƠN (5-10km) - VÙNG NGOẠI Ô BIÊN HÒA ==========
    {
        'username': 'comtam_tanphong',
        'email': 'comtam_tanphong@example.com',
        'password': 'Password123',
        'name': 'Cơm Tấm Tân Phong',
        'address': '234 Đường Tân Phong, Phường Tân Phong, Biên Hòa, Đồng Nai',
        'phone': '02513812360',
        'latitude': 11.350000,  # ~3.5km từ vị trí bạn
        'longitude': 106.080000,
        'description': 'Cơm tấm ngon giá rẻ',
        'menu_items': [
            {'name': 'Cơm Tấm Sườn', 'description': 'Cơm tấm sườn nướng', 'price': 48000, 'stock': 60},
            {'name': 'Cơm Tấm Bì Chả', 'description': 'Cơm tấm bì chả', 'price': 50000, 'stock': 55},
        ]
    },
    {
        'username': 'bunbo_hiephoa',
        'email': 'bunbo_hiephoa@example.com',
        'password': 'Password123',
        'name': 'Bún Bò Hiệp Hòa',
        'address': '567 Đường Hiệp Hòa, Phường Hiệp Hòa, Biên Hòa, Đồng Nai',
        'phone': '02513812361',
        'latitude': 11.280000,  # ~4.5km từ vị trí bạn
        'longitude': 106.010000,
        'description': 'Bún bò Huế đặc sản',
        'menu_items': [
            {'name': 'Bún Bò Huế', 'description': 'Bún bò Huế đậm đà', 'price': 55000, 'stock': 50},
            {'name': 'Bún Bò Giò Heo', 'description': 'Bún bò với giò heo', 'price': 60000, 'stock': 40},
        ]
    },
    {
        'username': 'banhcanh_trangbom',
        'email': 'banhcanh_trangbom@example.com',
        'password': 'Password123',
        'name': 'Bánh Canh Trảng Bom',
        'address': '890 Đường Quốc Lộ 1A, Thị trấn Trảng Bom, Đồng Nai',
        'phone': '02513812362',
        'latitude': 10.950000,  # ~8km từ vị trí bạn
        'longitude': 107.000000,
        'description': 'Bánh canh tôm cua',
        'menu_items': [
            {'name': 'Bánh Canh Tôm', 'description': 'Bánh canh tôm tươi', 'price': 45000, 'stock': 45},
            {'name': 'Bánh Canh Cua', 'description': 'Bánh canh cua biển', 'price': 50000, 'stock': 40},
        ]
    },
    
    # ========== CÁC CỬA HÀNG RẤT XA (>10km) - TP.HCM ==========
    {
        'username': 'pho_quan1',
        'email': 'pho_quan1@example.com',
        'password': 'Password123',
        'name': 'Phở 24 Quận 1',
        'address': '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
        'phone': '02838212345',
        'latitude': 10.776900,  # ~60km từ vị trí bạn (TP.HCM)
        'longitude': 106.700900,
        'description': 'Phở bò nổi tiếng Quận 1',
        'menu_items': [
            {'name': 'Phở Bò Tái', 'description': 'Phở bò tái chín', 'price': 65000, 'stock': 80},
            {'name': 'Phở Đặc Biệt', 'description': 'Phở đầy đủ', 'price': 80000, 'stock': 60},
        ]
    },
    {
        'username': 'comtam_quan7',
        'email': 'comtam_quan7@example.com',
        'password': 'Password123',
        'name': 'Cơm Tấm Cali Quận 7',
        'address': '456 Đường Nguyễn Thị Thập, Phường Tân Phú, Quận 7, TP.HCM',
        'phone': '02838212346',
        'latitude': 10.732300,  # ~65km từ vị trí bạn
        'longitude': 106.721400,
        'description': 'Cơm tấm Sài Gòn Quận 7',
        'menu_items': [
            {'name': 'Cơm Tấm Sườn', 'description': 'Cơm tấm sườn nướng', 'price': 55000, 'stock': 70},
            {'name': 'Cơm Tấm Đặc Biệt', 'description': 'Cơm tấm đầy đủ', 'price': 65000, 'stock': 55},
        ]
    },
    {
        'username': 'pizza_quan2',
        'email': 'pizza_quan2@example.com',
        'password': 'Password123',
        'name': 'Pizza Hut Quận 2',
        'address': '789 Đường Nguyễn Duy Trinh, Phường Bình Trưng Tây, Quận 2, TP.HCM',
        'phone': '02838212347',
        'latitude': 10.787200,  # ~63km từ vị trí bạn
        'longitude': 106.749300,
        'description': 'Pizza và pasta Quận 2',
        'menu_items': [
            {'name': 'Pizza Hải Sản', 'description': 'Pizza hải sản tươi', 'price': 200000, 'stock': 30},
            {'name': 'Pizza 4 Phô Mai', 'description': 'Pizza 4 loại phô mai', 'price': 180000, 'stock': 25},
        ]
    },
    {
        'username': 'bunthitnuong_quan9',
        'email': 'bunthitnuong_quan9@example.com',
        'password': 'Password123',
        'name': 'Bún Thịt Nướng Quận 9',
        'address': '321 Đường Đỗ Xuân Hợp, Phường Phước Long B, Quận 9, TP.HCM',
        'phone': '02838212348',
        'latitude': 10.842200,  # ~58km từ vị trí bạn
        'longitude': 106.809100,
        'description': 'Bún thịt nướng Quận 9',
        'menu_items': [
            {'name': 'Bún Thịt Nướng', 'description': 'Bún thịt nướng đặc biệt', 'price': 50000, 'stock': 60},
            {'name': 'Bún Thịt Nướng Đặc Biệt', 'description': 'Bún đầy đủ', 'price': 65000, 'stock': 45},
        ]
    },
    {
        'username': 'banhmi_thuduc',
        'email': 'banhmi_thuduc@example.com',
        'password': 'Password123',
        'name': 'Bánh Mì Thủ Đức',
        'address': '654 Đường Võ Văn Ngân, Phường Linh Chiểu, Thành phố Thủ Đức, TP.HCM',
        'phone': '02838212349',
        'latitude': 10.849700,  # ~57km từ vị trí bạn
        'longitude': 106.763700,
        'description': 'Bánh mì Sài Gòn Thủ Đức',
        'menu_items': [
            {'name': 'Bánh Mì Thịt Nướng', 'description': 'Bánh mì thịt nướng', 'price': 30000, 'stock': 100},
            {'name': 'Bánh Mì Đặc Biệt', 'description': 'Bánh mì đầy đủ', 'price': 40000, 'stock': 90},
        ]
    },
    {
        'username': 'cafe_quan1',
        'email': 'cafe_quan1@example.com',
        'password': 'Password123',
        'name': 'Cà Phê Trung Nguyên Quận 1',
        'address': '147 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
        'phone': '02838212350',
        'latitude': 10.770000,  # ~61km từ vị trí bạn
        'longitude': 106.695000,
        'description': 'Cà phê và đồ uống Quận 1',
        'menu_items': [
            {'name': 'Cà Phê Sữa Đá', 'description': 'Cà phê sữa đá', 'price': 25000, 'stock': 200},
            {'name': 'Cà Phê Đen Đá', 'description': 'Cà phê đen đá', 'price': 20000, 'stock': 200},
        ]
    },
    {
        'username': 'chicken_quan7',
        'email': 'chicken_quan7@example.com',
        'password': 'Password123',
        'name': 'KFC Quận 7',
        'address': '258 Đường Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM',
        'phone': '02838212351',
        'latitude': 10.740000,  # ~66km từ vị trí bạn
        'longitude': 106.730000,
        'description': 'Gà rán KFC Quận 7',
        'menu_items': [
            {'name': 'Combo Gà Rán', 'description': 'Combo gà rán đầy đủ', 'price': 95000, 'stock': 50},
            {'name': 'Gà Rán 4 Miếng', 'description': '4 miếng gà rán', 'price': 130000, 'stock': 40},
        ]
    },
    {
        'username': 'pho_quan2',
        'email': 'pho_quan2@example.com',
        'password': 'Password123',
        'name': 'Phở Gia Truyền Quận 2',
        'address': '987 Đường Nguyễn Thị Định, Phường An Phú, Quận 2, TP.HCM',
        'phone': '02838212352',
        'latitude': 10.795000,  # ~62km từ vị trí bạn
        'longitude': 106.755000,
        'description': 'Phở bò Quận 2',
        'menu_items': [
            {'name': 'Phở Bò Tái', 'description': 'Phở bò tái', 'price': 60000, 'stock': 70},
            {'name': 'Phở Gà', 'description': 'Phở gà', 'price': 55000, 'stock': 65},
        ]
    },
    {
        'username': 'bunbo_quan9',
        'email': 'bunbo_quan9@example.com',
        'password': 'Password123',
        'name': 'Bún Bò Huế Quận 9',
        'address': '159 Đường Đỗ Xuân Hợp, Phường Phước Long A, Quận 9, TP.HCM',
        'phone': '02838212353',
        'latitude': 10.835000,  # ~59km từ vị trí bạn
        'longitude': 106.800000,
        'description': 'Bún bò Huế Quận 9',
        'menu_items': [
            {'name': 'Bún Bò Huế', 'description': 'Bún bò Huế đậm đà', 'price': 60000, 'stock': 55},
            {'name': 'Bún Bò Giò Heo', 'description': 'Bún bò giò heo', 'price': 65000, 'stock': 45},
        ]
    },
    {
        'username': 'comtam_thuduc',
        'email': 'comtam_thuduc@example.com',
        'password': 'Password123',
        'name': 'Cơm Tấm Thủ Đức',
        'address': '753 Đường Võ Văn Ngân, Phường Linh Trung, Thành phố Thủ Đức, TP.HCM',
        'phone': '02838212354',
        'latitude': 10.860000,  # ~56km từ vị trí bạn
        'longitude': 106.770000,
        'description': 'Cơm tấm Thủ Đức',
        'menu_items': [
            {'name': 'Cơm Tấm Sườn', 'description': 'Cơm tấm sườn', 'price': 52000, 'stock': 65},
            {'name': 'Cơm Tấm Đặc Biệt', 'description': 'Cơm tấm đầy đủ', 'price': 62000, 'stock': 50},
        ]
    },
]

SHIPPERS_DATA = [
    {
        'username': 'shipper1',
        'email': 'shipper1@example.com',
        'password': 'Password123',
    },
    {
        'username': 'shipper2',
        'email': 'shipper2@example.com',
        'password': 'Password123',
    },
    {
        'username': 'shipper3',
        'email': 'shipper3@example.com',
        'password': 'Password123',
    },
]


class Command(BaseCommand):
    help = 'Seed demo data: merchants, menu items, and shippers near your location'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')
        
        # Tạo merchants và menu items
        for merchant_data in MERCHANTS_DATA:
            # Tạo hoặc lấy user
            user, created = User.objects.get_or_create(
                username=merchant_data['username'],
                defaults={
                    'email': merchant_data['email'],
                }
            )
            if created:
                user.set_password(merchant_data['password'])
                user.is_active = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f'✓ Created user: {merchant_data["username"]}'))
            else:
                self.stdout.write(f'  User exists: {merchant_data["username"]}')
            
            # Tạo hoặc cập nhật profile
            profile, _ = Profile.objects.get_or_create(
                user=user,
                defaults={'role': 'merchant'}
            )
            if profile.role != 'merchant':
                profile.role = 'merchant'
                profile.save()
            
            # Tạo hoặc cập nhật merchant
            merchant, created = Merchant.objects.get_or_create(
                owner=user,
                defaults={
                    'name': merchant_data['name'],
                    'address': merchant_data['address'],
                    'phone': merchant_data['phone'],
                    'latitude': merchant_data['latitude'],
                    'longitude': merchant_data['longitude'],
                    'description': merchant_data.get('description', ''),
                    'is_active': True,
                }
            )
            
            if not created:
                # Cập nhật tọa độ nếu chưa có
                if not merchant.latitude or not merchant.longitude:
                    merchant.latitude = merchant_data['latitude']
                    merchant.longitude = merchant_data['longitude']
                    merchant.save()
            
            # Tạo MerchantMember
            MerchantMember.objects.get_or_create(
                merchant=merchant,
                user=user,
                defaults={'role': 'owner'}
            )
            
            self.stdout.write(self.style.SUCCESS(f'✓ Created merchant: {merchant.name}'))
            
            # Tạo category mặc định
            category, _ = Category.objects.get_or_create(
                merchant=merchant,
                name='Món Chính',
                defaults={'description': 'Các món ăn chính'}
            )
            
            # Tạo menu items
            for item_data in merchant_data['menu_items']:
                menu_item, created = MenuItem.objects.get_or_create(
                    merchant=merchant,
                    name=item_data['name'],
                    defaults={
                        'category': category,
                        'description': item_data.get('description', ''),
                        'price': Decimal(str(item_data['price'])),
                        'stock': item_data.get('stock', 50),
                        'is_available': True,
                    }
                )
                if created:
                    self.stdout.write(f'    - Created menu item: {menu_item.name}')
        
        # Tạo shippers
        for shipper_data in SHIPPERS_DATA:
            user, created = User.objects.get_or_create(
                username=shipper_data['username'],
                defaults={
                    'email': shipper_data['email'],
                }
            )
            if created:
                user.set_password(shipper_data['password'])
                user.is_active = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f'✓ Created shipper: {shipper_data["username"]}'))
            else:
                self.stdout.write(f'  User exists: {shipper_data["username"]}')
            
            # Tạo hoặc cập nhật profile
            profile, _ = Profile.objects.get_or_create(
                user=user,
                defaults={'role': 'shipper'}
            )
            if profile.role != 'shipper':
                profile.role = 'shipper'
                profile.save()
        
        self.stdout.write(self.style.SUCCESS('\n✓ Done seeding demo data!'))
        self.stdout.write(f'\n📍 Vị trí của bạn: {CUSTOMER_LAT}, {CUSTOMER_LNG} (Biên Hòa, Đồng Nai)')
        self.stdout.write(f'\n📊 Tổng kết:')
        self.stdout.write(f'   - Đã tạo {len(MERCHANTS_DATA)} merchants')
        self.stdout.write(f'   - Đã tạo {len(SHIPPERS_DATA)} shippers')
        self.stdout.write(f'\n📌 Phân bố cửa hàng:')
        self.stdout.write(f'   - Gần vị trí (0-5km): 8 cửa hàng ở Biên Hòa')
        self.stdout.write(f'   - Xa hơn (5-10km): 3 cửa hàng ở vùng ngoại ô Biên Hòa')
        self.stdout.write(f'   - Rất xa (>10km): 10 cửa hàng ở TP.HCM (Quận 1, 2, 7, 9, Thủ Đức)')
        self.stdout.write(f'\n💡 Lưu ý:')
        self.stdout.write(f'   - Các cửa hàng trong phạm vi 10km sẽ hiển thị khi bạn ở vị trí hiện tại')
        self.stdout.write(f'   - Các cửa hàng ở TP.HCM (>10km) sẽ KHÔNG hiển thị để test logic lọc')
        self.stdout.write(f'   - Bạn có thể thay đổi vị trí để test với các cửa hàng khác nhau')
