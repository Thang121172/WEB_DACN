from decimal import Decimal
from django.db import transaction
from django.db.models import Q, Sum
from django.utils.timezone import now

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Order, OrderItem, Review, MenuItemReview, Complaint
from menus.models import MenuItem, Merchant, MerchantMember # Corrected import

# =========================================================
# Helpers
# =========================================================

def get_user_role(user) -> str:
    """
    Trả về role từ Profile. Mặc định 'customer' nếu user chưa có profile.
    """
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "role", None):
        return profile.role
    return "customer"


def user_merchants(user):
    """
    Lấy danh sách merchant mà user này có quyền (owner hoặc staff).
    Dùng cho merchant dashboard và MerchantViewSet.
    """
    return Merchant.objects.filter(
        Q(owner=user) | Q(members__user=user)
    ).distinct()


def serialize_order_item(item: OrderItem):
    return {
        "id": item.id,
        "menu_item_id": item.menu_item_id,  # menu_item là FK -> menu_item_id luôn có
        "product_name": item.name_snapshot,
        "name": item.name_snapshot,  # Alias for compatibility
        "price": float(item.price_snapshot),
        "quantity": item.quantity,
        "line_total": str(item.line_total),
    }


def serialize_order(order: Order):
    # Calculate subtotal from items
    subtotal = sum(float(item.line_total) for item in order.items.all())
    delivery_fee = 35000.0  # Fixed delivery fee
    # Total = subtotal + delivery_fee (luôn tính lại để đảm bảo đúng)
    total = subtotal + delivery_fee
    
    # Get customer info from user and profile
    customer_name = order.customer.username if order.customer else ""
    customer_email = order.customer.email if order.customer else ""
    
    # Try to get phone, full_name, and default_address from profile
    customer_phone = ""
    try:
        if order.customer and hasattr(order.customer, 'profile'):
            profile = order.customer.profile
            customer_phone = profile.phone or ""
            # Use full_name from profile if available, otherwise use username
            if profile.full_name:
                customer_name = profile.full_name
    except:
        pass
    
    # Use delivery_address from order, or fallback to profile default_address
    delivery_addr = order.delivery_address
    if not delivery_addr:
        try:
            if order.customer and hasattr(order.customer, 'profile'):
                delivery_addr = order.customer.profile.default_address or ""
        except:
            pass
    
    return {
        "id": order.id,
        "order_id": order.id,  # Alias for compatibility
        "status": order.status,
        "payment_status": order.payment_status,
        "total_amount": str(order.total_amount),
        "total": total,  # For frontend compatibility
        "subtotal": subtotal,
        "delivery_fee": delivery_fee,
        "delivery_address": delivery_addr,
        "customer_name": customer_name,
        "customer_address": delivery_addr,
        "customer_phone": customer_phone,
        "order_time": order.created_at.isoformat() if order.created_at else "",
        "created_at": order.created_at.isoformat() if order.created_at else "",
        "updated_at": order.updated_at.isoformat() if order.updated_at else "",
        "payment_method": "cash" if order.payment_status == "UNPAID" else "card",
        "note": order.note,
        "merchant": {
            "id": order.merchant.id,
            "name": order.merchant.name,
        },
        "merchant_name": order.merchant.name,
        "merchant_address": order.merchant.address or "",
        "shipper": (
            (lambda shipper: {
                "id": shipper.id,
                "username": shipper.username,
                "email": shipper.email,
                "phone": "",
                "full_name": shipper.username,
                "vehicle_plate": "",
            } if not hasattr(shipper, 'profile') or not shipper.profile else {
                "id": shipper.id,
                "username": shipper.username,
                "email": shipper.email,
                "phone": shipper.profile.phone or "",
                "full_name": shipper.profile.full_name or shipper.username,
                "vehicle_plate": shipper.profile.vehicle_plate or "",
            })(order.shipper) if order.shipper else None
        ),
        "items": [serialize_order_item(i) for i in order.items.all()],
        "items_count": order.items.count(),  # Số loại món khác nhau
        "total_quantity": sum(item.quantity for item in order.items.all()),  # Tổng số lượng món
    }


# =========================================================
# 1️⃣ ORDER VIEWSET (Customer-side)
# Routes dưới prefix /api/orders/
#
# - list(): lịch sử đơn của user hiện tại (customer)
# - retrieve(): xem chi tiết 1 đơn thuộc về mình
# - create(): checkout (tạo đơn hàng mới)
#
# Body tạo đơn (checkout) ví dụ:
# {
#   "merchant_id": 5,
#   "delivery_address": "123 Lê Lợi, Q1",
#   "note": "ít cay",
#   "items": [
#     { "menu_item_id": 10, "quantity": 2 },
#     { "menu_item_id": 11, "quantity": 1 }
#   ]
# }
# =========================================================

class OrderViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        GET /api/orders/
        -> trả về danh sách đơn hàng của chính user hiện tại.
        """
        qs = Order.objects.filter(customer=request.user).order_by("-created_at")
        data = [serialize_order(o) for o in qs]
        return Response(data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        """
        GET /api/orders/{id}/
        -> chỉ xem được nếu đơn đó thuộc về mình.
        """
        try:
            order = Order.objects.get(pk=pk, customer=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(serialize_order(order), status=status.HTTP_200_OK)

    @transaction.atomic
    def create(self, request):
        """
        POST /api/orders/
        -> customer checkout tạo đơn mới (status=PENDING).
        """
        user = request.user
        role = get_user_role(user)
        if role not in ["customer", "admin"]:
            return Response({"detail": "Chỉ customer mới được tạo đơn."}, status=403)

        merchant_id = request.data.get("merchant_id")
        delivery_address = request.data.get("delivery_address", "")
        note = request.data.get("note", "")
        items_payload = request.data.get("items", [])

        # Validate input
        if not merchant_id:
            return Response({"detail": "merchant_id là bắt buộc"}, status=400)
        
        if not items_payload or not isinstance(items_payload, list) or len(items_payload) == 0:
            return Response({"detail": "items không được để trống"}, status=400)

        # Lấy merchant
        try:
            merchant = Merchant.objects.get(id=merchant_id, is_active=True)
        except Merchant.DoesNotExist:
            return Response({"detail": "Merchant không tồn tại"}, status=400)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Lỗi khi lấy merchant {merchant_id}: {str(e)}")
            return Response({"detail": f"Lỗi khi xử lý merchant: {str(e)}"}, status=500)

        # Tạo order khung - ĐẢM BẢO status luôn là PENDING
        try:
            order = Order.objects.create(
                customer=user,
                merchant=merchant,
                status=Order.Status.PENDING,  # Đơn mới LUÔN bắt đầu với PENDING
                payment_status=Order.PaymentStatus.UNPAID,
                delivery_address=delivery_address,
                note=note,
                total_amount=Decimal("0.00"),
            )
            
            # Debug: Log để đảm bảo status đúng
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"✅ Created Order #{order.id} with status={order.status} (should be PENDING)")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Lỗi khi tạo Order: {str(e)}")
            transaction.set_rollback(True)
            return Response(
                {"detail": f"Lỗi khi tạo đơn hàng: {str(e)}"},
                status=500,
            )

        total_amount = Decimal("0.00")
        stock_errors = []
        stock_warnings = []

        # Duyệt giỏ hàng và kiểm tra tồn kho
        for row in items_payload:
            menu_item_id = row.get("menu_item_id")
            quantity = int(row.get("quantity", 1))

            if not menu_item_id:
                stock_errors.append("Menu item ID không hợp lệ")
                continue

            try:
                # Sử dụng select_for_update để lock row khi đọc
                m_item = MenuItem.objects.select_for_update().get(id=menu_item_id, merchant=merchant)
            except MenuItem.DoesNotExist:
                transaction.set_rollback(True)
                return Response(
                    {"detail": f"Menu item {menu_item_id} không tồn tại"},
                    status=400,
                )
            except Exception as e:
                transaction.set_rollback(True)
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Lỗi khi lấy menu item {menu_item_id}: {str(e)}")
                return Response(
                    {"detail": f"Lỗi khi xử lý menu item {menu_item_id}: {str(e)}"},
                    status=500,
                )

            # Kiểm tra giá và tồn kho
            if m_item.price is None:
                stock_errors.append(f"{m_item.name}: Giá không hợp lệ")
                continue
                
            # Đảm bảo stock là số nguyên hợp lệ
            stock_value = m_item.stock if m_item.stock is not None else 0
            
            # Kiểm tra tồn kho
            if stock_value < quantity:
                if stock_value <= 0:
                    # Hết hàng hoàn toàn
                    stock_errors.append(f"{m_item.name}: Hết hàng (tồn kho: {stock_value})")
                else:
                    # Không đủ số lượng
                    stock_errors.append(f"{m_item.name}: Chỉ còn {stock_value} phần, bạn đặt {quantity} phần")
                continue

            try:
                # Đảm bảo price là Decimal
                price_snapshot = Decimal(str(m_item.price))
                line_total = price_snapshot * Decimal(str(quantity))
                total_amount += line_total
            except (ValueError, TypeError) as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Lỗi khi tính giá cho menu item {m_item.id}: {str(e)}")
                stock_errors.append(f"{m_item.name}: Lỗi tính giá (giá: {m_item.price})")
                continue

            # Trừ tồn kho - Sử dụng F() expression để đảm bảo atomic update
            from django.db.models import F
            import logging
            logger = logging.getLogger(__name__)
            
            old_stock = m_item.stock
            logger.info(f"🔴 Trừ stock: Menu Item {m_item.id} ({m_item.name}): Stock hiện tại = {old_stock}, sẽ trừ {quantity}")
            
            # Sử dụng F() expression để trừ stock atomic
            MenuItem.objects.filter(id=m_item.id).update(
                stock=F('stock') - quantity
            )
            
            # Refresh để lấy giá trị mới
            m_item.refresh_from_db()
            
            # Kiểm tra và cập nhật is_available
            if m_item.stock <= 0:
                m_item.is_available = False
                stock_warnings.append(f"{m_item.name} đã hết hàng")
            else:
                m_item.is_available = True
            
            m_item.save(update_fields=["is_available"])
            
            # Log sau khi save
            logger.info(f"✅ Đã lưu stock: Menu Item {m_item.id} ({m_item.name}): Stock = {m_item.stock}, Available = {m_item.is_available}")

            try:
                OrderItem.objects.create(
                    order=order,
                    menu_item=m_item,
                    name_snapshot=m_item.name,
                    price_snapshot=price_snapshot,
                    quantity=quantity,
                    line_total=line_total,
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Lỗi khi tạo OrderItem cho menu item {m_item.id}: {str(e)}")
                transaction.set_rollback(True)
                return Response(
                    {"detail": f"Lỗi khi tạo đơn hàng: {str(e)}"},
                    status=500,
                )

        # Nếu có lỗi tồn kho, hủy đơn hàng
        if stock_errors:
            transaction.set_rollback(True)
            return Response(
                {
                    "detail": "Không đủ tồn kho cho một số món",
                    "errors": stock_errors
                },
                status=400,
            )

        # cập nhật tổng tiền
        try:
            order.total_amount = total_amount
            order.save(update_fields=["total_amount"])

            response_data = serialize_order(order)
            if stock_warnings:
                response_data["warnings"] = stock_warnings

            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Lỗi khi cập nhật total_amount cho Order {order.id}: {str(e)}")
            transaction.set_rollback(True)
            return Response(
                {"detail": f"Lỗi khi hoàn tất đơn hàng: {str(e)}"},
                status=500,
            )

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        """
        POST /api/orders/{id}/set_status/
        Body: { "status": "CONFIRMED" }
        => Cho phép customer, merchant, hoặc admin đổi trạng thái đơn hàng.
        - Customer: chỉ có thể hủy đơn của mình (PENDING -> CANCELED)
        - Merchant: có thể confirm/cancel đơn của merchant của họ
        - Admin: có thể set bất kỳ status nào
        """
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        new_status = request.data.get("status")
        if not new_status:
            return Response({"detail": "status required"}, status=400)

        user = request.user
        role = get_user_role(user)

        # Kiểm tra quyền
        if role == "customer":
            # Customer chỉ có thể hủy đơn của mình
            if order.customer != user:
                return Response({"detail": "Forbidden"}, status=403)
            if new_status != "CANCELED":
                return Response({"detail": "Customer chỉ có thể hủy đơn"}, status=403)
        elif role == "merchant":
            # Merchant chỉ có thể thao tác với đơn của merchant của họ
            merchants = user_merchants(user)
            if order.merchant not in merchants:
                return Response({"detail": "Forbidden"}, status=403)
            # Merchant có thể confirm hoặc cancel
            if new_status not in ["CONFIRMED", "CANCELED", "READY_FOR_PICKUP"]:
                return Response({"detail": "Merchant chỉ có thể confirm, cancel, hoặc ready"}, status=403)
        elif role != "admin":
            return Response({"detail": "Forbidden"}, status=403)

        # Lưu trạng thái cũ để xử lý restore stock khi cancel
        old_status = order.status
        
        # Nếu merchant cancel đơn (PENDING -> CANCELED hoặc CONFIRMED -> CANCELED)
        # Cần restore stock vì stock đã bị trừ khi tạo đơn
        # Phải restore TRƯỚC KHI cập nhật status để đảm bảo transaction consistency
        if new_status == "CANCELED" and old_status in [Order.Status.PENDING, Order.Status.CONFIRMED]:
            for item in order.items.all():
                if item.menu_item:
                    # Restore stock
                    item.menu_item.stock += item.quantity
                    # Nếu stock > 0, đánh dấu lại là available
                    if item.menu_item.stock > 0:
                        item.menu_item.is_available = True
                    item.menu_item.save(update_fields=["stock", "is_available"])
        
        # Cập nhật status sau khi restore stock
        order.status = new_status
        order.save(update_fields=["status"])
        
        return Response(serialize_order(order), status=200)

    @transaction.atomic
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        POST /api/orders/{id}/cancel/
        UC-10: Customer hủy đơn khi còn trong PENDING/CONFIRMED.
        Body: { "reason": "Lý do hủy (optional)" }
        """
        try:
            order = Order.objects.get(pk=pk, customer=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        # Chỉ cho phép hủy khi status là PENDING hoặc CONFIRMED
        if order.status not in [Order.Status.PENDING, Order.Status.CONFIRMED]:
            return Response(
                {
                    "detail": f"Không thể hủy đơn ở trạng thái {order.status}. Chỉ có thể hủy khi đơn ở trạng thái PENDING hoặc CONFIRMED."
                },
                status=400
            )

        reason = request.data.get("reason", "Khách hàng hủy đơn")
        
        # Lưu trạng thái cũ để kiểm tra hoàn trả kho
        old_status = order.status

        # Cập nhật trạng thái
        order.status = Order.Status.CANCELED
        
        # Nếu đã thanh toán, chuyển payment_status sang REFUNDED
        if order.payment_status == Order.PaymentStatus.PAID:
            order.payment_status = Order.PaymentStatus.REFUNDED
        
        order.save(update_fields=["status", "payment_status"])

        # Hoàn trả kho: Stock đã bị trừ khi tạo đơn (PENDING), nên cần restore khi cancel
        # Dù là PENDING hay CONFIRMED, đều cần restore stock vì đã trừ khi tạo đơn
        for item in order.items.all():
            if item.menu_item:
                # Restore stock
                item.menu_item.stock += item.quantity
                # Nếu stock > 0, đánh dấu lại là available
                if item.menu_item.stock > 0:
                    item.menu_item.is_available = True
                item.menu_item.save(update_fields=["stock", "is_available"])

        return Response(
            {
                "id": order.id,
                "status": order.status,
                "payment_status": order.payment_status,
                "message": "Đơn hàng đã được hủy thành công"
            },
            status=200
        )


# =========================================================
# 2️⃣ MERCHANT VIEWSET
# Routes dưới prefix /api/merchant/
#
# - list(): liệt kê menu item để quản lý tồn kho
# - update_stock(): POST /api/merchant/{id}/update_stock/
#
# Sau này bạn có thể thêm list_orders(), confirm_order(), ready_for_pickup()...
# =========================================================

class MerchantViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        GET /api/merchant/
        -> trả danh sách món (MenuItem). Hiện đang chưa filter theo merchant cụ thể,
          vì MenuItem hiện chỉ có merchant_id dạng số (chưa FK chặt).
        Bạn có thể filter theo merchant_id của user sau.
        """
        items = MenuItem.objects.all().order_by("id")
        data = [
            {
                "id": m.id,
                "name": m.name,
                "price": str(m.price),
                "stock": m.stock,
                "merchant_id": m.merchant_id,
            }
            for m in items
        ]
        return Response(data, status=200)

    @action(detail=True, methods=['post'])
    def update_stock(self, request, pk=None):
        """
        POST /api/merchant/{menu_item_id}/update_stock/
        Body: { "stock": 42 }
        -> cập nhật tồn kho món ăn.
        """
        try:
            menu = MenuItem.objects.get(pk=pk)
        except MenuItem.DoesNotExist:
            return Response({"detail": "not found"}, status=404)

        try:
            new_stock = int(request.data.get("stock", menu.stock))
        except (TypeError, ValueError):
            return Response({"detail": "invalid stock"}, status=400)

        menu.stock = new_stock
        menu.save(update_fields=["stock"])
        return Response({"id": menu.id, "stock": menu.stock}, status=200)


# =========================================================
# 3️⃣ SHIPPER VIEWSET
# Routes dưới prefix /api/shipper/
#
# - list(): đơn chưa giao xong (khác DELIVERED)
# - pickup(): POST /api/shipper/{order_id}/pickup/
#              -> shipper nhận đơn, chuyển trạng thái sang đang giao
#
# Gợi ý: bạn có thể mở rộng:
#   - available(): liệt kê đơn READY_FOR_PICKUP chưa ai nhận
#   - update_status(): cập nhật DELIVERING / DELIVERED
# =========================================================

class ShipperViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def update_location(self, request):
        """
        POST /api/shipper/update_location/
        Body: { "latitude": 10.123456, "longitude": 106.123456 }
        -> Cập nhật vị trí GPS của shipper để phân luồng đơn hàng
        """
        from accounts.models import Profile
        from django.utils import timezone
        
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        
        if latitude is None or longitude is None:
            return Response({"detail": "latitude và longitude là bắt buộc"}, status=400)
        
        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except (ValueError, TypeError):
            return Response({"detail": "latitude và longitude phải là số hợp lệ"}, status=400)
        
        # Cập nhật profile của shipper
        try:
            profile = request.user.profile
            if profile.role != 'shipper':
                return Response({"detail": "Chỉ shipper mới được cập nhật vị trí"}, status=403)
            
            profile.latitude = latitude
            profile.longitude = longitude
            profile.location_updated_at = timezone.now()
            profile.save(update_fields=['latitude', 'longitude', 'location_updated_at'])
            
            return Response({
                "message": "Đã cập nhật vị trí thành công",
                "latitude": float(profile.latitude),
                "longitude": float(profile.longitude),
                "location_updated_at": profile.location_updated_at.isoformat() if profile.location_updated_at else None,
            }, status=200)
        except Profile.DoesNotExist:
            return Response({"detail": "Profile không tồn tại"}, status=404)

    def list(self, request):
        """
        GET /api/shipper/?lat=10.123&lng=106.123&radius=20
        -> danh sách đơn hàng sẵn sàng giao, sắp xếp theo khoảng cách gần nhất.
        - Chỉ hiển thị đơn READY_FOR_PICKUP hoặc PENDING (chưa có shipper)
        - Tính khoảng cách từ shipper đến merchant
        - Sắp xếp theo khoảng cách gần nhất
        - Chỉ hiển thị đơn trong phạm vi radius (km), mặc định 20km
        """
        try:
            from accounts.models import Profile
            from menus.utils import haversine_distance
            
            # Lấy GPS location từ query params hoặc từ profile
            # Tương thích với cả Django request và DRF request
            if hasattr(request, 'query_params'):
                query_params = request.query_params
            else:
                query_params = request.GET
            
            lat = query_params.get('lat')
            lng = query_params.get('lng')
            try:
                radius = float(query_params.get('radius', 20))  # Mặc định 20km
            except (ValueError, TypeError):
                radius = 20.0
            
            print(f"🔍 ShipperViewSet.list - Query params: lat={lat}, lng={lng}, radius={radius}")
            
            # Nếu không có trong query params, lấy từ profile
            if not lat or not lng:
                try:
                    profile = request.user.profile
                    if profile.role == 'shipper' and profile.latitude and profile.longitude:
                        lat = str(profile.latitude)
                        lng = str(profile.longitude)
                        print(f"📍 Lấy GPS từ profile: lat={lat}, lng={lng}")
                except Profile.DoesNotExist:
                    print("⚠️ Profile không tồn tại")
                    pass
            
            # Lấy đơn hàng sẵn sàng (READY hoặc PENDING, chưa có shipper)
            # Lưu ý: Order.Status.READY có giá trị là "READY_FOR_PICKUP"
            qs = Order.objects.filter(
                status__in=[Order.Status.READY, Order.Status.PENDING],
                shipper__isnull=True
            ).select_related('merchant', 'customer').order_by("-created_at")
            
            print(f"📦 Tìm thấy {qs.count()} đơn hàng sẵn sàng (PENDING/READY, chưa có shipper)")
            
            orders_with_distance = []
            
            for order in qs:
                # Chỉ tính khoảng cách nếu có GPS của shipper và merchant
                if lat and lng and order.merchant.latitude and order.merchant.longitude:
                    try:
                        distance = haversine_distance(
                            float(lat), float(lng),
                            float(order.merchant.latitude), float(order.merchant.longitude)
                        )
                        
                        print(f"  Order {order.id}: Merchant GPS={order.merchant.latitude}, {order.merchant.longitude}, Distance={distance:.2f}km, Radius={radius}km")
                        
                        # Chỉ thêm đơn trong phạm vi radius
                        if distance <= radius:
                            orders_with_distance.append({
                                "order": order,
                                "distance_to_merchant": distance,
                            })
                            print(f"    ✅ Thêm Order {order.id} vào danh sách (distance={distance:.2f}km <= radius={radius}km)")
                        else:
                            print(f"    ❌ Bỏ qua Order {order.id} (distance={distance:.2f}km > radius={radius}km)")
                    except (ValueError, TypeError) as e:
                        # Bỏ qua nếu không tính được khoảng cách
                        print(f"    ⚠️ Lỗi tính khoảng cách cho Order {order.id}: {e}")
                        continue
                else:
                    # Nếu không có GPS, vẫn hiển thị nhưng không có khoảng cách
                    print(f"  Order {order.id}: Không có GPS (shipper: lat={lat}, lng={lng}, merchant: lat={order.merchant.latitude}, lng={order.merchant.longitude})")
                    orders_with_distance.append({
                        "order": order,
                        "distance_to_merchant": None,
                    })
            
            print(f"✅ Trả về {len(orders_with_distance)} đơn hàng")
            
            # Sắp xếp theo khoảng cách gần nhất (None sẽ ở cuối)
            orders_with_distance.sort(key=lambda x: x["distance_to_merchant"] if x["distance_to_merchant"] is not None else float('inf'))
            
            # Serialize data
            data = []
            for item in orders_with_distance:
                try:
                    order = item["order"]
                    distance = item["distance_to_merchant"]
                    
                    # Tính phí giao hàng dựa trên khoảng cách (ví dụ: 5,000 VND/km, tối thiểu 20,000 VND)
                    delivery_fee = 20000  # Phí cơ bản
                    if distance is not None:
                        delivery_fee = max(20000, int(distance * 5000))
                    
                    # Convert Decimal to float safely
                    merchant_lat = None
                    merchant_lng = None
                    if order.merchant.latitude is not None:
                        try:
                            merchant_lat = float(order.merchant.latitude)
                        except (ValueError, TypeError):
                            merchant_lat = None
                    if order.merchant.longitude is not None:
                        try:
                            merchant_lng = float(order.merchant.longitude)
                        except (ValueError, TypeError):
                            merchant_lng = None
                    
                    # Thông tin shipper (nếu có)
                    shipper_info = None
                    if order.shipper:
                        shipper_info = {
                            "id": order.shipper.id,
                            "username": order.shipper.username,
                        }
                    
                    data.append({
                        "id": order.id,
                        "status": order.status,
                        "created_at": order.created_at.isoformat(),
                        "merchant": {
                            "id": order.merchant.id,
                            "name": order.merchant.name,
                            "address": order.merchant.address or "",
                            "latitude": merchant_lat,
                            "longitude": merchant_lng,
                        },
                        "customer": {
                            "id": order.customer.id,
                            "username": order.customer.username,
                            "delivery_address": order.delivery_address or "",
                        },
                        "shipper": shipper_info,  # Thêm thông tin shipper
                        "total_amount": str(order.total_amount),
                        "distance_to_merchant_km": round(distance, 2) if distance is not None else None,
                        "delivery_fee": delivery_fee,
                    })
                except Exception as e:
                    print(f"❌ Lỗi khi serialize Order {item['order'].id}: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
            
            print(f"✅ Serialize thành công {len(data)} đơn hàng")
            return Response(data, status=200)
        except Exception as e:
            print(f"❌ Lỗi trong ShipperViewSet.list: {e}")
            import traceback
            traceback.print_exc()
            return Response({"detail": f"Lỗi server: {str(e)}"}, status=500)

    @action(detail=False, methods=['get'])
    def revenue(self, request):
        """
        GET /api/shipper/revenue/
        -> Lấy thống kê doanh thu của shipper hiện tại
        """
        from django.db.models import Sum, Count, Q
        from django.utils import timezone
        from datetime import timedelta
        
        try:
            shipper = request.user
            
            # Tính phí giao hàng dựa trên khoảng cách (giống logic trong list)
            # Tạm thời dùng delivery_fee từ order hoặc tính theo công thức
            def calculate_delivery_fee(order):
                # Nếu có delivery_fee trong order, dùng nó
                # Nếu không, tính theo khoảng cách (5,000 VND/km, tối thiểu 20,000 VND)
                # Tạm thời dùng 20,000 VND làm phí cơ bản
                return 20000
            
            # Tổng số đơn đã giao (DELIVERED)
            total_deliveries = Order.objects.filter(
                shipper=shipper,
                status=Order.Status.DELIVERED
            ).count()
            
            # Tổng thu nhập (tổng delivery_fee của các đơn đã giao)
            # Tính delivery_fee cho mỗi đơn dựa trên khoảng cách
            delivered_orders = Order.objects.filter(
                shipper=shipper,
                status=Order.Status.DELIVERED
            ).select_related('merchant')
            
            total_earnings = 0
            for order in delivered_orders:
                # Tính delivery_fee dựa trên khoảng cách
                delivery_fee = 20000  # Phí cơ bản
                try:
                    from accounts.models import Profile
                    from menus.utils import haversine_distance
                    
                    profile = shipper.profile
                    if profile.latitude and profile.longitude and order.merchant.latitude and order.merchant.longitude:
                        distance = haversine_distance(
                            float(profile.latitude), float(profile.longitude),
                            float(order.merchant.latitude), float(order.merchant.longitude)
                        )
                        delivery_fee = max(20000, int(distance * 5000))
                except:
                    pass
                
                total_earnings += delivery_fee
            
            # Hôm nay
            today = timezone.now().date()
            today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
            
            deliveries_today = Order.objects.filter(
                shipper=shipper,
                status=Order.Status.DELIVERED,
                updated_at__gte=today_start
            ).count()
            
            earnings_today = 0
            today_orders = Order.objects.filter(
                shipper=shipper,
                status=Order.Status.DELIVERED,
                updated_at__gte=today_start
            ).select_related('merchant')
            
            for order in today_orders:
                delivery_fee = 20000
                try:
                    from accounts.models import Profile
                    from menus.utils import haversine_distance
                    
                    profile = shipper.profile
                    if profile.latitude and profile.longitude and order.merchant.latitude and order.merchant.longitude:
                        distance = haversine_distance(
                            float(profile.latitude), float(profile.longitude),
                            float(order.merchant.latitude), float(order.merchant.longitude)
                        )
                        delivery_fee = max(20000, int(distance * 5000))
                except:
                    pass
                
                earnings_today += delivery_fee
            
            # Tháng này
            month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            deliveries_this_month = Order.objects.filter(
                shipper=shipper,
                status=Order.Status.DELIVERED,
                updated_at__gte=month_start
            ).count()
            
            earnings_this_month = 0
            month_orders = Order.objects.filter(
                shipper=shipper,
                status=Order.Status.DELIVERED,
                updated_at__gte=month_start
            ).select_related('merchant')
            
            for order in month_orders:
                delivery_fee = 20000
                try:
                    from accounts.models import Profile
                    from menus.utils import haversine_distance
                    
                    profile = shipper.profile
                    if profile.latitude and profile.longitude and order.merchant.latitude and order.merchant.longitude:
                        distance = haversine_distance(
                            float(profile.latitude), float(profile.longitude),
                            float(order.merchant.latitude), float(order.merchant.longitude)
                        )
                        delivery_fee = max(20000, int(distance * 5000))
                except:
                    pass
                
                earnings_this_month += delivery_fee
            
            return Response({
                "total_earnings": total_earnings,
                "total_deliveries": total_deliveries,
                "earnings_today": earnings_today,
                "deliveries_today": deliveries_today,
                "earnings_this_month": earnings_this_month,
                "deliveries_this_month": deliveries_this_month,
            }, status=200)
        except Exception as e:
            print(f"❌ Lỗi trong ShipperViewSet.revenue: {e}")
            import traceback
            traceback.print_exc()
            return Response({"detail": f"Lỗi server: {str(e)}"}, status=500)

    @action(detail=False, methods=['get'])
    def delivery_history(self, request):
        """
        GET /api/shipper/delivery_history/
        -> Lấy lịch sử đơn hàng đã giao của shipper hiện tại (status = DELIVERED)
        """
        try:
            from menus.utils import haversine_distance
            
            # Lấy đơn hàng đã giao của shipper hiện tại
            qs = Order.objects.filter(
                shipper=request.user,
                status=Order.Status.DELIVERED
            ).select_related('merchant', 'customer').order_by("-updated_at")
            
            data = []
            for order in qs:
                # Tính khoảng cách từ shipper đến merchant (nếu có GPS)
                distance = None
                try:
                    profile = request.user.profile
                    if profile.latitude and profile.longitude and order.merchant.latitude and order.merchant.longitude:
                        distance = haversine_distance(
                            float(profile.latitude), float(profile.longitude),
                            float(order.merchant.latitude), float(order.merchant.longitude)
                        )
                except:
                    pass
                
                # Tính phí giao hàng
                delivery_fee = 20000
                if distance is not None:
                    delivery_fee = max(20000, int(distance * 5000))
                
                data.append({
                    "id": order.id,
                    "status": order.status,
                    "created_at": order.created_at.isoformat(),
                    "updated_at": order.updated_at.isoformat(),
                    "merchant": {
                        "id": order.merchant.id,
                        "name": order.merchant.name,
                        "address": order.merchant.address or "",
                    },
                    "customer": {
                        "id": order.customer.id,
                        "username": order.customer.username,
                        "delivery_address": order.delivery_address or "",
                    },
                    "total_amount": str(order.total_amount),
                    "distance_to_merchant_km": round(distance, 2) if distance is not None else None,
                    "delivery_fee": delivery_fee,
                })
            
            return Response(data, status=200)
        except Exception as e:
            print(f"❌ Lỗi trong ShipperViewSet.delivery_history: {e}")
            import traceback
            traceback.print_exc()
            return Response({"detail": f"Lỗi server: {str(e)}"}, status=500)

    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        """
        GET /api/shipper/my_orders/
        -> Lấy danh sách đơn hàng đang giao của shipper hiện tại (status = DELIVERING)
        """
        try:
            from menus.utils import haversine_distance
            
            # Lấy đơn hàng đang giao của shipper hiện tại
            qs = Order.objects.filter(
                shipper=request.user,
                status=Order.Status.DELIVERING
            ).select_related('merchant', 'customer').order_by("-created_at")
            
            data = []
            for order in qs:
                # Tính khoảng cách từ shipper đến merchant (nếu có GPS)
                distance = None
                try:
                    profile = request.user.profile
                    if profile.latitude and profile.longitude and order.merchant.latitude and order.merchant.longitude:
                        distance = haversine_distance(
                            float(profile.latitude), float(profile.longitude),
                            float(order.merchant.latitude), float(order.merchant.longitude)
                        )
                except:
                    pass
                
                # Tính phí giao hàng
                delivery_fee = 20000
                if distance is not None:
                    delivery_fee = max(20000, int(distance * 5000))
                
                data.append({
                    "id": order.id,
                    "status": order.status,
                    "created_at": order.created_at.isoformat(),
                    "merchant": {
                        "id": order.merchant.id,
                        "name": order.merchant.name,
                        "address": order.merchant.address or "",
                    },
                    "customer": {
                        "id": order.customer.id,
                        "username": order.customer.username,
                        "delivery_address": order.delivery_address or "",
                    },
                    "total_amount": str(order.total_amount),
                    "distance_to_merchant_km": round(distance, 2) if distance is not None else None,
                    "delivery_fee": delivery_fee,
                })
            
            return Response(data, status=200)
        except Exception as e:
            print(f"❌ Lỗi trong ShipperViewSet.my_orders: {e}")
            import traceback
            traceback.print_exc()
            return Response({"detail": f"Lỗi server: {str(e)}"}, status=500)

    @action(detail=True, methods=['post'])
    def pickup(self, request, pk=None):
        """
        POST /api/shipper/{order_id}/pickup/
        -> shipper nhận đơn.
        - Chỉ cho phép nhận đơn ở trạng thái READY_FOR_PICKUP hoặc PENDING
        - Đơn phải chưa có shipper nào nhận
        - Sau khi nhận, đặt status thành DELIVERING và gán shipper=request.user
        """
        from django.db import transaction
        
        try:
            # Sử dụng select_for_update để tránh race condition khi nhiều shipper cùng nhận một đơn
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=pk)
                
                # Kiểm tra đơn có ở trạng thái hợp lệ không (READY_FOR_PICKUP hoặc PENDING)
                if order.status not in [Order.Status.READY, Order.Status.PENDING]:
                    return Response(
                        {"detail": f"Không thể nhận đơn ở trạng thái {order.status}. Chỉ có thể nhận đơn ở trạng thái READY_FOR_PICKUP hoặc PENDING."},
                        status=400
                    )
                
                # Kiểm tra đơn đã có shipper chưa
                if order.shipper is not None:
                    if order.shipper.id == request.user.id:
                        # Shipper này đã nhận đơn rồi
                        return Response(
                            {"detail": "Bạn đã nhận đơn này rồi."},
                            status=400
                        )
                    else:
                        # Đơn đã được shipper khác nhận - dùng status 409 (Conflict) để frontend dễ xử lý
                        return Response(
                            {
                                "detail": "Đơn hàng này đã được shipper khác nhận.",
                                "error_code": "ORDER_ALREADY_TAKEN",
                                "order_id": order.id
                            },
                            status=409  # Conflict - đơn đã được nhận bởi shipper khác
                        )
                
                # Nhận đơn: gán shipper và chuyển trạng thái
                order.shipper = request.user
                order.status = Order.Status.DELIVERING
                order.save(update_fields=["shipper", "status"])
                
        except Order.DoesNotExist:
            return Response({"detail": "Not found hoặc bạn không phải shipper của đơn này"}, status=404)

        return Response(
            {
                "id": order.id,
                "status": order.status,
                "shipper_id": order.shipper.id if order.shipper else None,
                "message": "Đã nhận đơn hàng thành công",
            },
            status=200,
        )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        POST /api/shipper/{order_id}/complete/
        -> shipper hoàn tất giao hàng, đặt status thành DELIVERED.
        """
        try:
            order = Order.objects.get(pk=pk, shipper=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Not found hoặc bạn không phải shipper của đơn này"}, status=404)

        # Kiểm tra đơn phải đang ở trạng thái DELIVERING
        if order.status != Order.Status.DELIVERING:
            return Response(
                {"detail": f"Chỉ có thể hoàn tất đơn hàng đang ở trạng thái DELIVERING. Đơn hiện tại: {order.status}"},
                status=400
            )

        # Cập nhật status thành DELIVERED
        order.status = Order.Status.DELIVERED
        order.save(update_fields=["status"])

        return Response(
            {
                "id": order.id,
                "status": order.status,
                "message": "Đã hoàn tất giao hàng thành công",
            },
            status=200,
        )


# =========================================================
# 4️⃣ MERCHANT DASHBOARD
# GET /api/merchant/dashboard/   (sau này bạn có thể mount endpoint này)
#
# Tóm tắt:
# - tổng số đơn hôm nay
# - tổng doanh thu hôm nay
# - số món hết hàng
# - danh sách đơn gần đây
#
# Lưu ý: vì bạn chưa mount endpoint này trong router, nên muốn dùng
# thì phải tự add path(...) trong urls project.
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def merchant_dashboard(request):
    """
    Dashboard cho merchant: thống kê trong ngày cho 1 merchant mà user có quyền.
    Hiện tại: lấy merchant đầu tiên mà user sở hữu / là member.
    """
    merchants_qs = user_merchants(request.user)
    merchant = merchants_qs.first()
    if not merchant:
        return Response({"detail": "Bạn không phải merchant."}, status=403)

    today = now().date()

    # Lấy tất cả đơn hàng hôm nay (bao gồm cả đã hủy để hiển thị)
    today_orders = (
        Order.objects.filter(
            merchant=merchant,
            created_at__date=today,
        )
        .order_by("-created_at")
        .select_related("customer")
    )

    # Chỉ tính doanh thu từ đơn không bị hủy
    today_orders_not_cancelled = today_orders.exclude(status=Order.Status.CANCELED)
    
    orders_today_count = today_orders_not_cancelled.count()
    revenue_today = today_orders_not_cancelled.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")

    # món hết hàng
    sold_out_count = MenuItem.objects.filter(
        merchant_id=merchant.id,
        stock=0,
    ).count()

    # Lấy đơn hàng gần đây (không chỉ hôm nay, lấy 7 đơn mới nhất)
    recent_orders_all = (
        Order.objects.filter(merchant=merchant)
        .order_by("-created_at")
        .select_related("customer")[:7]
    )

    recent_orders = [
        {
            "order_id": o.id,
            "customer_username": getattr(o.customer, "username", "Khách"),
            "total": str(o.total_amount),
            "payment_status": o.payment_status,
            "status": o.status,  # Trả về status thực từ database
            "time": o.created_at.strftime("%H:%M"),
        }
        for o in recent_orders_all
    ]
    
    # Debug: Log status của các đơn hàng
    import logging
    logger = logging.getLogger(__name__)
    for o in recent_orders_all[:3]:  # Log 3 đơn đầu tiên
        logger.info(f"Order #{o.id}: status={o.status}, total={o.total_amount}, created={o.created_at}")

    return Response(
        {
            "merchant": {
                "id": merchant.id,
                "name": merchant.name,
            },
            "orders_today": orders_today_count,
            "revenue_today": str(revenue_today),
            "sold_out": sold_out_count,
            "recent_orders": recent_orders,
        },
        status=200,
    )


# =========================================================
# 5️⃣ REVIEW & RATING (UC-11)
# =========================================================

class ReviewViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def create(self, request):
        """
        POST /api/reviews/
        UC-11: Customer đánh giá đơn/món/shipper
        Body: {
            "order_id": 1,
            "order_rating": 5,
            "merchant_rating": 4,
            "shipper_rating": 5,
            "comment": "Rất tốt",
            "menu_item_reviews": [
                {"order_item_id": 1, "rating": 5, "comment": "Ngon"},
                {"order_item_id": 2, "rating": 4, "comment": "OK"}
            ]
        }
        """
        user = request.user
        order_id = request.data.get("order_id")
        
        try:
            order = Order.objects.get(pk=order_id, customer=user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=404)
        
        # Chỉ cho phép đánh giá đơn đã DELIVERED
        if order.status != Order.Status.DELIVERED:
            return Response(
                {"detail": "Chỉ có thể đánh giá đơn hàng đã giao thành công"},
                status=400
            )
        
        # Kiểm tra đã đánh giá chưa
        if Review.objects.filter(order=order, customer=user).exists():
            return Response(
                {"detail": "Bạn đã đánh giá đơn hàng này rồi"},
                status=400
            )
        
        # Tạo review
        review = Review.objects.create(
            order=order,
            customer=user,
            order_rating=request.data.get("order_rating", 5),
            merchant_rating=request.data.get("merchant_rating"),
            shipper_rating=request.data.get("shipper_rating") if order.shipper else None,
            comment=request.data.get("comment", "")
        )
        
        # Tạo menu item reviews
        menu_item_reviews_data = request.data.get("menu_item_reviews", [])
        for item_review_data in menu_item_reviews_data:
            order_item_id = item_review_data.get("order_item_id")
            try:
                order_item = OrderItem.objects.get(pk=order_item_id, order=order)
                MenuItemReview.objects.create(
                    review=review,
                    order_item=order_item,
                    rating=item_review_data.get("rating", 5),
                    comment=item_review_data.get("comment", "")
                )
            except OrderItem.DoesNotExist:
                continue
        
        return Response({
            "id": review.id,
            "order_id": review.order_id,
            "order_rating": review.order_rating,
            "merchant_rating": review.merchant_rating,
            "shipper_rating": review.shipper_rating,
            "comment": review.comment,
            "created_at": review.created_at
        }, status=201)

    def retrieve(self, request, pk=None):
        """
        GET /api/reviews/{id}/
        Xem chi tiết review
        """
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)
        
        menu_item_reviews = [
            {
                "id": mir.id,
                "order_item_id": mir.order_item_id,
                "item_name": mir.order_item.name_snapshot,
                "rating": mir.rating,
                "comment": mir.comment
            }
            for mir in review.menu_item_reviews.all()
        ]
        
        return Response({
            "id": review.id,
            "order_id": review.order_id,
            "customer": review.customer.username,
            "order_rating": review.order_rating,
            "merchant_rating": review.merchant_rating,
            "shipper_rating": review.shipper_rating,
            "comment": review.comment,
            "menu_item_reviews": menu_item_reviews,
            "created_at": review.created_at
        }, status=200)


# =========================================================
# 6️⃣ COMPLAINT & FEEDBACK (UC-13)
# =========================================================

class ComplaintViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        """
        POST /api/complaints/
        UC-13: Customer gửi khiếu nại
        Body: {
            "order_id": 1,
            "complaint_type": "FOOD_QUALITY",
            "title": "Món ăn không đúng",
            "description": "Chi tiết khiếu nại..."
        }
        """
        user = request.user
        order_id = request.data.get("order_id")
        
        try:
            order = Order.objects.get(pk=order_id, customer=user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=404)
        
        complaint = Complaint.objects.create(
            order=order,
            customer=user,
            complaint_type=request.data.get("complaint_type", Complaint.Type.OTHER),
            title=request.data.get("title", ""),
            description=request.data.get("description", "")
        )
        
        return Response({
            "id": complaint.id,
            "order_id": complaint.order_id,
            "complaint_type": complaint.complaint_type,
            "title": complaint.title,
            "status": complaint.status,
            "created_at": complaint.created_at
        }, status=201)

    def list(self, request):
        """
        GET /api/complaints/
        Danh sách khiếu nại
        - Customer: chỉ thấy khiếu nại của mình
        - Merchant/Admin: thấy tất cả khiếu nại liên quan
        """
        user = request.user
        role = get_user_role(user)
        
        if role == "customer":
            complaints = Complaint.objects.filter(customer=user)
        elif role in ["merchant", "admin"]:
            # Merchant thấy khiếu nại của đơn hàng thuộc merchant của họ
            if role == "merchant":
                merchants = user_merchants(user)
                complaints = Complaint.objects.filter(order__merchant__in=merchants)
            else:
                complaints = Complaint.objects.all()
        else:
            return Response({"detail": "Forbidden"}, status=403)
        
        data = [
            {
                "id": c.id,
                "order_id": c.order_id,
                "customer": c.customer.username,
                "complaint_type": c.complaint_type,
                "title": c.title,
                "description": c.description,
                "status": c.status,
                "response": c.response,
                "created_at": c.created_at
            }
            for c in complaints.order_by("-created_at")
        ]
        return Response(data, status=200)

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """
        POST /api/complaints/{id}/respond/
        Merchant/Admin phản hồi khiếu nại
        Body: {
            "response": "Phản hồi...",
            "status": "RESOLVED" hoặc "REJECTED"
        }
        """
        try:
            complaint = Complaint.objects.get(pk=pk)
        except Complaint.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)
        
        user = request.user
        role = get_user_role(user)
        
        # Kiểm tra quyền
        if role == "customer":
            return Response({"detail": "Forbidden"}, status=403)
        
        if role == "merchant":
            merchants = user_merchants(user)
            if complaint.order.merchant not in merchants:
                return Response({"detail": "Forbidden"}, status=403)
        
        # Cập nhật phản hồi
        complaint.response = request.data.get("response", "")
        new_status = request.data.get("status")
        if new_status in [Complaint.Status.RESOLVED, Complaint.Status.REJECTED]:
            complaint.status = new_status
            if new_status == Complaint.Status.RESOLVED:
                from django.utils import timezone
                complaint.resolved_at = timezone.now()
        complaint.handled_by = user
        complaint.save()
        
        return Response({
            "id": complaint.id,
            "status": complaint.status,
            "response": complaint.response,
            "resolved_at": complaint.resolved_at
        }, status=200)


