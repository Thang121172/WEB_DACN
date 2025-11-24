import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/http';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../components/Toast';

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
}

interface Restaurant {
  id: number;
  name: string;
  description?: string;
  address?: string;
  image_url?: string;
  rating?: number;
  is_open?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export default function RestaurantDetail() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const { showToast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRestaurantData = async () => {
      setLoading(true);
      try {
        // Fetch restaurant info
        const restaurantResponse = await api.get(`/menus/merchants/${restaurantId}/`);
        setRestaurant(restaurantResponse.data);

        // Fetch menu items
        const menuResponse = await api.get('/menus/', {
          params: { merchant_id: restaurantId },
        });
        setMenuItems(menuResponse.data || []);
      } catch (error) {
        console.error('Failed to fetch restaurant data:', error);
        showToast('Không thể tải thông tin cửa hàng. Vui lòng thử lại.', 'error');
        setTimeout(() => navigate('/'), 2000);
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchRestaurantData();
    }
  }, [restaurantId, navigate]);

  const handleAddToCart = (item: MenuItem) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!', 'warning');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    // Get existing cart from localStorage
    const existingCart = localStorage.getItem('cart');
    const cart = existingCart ? JSON.parse(existingCart) : [];

    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex((cartItem: any) => cartItem.id === item.id);
    
    if (existingItemIndex >= 0) {
      // Increase quantity
      cart[existingItemIndex].quantity += 1;
    } else {
      // Add new item
      cart.push({
        id: item.id,
        product_name: item.name,
        store_name: restaurant?.name || 'Unknown',
        price: item.price,
        quantity: 1,
        image_url: item.image_url || 'https://via.placeholder.com/200?text=Food',
      });
    }

    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    showToast(`Đã thêm "${item.name}" vào giỏ hàng!`, 'success');
  };

  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Đang tải thông tin cửa hàng...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-lg font-medium text-gray-700">
          Không tìm thấy cửa hàng.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <Link to="/customer" className="text-grabGreen-700 hover:text-grabGreen-800 font-medium mb-4 inline-block">
        &larr; Quay lại
      </Link>

      {/* Restaurant Header */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 border border-gray-100">
        <img
          src={restaurant.image_url || 'https://via.placeholder.com/800x300?text=Restaurant'}
          alt={restaurant.name}
          className="w-full h-64 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://via.placeholder.com/800x300?text=Restaurant';
          }}
        />
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-800">{restaurant.name}</h1>
            {restaurant.is_open !== undefined && (
              <span
                className={`px-4 py-2 text-sm font-semibold rounded-full ${
                  restaurant.is_open
                    ? 'bg-grabGreen-100 text-grabGreen-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {restaurant.is_open ? 'Mở cửa' : 'Đóng cửa'}
              </span>
            )}
          </div>
          {restaurant.description && (
            <p className="text-gray-600 mb-2">{restaurant.description}</p>
          )}
          {restaurant.address && (
            <p className="text-sm text-gray-500 mb-2">📍 {restaurant.address}</p>
          )}
          {restaurant.rating && (
            <div className="flex items-center text-yellow-500">
              <span className="text-lg font-semibold">⭐ {restaurant.rating}</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm món ăn..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-xl shadow-inner focus:ring-grabGreen-500 focus:border-grabGreen-500 transition duration-150"
        />
      </div>

      {/* Menu Items */}
      <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b pb-2 border-gray-200">
        Thực đơn ({filteredMenuItems.length})
      </h2>
      {filteredMenuItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden transition duration-300 hover:shadow-xl border ${
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
                <h3 className="text-lg font-bold text-gray-800 mb-1 truncate">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-gray-600 h-10 overflow-hidden mb-3">
                    {item.description}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xl font-extrabold text-red-500">
                    {formatCurrency(item.price)}
                  </span>
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.is_available}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition shadow-md ${
                      item.is_available
                        ? 'bg-grabGreen-700 text-white hover:bg-grabGreen-800'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={!item.is_available ? 'Món này hiện không có sẵn' : ''}
                  >
                    {item.is_available ? 'Thêm vào giỏ' : 'Hết hàng'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 text-center bg-white rounded-xl shadow-lg text-gray-500">
          Không tìm thấy món ăn nào.
        </div>
      )}
    </div>
  );
}

