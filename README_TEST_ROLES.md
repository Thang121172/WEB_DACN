# Hướng dẫn Test 3 Role Cùng Lúc

## Cách 1: Sử dụng Script PowerShell (Khuyến nghị)

### Mở 3 tab thường:
```powershell
.\open_all_roles.ps1
```

### Mở 3 cửa sổ ẩn danh (Khuyến nghị):
```powershell
.\open_all_roles_incognito.ps1
```

## Cách 2: Mở thủ công

### Bước 1: Mở 3 tab/cửa sổ trình duyệt
- Tab 1: `http://localhost:5173/customer`
- Tab 2: `http://localhost:5173/merchant/dashboard`
- Tab 3: `http://localhost:5173/shipper`

### Bước 2: Đăng nhập với 3 tài khoản khác nhau
- Tab 1: Đăng nhập với tài khoản **Customer**
- Tab 2: Đăng nhập với tài khoản **Merchant**
- Tab 3: Đăng nhập với tài khoản **Shipper**

## Cách 3: Sử dụng nhiều trình duyệt khác nhau

Bạn có thể sử dụng:
- **Chrome**: Customer
- **Edge**: Merchant
- **Firefox**: Shipper

Hoặc sử dụng chế độ ẩn danh của từng trình duyệt.

## Lưu ý

1. **Chế độ ẩn danh (Incognito)** là cách tốt nhất vì:
   - Mỗi cửa sổ có session riêng
   - Không bị conflict cookie/token
   - Dễ quản lý

2. **Nếu dùng cùng trình duyệt thường**:
   - Cần đăng xuất và đăng nhập lại khi chuyển role
   - Hoặc sử dụng nhiều profile Chrome khác nhau

3. **Đảm bảo Backend và Frontend đang chạy**:
   - Backend: `http://localhost:8000`
   - Frontend: `http://localhost:5173`

## Test Flow

1. **Customer** đặt đơn hàng
2. **Merchant** xác nhận đơn hàng
3. **Merchant** báo sẵn sàng giao (Ready for pickup)
4. **Shipper** nhận đơn hàng
5. **Shipper** hoàn tất giao hàng
6. **Customer** xem đơn hàng đã giao