# =========================================================
# 7️⃣ MERCHANT: QUẢN LÝ KHO (UC-04) & XỬ LÝ THIẾU KHO (UC-12) & REFUND (UC-14)
# =========================================================

class InventoryViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """
        POST /api/inventory/{menu_item_id}/adjust_stock/
        UC-04: Nhập/xuất/điều chỉnh kho
        Body: {
            "quantity": 10,  # Số lượng thay đổi (dương = nhập, âm = xuất)
            "reason": "Nhập hàng mới",
            "type": "IN" hoặc "OUT" hoặc "ADJUST"
        }
        """
        user = request.user
        role = get_user_role(user)
        
        if role not in ["merchant", "admin"]:
            return Response({"detail": "Forbidden"}, status=403)
        
        try:
            menu_item = MenuItem.objects.get(pk=pk)
        except MenuItem.DoesNotExist:
            return Response({"detail": "Menu item not found"}, status=404)
        
        # Kiểm tra quyền với merchant
        if role == "merchant":
            merchants = user_merchants(user)
            if menu_item.merchant not in merchants:
                return Response({"detail": "Forbidden"}, status=403)
        
        quantity = int(request.data.get("quantity", 0))
        stock_type = request.data.get("type", "ADJUST")
        
        if stock_type == "IN":
            menu_item.stock += abs(quantity)
        elif stock_type == "OUT":
            menu_item.stock = max(0, menu_item.stock - abs(quantity))
        else:  # ADJUST
            menu_item.stock = max(0, quantity)
        
        menu_item.save(update_fields=["stock"])
        
        return Response({
            "id": menu_item.id,
            "name": menu_item.name,
            "stock": menu_item.stock,
            "message": f"Đã cập nhật tồn kho thành công"
        }, status=200)


class MerchantOrderViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, pk=None):
        """
        GET /api/merchant-orders/{order_id}/
        Merchant xem chi tiết đơn hàng của merchant của họ
        """
        user = request.user
        role = get_user_role(user)
        
        if role not in ["merchant", "admin"]:
            return Response({"detail": "Forbidden"}, status=403)
        
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=404)
        
        # Kiểm tra quyền: merchant chỉ xem được đơn của merchant của họ
        if role == "merchant":
            merchants = user_merchants(user)
            if order.merchant not in merchants:
                return Response({"detail": "Forbidden"}, status=403)
        
        return Response(serialize_order(order), status=200)

    @action(detail=True, methods=['post'])
    def handle_out_of_stock(self, request, pk=None):
        """
        POST /api/merchant/orders/{order_id}/handle_out_of_stock/
        UC-12: Xử lý thiếu kho
        Body: {
            "action": "SUBSTITUTE" hoặc "REDUCE" hoặc "CANCEL",
            "substitutions": [  # Nếu action = SUBSTITUTE
                {"order_item_id": 1, "new_menu_item_id": 5}
            ],
            "reductions": [  # Nếu action = REDUCE
                {"order_item_id": 1, "new_quantity": 1}
            ],
            "reason": "Lý do xử lý"
        }
        """
        user = request.user
        role = get_user_role(user)
        
        if role not in ["merchant", "admin"]:
            return Response({"detail": "Forbidden"}, status=403)
        
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=404)
        
        # Kiểm tra quyền
        if role == "merchant":
            merchants = user_merchants(user)
            if order.merchant not in merchants:
                return Response({"detail": "Forbidden"}, status=403)
        
        action = request.data.get("action")
        
        with transaction.atomic():
            if action == "SUBSTITUTE":
                # Đổi món
                substitutions = request.data.get("substitutions", [])
                for sub in substitutions:
                    order_item_id = sub.get("order_item_id")
                    new_menu_item_id = sub.get("new_menu_item_id")
                    try:
                        order_item = OrderItem.objects.get(pk=order_item_id, order=order)
                        new_menu_item = MenuItem.objects.get(pk=new_menu_item_id)
                        
                        # Cập nhật order item
                        order_item.menu_item = new_menu_item
                        order_item.name_snapshot = new_menu_item.name
                        order_item.price_snapshot = new_menu_item.price
                        order_item.line_total = new_menu_item.price * order_item.quantity
                        order_item.save()
                    except (OrderItem.DoesNotExist, MenuItem.DoesNotExist):
                        continue
                
            elif action == "REDUCE":
                # Giảm số lượng
                reductions = request.data.get("reductions", [])
                for red in reductions:
                    order_item_id = red.get("order_item_id")
                    new_quantity = int(red.get("new_quantity", 1))
                    try:
                        order_item = OrderItem.objects.get(pk=order_item_id, order=order)
                        order_item.quantity = max(1, new_quantity)
                        order_item.line_total = order_item.price_snapshot * order_item.quantity
                        order_item.save()
                    except OrderItem.DoesNotExist:
                        continue
                
            elif action == "CANCEL":
                # Hủy đơn
                order.status = Order.Status.CANCELED
                if order.payment_status == Order.PaymentStatus.PAID:
                    order.payment_status = Order.PaymentStatus.REFUNDED
                order.save()
                return Response({
                    "id": order.id,
                    "status": order.status,
                    "message": "Đơn hàng đã được hủy do thiếu kho"
                }, status=200)
            
            # Tính lại tổng tiền
            total = sum(item.line_total for item in order.items.all())
            order.total_amount = total
            order.save(update_fields=["total_amount"])
        
        return Response({
            "id": order.id,
            "total_amount": str(order.total_amount),
            "message": f"Đã xử lý thiếu kho bằng cách {action}"
        }, status=200)

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """
        POST /api/merchant/orders/{order_id}/refund/
        UC-14: Xử lý refund
        Body: {
            "amount": 50000,  # Số tiền hoàn (null = hoàn toàn bộ)
            "reason": "Lý do hoàn tiền"
        }
        """
        user = request.user
        role = get_user_role(user)
        
        if role not in ["merchant", "admin"]:
            return Response({"detail": "Forbidden"}, status=403)
        
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=404)
        
        # Kiểm tra quyền
        if role == "merchant":
            merchants = user_merchants(user)
            if order.merchant not in merchants:
                return Response({"detail": "Forbidden"}, status=403)
        
        # Chỉ refund nếu đã thanh toán
        if order.payment_status != Order.PaymentStatus.PAID:
            return Response(
                {"detail": "Chỉ có thể hoàn tiền cho đơn đã thanh toán"},
                status=400
            )
        
        refund_amount = request.data.get("amount")
        if refund_amount is None:
            refund_amount = order.total_amount
        else:
            refund_amount = Decimal(str(refund_amount))
            if refund_amount > order.total_amount:
                refund_amount = order.total_amount
        
        # Cập nhật payment status
        if refund_amount >= order.total_amount:
            order.payment_status = Order.PaymentStatus.REFUNDED
        else:
            # Partial refund - có thể cần thêm field refunded_amount
            order.payment_status = Order.PaymentStatus.REFUNDED
        
        order.save(update_fields=["payment_status"])
        
        return Response({
            "id": order.id,
            "refund_amount": str(refund_amount),
            "payment_status": order.payment_status,
            "message": f"Đã hoàn tiền {refund_amount} VNĐ"
        }, status=200)


