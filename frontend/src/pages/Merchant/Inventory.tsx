import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/http';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  merchant_id: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export default function Inventory() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthContext();
  const { showToast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<{ id: number; stock: number; type: 'IN' | 'OUT' | 'ADJUST' } | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchMenuItems();
  }, [isAuthenticated, navigate]);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/merchant/');
      setMenuItems(response.data);
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      showToast('Không thể tải danh sách món ăn', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (itemId: number, quantity: number, type: 'IN' | 'OUT' | 'ADJUST') => {
    setAdjusting(true);
    try {
      await api.post(`/inventory/${itemId}/adjust_stock/`, {
        quantity: quantity,
        type: type
      });
      showToast('Đã cập nhật tồn kho thành công', 'success');
      setEditingItem(null);
      fetchMenuItems();
    } catch (error: any) {
      console.error('Failed to adjust stock:', error);
      showToast(error.response?.data?.detail || 'Không thể cập nhật tồn kho', 'error');
    } finally {
      setAdjusting(false);
    }
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
        <button
          onClick={() => navigate('/merchant/dashboard')}
          className="text-grabGreen-700 hover:text-grabGreen-800 font-medium"
        >
          &larr; Quay lại Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mt-2">Quản lý Tồn kho</h1>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên món
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tồn kho
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {menuItems.map((item) => (
                <tr key={item.id} className={item.stock === 0 ? 'bg-red-50' : item.stock < 10 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(item.price)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${item.stock === 0 ? 'text-red-600' : item.stock < 10 ? 'text-yellow-600' : 'text-gray-900'}`}>
                      {item.stock}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingItem?.id === item.id ? (
                      <StockAdjustForm
                        item={item}
                        editingItem={editingItem}
                        onSave={(quantity, type) => handleAdjustStock(item.id, quantity, type)}
                        onCancel={() => setEditingItem(null)}
                        adjusting={adjusting}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingItem({ id: item.id, stock: item.stock, type: 'IN' })}
                          className="text-green-600 hover:text-green-900"
                        >
                          Nhập
                        </button>
                        <button
                          onClick={() => setEditingItem({ id: item.id, stock: item.stock, type: 'OUT' })}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Xuất
                        </button>
                        <button
                          onClick={() => setEditingItem({ id: item.id, stock: item.stock, type: 'ADJUST' })}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Điều chỉnh
                        </button>
                      </div>
                    )}
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

interface StockAdjustFormProps {
  item: MenuItem;
  editingItem: { id: number; stock: number; type: 'IN' | 'OUT' | 'ADJUST' };
  onSave: (quantity: number, type: 'IN' | 'OUT' | 'ADJUST') => void;
  onCancel: () => void;
  adjusting: boolean;
}

const StockAdjustForm: React.FC<StockAdjustFormProps> = ({ item, editingItem, onSave, onCancel, adjusting }) => {
  const [quantity, setQuantity] = useState(editingItem.type === 'ADJUST' ? editingItem.stock : 0);
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 0) {
      showToast('Số lượng không hợp lệ', 'error');
      return;
    }
    onSave(quantity, editingItem.type);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <input
        type="number"
        min="0"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
        placeholder={editingItem.type === 'ADJUST' ? 'Số mới' : 'Số lượng'}
        required
      />
      <button
        type="submit"
        disabled={adjusting}
        className="px-3 py-1 bg-grabGreen-600 text-white rounded text-sm hover:bg-grabGreen-700 disabled:opacity-50"
      >
        {adjusting ? '...' : 'OK'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
      >
        Hủy
      </button>
    </form>
  );
};

