# THÔNG TIN ĐĂNG NHẬP CÁC CỬA HÀNG

## 📋 Danh sách tài khoản Merchant để test

| # | Tên cửa hàng | Username | Email | Password | Merchant ID |
|---|--------------|----------|-------|----------|-------------|
| 1 | **Cà Phê Sáng** | `cafe_bienhoa` | `cafe@example.com` | `Password123` | 7 |
| 2 | **Quán Cơm Gia Đình** | `quancom_bienhoa` | `quancom@example.com` | `Password123` | 1 |
| 3 | **Pizza & Pasta House** | `pizza_bienhoa` | `pizza@example.com` | `Password123` | 2 |
| 4 | **Gà Rán KFC Style** | `chicken_bienhoa` | `chicken@example.com` | `Password123` | 8 |
| 5 | **Bún Thịt Nướng Cô Ba** | `bunthitnuong_bienhoa` | `bunthitnuong@example.com` | `Password123` | 3 |
| 6 | **Phở Gia Truyền** | `pho_bienhoa` | `pho@example.com` | `Password123` | 4 |
| 7 | **Bánh Mì Sài Gòn** | `banhmi_bienhoa` | `banhmi@example.com` | `Password123` | 5 |
| 8 | **Cơm Tấm Cali** | `comtam_bienhoa` | `comtam@example.com` | `Password123` | 6 |
| 9 | **Cơm Tấm Tân Phong** | `comtam_tanphong` | `comtam_tanphong@example.com` | `Password123` | 9 |
| 10 | **Bún Bò Hiệp Hòa** | `bunbo_hiephoa` | `bunbo_hiephoa@example.com` | `Password123` | 10 |

## 🔐 Cách đăng nhập

Bạn có thể đăng nhập bằng:
- **Username**: Ví dụ `cafe_bienhoa`
- **Email**: Ví dụ `cafe@example.com`
- **Password**: `Password123` (cho tất cả các tài khoản)

## 🧪 Hướng dẫn test luồng Customer → Merchant

### Bước 1: Test phía Customer
1. Đăng nhập với tài khoản customer (ví dụ: `testaccnhe@gmail.com`)
2. Vào `/customer` để xem menu các cửa hàng gần bạn
3. Thêm món vào giỏ hàng
4. Vào `/cart` và checkout
5. Đặt hàng

### Bước 2: Test phía Merchant
1. Đăng nhập với một trong các tài khoản merchant trên (ví dụ: `cafe_bienhoa` hoặc `cafe@example.com`)
2. Vào `/merchant/dashboard` để xem:
   - Thống kê đơn hàng hôm nay
   - Doanh thu
   - Danh sách đơn hàng gần đây
3. Vào `/merchant/menu` để quản lý menu
4. Xác nhận đơn hàng từ customer

## 📍 Địa chỉ các cửa hàng (gần Biên Hòa)

- **Cà Phê Sáng**: 147 Đường Nguyễn Văn Trị, Phường Long Bình Tân, Biên Hòa, Đồng Nai (0.1 km)
- **Quán Cơm Gia Đình**: 123 Đường Hoàng Văn Bồn, Phường Long Bình, Biên Hòa, Đồng Nai (0.3 km)
- **Pizza & Pasta House**: 456 Đường Phạm Văn Thuận, Phường Tân Hiệp, Biên Hòa, Đồng Nai (0.3 km)
- **Gà Rán KFC Style**: 258 Đường Đồng Khởi, Phường Tân Hòa, Biên Hòa, Đồng Nai (0.5 km)
- **Bún Thịt Nướng Cô Ba**: 789 Đường Nguyễn Ái Quốc, Phường Tân Phong, Biên Hòa, Đồng Nai (0.5 km)
- **Phở Gia Truyền**: 321 Đường Trần Hưng Đạo, Phường Quang Vinh, Biên Hòa, Đồng Nai (0.7 km)
- **Bánh Mì Sài Gòn**: 654 Đường Lê Lợi, Phường Tân Mai, Biên Hòa, Đồng Nai (0.9 km)
- **Cơm Tấm Cali**: 987 Đường Võ Thị Sáu, Phường Tam Hiệp, Biên Hòa, Đồng Nai (1.0 km)
- **Cơm Tấm Tân Phong**: 234 Đường Tân Phong, Phường Tân Phong, Biên Hòa, Đồng Nai (4.8 km)
- **Bún Bò Hiệp Hòa**: 567 Đường Hiệp Hòa, Phường Hiệp Hòa, Biên Hòa, Đồng Nai (4.5 km)

