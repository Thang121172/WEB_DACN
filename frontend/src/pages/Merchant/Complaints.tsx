import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/http';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

interface Complaint {
  id: number;
  order_id: number;
  customer: string;
  complaint_type: string;
  title: string;
  description: string;
  status: string;
  response: string;
  created_at: string;
}

const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  ORDER_ISSUE: 'Vấn đề về đơn hàng',
  FOOD_QUALITY: 'Chất lượng món ăn',
  DELIVERY_ISSUE: 'Vấn đề giao hàng',
  PAYMENT_ISSUE: 'Vấn đề thanh toán',
  OTHER: 'Khác'
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Từ chối'
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
};

export default function Complaints() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthContext();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchComplaints();
  }, [isAuthenticated, navigate]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await api.get('/complaints/');
      setComplaints(response.data);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      showToast('Không thể tải danh sách khiếu nại', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (complaintId: number, status: 'RESOLVED' | 'REJECTED') => {
    if (!response.trim()) {
      showToast('Vui lòng nhập phản hồi', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/complaints/${complaintId}/respond/`, {
        response: response,
        status: status
      });
      showToast('Đã phản hồi khiếu nại thành công', 'success');
      setSelectedComplaint(null);
      setResponse('');
      fetchComplaints();
    } catch (error: any) {
      console.error('Failed to respond complaint:', error);
      showToast(error.response?.data?.detail || 'Không thể phản hồi khiếu nại', 'error');
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

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <button
          onClick={() => navigate('/merchant/dashboard')}
          className="text-grabGreen-700 hover:text-grabGreen-800 font-medium"
        >
          &larr; Quay lại Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mt-2">Quản lý Khiếu nại</h1>
      </div>

      <div className="space-y-4">
        {complaints.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600">Chưa có khiếu nại nào</p>
          </div>
        ) : (
          complaints.map((complaint) => (
            <div key={complaint.id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{complaint.title}</h3>
                  <p className="text-sm text-gray-600">
                    Đơn hàng #{complaint.order_id} - Khách hàng: {complaint.customer}
                  </p>
                  <p className="text-sm text-gray-600">
                    Loại: {COMPLAINT_TYPE_LABELS[complaint.complaint_type] || complaint.complaint_type}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[complaint.status] || 'bg-gray-100 text-gray-800'}`}>
                  {STATUS_LABELS[complaint.status] || complaint.status}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 whitespace-pre-wrap">{complaint.description}</p>
              </div>

              {complaint.response && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Phản hồi:</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{complaint.response}</p>
                </div>
              )}

              {complaint.status === 'PENDING' && (
                <div className="mt-4 pt-4 border-t">
                  {selectedComplaint?.id === complaint.id ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-grabGreen-500 focus:border-transparent"
                        rows={4}
                        placeholder="Nhập phản hồi của bạn..."
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRespond(complaint.id, 'RESOLVED')}
                          disabled={submitting}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {submitting ? 'Đang xử lý...' : 'Giải quyết'}
                        </button>
                        <button
                          onClick={() => handleRespond(complaint.id, 'REJECTED')}
                          disabled={submitting}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {submitting ? 'Đang xử lý...' : 'Từ chối'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedComplaint(null);
                            setResponse('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedComplaint(complaint)}
                      className="bg-grabGreen-600 hover:bg-grabGreen-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Phản hồi
                    </button>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4">
                Ngày tạo: {new Date(complaint.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

