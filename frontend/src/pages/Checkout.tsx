import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../services/http';

interface CartItem {
  id: number;
  product_name: string;
  store_name: string;
  price: number;
  quantity: number;
  image_url: string;
}

interface CheckoutData {
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  delivery_address: string;
  payment_method: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const DELIVERY_FEE = 35000;
const DISCOUNT_THRESHOLD = 200000;
const DISCOUNT_AMOUNT = 10000;

export default function Checkout() {
  const { isAuthenticated, user } = useAuthContext();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Get cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const cart = JSON.parse(savedCart);
      setCartItems(cart);
      
      // Validate cart items khi tải trang (không chặn, chỉ cảnh báo)
      const validateCartItems = async () => {
        const invalidItems: string[] = [];
        const validCartItems: CartItem[] = [];
        
        for (const item of cart) {
          try {
            const menuItemResponse = await api.get(`/menus/${item.id}/`);
            
            if (!menuItemResponse.data || !menuItemResponse.data.is_available) {
              invalidItems.push(item.product_name || `Menu item ${item.id}`);
              continue;
            }
            
            // Kiểm tra tồn kho
            const stock = menuItemResponse.data.stock || 0;
            if (stock < item.quantity) {
              invalidItems.push(item.product_name || `Menu item ${item.id}`);
              continue;
            }
            
            validCartItems.push(item);
          } catch (err: any) {
            if (err?.response?.status === 404) {
              invalidItems.push(item.product_name || `Menu item ${item.id}`);
            }
          }
        }
        
        // Nếu có items không hợp lệ, cảnh báo và cập nhật cart
        if (invalidItems.length > 0) {
          showToast(
            `Có ${invalidItems.length} món không còn khả dụng. Đã tự động xóa khỏi giỏ hàng.`,
            'warning'
          );
          
          if (validCartItems.length > 0) {
            localStorage.setItem('cart', JSON.stringify(validCartItems));
            setCartItems(validCartItems);
          } else {
            localStorage.removeItem('cart');
            setCartItems([]);
            setTimeout(() => navigate('/cart'), 2000);
          }
        }
      };
      
      // Chạy validation trong background (không chặn UI)
      validateCartItems();
    } else {
      navigate('/cart');
    }

