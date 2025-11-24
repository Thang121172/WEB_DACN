import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext'; // ✅ sửa lại path
import api from '../../services/http';

// ===================================
// INTERFACES (Mock)
// ===================================

interface OrderSummary {
  order_id: number;
  customer_name: string;
  total: number;
  payment_status: string;
  status: string;
  time: string;
}

interface MerchantStats {
  orders_today: number;
  revenue_today: number;
  sold_out_items: number;
  store_rating: number;
}

// ===================================
// MOCK DATA & UTILITY
// ===================================

// API Response types
interface DashboardResponse {
  merchant: {
    id: number;
    name: string;
  };
  orders_today: number;
  revenue_today: string;
  sold_out: number;
  recent_orders: Array<{
    order_id: number;
    customer_username: string;
    total: string;
    payment_status: string;
    status: string;
    time: string;
  }>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

// ===================================
// STATS CARD COMPONENT
// ===================================
const StatCard: React.FC<{
  title: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}> = ({ title, value, color, icon }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col transition duration-300 hover:shadow-xl border border-gray-100">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className={`p-1 rounded-full ${color} bg-opacity-20 text-lg`}>
        {icon}
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

// ===================================
// ORDER ROW COMPONENT
// ===================================
const OrderRow: React.FC<{ order: OrderSummary }> = ({ order }) => {
  const getStatusClass = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === 'PENDING') return 'bg-red-100 text-red-700';
    if (statusUpper === 'CONFIRMED') return 'bg-yellow-100 text-yellow-700';
    if (statusUpper === 'READY_FOR_PICKUP' || statusUpper === 'READY') return 'bg-blue-100 text-blue-700';
    if (statusUpper === 'CANCELED' || statusUpper === 'CANCELLED') return 'bg-gray-100 text-gray-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === 'PENDING') return 'Chờ xác nhận';
    if (statusUpper === 'CONFIRMED') return 'Đã xác nhận';
    if (statusUpper === 'READY_FOR_PICKUP' || statusUpper === 'READY') return 'Đã sẵn sàng';
    if (statusUpper === 'CANCELED' || statusUpper === 'CANCELLED') return 'Đã hủy';
    return status;
  };

  return (
    <tr className="border-b hover:bg-gray-50 transition duration-100">
      <td className="py-3 px-4 text-sm font-medium text-gray-900">
        #{order.order_id}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">
        {order.customer_name}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">
        {/* Items count - API chưa trả về */}
      </td>
      <td className="py-3 px-4 text-sm font-semibold text-grabGreen-700">
        {formatCurrency(order.total)}
      </td>
      <td className="py-3 px-4">
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}`}
        >
          {getStatusText(order.status)}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">{order.time}</td>
      <td className="py-3 px-4 text-right">
        <Link
          to={`/merchant/orders/${order.order_id}/confirm`}
          className="text-grabGreen-600 hover:text-grabGreen-800 text-sm font-medium transition duration-150"
        >
          Chi tiết &rarr;
        </Link>
      </td>
    </tr>
  );
};

// ===================================
// MAIN COMPONENT
// ===================================

export default function MerchantDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();

  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Điều hướng bảo vệ role
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (
      !authLoading &&
      isAuthenticated &&
      user?.role !== 'merchant' &&
      user?.role !== 'admin'
    ) {
      // Nếu không phải merchant/admin thì đẩy về trang merchant chính (ví dụ trang giới thiệu / đăng ký)
      navigate('/merchant', { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Gọi API dashboard
      const response = await api.get('/merchant/dashboard/');
      const data: DashboardResponse = response.data;
      
      // Transform data
      const stats: MerchantStats = {
        orders_today: data.orders_today || 0,
        revenue_today: parseFloat(data.revenue_today || '0'),
        sold_out_items: data.sold_out || 0,
        store_rating: 4.5, // API chưa trả về, có thể thêm sau
      };
      
      const recentOrders: OrderSummary[] = (data.recent_orders || []).map(o => ({
        order_id: o.order_id,
        customer_name: o.customer_username,
        total: parseFloat(o.total || '0'),
        payment_status: o.payment_status,
        status: o.status,
        time: o.time,
      }));
      
      setStats(stats);
      setRecentOrders(recentOrders);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch merchant dashboard data:', e);
      // Trả về empty data thay vì mock
      setStats({
        orders_today: 0,
        revenue_today: 0,
        sold_out_items: 0,
        store_rating: 0,
      });
      setRecentOrders([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'merchant' || user?.role === 'admin')) {
      fetchDashboardData();
    }
  }, [isAuthenticated, user]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-xl text-gray-600">
          Đang tải Trang tổng quan cửa hàng...
        </div>
      </div>
    );
  }

  // Nếu lỡ stats null vì lỗi logic
  if (!stats) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-lg text-gray-600">
          Không thể tải dữ liệu cửa hàng.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">
        Dashboard Cửa hàng - {user?.name || 'Cửa hàng của tôi'}
      </h1>

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          to="/merchant/menu"
          className="px-4 py-2 bg-grabGreen-600 hover:bg-grabGreen-700 text-white font-semibold rounded-lg transition-colors"
        >
          📋 Quản lý Menu
        </Link>
        <Link
          to="/merchant/inventory"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          📦 Quản lý Kho
        </Link>
        <Link
          to="/merchant/complaints"
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
        >
          📢 Khiếu nại
        </Link>
        <Link
          to="/merchant/revenue"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          💰 Doanh thu
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Đơn hàng Hôm nay"
          value={stats.orders_today}
          color="text-blue-500"
          icon="📈"
        />
        <StatCard
          title="Doanh thu Hôm nay"
          value={formatCurrency(stats.revenue_today)}
          color="text-grabGreen-700"
          icon="💰"
        />
        <StatCard
          title="Món hết hàng"
          value={stats.sold_out_items}
          color="text-red-500"
          icon="🔔"
        />
        <StatCard
          title="Đánh giá Cửa hàng"
          value={`${stats.store_rating} / 5`}
          color="text-yellow-500"
          icon="⭐"
        />
      </div>

      {/* Recent Orders */}
      <section className="bg-white rounded-xl shadow-2xl p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-800">Đơn hàng Gần đây</h2>
          <Link
            to="/merchant/orders"
            className="text-grabGreen-600 font-medium hover:underline"
          >
            Xem tất cả &rarr;
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã Đơn
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SL Món
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng tiền
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <OrderRow key={order.order_id} order={order} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-6 text-gray-500">
            Hiện chưa có đơn hàng nào gần đây.
          </div>
        )}
      </section>
    </div>
  );
}
