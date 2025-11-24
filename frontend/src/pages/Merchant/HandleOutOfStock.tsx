import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import api from '../../services/http';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  menu_item_id: number;
}

interface Order {
  id: number;
  items: OrderItem[];
  total_amount: number;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
}

export default function HandleOutOfStock() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthContext();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'SUBSTITUTE' | 'REDUCE' | 'CANCEL'>('SUBSTITUTE');
  const [substitutions, setSubstitutions] = useState<Record<number, number>>({});
  const [reductions, setReductions] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch order details
        const orderResponse = await api.get(`/orders/${orderId}/`);
        setOrder(orderResponse.data);

        // Fetch available menu items for substitution
        const menuResponse = await api.get('/merchant/');
        setMenuItems(menuResponse.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        showToast('Không thể tải dữ liệu', 'error');
        navigate('/merchant/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchData();
    }
  }, [orderId, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !order) return;

    setSubmitting(true);
    try {
      let payload: any = { action };

      if (action === 'SUBSTITUTE') {
        payload.substitutions = Object.entries(substitutions).map(([orderItemId, newMenuItemId]) => ({
          order_item_id: parseInt(orderItemId),
          new_menu_item_id: newMenuItemId
        }));
      } else if (action === 'REDUCE') {
        payload.reductions = Object.entries(reductions).map(([orderItemId, newQuantity]) => ({
          order_item_id: parseInt(orderItemId),
          new_quantity: newQuantity
        }));
      }

      await api.post(`/merchant-orders/${orderId}/handle_out_of_stock/`, payload);

      showToast('Đã xử lý thiếu kho thành công', 'success');
      setTimeout(() => {
        navigate('/merchant/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Failed to handle out of stock:', error);
      showToast(error.response?.data?.detail || 'Không thể xử lý thiếu kho', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Đang tải...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-lg font-medium text-gray-700">Không tìm thấy đơn hàng</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link
          to="/merchant/dashboard"
          className="text-grabGreen-700 hover:text-grabGreen-800 font-medium mb-4 inline-block"
        >
          &larr; Quay lại Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Xử lý Thiếu kho - Đơn hàng #{orderId}</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
        {/* Action Selection */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-800 mb-3">
            Chọn cách xử lý
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="action"
                value="SUBSTITUTE"
                checked={action === 'SUBSTITUTE'}
                onChange={(e) => setAction(e.target.value as any)}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Đổi món</span>
                <p className="text-sm text-gray-600">Thay thế món thiếu bằng món khác</p>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="action"
                value="REDUCE"
                checked={action === 'REDUCE'}
                onChange={(e) => setAction(e.target.value as any)}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Giảm số lượng</span>
                <p className="text-sm text-gray-600">Giảm số lượng món thiếu</p>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="action"
                value="CANCEL"
                checked={action === 'CANCEL'}
                onChange={(e) => setAction(e.target.value as any)}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Hủy đơn</span>
                <p className="text-sm text-gray-600">Hủy toàn bộ đơn hàng do thiếu kho</p>
              </div>
            </label>
          </div>
        </div>

        {/* Substitute Form */}
        {action === 'SUBSTITUTE' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Chọn món thay thế</h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{item.quantity}x {item.name}</span>
                    <span className="text-gray-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                    </span>
                  </div>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={substitutions[item.id] || item.menu_item_id}
                    onChange={(e) => setSubstitutions({ ...substitutions, [item.id]: parseInt(e.target.value) })}
                  >
                    {menuItems.map((menuItem) => (
                      <option key={menuItem.id} value={menuItem.id}>
                        {menuItem.name} - {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(menuItem.price)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reduce Form */}
        {action === 'REDUCE' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Giảm số lượng</h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-600">Số lượng hiện tại: {item.quantity}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={item.quantity}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={reductions[item.id] || item.quantity}
                    onChange={(e) => setReductions({ ...reductions, [item.id]: parseInt(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Warning */}
        {action === 'CANCEL' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold mb-2">⚠️ Cảnh báo</p>
            <p className="text-red-700">
              Bạn sắp hủy đơn hàng #{orderId}. Hành động này sẽ hoàn tiền cho khách hàng nếu đã thanh toán.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Link
            to="/merchant/dashboard"
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors text-center"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-colors ${
              action === 'CANCEL'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-grabGreen-600 hover:bg-grabGreen-700 text-white'
            } disabled:opacity-50`}
          >
            {submitting ? 'Đang xử lý...' : action === 'CANCEL' ? 'Xác nhận hủy đơn' : 'Xác nhận xử lý'}
          </button>
        </div>
      </form>
    </div>
  );
}

