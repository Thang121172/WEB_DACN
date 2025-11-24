import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/http';
import { useAuthContext } from '../context/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { useToast } from '../components/Toast';

// ===================================
// INTERFACES (Mock)
// ===================================

interface Order {
  id: number;
  store_name: string;
  store_address: string;
  customer_address: string;
  delivery_fee: number;
  distance_km: number | null;
  status: 'Ready' | 'In Progress' | 'Delivered' | 'Pending';
}

interface ShipperSummary {
  total_deliveries: number;
  total_earnings: number;
  current_orders: number;
}

// API Response types
interface OrderResponse {
  id: number;
  status: string;
  created_at: string;
  merchant: {
    id: number;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  customer: {
    id: number;
    username: string;
    delivery_address?: string;
  };
  shipper?: {
    id: number;
    username: string;
  } | null;
  total_amount: string;
  distance_to_merchant_km?: number | null;
  delivery_fee?: number;
}

// ===================================
// UTILITY
// ===================================

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

// ===================================
// SMALL COMPONENTS
// ===================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}> = ({ title, value, color, icon }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 flex items-center space-x-4 transition duration-300 hover:shadow-xl border border-gray-100">
    <div className={`p-3 rounded-full ${color} bg-opacity-20 text-xl`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const OrderCard: React.FC<{
  order: Order;
  onAction: (orderId: number, action: 'accept' | 'complete') => void;
  onReportIssue?: (orderId: number) => void;
  isInProgress?: boolean; // Đơn đang giao của shipper hiện tại
}> = ({ order, onAction, onReportIssue, isInProgress = false }) => {
  // Nếu isInProgress = true, đây là đơn đang giao của shipper hiện tại
  // Nếu isInProgress = false, đây là đơn sẵn sàng (chưa có shipper)
  const isAvailable = !isInProgress;

  const handleAction = () => {
    if (isAvailable) {
      onAction(order.id, 'accept');
    } else {
      onAction(order.id, 'complete');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 space-y-3 border border-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <div className="text-lg font-bold text-gray-800">
          Đơn hàng #{order.id}
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            isAvailable
              ? 'bg-grabGreen-50 text-grabGreen-700 border-grabGreen-300'
              : 'bg-blue-50 text-blue-700 border-blue-300'
          }`}
        >
          {isAvailable ? 'Sẵn sàng giao' : 'Đang trên đường'}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm text-gray-700">
        <div className="flex items-start text-red-600 font-medium">
          <span className="mr-2 text-xl leading-none">📍</span>
          <div>
            <div>Lấy hàng:</div>
            <div>
              {order.store_address} ({order.store_name})
            </div>
          </div>
        </div>

        <div className="flex items-start text-blue-600 font-medium">
          <span className="mr-2 text-xl leading-none"></span>
          <div>
            <div>Giao đến:</div>
            <div>{order.customer_address}</div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          <span>
            Khoảng cách: {order.distance_km !== null ? `${order.distance_km.toFixed(2)} km` : 'Đang tính...'}
          </span>
          <span>Phí giao hàng: {formatCurrency(order.delivery_fee)}</span>
        </div>
      </div>

      {/* Action */}
      <div className="space-y-2">
        <button
          onClick={handleAction}
          className={`w-full py-2 text-white rounded-full font-semibold transition duration-150 shadow-md ${
            isAvailable
              ? 'bg-grabGreen-700 hover:bg-grabGreen-800'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isAvailable ? 'Nhận đơn này' : 'Hoàn tất giao hàng'}
        </button>
        {!isAvailable && onReportIssue && (
          <button
            onClick={() => onReportIssue(order.id)}
            className="w-full py-2 text-red-600 border-2 border-red-600 rounded-full font-semibold transition duration-150 hover:bg-red-50"
          >
            Báo cáo vấn đề
          </button>
        )}
      </div>
    </div>
  );
};

// ===================================
// MAIN COMPONENT
// ===================================

export default function ShipperApp() {
  const { user } = useAuthContext();
  const { location, requestPermission, permissionStatus, setLocation: setLocationState } = useLocation();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<ShipperSummary | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [inProgressOrder, setInProgressOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastUpdatedLocation, setLastUpdatedLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [profileLocation, setProfileLocation] = useState<{lat: number, lng: number} | null | undefined>(undefined); // undefined = chưa kiểm tra, null = đã kiểm tra nhưng không có
  const [hasFetched, setHasFetched] = useState(false); // Đánh dấu đã fetch lần đầu

  // Cập nhật GPS location lên backend - chỉ khi có độ chính xác tốt
  const updateShipperLocation = useCallback(async (lat: number, lng: number, accuracy?: number) => {
    // Chỉ cập nhật nếu accuracy < 50m (độ chính xác tốt)
    if (accuracy && accuracy > 50) {
      console.log(`⚠️ Độ chính xác GPS quá thấp (${accuracy.toFixed(2)}m), không cập nhật lên server. Cần < 50m`);
      return;
    }

    // Kiểm tra xem vị trí có thay đổi đáng kể không (ít nhất 10m)
    if (lastUpdatedLocation) {
      const distance = Math.sqrt(
        Math.pow(lat - lastUpdatedLocation.lat, 2) + 
        Math.pow(lng - lastUpdatedLocation.lng, 2)
      ) * 111000; // Chuyển đổi sang mét (1 độ ≈ 111km)
      
      // Nếu vị trí thay đổi ít hơn 10m và accuracy không tốt hơn, không cập nhật
      if (distance < 10 && accuracy && lastUpdatedLocation.accuracy && accuracy >= lastUpdatedLocation.accuracy) {
        console.log(`📍 Vị trí thay đổi không đáng kể (${distance.toFixed(2)}m), bỏ qua cập nhật`);
        return;
      }
    }

    try {
      await api.post('/shipper/update_location/', {
        latitude: lat,
        longitude: lng,
      });
      console.log(`✅ Đã cập nhật vị trí GPS lên server: ${lat.toFixed(6)}, ${lng.toFixed(6)} (accuracy: ${accuracy?.toFixed(2)}m)`);
      setLastUpdatedLocation({ lat, lng, accuracy: accuracy || 0 });
    } catch (error) {
      console.error('❌ Lỗi khi cập nhật vị trí GPS:', error);
    }
  }, [lastUpdatedLocation]);

  // Lấy GPS location từ profile khi component mount
  useEffect(() => {
    const fetchProfileLocation = async () => {
      try {
        const response = await api.get('/accounts/me/');
        const profile = response.data;
        
        // Nếu profile có GPS location, sử dụng nó
        if (profile.latitude && profile.longitude) {
          const profileLat = parseFloat(profile.latitude);
          const profileLng = parseFloat(profile.longitude);
          
          console.log(`✅ Lấy GPS từ profile: ${profileLat}, ${profileLng}`);
          setProfileLocation({ lat: profileLat, lng: profileLng });
          
          // Set location state để sử dụng ngay (không cần accuracy vì từ database)
          setLocationState(profileLat, profileLng);
          
          // Cập nhật lên backend để đảm bảo đồng bộ (không cần chờ)
          updateShipperLocation(profileLat, profileLng, 0).catch(err => {
            console.error('Lỗi khi cập nhật location lên backend:', err);
          });
        } else {
          // Nếu không có GPS trong profile, đánh dấu để fetch data không có GPS
          console.log('⚠️ Profile không có GPS location');
          setProfileLocation(null); // Đánh dấu đã kiểm tra nhưng không có GPS
        }
      } catch (error) {
        console.error('❌ Lỗi khi lấy profile location:', error);
        setProfileLocation(null); // Đánh dấu đã kiểm tra nhưng có lỗi
      }
    };
    
    if (user?.role === 'shipper') {
      fetchProfileLocation();
    }
  }, [user, setLocationState, updateShipperLocation]);

  // Lấy data từ API
  const fetchShipperData = useCallback(async () => {
    setLoading(true);
    try {
      // Xây dựng query params với GPS location
      // Ưu tiên location từ profile, sau đó mới đến location từ browser
      const params: any = { radius: 20 }; // Bán kính 20km
      
      const latToUse = profileLocation?.lat || location?.latitude;
      const lngToUse = profileLocation?.lng || location?.longitude;
      
      if (latToUse && lngToUse) {
        params.lat = latToUse;
        params.lng = lngToUse;
        console.log(`🔍 Fetch đơn hàng với GPS: ${latToUse}, ${lngToUse}`);
      } else {
        console.log('⚠️ Không có GPS, fetch đơn hàng không lọc theo vị trí');
      }
      
      // Lấy danh sách đơn hàng sẵn sàng giao (chưa có shipper), đơn đang giao, và stats
      const [availableResponse, myOrdersResponse, revenueResponse] = await Promise.all([
        api.get('/shipper/', { params }),
        api.get('/shipper/my_orders/').catch(() => ({ data: [] })), // Nếu endpoint chưa có, trả về mảng rỗng
        api.get('/shipper/revenue/').catch(() => ({ data: { total_earnings: 0, total_deliveries: 0 } })) // Nếu endpoint chưa có, trả về 0
      ]);
      
      const availableOrdersData: OrderResponse[] = availableResponse.data || [];
      const myOrdersData: OrderResponse[] = myOrdersResponse.data || [];
      const revenueData = revenueResponse.data || { total_earnings: 0, total_deliveries: 0 };
      
      console.log(`✅ Nhận được ${availableOrdersData.length} đơn hàng sẵn sàng và ${myOrdersData.length} đơn đang giao`);
      console.log(`💰 Stats: ${revenueData.total_deliveries} chuyến, ${revenueData.total_earnings} VND`);
      
      // Transform data cho đơn sẵn sàng
      const availableOrders: Order[] = availableOrdersData.map(o => ({
        id: o.id,
        store_name: o.merchant.name,
        store_address: o.merchant.address || '',
        customer_address: o.customer.delivery_address || '',
        delivery_fee: o.delivery_fee || 0,
        distance_km: o.distance_to_merchant_km ?? null,
        status: 'Ready' as const,
      }));
      
      // Transform data cho đơn đang giao
      const inProgressOrders: Order[] = myOrdersData.map(o => ({
        id: o.id,
        store_name: o.merchant.name,
        store_address: o.merchant.address || '',
        customer_address: o.customer.delivery_address || '',
        delivery_fee: o.delivery_fee || 0,
        distance_km: o.distance_to_merchant_km ?? null,
        status: (o.status === 'DELIVERING' ? 'In Progress' : 'Ready') as const,
      }));
      
      // Tính summary từ API
      const summary: ShipperSummary = {
        total_deliveries: revenueData.total_deliveries || 0,
        total_earnings: revenueData.total_earnings || 0,
        current_orders: inProgressOrders.length,
      };
      
      setSummary(summary);
      
      // Kiểm tra nếu có đơn mới để thông báo (so sánh với số lượng hiện tại)
      const previousCount = availableOrders.length;
      setAvailableOrders(availableOrders);
      
      // Thông báo đơn mới (sau khi state được cập nhật)
      if (availableOrders.length > previousCount && previousCount > 0) {
        const newOrdersCount = availableOrders.length - previousCount;
        setTimeout(() => {
          // Hiển thị thông báo browser
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🚚 Có đơn hàng mới!', {
              body: `Có ${newOrdersCount} đơn hàng mới sẵn sàng giao trong khu vực của bạn`,
              icon: '/favicon.ico',
              tag: 'new-order',
            });
          }
        }, 100);
      }
      
      // Set đơn đang giao (lấy đơn đầu tiên nếu có)
      setInProgressOrder(inProgressOrders.length > 0 ? inProgressOrders[0] : null);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch shipper data:', e);
      setSummary(null);
      setAvailableOrders([]);
      setInProgressOrder(null);
      setLoading(false);
    }
  }, [location, profileLocation]);

