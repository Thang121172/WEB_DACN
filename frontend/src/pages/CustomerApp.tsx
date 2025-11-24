import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/http';
import { useAuthContext } from '../context/AuthContext';
import LocationPermission from '../components/LocationPermission';
import { useLocation } from '../hooks/useLocation';
import { useToast } from '../components/Toast'; 

// ===================================
// INTERFACES (Mock)
// ===================================

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    image_url: string;
    merchant_name: string;
    merchant_id?: number; // ID của merchant
    distance_km?: number; // Khoảng cách từ vị trí khách hàng (km)
}

// API Response type từ backend
interface MenuItemResponse {
    id: number;
    name: string;
    description: string | null;
    price: string;
    image_url: string | null;
    merchant_name: string;
    is_available: boolean;
}


// ===================================
// UTILITY FUNCTIONS
// ===================================
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};


// ===================================
// PRODUCT CARD COMPONENT
// ===================================
const ProductCard: React.FC<{ product: Product; isAuthenticated: boolean }> = ({ product, isAuthenticated }) => {
    const { showToast } = useToast()
    
    const handleAddToCart = () => {
        if (!isAuthenticated) {
            showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!', 'warning');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
            return;
        }

        // Get existing cart from localStorage
        const existingCart = localStorage.getItem('cart');
        const cart = existingCart ? JSON.parse(existingCart) : [];

        // Check if item already exists in cart
        const existingItemIndex = cart.findIndex((cartItem: any) => cartItem.id === product.id);
        
        if (existingItemIndex >= 0) {
            // Increase quantity
            cart[existingItemIndex].quantity += 1;
        } else {
            // Add new item
            cart.push({
                id: product.id,
                product_name: product.name,
                store_name: product.merchant_name || 'Unknown',
                merchant_id: product.merchant_id, // Lưu merchant_id
                price: product.price,
                quantity: 1,
                image_url: product.image_url || 'https://via.placeholder.com/200?text=Food',
            });
        }

        // Save to localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        console.log('✅ Đã lưu vào localStorage:', cart);
        
        // Trigger custom event để các component khác có thể listen
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
        
        showToast(`Đã thêm "${product.name}" vào giỏ hàng!`, 'success');
        console.log(`✅ Added ${product.name} to cart`);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transition duration-300 hover:shadow-xl border border-gray-100">
            <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover" />
            <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-gray-500 truncate">{product.merchant_name}</div>
                    {product.distance_km !== undefined && (
                        <div className="flex items-center space-x-1 text-xs text-grabGreen-700 font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{product.distance_km.toFixed(1)} km</span>
                        </div>
                    )}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1 truncate">{product.name}</h3>
                <p className="text-sm text-gray-600 h-10 overflow-hidden mb-3">{product.description}</p>
                <div className="flex justify-between items-center mt-3">
                    <span className="text-xl font-extrabold text-red-500">{formatCurrency(product.price)}</span>
                    <button 
                        className={`px-4 py-2 text-sm font-medium rounded-full transition shadow-md ${
                            isAuthenticated 
                                ? 'bg-grabGreen-700 text-white hover:bg-grabGreen-800' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        onClick={handleAddToCart}
                        disabled={!isAuthenticated}
                        title={!isAuthenticated ? 'Vui lòng đăng nhập để thêm vào giỏ hàng' : ''}
                    >
                        {isAuthenticated ? 'Thêm vào giỏ' : 'Đăng nhập để mua'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===================================
// MAIN COMPONENT
// ===================================

export default function CustomerApp() {
    const { user, isAuthenticated } = useAuthContext();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { location, permissionStatus } = useLocation();
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);

    useEffect(() => {
        // Chỉ fetch products nếu đã đăng nhập
        if (!isAuthenticated) {
            setLoading(false);
            setProducts([]);
            return;
        }

        const fetchProducts = async () => {
            try {
                let menuItems: MenuItemResponse[] = [];
                
                // Nếu có vị trí, lấy menu items gần đó (trong phạm vi 10km)
                if (location) {
                    try {
                        console.log(`📍 Đang tìm menu items gần vị trí: ${location.latitude}, ${location.longitude}`);
                        console.log(`📏 Bán kính tìm kiếm: 20km`);
                        
                        const nearbyResponse = await api.get('/menus/nearby/', {
                            params: {
                                lat: location.latitude,
                                lng: location.longitude,
                                radius: 20 // 20km để chỉ hiển thị các cửa hàng gần
                            }
                        });
                        
                        console.log('📦 API nearby response:', nearbyResponse.data);
                        
                        if (nearbyResponse.data && nearbyResponse.data.items) {
                            menuItems = nearbyResponse.data.items;
                            console.log(`✅ Tìm thấy ${menuItems.length} món ăn gần bạn trong phạm vi 20km`);
                            
                            // Log các merchant và khoảng cách
                            const merchants = new Set<string>();
                            menuItems.forEach((item: any) => {
                                if (item.merchant_name && item.distance_km !== undefined) {
                                    merchants.add(`${item.merchant_name} (${item.distance_km.toFixed(2)}km)`);
                                }
                            });
                            console.log(`🏪 Các cửa hàng:`, Array.from(merchants));
                            
                            // KHÔNG fallback - chỉ hiển thị các món trong phạm vi
                            if (menuItems.length === 0) {
                                console.warn('⚠️ Không có món ăn nào trong phạm vi 20km');
                            }
                        } else {
                            console.warn('⚠️ API nearby không trả về items');
                            menuItems = [];
                        }
                    } catch (nearbyError: any) {
                        console.error("❌ Lỗi khi gọi API nearby:", nearbyError);
                        console.error("Chi tiết lỗi:", nearbyError?.response?.data || nearbyError.message);
                        // KHÔNG fallback - chỉ hiển thị khi có vị trí và API thành công
                        menuItems = [];
                    }
                } else {
                    // Nếu chưa có vị trí, KHÔNG lấy menu items (yêu cầu vị trí)
                    console.log('⚠️ Chưa có vị trí, không hiển thị menu items');
                    menuItems = [];
                }
                
                // Transform data từ API sang format Product
                const products: Product[] = (menuItems as MenuItemResponse[])
                    .filter((item) => item.is_available !== false) // Chỉ lấy items available
                    .map((item) => ({
                        id: item.id,
                        name: item.name,
                        description: item.description || '',
                        price: parseFloat(item.price),
                        image_url: item.image_url || 'https://via.placeholder.com/200?text=No+Image',
                        merchant_name: item.merchant_name || 'Unknown',
                        merchant_id: (item as any).merchant_id, // ID của merchant
                        distance_km: (item as any).distance_km, // Khoảng cách nếu có
                    }))
                    .sort((a, b) => {
                        // Sắp xếp theo khoảng cách (gần nhất trước)
                        const distA = a.distance_km || Infinity;
                        const distB = b.distance_km || Infinity;
                        return distA - distB;
                    });
                
                setProducts(products);
                setLoading(false);
            } catch (e) {
                console.error("Failed to fetch products:", e);
                setProducts([]); // Trả về mảng rỗng thay vì mock data
                setLoading(false);
            }
        };
        fetchProducts();
    }, [isAuthenticated, location]);

    // Chỉ hiển thị prompt yêu cầu vị trí nếu đã đăng nhập
    useEffect(() => {
        if (!isAuthenticated) {
            setShowLocationPrompt(false);
            return;
        }

        // Luôn hiển thị LocationPermission nếu đã đăng nhập
        // Để user có thể xem/sửa vị trí hoặc cấp quyền nếu chưa có
        if (isAuthenticated) {
            const timer = setTimeout(() => {
                setShowLocationPrompt(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [location, permissionStatus, isAuthenticated]);

    // Lọc sản phẩm theo từ khóa tìm kiếm
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.merchant_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Xin chào{user?.name ? `, ${user.name}` : ''}!</h1>
                    <p className="text-lg text-gray-600">Bạn muốn ăn gì hôm nay?</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/stores"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        🔍 Khám phá cửa hàng
                    </Link>
                    <Link
                        to="/customer/orders"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        📦 Đơn hàng của tôi
                    </Link>
                </div>
            </div>
            
            {/* Location Permission Prompt - Hiển thị form yêu cầu hoặc thông tin vị trí */}
            {showLocationPrompt && (
                <div className="mb-6">
                    {location && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>📍 Vị trí hiện tại:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                {location.accuracy && (
                                    <span className="ml-2">(Độ chính xác: {location.accuracy.toFixed(0)}m)</span>
                                )}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                Đang tìm cửa hàng trong phạm vi 20km từ vị trí này
                            </p>
                        </div>
                    )}
                    <LocationPermission
                        onLocationGranted={(loc) => {
                            console.log('Location granted:', loc);
                            // Không ẩn component, để nó tự hiển thị địa chỉ
                        }}
                    />
                </div>
            )}
            
            {/* Search Bar */}
            <div className="mb-8">
                <input
                    type="text"
                    placeholder="Tìm kiếm món ăn, nhà hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-xl shadow-inner focus:ring-grabGreen-500 focus:border-grabGreen-500 transition duration-150"
                />
            </div>

            {loading ? (
                <div className="text-center p-10">Đang tải menu...</div>
            ) : (
                <>
                    <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b pb-2 border-gray-200">
                        {searchTerm 
                            ? `Kết quả tìm kiếm (${filteredProducts.length})` 
                            : 'Món ăn Nổi bật'}
                    </h2>
                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product} 
                                    isAuthenticated={isAuthenticated}
                                />
                            ))}
                        </div>
                    ) : (
                         <div className="p-10 text-center bg-white rounded-xl shadow-lg text-gray-500">
                            {searchTerm ? (
                                <>Không tìm thấy món ăn nào phù hợp với từ khóa "{searchTerm}".</>
                            ) : location ? (
                                <>
                                    <p className="text-lg font-semibold mb-2">Không có cửa hàng nào trong phạm vi 20km</p>
                                    <p className="text-sm">Vị trí hiện tại: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
                                    <p className="text-sm mt-2">Vui lòng thử làm mới vị trí GPS hoặc mở rộng phạm vi tìm kiếm.</p>
                                </>
                            ) : (
                                <>Vui lòng cấp quyền vị trí để xem các cửa hàng gần bạn.</>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}