    // Get user's default address from profile
    const fetchProfile = async () => {
      try {
        const response = await api.get('/accounts/me/');
        if (response.data?.default_address) {
          setDeliveryAddress(response.data.default_address);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        // Không hiển thị lỗi, chỉ để trống địa chỉ
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [isAuthenticated, user, navigate, showToast]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? DELIVERY_FEE : 0;
  const discount = subtotal > DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
  const total = subtotal + deliveryFee - discount;

  const handlePlaceOrder = async () => {
    // Prevent multiple clicks
    if (loading) {
      return;
    }

    if (!deliveryAddress.trim()) {
      showToast('Vui lòng nhập địa chỉ giao hàng!', 'warning');
      return;
    }

    if (cartItems.length === 0) {
      showToast('Giỏ hàng trống!', 'warning');
      navigate('/cart');
      return;
    }

    setLoading(true);
    try {
      // Lấy merchant_id từ cart items
      // Nếu không có, lấy từ menu_item đầu tiên
      let merchantId = cartItems[0]?.merchant_id;
      
      // Validate menu items trước khi checkout
      const invalidItems: string[] = [];
      const validCartItems: CartItem[] = [];
      
      for (const item of cartItems) {
        try {
          // Kiểm tra menu item có tồn tại không
          const menuItemResponse = await api.get(`/menus/${item.id}/`);
          
          if (!menuItemResponse.data) {
            invalidItems.push(item.product_name || `Menu item ${item.id}`);
            continue;
          }
          
          // Lấy merchant_id nếu chưa có
          if (!merchantId && menuItemResponse.data.merchant_id) {
            merchantId = menuItemResponse.data.merchant_id;
          }
          
          // Kiểm tra menu item có thuộc về merchant không
          if (merchantId && menuItemResponse.data.merchant_id !== merchantId) {
            invalidItems.push(`${item.product_name} (không thuộc cửa hàng này)`);
            continue;
          }
          
          // Kiểm tra menu item còn available không
          if (!menuItemResponse.data.is_available) {
            invalidItems.push(`${item.product_name} (không còn bán)`);
            continue;
          }
          
          // Kiểm tra tồn kho
          const stock = menuItemResponse.data.stock || 0;
          if (stock < item.quantity) {
            if (stock <= 0) {
              invalidItems.push(`${item.product_name} (hết hàng)`);
            } else {
              invalidItems.push(`${item.product_name} (chỉ còn ${stock} phần, bạn đặt ${item.quantity} phần)`);
            }
            continue;
          }
          
          validCartItems.push(item);
        } catch (err: any) {
          // Menu item không tồn tại
          if (err?.response?.status === 404) {
            invalidItems.push(item.product_name || `Menu item ${item.id}`);
          } else {
            console.error(`❌ Lỗi khi kiểm tra menu item ${item.id}:`, err);
            invalidItems.push(item.product_name || `Menu item ${item.id} (lỗi kiểm tra)`);
          }
        }
      }
      
      // Nếu có menu items không hợp lệ, hiển thị lỗi và cập nhật cart
      if (invalidItems.length > 0) {
        const errorMsg = `Các món sau không thể đặt hàng:\n${invalidItems.join('\n')}\n\nVui lòng xóa các món này khỏi giỏ hàng.`;
        showToast(errorMsg, 'error');
        
        // Cập nhật cart, chỉ giữ lại các items hợp lệ
        if (validCartItems.length > 0) {
          localStorage.setItem('cart', JSON.stringify(validCartItems));
          setCartItems(validCartItems);
        } else {
          // Nếu không còn item nào hợp lệ, xóa cart
          localStorage.removeItem('cart');
          setCartItems([]);
          setTimeout(() => navigate('/cart'), 2000);
        }
        
        setLoading(false);
        return;
      }
      
      if (!merchantId) {
        showToast('Không thể xác định cửa hàng. Vui lòng xóa giỏ hàng và thêm lại sản phẩm.', 'error');
        setLoading(false);
        return;
      }

      // Prepare order data với các items hợp lệ
      const orderData = {
        merchant_id: merchantId,
        items: validCartItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
        })),
        delivery_address: deliveryAddress,
        payment_method: paymentMethod,
      };

      console.log('📦 Đang tạo đơn hàng...', orderData);

      // Create order với các items hợp lệ
      const response = await api.post('/orders/', orderData);
      
      console.log('✅ Đơn hàng đã được tạo:', response.data);
      
      // Clear cart
      localStorage.removeItem('cart');
      setCartItems([]);
      
      // Trigger cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: [] }));
      
      // Show success message
      showToast('Đặt hàng thành công!', 'success');
      
      // Redirect to orders page after a short delay
      setTimeout(() => {
        navigate('/customer/orders', {
          state: { message: 'Đặt hàng thành công!' },
        });
      }, 1500);
    } catch (error: any) {
      console.error('❌ Failed to place order:', error);
      
      // Xử lý lỗi cụ thể từ backend
      let errorMessage = 'Không thể đặt hàng. Vui lòng thử lại.';
      
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
        
        // Nếu lỗi là menu item không tồn tại, xóa item đó khỏi cart
        if (errorMessage.includes('Menu item') && errorMessage.includes('không tồn tại')) {
          const match = errorMessage.match(/Menu item (\d+)/);
          if (match) {
            const invalidItemId = parseInt(match[1]);
            const updatedCart = cartItems.filter(item => item.id !== invalidItemId);
            localStorage.setItem('cart', JSON.stringify(updatedCart));
            setCartItems(updatedCart);
            errorMessage += '\n\nĐã tự động xóa món này khỏi giỏ hàng. Vui lòng thử lại.';
          }
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Giỏ hàng trống</h1>
        <p className="text-lg text-gray-600 mb-6">Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán.</p>
        <Link
          to="/customer"
          className="px-8 py-3 text-lg text-white bg-grabGreen-700 rounded-full font-semibold hover:bg-grabGreen-800 transition duration-150 shadow-lg"
        >
          Mua sắm ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">Thanh toán</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Order Details & Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Địa chỉ giao hàng</h2>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Nhập địa chỉ giao hàng..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-grabGreen-500 focus:border-grabGreen-500"
              rows={4}
              required
            />
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Phương thức thanh toán</h2>
            <div className="space-y-3">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-4 h-4 text-grabGreen-600 border-gray-300 focus:ring-grabGreen-500"
                />
                <span className="ml-3 font-medium text-gray-700">💵 Thanh toán khi nhận hàng (COD)</span>
              </label>
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-4 h-4 text-grabGreen-600 border-gray-300 focus:ring-grabGreen-500"
                />
                <span className="ml-3 font-medium text-gray-700">💳 Thẻ tín dụng/Ghi nợ</span>
              </label>
            </div>
            {paymentMethod === 'card' && (
              <Link
                to="/payment/card"
                className="mt-3 inline-block text-grabGreen-700 hover:text-grabGreen-800 font-medium text-sm"
              >
                Thêm thẻ thanh toán →
              </Link>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Chi tiết đơn hàng</h2>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'https://placehold.co/100x100/E5E7EB/6B7280?text=Food';
                      }}
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-500">Từ: {item.store_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                    <p className="font-bold text-grabGreen-700">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-2xl p-6 border-t-4 border-grabGreen-700 sticky top-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">Tóm tắt đơn hàng</h2>
            <div className="space-y-3 text-gray-700 mb-4">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phí giao hàng:</span>
                <span className="font-medium text-red-600">{formatCurrency(deliveryFee)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span>Giảm giá:</span>
                  <span className="font-medium text-grabGreen-700">- {formatCurrency(discount)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-4 border-t mb-6">
              <span className="text-xl font-bold text-gray-900">Thành tiền:</span>
              <span className="text-2xl font-extrabold text-red-600">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={loading || !deliveryAddress.trim()}
              className={`w-full py-3 text-lg text-white rounded-full font-semibold transition duration-150 shadow-lg ${
                loading || !deliveryAddress.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-grabGreen-700 hover:bg-grabGreen-800'
              }`}
            >
              {loading ? 'Đang xử lý...' : 'Đặt hàng'}
            </button>
            <Link
              to="/cart"
              className="block mt-3 text-center text-sm text-grabGreen-700 hover:text-grabGreen-800 font-medium"
            >
              ← Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

