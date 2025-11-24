import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import api from '../../services/http';

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
  ORDER_ISSUE: 'Vấn đề đơn hàng',
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

export default function ComplaintsManagement() {
  const { user, isAuthenticated, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState('RESOLVED');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!authLoading && isAuthenticated && user?.role !== 'merchant' && user?.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchComplaints();
  }, [isAuthenticated, authLoading, user, navigate]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await api.get('/complaints/');
      setComplaints(response.data || []);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !responseText) {
      showToast('Vui lòng nhập phản hồi', 'warning');
      return;
    }

    try {
      await api.post(`/complaints/${selectedComplaint.id}/respond/`, {
        response: responseText,
        status: responseStatus
      });

      showToast('Đã gửi phản hồi thành công', 'success');
      setShowResponseForm(false);
      setSelectedComplaint(null);
      setResponseText('');
      fetchComplaints();
    } catch (error: any) {
      console.error('Failed to respond complaint:', error);
      showToast(error.response?.data?.detail || 'Không thể gửi phản hồi', 'error');
    }
  };

  const openResponseForm = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setResponseText(complaint.response || '');
    setResponseStatus(complaint.status === 'PENDING' ? 'RESOLVED' : complaint.status);
    setShowResponseForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <Link
          to="/merchant/dashboard"
          className="text-grabGreen-700 hover:text-grabGreen-800 font-medium mb-4 inline-block"
        >
          &larr; Quay lại Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Khiếu nại</h1>
      </div>

      {/* Response Form Modal */}
      {showResponseForm && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Phản hồi khiếu nại</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">Đơn hàng:</span> #{selectedComplaint.order_id}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">Khách hàng:</span> {selectedComplaint.customer}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">Loại:</span> {COMPLAINT_TYPE_LABELS[selectedComplaint.complaint_type] || selectedComplaint.complaint_type}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">Tiêu đề:</span> {selectedComplaint.title}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Mô tả:</span> {selectedComplaint.description}
              </p>
            </div>

            <form onSubmit={handleRespond}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Trạng thái xử lý
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(e.target.value)}
                >
                  <option value="RESOLVED">Đã giải quyết</option>
                  <option value="REJECTED">Từ chối</option>
                  <option value="IN_PROGRESS">Đang xử lý</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phản hồi <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows={6}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Nhập phản hồi của bạn..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResponseForm(false);
                    setSelectedComplaint(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-grabGreen-600 hover:bg-grabGreen-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  Gửi phản hồi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaints List */}
      <div className="space-y-4">
        {complaints.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600">Chưa có khiếu nại nào</p>
          </div>
        ) : (
          complaints.map((complaint) => (
            <div key={complaint.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{complaint.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Đơn hàng #{complaint.order_id} - {complaint.customer}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                  {STATUS_LABELS[complaint.status] || complaint.status}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Loại:</span> {COMPLAINT_TYPE_LABELS[complaint.complaint_type] || complaint.complaint_type}
                </p>
                <p className="text-gray-700">{complaint.description}</p>
              </div>

              {complaint.response && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Phản hồi:</p>
                  <p className="text-gray-700">{complaint.response}</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {new Date(complaint.created_at).toLocaleString('vi-VN')}
                </span>
                {complaint.status === 'PENDING' && (
                  <button
                    onClick={() => openResponseForm(complaint)}
                    className="px-4 py-2 bg-grabGreen-600 hover:bg-grabGreen-700 text-white font-semibold rounded-lg"
                  >
                    Phản hồi
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

