import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/http';
import { useLocation } from '../hooks/useLocation';

interface Restaurant {
  id: number;
  name: string;
  description?: string;
  address?: string;
  image_url?: string;
  rating?: number;
  distance_km?: number;
  is_open?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export default function StoreDiscovery() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { location } = useLocation();

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        let response;
        
        // Nếu có vị trí, tìm cửa hàng gần đó
        if (location) {
          try {
            response = await api.get('/menus/merchants/nearby/', {
              params: {
                lat: location.latitude,
                lng: location.longitude,
                radius: 10, // 10km
              },
            });
            // API nearby trả về {merchants: [...], count: ...}
            if (response.data && response.data.merchants) {
              setRestaurants(response.data.merchants);
              console.log(`✅ Tìm thấy ${response.data.merchants.length} cửa hàng gần bạn trong phạm vi 10km`);
            } else {
              // KHÔNG fallback - chỉ hiển thị cửa hàng trong phạm vi
              console.warn('⚠️ Không tìm thấy cửa hàng gần đó trong phạm vi 10km');
              setRestaurants([]);
            }
          } catch (error) {
            console.error('Failed to fetch nearby merchants:', error);
            // KHÔNG fallback - chỉ hiển thị khi có vị trí và API thành công
            setRestaurants([]);
          }
        } else {
          // Nếu chưa có vị trí, KHÔNG lấy merchants (yêu cầu vị trí)
          console.log('⚠️ Chưa có vị trí, không hiển thị cửa hàng');
          setRestaurants([]);
        }
      } catch (error) {
        console.error('Failed to fetch restaurants:', error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [location]);

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Khám phá Cửa hàng</h1>
      <p className="text-lg text-gray-600 mb-8">Tìm kiếm cửa hàng yêu thích của bạn</p>

      {/* Search Bar */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Tìm kiếm cửa hàng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-xl shadow-inner focus:ring-grabGreen-500 focus:border-grabGreen-500 transition duration-150"
        />
      </div>

      {loading ? (
        <div className="text-center p-10">Đang tải cửa hàng...</div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b pb-2 border-gray-200">
            {searchTerm
              ? `Kết quả tìm kiếm (${filteredRestaurants.length})`
              : `Tất cả cửa hàng (${filteredRestaurants.length})`}
          </h2>
          {filteredRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRestaurants.map((restaurant) => (
                <Link
                  key={restaurant.id}
                  to={`/restaurant/${restaurant.id}`}
                  className="bg-white rounded-xl shadow-lg overflow-hidden transition duration-300 hover:shadow-xl border border-gray-100"
                >
                  <img
                    src={restaurant.image_url || 'https://via.placeholder.com/300?text=Restaurant'}
                    alt={restaurant.name}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://via.placeholder.com/300?text=Restaurant';
                    }}
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-800 truncate">
                        {restaurant.name}
                      </h3>
                      {restaurant.is_open !== undefined && (
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
                      <p className="text-sm text-gray-600 h-10 overflow-hidden mb-2">
                        {restaurant.description}
                      </p>
                    )}
                    {restaurant.address && (
                      <p className="text-xs text-gray-500 mb-2 truncate">
                        📍 {restaurant.address}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {restaurant.rating && (
                        <div className="flex items-center text-yellow-500">
                          <span className="text-sm font-semibold">⭐ {restaurant.rating}</span>
                        </div>
                      )}
                      {restaurant.distance_km !== undefined && (
                        <div className="text-xs text-grabGreen-700 font-medium">
                          {restaurant.distance_km.toFixed(1)} km
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-white rounded-xl shadow-lg text-gray-500">
              Không tìm thấy cửa hàng nào phù hợp.
            </div>
          )}
        </>
      )}
    </div>
  );
}

