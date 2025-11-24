import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import api from '../../services/http';

interface Order {
  id: number;
  total_amount: number;
  payment_status: string;
  customer: { username: string };
  items: Array<{ name: string; quantity: number; price: number }>;
}

export default function RefundManagement() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthContext();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        setRefundAmount(response.data.total_amount.toString());
      } catch (error) {
        console.error('Failed to fetch order:', error);
        showToast('Không thể tải thông tin đơn hàng', 'error');
        navigate('/merchant/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, isAuthenticated, navigate]);

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !order || !refundAmount) {
      showToast('Vui lòng nhập số tiền hoàn', 'warning');
      return;
    }

    const amount = parseFloat(refundAmount);
    if (amount <= 0 || amount > parseFloat(order.total_amount.toString())) {
      showToast('Số tiền hoàn không hợp lệ', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/merchant-orders/${orderId}/refund/`, {
        amount: amount,
        reason: reason
      });

      showToast(`Đã hoàn tiền ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)} thành công`, 'success');
      setTimeout(() => {
        navigate('/merchant/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Failed to process refund:', error);
      showToast(error.response?.data?.detail || 'Không thể xử lý hoàn tiền', 'error');
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

  if (order.payment_status !== 'PAID') {
    return (
      <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Không thể hoàn tiền</h2>
          <p className="text-gray-600 mb-4">
            Chỉ có thể hoàn tiền cho đơn hàng đã thanh toán. Trạng thái thanh toán hiện tại: {order.payment_status}
          </p>
          <Link
            to="/merchant/dashboard"
            className="text-grabGreen-700 hover:text-grabGreen-800 font-medium"
          >
            &larr; Quay lại Dashboard
          </Link>
        </div>
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
        <h1 className="text-3xl font-bold text-gray-800">Hoàn tiền - Đơn hàng #{orderId}</h1>
      </div>

      <form onSubmit={handleRefund} className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        {/* Order Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">Thông tin đơn hàng</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="font-semibold">Khách hàng:</span> {order.customer?.username || 'N/A'}</p>
            <p><span className="font-semibold">Tổng tiền:</span> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(order.total_amount.toString()))}</p>
            <p><span className="font-semibold">Trạng thái thanh toán:</span> {order.payment_status}</p>
          </div>
        </div>

        {/* Refund Amount */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-800 mb-3">
            Số tiền hoàn (VNĐ) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            max={order.total_amount}
            step="1000"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-grabGreen-500 focus:border-transparent"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            required
          />
          <p className="text-sm text-gray-500 mt-2">
            Tối đa: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(order.total_amount.toString()))}
          </p>
          <button
            type="button"
            onClick={() => setRefundAmount(order.total_amount.toString())}
            className="mt-2 text-sm text-grabGreen-600 hover:text-grabGreen-800 font-medium"
          >
            Hoàn toàn bộ
          </button>
        </div>

        {/* Reason */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-800 mb-3">
            Lý do hoàn tiền (tùy chọn)
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-grabGreen-500 focus:border-transparent"
            rows={4}
            placeholder="Ví dụ: Khách hàng yêu cầu hủy đơn, món ăn không đúng..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-semibold mb-2">⚠️ Lưu ý</p>
          <p className="text-yellow-700 text-sm">
            Sau khi hoàn tiền, trạng thái thanh toán của đơn hàng sẽ được cập nhật thành REFUNDED.
            Vui lòng xác nhận số tiền hoàn trước khi tiếp tục.
          </p>
        </div>

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
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
          </button>
        </div>
      </form>
    </div>
  );
}