  // Theo dõi GPS location liên tục cho shipper
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Trình duyệt của bạn không hỗ trợ định vị địa lý');
      return;
    }

    // Yêu cầu quyền nếu chưa có
    if (permissionStatus === 'prompt' || permissionStatus === 'denied') {
      requestPermission();
    }

    // Nếu đã có quyền, bắt đầu theo dõi vị trí liên tục
    if (permissionStatus === 'granted' || location) {
      let bestPosition: GeolocationPosition | null = null;
      let bestAccuracy = Infinity;
      
      // Sử dụng watchPosition để theo dõi vị trí liên tục
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const accuracy = pos.coords.accuracy || Infinity;
          
          // Chỉ cập nhật nếu có độ chính xác tốt hơn
          if (accuracy < bestAccuracy) {
            bestPosition = pos;
            bestAccuracy = accuracy;
            
            const newLocation = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: accuracy,
              timestamp: pos.timestamp,
            };
            
            // Cập nhật state
            setLocationState(newLocation.latitude, newLocation.longitude);
            
            // Cập nhật lên backend nếu có độ chính xác tốt
            if (accuracy <= 50) {
              updateShipperLocation(
                pos.coords.latitude,
                pos.coords.longitude,
                accuracy
              );
            } else {
              console.log(`⚠️ GPS accuracy: ${accuracy.toFixed(2)}m (cần < 50m để cập nhật)`);
            }
          }
        },
        (err) => {
          console.error('❌ GPS error:', err);
          if (err.code === 1) {
            setLocationError('Bạn đã từ chối quyền truy cập vị trí. Vui lòng cấp quyền để nhận đơn hàng.');
          } else if (err.code === 2) {
            setLocationError('Không thể xác định vị trí. Vui lòng kiểm tra GPS hoặc kết nối mạng.');
          } else {
            setLocationError('Lỗi khi lấy vị trí GPS. Vui lòng thử lại.');
          }
        },
        {
          enableHighAccuracy: true, // Yêu cầu độ chính xác cao
          timeout: 30000, // Timeout 30 giây
          maximumAge: 5000, // Chỉ chấp nhận vị trí cũ nhất 5 giây
        }
      );
      
      setWatchId(id);
      
      return () => {
        if (id !== null) {
          navigator.geolocation.clearWatch(id);
        }
      };
    }
  }, [permissionStatus, requestPermission, updateShipperLocation]);

  // Fetch data khi có location (ưu tiên profileLocation) - chỉ chạy một lần khi có location
  useEffect(() => {
    // Nếu đã fetch rồi, không fetch lại (trừ khi auto-refresh)
    if (hasFetched) {
      return;
    }
    
    // Chờ cho đến khi đã kiểm tra profileLocation (không còn undefined)
    if (profileLocation === undefined) {
      console.log('⏳ Đang chờ kiểm tra GPS từ profile...');
      return; // Chưa kiểm tra xong, chờ
    }
    
    // Nếu có profileLocation, fetch ngay lập tức
    if (profileLocation?.lat && profileLocation?.lng) {
      console.log('📍 Fetch data với GPS từ profile:', profileLocation);
      fetchShipperData();
      setHasFetched(true);
      return;
    }
    
    // Nếu profileLocation là null (đã kiểm tra nhưng không có), vẫn fetch data không có GPS
    if (profileLocation === null) {
      console.log('📍 Profile không có GPS, fetch data không lọc theo vị trí');
      fetchShipperData();
      setHasFetched(true);
      return;
    }
    
    // Nếu không có profileLocation, chờ GPS từ browser (chỉ khi accuracy tốt)
    if (location?.latitude && location?.longitude && location.accuracy && location.accuracy <= 50) {
      console.log('📍 Fetch data với GPS từ browser:', location);
      fetchShipperData();
      setHasFetched(true);
    }
  }, [profileLocation, location, fetchShipperData, hasFetched]);

  // Auto-refresh mỗi 5 giây để nhận đơn mới và cập nhật danh sách (đơn đã được nhận sẽ biến mất)
  useEffect(() => {
    const interval = setInterval(async () => {
      // Chỉ refresh nếu có location hoặc đã fetch lần đầu
      if (hasFetched && (location?.latitude || profileLocation?.lat)) {
        await fetchShipperData();
      }
    }, 5000); // 5 giây - cập nhật nhanh hơn để đơn đã được nhận biến mất sớm
    
    return () => clearInterval(interval);
  }, [location, profileLocation, fetchShipperData, hasFetched]);

  // Yêu cầu quyền thông báo khi component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Nhận đơn hoặc hoàn tất giao
  const handleOrderAction = async (
    orderId: number,
    action: 'accept' | 'complete'
  ) => {
    setLoading(true);

    try {
      if (action === 'accept') {
        // Gọi API để nhận đơn
        await api.post(`/shipper/${orderId}/pickup/`);
        
        // Loại bỏ đơn khỏi danh sách sẵn sàng ngay lập tức (optimistic update)
        setAvailableOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        
        // Refresh data để lấy đơn đang giao và cập nhật danh sách
        await fetchShipperData();
        console.log(`✅ Đã nhận đơn hàng #${orderId}.`);
        showToast(`✅ Đã nhận đơn hàng #${orderId} thành công!`, 'success');
      } else if (action === 'complete') {
        // Cập nhật trạng thái đơn hàng thành DELIVERED
        await api.post(`/shipper/${orderId}/complete/`);
        
        // Refresh data
        await fetchShipperData();
        console.log(`✅ Đã hoàn tất giao đơn hàng #${orderId}.`);
        showToast(`✅ Đã hoàn tất giao đơn hàng #${orderId}`, 'success');
      }
    } catch (e: any) {
      console.error(`❌ Failed to ${action} order:`, e);
      
      // Xử lý lỗi đặc biệt khi đơn đã được shipper khác nhận
      const statusCode = e?.response?.status;
      const errorData = e?.response?.data;
      const errorCode = errorData?.error_code;
      
      if (statusCode === 409 || errorCode === 'ORDER_ALREADY_TAKEN') {
        // Đơn đã được shipper khác nhận - loại bỏ đơn khỏi danh sách ngay lập tức
        setAvailableOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        
        // Refresh danh sách để đảm bảo đồng bộ
        await fetchShipperData();
        
        showToast('⚠️ Đơn hàng này đã được shipper khác nhận. Danh sách đã được cập nhật.', 'warning');
      } else {
        // Các lỗi khác
        const errorMessage = errorData?.detail || `Không thể ${action === 'accept' ? 'nhận' : 'hoàn tất'} đơn hàng. Vui lòng thử lại.`;
        showToast(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Báo cáo vấn đề
  const handleReportIssue = (orderId: number) => {
    const issueType = prompt('Chọn loại vấn đề:\n1. RETURNED - Khách hàng trả lại\n2. FAILED_DELIVERY - Giao hàng thất bại\n\nNhập 1 hoặc 2:');
    if (!issueType) return;

    const type = issueType === '1' ? 'RETURNED' : issueType === '2' ? 'FAILED_DELIVERY' : null;
    if (!type) {
      showToast('Lựa chọn không hợp lệ', 'error');
      return;
    }

    const reason = prompt('Nhập lý do chi tiết:');
    if (!reason) return;

    setLoading(true);
    api.post(`/shipper/${orderId}/report_issue/`, {
      issue_type: type,
      reason: reason
    })
      .then(() => {
        showToast('✅ Đã báo cáo vấn đề thành công', 'success');
        fetchShipperData();
      })
      .catch((error: any) => {
        console.error('Failed to report issue:', error);
        const errorMessage = error?.response?.data?.detail || 'Không thể báo cáo vấn đề. Vui lòng thử lại.';
        showToast(errorMessage, 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Emoji icons dùng cho summary cards
  const Icons: Record<string, React.ReactNode> = {
    Deliveries: '',
    Earnings: '',
    Current: '',
  };

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-grabGreen-700 mb-6">
        Chào mừng, Shipper! 
      </h1>

      {/* Thông báo lỗi GPS */}
      {locationError && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <p className="font-semibold">⚠️ {locationError}</p>
          <button
            onClick={async () => {
              await requestPermission();
              if (location?.latitude && location?.longitude) {
                setLocationError(null);
              }
            }}
            className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Cấp quyền truy cập vị trí
          </button>
        </div>
      )}

      {/* Hiển thị vị trí hiện tại */}
      {(location || profileLocation) && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          (location?.accuracy && location.accuracy <= 50) || profileLocation
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">📍 Vị trí hiện tại:</span>{' '}
              {profileLocation 
                ? `${profileLocation.lat.toFixed(6)}, ${profileLocation.lng.toFixed(6)} (từ database)`
                : `${location?.latitude?.toFixed(6)}, ${location?.longitude?.toFixed(6)}`
              }
              {location?.accuracy && (
                <span className={`ml-2 ${location.accuracy <= 50 ? 'text-green-700' : 'text-yellow-700'}`}>
                  (Độ chính xác GPS: {location.accuracy.toFixed(2)}m)
                </span>
              )}
              {profileLocation && !location?.accuracy && (
                <span className="ml-2 text-green-700">
                  (GPS từ database)
                </span>
              )}
            </div>
            {profileLocation ? (
              <span className="text-xs bg-green-200 px-2 py-1 rounded">
                ✅ Vị trí từ database
              </span>
            ) : location?.accuracy && location.accuracy > 50 ? (
              <span className="text-xs bg-yellow-200 px-2 py-1 rounded">
                ⚠️ Độ chính xác thấp - Vui lòng di chuyển ra ngoài trời
              </span>
            ) : location?.accuracy && location.accuracy <= 50 ? (
              <span className="text-xs bg-green-200 px-2 py-1 rounded">
                ✅ Vị trí chính xác
              </span>
            ) : null}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center p-10 text-gray-500">
          Đang tải dữ liệu và kiểm tra đơn hàng...
        </div>
      ) : (
        <>
          {/* Thông tin tổng quan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Tổng chuyến giao"
              value={summary?.total_deliveries || 0}
              color="text-grabGreen-700"
              icon={Icons.Deliveries}
            />
            <StatCard
              title="Tổng thu nhập"
              value={formatCurrency(summary?.total_earnings || 0)}
              color="text-yellow-600"
              icon={Icons.Earnings}
            />
            <StatCard
              title="Đơn đang chạy"
              value={summary?.current_orders || 0}
              color="text-red-500"
              icon={Icons.Current}
            />
          </div>

          {/* Đơn đang giao */}
          <section className="mb-8">
            <h2 className="text-2xl font-extrabold text-blue-700 mb-4 border-b pb-2">
              {inProgressOrder
                ? ' Đơn hàng đang thực hiện'
                : 'Tìm kiếm đơn hàng mới...'}
            </h2>

            {inProgressOrder ? (
              <div>
                <OrderCard
                  order={inProgressOrder}
                  onAction={handleOrderAction}
                  onReportIssue={handleReportIssue}
                  isInProgress={true}
                />
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-xl shadow-lg text-gray-500 border border-dashed border-gray-300">
                Hiện tại không có đơn hàng nào bạn đang giao.
              </div>
            )}
          </section>

          {/* Danh sách đơn sẵn sàng nhận */}
          {!inProgressOrder && (
            <section>
              <h2 className="text-2xl font-extrabold text-grabGreen-700 mb-4 border-b pb-2">
                 Đơn hàng sẵn sàng ({availableOrders.length})
              </h2>

              <div className="space-y-6">
                {availableOrders.length > 0 ? (
                  availableOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onAction={handleOrderAction}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center bg-white rounded-xl shadow-lg text-gray-500 border border-dashed border-gray-300">
                    Không có đơn hàng nào sẵn sàng ở khu vực của bạn.
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
