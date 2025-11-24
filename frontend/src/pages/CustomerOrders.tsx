import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/http';
import { useAuthContext } from '../context/AuthContext';

interface Order {
  id: number;
  order_id: number;
  merchant_name?: string;
  total: number;
  status: string;
  created_at: string;
  items_count?: number;  // Số loại món khác nhau
  total_quantity?: number;  // Tổng số lượng món
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800';
  if (statusLower.includes('confirmed')) return 'bg-blue-100 text-blue-800';
  if (statusLower.includes('ready')) return 'bg-green-100 text-green-800';
  if (statusLower.includes('delivering')) return 'bg-purple-100 text-purple-800';
  if (statusLower.includes('delivered')) return 'bg-grabGreen-100 text-grabGreen-800';
  if (statusLower.includes('cancelled')) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

const getStatusText = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('pending')) return 'Chờ xác nhận';
  if (statusLower.includes('confirmed')) return 'Đã xác nhận';
  if (statusLower.includes('ready')) return 'Sẵn sàng';
  if (statusLower.includes('delivering')) return 'Đang giao';
  if (statusLower.includes('delivered')) return 'Đã giao';
  if (statusLower.includes('cancelled')) return 'Đã hủy';
  return status;
};

export default function CustomerOrders() {
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await api.get('/orders/');
        // Map backend response to frontend format
        const ordersData = (response.data || []).map((order: any) => {
          // Tính tổng số lượng món nếu không có từ backend
          const totalQuantity = order.total_quantity || 
            (order.items ? order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) : 0);
          
          return {
            id: order.id,
            order_id: order.order_id || order.id,
            merchant_name: order.merchant_name || order.merchant?.name,
            total: parseFloat(order.total || order.total_amount || 0),
            status: order.status,
            created_at: order.created_at || order.order_time,
            items_count: order.items_count || order.items?.length || 0,
            total_quantity: totalQuantity,
          };
        });
        setOrders(ordersData);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Đang tải đơn hàng...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link
          to="/customer"
          className="text-grabGreen-700 hover:text-grabGreen-800 font-medium mb-4 inline-block"
        >
          &larr; Quay lại
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Đơn hàng của tôi</h1>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Đơn hàng #{order.order_id || order.id}
                  </h3>
                  {order.merchant_name && (
                    <p className="text-sm text-gray-600 mt-1">Cửa hàng: {order.merchant_name}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Đặt lúc: {formatDate(order.created_at)}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  {order.total_quantity !== undefined ? (
                    <p className="text-sm text-gray-600">
                      {order.total_quantity} phần
                      {order.items_count && order.items_count > 1 && (
                        <span className="text-gray-500"> ({order.items_count} loại món)</span>
                      )}
                    </p>
                  ) : order.items_count !== undefined ? (
                    <p className="text-sm text-gray-600">
                      {order.items_count} món
                    </p>
                  ) : null}
                </div>
                <p className="text-xl font-extrabold text-red-600">
                  {formatCurrency(order.total)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center p-10 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Chưa có đơn hàng nào</h2>
          <p className="text-gray-600 mb-6">Hãy đặt hàng để xem lịch sử đơn hàng của bạn!</p>
          <Link
            to="/customer"
            className="inline-block px-6 py-3 bg-grabGreen-700 text-white rounded-full font-semibold hover:bg-grabGreen-800 transition duration-150"
          >
            Đặt hàng ngay
          </Link>
        </div>
      )}
    </div>
  );
}

