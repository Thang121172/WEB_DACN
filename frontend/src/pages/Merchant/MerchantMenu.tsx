import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import api from '../../services/http';

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export default function MerchantMenu() {
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!authLoading && isAuthenticated && user?.role !== 'merchant' && user?.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchMenuItems = async () => {
      setLoading(true);
      try {
        const response = await api.get('/menus/');
        // Filter items for current merchant (if API doesn't filter by default)
        setMenuItems(response.data || []);
      } catch (error) {
        console.error('Failed to fetch menu items:', error);
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && (user?.role === 'merchant' || user?.role === 'admin')) {
      fetchMenuItems();
    }
  }, [isAuthenticated, authLoading, user, navigate]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('price', formData.price);
      formDataToSend.append('is_available', formData.is_available.toString());
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      } else if (formData.image_url) {
        formDataToSend.append('image_url', formData.image_url);
      }

      const response = await api.post('/menus/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMenuItems([...menuItems, response.data]);
      setFormData({ name: '', description: '', price: '', image_url: '', is_available: true });
      setImageFile(null);
      setImagePreview(null);
      setShowAddForm(false);
      showToast('Thêm món thành công!', 'success');
    } catch (error) {
      console.error('Failed to add menu item:', error);
      showToast('Không thể thêm món. Vui lòng thử lại.', 'error');
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('price', formData.price);
      formDataToSend.append('is_available', formData.is_available.toString());
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      } else if (formData.image_url) {
        formDataToSend.append('image_url', formData.image_url);
      }

      const response = await api.put(`/menus/${editingItem.id}/`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMenuItems(menuItems.map(item => item.id === editingItem.id ? response.data : item));
      setEditingItem(null);
      setFormData({ name: '', description: '', price: '', image_url: '', is_available: true });
      setImageFile(null);
      setImagePreview(null);
      showToast('Cập nhật món thành công!', 'success');
    } catch (error) {
      console.error('Failed to update menu item:', error);
      showToast('Không thể cập nhật món. Vui lòng thử lại.', 'error');
    }
  };

  const handleDeleteItem = async (id: number) => {
    const itemName = menuItems.find(item => item.id === id)?.name || 'món này';
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${itemName}"?`)) return;

    try {
      await api.delete(`/menus/${id}/`);
      setMenuItems(menuItems.filter(item => item.id !== id));
      showToast('Xóa món thành công!', 'success');
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      showToast('Không thể xóa món. Vui lòng thử lại.', 'error');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      // Chỉ gửi field is_available để tránh conflict với các field khác
      const response = await api.patch(`/menus/${item.id}/`, {
        is_available: !item.is_available,
      });
      setMenuItems(menuItems.map(i => i.id === item.id ? response.data : i));
      showToast(`Đã ${!item.is_available ? 'kích hoạt' : 'tắt'} món "${item.name}"`, 'success');
    } catch (error: any) {
      console.error('Failed to toggle availability:', error);
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.message || 
                          'Không thể thay đổi trạng thái. Vui lòng thử lại.';
      showToast(errorMessage, 'error');
    }
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image_url: item.image_url || '',
      is_available: item.is_available,
    });
    setImageFile(null);
    setImagePreview(item.image_url || null);
    setShowAddForm(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Đang tải menu...</div>
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Quản lý Món ăn</h1>
          <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingItem(null);
                setFormData({ name: '', description: '', price: '', image_url: '', is_available: true });
                setImageFile(null);
                setImagePreview(null);
              }}
            className="px-6 py-3 bg-grabGreen-700 text-white rounded-lg font-semibold hover:bg-grabGreen-800 transition"
          >
            {showAddForm ? 'Hủy' : '+ Thêm món mới'}
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingItem) && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {editingItem ? 'Chỉnh sửa món' : 'Thêm món mới'}
          </h2>
          <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên món *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-grabGreen-500 focus:border-grabGreen-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-grabGreen-500 focus:border-grabGreen-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VND) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-grabGreen-500 focus:border-grabGreen-500"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh món ăn</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-grabGreen-500 focus:border-grabGreen-500"
              />
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Hoặc nhập URL ảnh (nếu không upload file)</p>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => {
                  setFormData({ ...formData, image_url: e.target.value });
                  if (e.target.value) {
                    setImagePreview(e.target.value);
                    setImageFile(null);
                  }
                }}
                placeholder="https://example.com/image.jpg"
                className="w-full p-2 mt-2 border border-gray-300 rounded-lg focus:ring-grabGreen-500 focus:border-grabGreen-500 text-sm"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                className="w-4 h-4 text-grabGreen-600 border-gray-300 rounded focus:ring-grabGreen-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Có sẵn</label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-3 bg-grabGreen-700 text-white rounded-lg font-semibold hover:bg-grabGreen-800 transition"
              >
                {editingItem ? 'Cập nhật' : 'Thêm món'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                  setFormData({ name: '', description: '', price: '', image_url: '', is_available: true });
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Menu Items List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-xl shadow-lg overflow-hidden border ${
              item.is_available ? 'border-gray-100' : 'border-gray-300 opacity-60'
            }`}
          >
            <img
              src={item.image_url || 'https://via.placeholder.com/200?text=Food'}
              alt={item.name}
              className="w-full h-40 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://via.placeholder.com/200?text=Food';
              }}
            />
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-gray-600 h-10 overflow-hidden mb-2">
                  {item.description}
                </p>
              )}
              <p className="text-xl font-extrabold text-red-500 mb-4">
                {formatCurrency(item.price)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(item)}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    item.is_available
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {item.is_available ? 'Ẩn' : 'Hiện'}
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {menuItems.length === 0 && (
        <div className="text-center p-10 bg-white rounded-xl shadow-lg text-gray-500">
          Chưa có món nào. Hãy thêm món đầu tiên!
        </div>
      )}
    </div>
  );
}