# =========================================================
# 8️⃣ SHIPPER: XỬ LÝ VẤN ĐỀ
# =========================================================

    @action(detail=True, methods=['post'])
    def report_issue(self, request, pk=None):
        """
        POST /api/shipper/orders/{order_id}/report_issue/
        Shipper báo cáo vấn đề (RETURNED, FAILED_DELIVERY)
        Body: {
            "issue_type": "RETURNED" hoặc "FAILED_DELIVERY",
            "reason": "Lý do..."
        }
        """
        user = request.user
        role = get_user_role(user)
        
        if role not in ["shipper", "admin"]:
            return Response({"detail": "Forbidden"}, status=403)
        
        try:
            order = Order.objects.get(pk=pk, shipper=user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found or not assigned to you"}, status=404)
        
        issue_type = request.data.get("issue_type")
        reason = request.data.get("reason", "")
        
        # Cập nhật trạng thái
        if issue_type == "RETURNED":
            order.status = Order.Status.CANCELED  # Hoặc có thể thêm status RETURNED
        elif issue_type == "FAILED_DELIVERY":
            order.status = Order.Status.CANCELED  # Hoặc có thể thêm status FAILED_DELIVERY
        
        order.note = f"{order.note}\n[Shipper Issue]: {reason}".strip()
        order.save(update_fields=["status", "note"])
        
        return Response({
            "id": order.id,
            "status": order.status,
            "message": f"Đã báo cáo vấn đề: {issue_type}"
        }, status=200)


# =========================================================
# 9️⃣ ADMIN: QUẢN LÝ USER & ROLE (UC-09)
# =========================================================

class AdminViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def users(self, request):
        """
        GET /api/admin/users/
        UC-09: Danh sách users
        """
        user = request.user
        role = get_user_role(user)
        
        if role != "admin":
            return Response({"detail": "Forbidden"}, status=403)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        users = User.objects.all().select_related("profile")
        data = [
            {
                "id": u.id,
                "username": u.username,
                "email": getattr(u, "email", ""),
                "role": getattr(u.profile, "role", "customer") if hasattr(u, "profile") else "customer",
                "is_active": u.is_active,
                "date_joined": u.date_joined
            }
            for u in users
        ]
        return Response(data, status=200)

    @action(detail=True, methods=['patch'])
    def update_user_role(self, request, pk=None):
        """
        PATCH /api/admin/users/{user_id}/update_role/
        UC-09: Thay đổi role của user
        Body: {
            "role": "merchant" hoặc "shipper" hoặc "customer" hoặc "admin"
        }
        """
        user = request.user
        role = get_user_role(user)
        
        if role != "admin":
            return Response({"detail": "Forbidden"}, status=403)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=404)
        
        new_role = request.data.get("role")
        if new_role not in ["customer", "merchant", "shipper", "admin"]:
            return Response({"detail": "Invalid role"}, status=400)
        
        # Cập nhật profile
        from accounts.models import Profile
        profile, created = Profile.objects.get_or_create(user=target_user)
        profile.role = new_role
        profile.save()
        
        return Response({
            "id": target_user.id,
            "username": target_user.username,
            "role": profile.role,
            "message": f"Đã cập nhật role thành {new_role}"
        }, status=200)