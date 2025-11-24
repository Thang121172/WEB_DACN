import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/http';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../components/Toast';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  status: string;
  items: OrderItem[];
  merchant: { id: number; name: string };
  shipper: { id: number; username: string } | null;
}

export default function ReviewOrder() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthContext();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Review form state
  const [orderRating, setOrderRating] = useState(5);
  const [merchantRating, setMerchantRating] = useState(5);
  const [shipperRating, setShipperRating] = useState(5);
  const [comment, setComment] = useState('');
  const [menuItemRatings, setMenuItemRatings] = useState<Record<number, { rating: number; comment: string }>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/orders/${orderId}/`);
        setOrder(response.data);
        
        // Initialize menu item ratings
        const initialRatings: Record<number, { rating: number; comment: string }> = {};
        response.data.items.forEach((item: OrderItem) => {
          initialRatings[item.id] = { rating: 5, comment: '' };
        });
        setMenuItemRatings(initialRatings);
      } catch (error) {
        console.error('Failed to fetch order:', error);
        showToast('Không thể tải thông tin đơn hàng', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !order) return;

    setSubmitting(true);
    try {
      const menuItemReviews = order.items.map((item) => ({
        order_item_id: item.id,
        rating: menuItemRatings[item.id]?.rating || 5,
        comment: menuItemRatings[item.id]?.comment || ''
      }));

      await api.post('/reviews/', {
        order_id: parseInt(orderId),
        order_rating: orderRating,
        merchant_rating: merchantRating,
        shipper_rating: order.shipper ? shipperRating : null,
        comment: comment,
        menu_item_reviews: menuItemReviews
      });

      showToast('Cảm ơn bạn đã đánh giá!', 'success');
      navigate(`/orders/${orderId}`);
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      showToast(error.response?.data?.detail || 'Không thể gửi đánh giá. Vui lòng thử lại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating: React.FC<{ rating: number; onRatingChange: (rating: number) => void }> = ({ rating, onRatingChange }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
          >
            ★
          </button>
        ))}
      </div>
    );
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
        <Link to={`/orders/${orderId}`} className="text-grabGreen-700 hover:text-grabGreen-800 font-medium">
          &larr; Quay lại
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 mt-2">Đánh giá đơn hàng #{orderId}</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
        {/* Overall Order Rating */}
        <div className="mb-6 pb-6 border-b">
          <label className="block text-lg font-semibold text-gray-800 mb-3">
            Đánh giá tổng thể đơn hàng
          </label>
          <StarRating rating={orderRating} onRatingChange={setOrderRating} />
        </div>

        {/* Merchant Rating */}
        <div className="mb-6 pb-6 border-b">
          <label className="block text-lg font-semibold text-gray-800 mb-3">
            Đánh giá cửa hàng: {order.merchant.name}
          </label>
          <StarRating rating={merchantRating} onRatingChange={setMerchantRating} />
        </div>

        {/* Shipper Rating */}
        {order.shipper && (
          <div className="mb-6 pb-6 border-b">
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              Đánh giá shipper: {order.shipper.username}
            </label>
            <StarRating rating={shipperRating} onRatingChange={setShipperRating} />
          </div>
        )}

        {/* Menu Item Ratings */}
        <div className="mb-6 pb-6 border-b">
          <label className="block text-lg font-semibold text-gray-800 mb-4">
            Đánh giá từng món
          </label>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-800">
                    {item.quantity}x {item.name}
                  </span>
                </div>
                <StarRating
                  rating={menuItemRatings[item.id]?.rating || 5}
                  onRatingChange={(rating) =>
                    setMenuItemRatings({
                      ...menuItemRatings,
                      [item.id]: { ...menuItemRatings[item.id], rating }
                    })
                  }
                />
                <textarea
                  className="w-full mt-2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-grabGreen-500 focus:border-transparent"
                  placeholder="Nhận xét về món này (tùy chọn)"
                  rows={2}
                  value={menuItemRatings[item.id]?.comment || ''}
                  onChange={(e) =>
                    setMenuItemRatings({
                      ...menuItemRatings,
                      [item.id]: { ...menuItemRatings[item.id], comment: e.target.value }
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Overall Comment */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-800 mb-3">
            Nhận xét chung (tùy chọn)
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-grabGreen-500 focus:border-transparent"
            rows={4}
            placeholder="Chia sẻ trải nghiệm của bạn..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Link
            to={`/orders/${orderId}`}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors text-center"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-grabGreen-600 hover:bg-grabGreen-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>
      </form>
    </div>
  );
}

