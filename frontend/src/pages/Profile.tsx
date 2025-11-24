import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../services/http';

export default function Profile() {
  const { user, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    default_address: '',
  });

  useEffect(() => {
    // Kiểm tra token trước khi check isAuthenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('[Profile] No token in localStorage, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (!isAuthenticated) {
      console.warn('[Profile] Not authenticated, but token exists. Waiting for auth check...');
      // Đợi một chút để AuthContext có thể load user
      const timer = setTimeout(() => {
        if (!isAuthenticated) {
          navigate('/login');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        // Kiểm tra token trước khi gọi API
        const token = localStorage.getItem('authToken');
        console.log('[Profile] Checking token:', token ? token.substring(0, 20) + '...' : 'NOT FOUND');
        console.log('[Profile] User from context:', user);
        console.log('[Profile] Is authenticated:', isAuthenticated);
        
        if (!token) {
          console.warn('[Profile] No token found, redirecting to login');
          showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
          navigate('/login');
          return;
        }
        
        console.log('[Profile] Fetching profile with token:', token.substring(0, 20) + '...');
        const response = await api.get('/accounts/me/');
        const data = response.data;
        console.log('[Profile] Profile data received:', data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          default_address: data.default_address || '',
        });
      } catch (error: any) {
        console.error('Failed to fetch profile:', error);
        console.error('Error response:', error?.response?.data);
        console.error('Error status:', error?.response?.status);
        
        // Nếu lỗi 401, redirect về login
        if (error?.response?.status === 401) {
          showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
          navigate('/login');
          return;
        }
        
        showToast('Không thể tải thông tin hồ sơ', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, navigate, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.patch('/accounts/profile/', formData);
      showToast('Đã cập nhật thông tin hồ sơ thành công!', 'success');
      setIsEditing(false); // Khóa form sau khi lưu thành công
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.message ||
                          'Không thể cập nhật thông tin. Vui lòng thử lại.';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Đang tải thông tin...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Hồ sơ của tôi</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin cá nhân và địa chỉ giao hàng</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Nhập họ và tên đầy đủ"
              disabled={!isEditing}
              className={`w-full p-3 border border-gray-300 rounded-lg ${
                isEditing 
                  ? 'focus:ring-grabGreen-500 focus:border-grabGreen-500' 
                  : 'bg-gray-50 text-gray-500 cursor-not-allowed'
              }`}
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
              disabled={!isEditing}
              className={`w-full p-3 border border-gray-300 rounded-lg ${
                isEditing 
                  ? 'focus:ring-grabGreen-500 focus:border-grabGreen-500' 
                  : 'bg-gray-50 text-gray-500 cursor-not-allowed'
              }`}
              required
            />
          </div>

          {/* Default Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Địa chỉ giao hàng mặc định <span className="text-red-500">*</span>
            </label>
            <textarea
              name="default_address"
              value={formData.default_address}
              onChange={handleChange}
              placeholder="Nhập địa chỉ giao hàng (số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố)"
              rows={4}
              disabled={!isEditing}
              className={`w-full p-3 border border-gray-300 rounded-lg ${
                isEditing 
                  ? 'focus:ring-grabGreen-500 focus:border-grabGreen-500' 
                  : 'bg-gray-50 text-gray-500 cursor-not-allowed'
              }`}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Địa chỉ này sẽ được tự động điền khi bạn đặt hàng
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            {isEditing ? (
              <>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition duration-150 ${
                    saving
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-grabGreen-700 text-white hover:bg-grabGreen-800'
                  }`}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    // Reload form data to cancel changes
                    const fetchProfile = async () => {
                      try {
                        const response = await api.get('/accounts/me/');
                        const data = response.data;
                        setFormData({
                          full_name: data.full_name || '',
                          phone: data.phone || '',
                          default_address: data.default_address || '',
                        });
                      } catch (error) {
                        console.error('Failed to fetch profile:', error);
                      }
                    };
                    fetchProfile();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition duration-150"
                >
                  Hủy
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 py-3 px-6 bg-grabGreen-700 text-white rounded-lg font-semibold hover:bg-grabGreen-800 transition duration-150"
              >
                Chỉnh sửa
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
