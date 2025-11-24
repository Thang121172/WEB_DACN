import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import api from '../../services/http';
import { useToast } from '../../components/Toast';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  merchant_id?: number;
}

export default function InventoryManagement() {
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustData, setAdjustData] = useState({
    type: 'ADJUST' as 'IN' | 'OUT' | 'ADJUST',
    quantity: '',
    reason: ''
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!authLoading && isAuthenticated && user?.role !== 'merchant' && user?.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchMenuItems();
    
    // Lắng nghe sự kiện refresh inventory khi có thay đổi order
    const handleInventoryRefresh = () => {
      fetchMenuItems();
    };
    
    // Lắng nghe custom event để refresh inventory
    window.addEventListener('inventoryRefresh', handleInventoryRefresh);
    
    // Refresh mỗi 5 giây để đảm bảo dữ liệu luôn mới nhất
    const interval = setInterval(() => {
      fetchMenuItems();
    }, 5000);
    
    return () => {
      window.removeEventListener('inventoryRefresh', handleInventoryRefresh);
      clearInterval(interval);
    };
  }, [isAuthenticated, authLoading, user, navigate]);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/merchant/');
      setMenuItems(response.data || []);
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !adjustData.quantity) {
      showToast('Vui lòng nhập số lượng', 'warning');
      return;
    }

    try {
      await api.post(`/inventory/${editingItem.id}/adjust_stock/`, {
        quantity: parseInt(adjustData.quantity),
        type: adjustData.type,
        reason: adjustData.reason
      });

      showToast('Đã cập nhật tồn kho thành công', 'success');
      setShowAdjustForm(false);
      setEditingItem(null);
      setAdjustData({ type: 'ADJUST', quantity: '', reason: '' });
      fetchMenuItems();
    } catch (error: any) {
      console.error('Failed to adjust stock:', error);
      showToast(error.response?.data?.detail || 'Không thể cập nhật tồn kho', 'error');
    }
  };

  const openAdjustForm = (item: MenuItem) => {
    setEditingItem(item);
    setAdjustData({ type: 'ADJUST', quantity: item.stock.toString(), reason: '' });
    setShowAdjustForm(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Đang tải...</div>
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
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Tồn kho</h1>
      </div>

      {/* Adjust Stock Modal */}
      {showAdjustForm && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Điều chỉnh tồn kho: {editingItem.name}
            </h3>
            <form onSubmit={handleAdjustStock}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Loại điều chỉnh
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={adjustData.type}
                  onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value as any })}
                >
                  <option value="IN">Nhập kho</option>
                  <option value="OUT">Xuất kho</option>
                  <option value="ADJUST">Điều chỉnh (set số lượng)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {adjustData.type === 'ADJUST' ? 'Số lượng mới' : 'Số lượng'}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  required
                />
                {adjustData.type === 'ADJUST' && (
                  <p className="text-sm text-gray-500 mt-1">Tồn kho hiện tại: {editingItem.stock}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lý do (tùy chọn)
                </label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={3}
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustForm(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-grabGreen-600 hover:bg-grabGreen-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Món ăn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Giá</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tồn kho</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {menuItems.map((item) => (
                <tr key={item.id} className={item.stock === 0 ? 'bg-red-50' : item.stock < 10 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-semibold ${item.stock === 0 ? 'text-red-600' : item.stock < 10 ? 'text-yellow-600' : 'text-gray-900'}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.stock === 0 ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Hết hàng
                      </span>
                    ) : item.stock < 10 ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Sắp hết
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Còn hàng
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openAdjustForm(item)}
                      className="text-grabGreen-600 hover:text-grabGreen-800 font-medium"
                    >
                      Điều chỉnh
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

