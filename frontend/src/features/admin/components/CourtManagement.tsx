import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface Court {
  id: number;
  name: string;
  description?: string;
  pricePerHour: number;
  isActive: boolean;
}

interface CreateCourtInput {
  name: string;
  description?: string;
  pricePerHour: number;
}

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

const CourtManagement: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateCourtInput>({
    name: '',
    description: '',
    pricePerHour: 0,
  });
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();

  const { data: courts = [], isLoading } = useQuery({
    queryKey: ['courts'],
    queryFn: async () => {
      const response = await API.get<Court[]>('/courts');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateCourtInput) => {
      const response = await API.post('/courts', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      setFormData({ name: '', description: '', pricePerHour: 0 });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CreateCourtInput & { id: number }) => {
      const response = await API.put(`/courts/${data.id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      setEditingId(null);
      setFormData({ name: '', description: '', pricePerHour: 0 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/courts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.pricePerHour) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ ...formData, id: editingId });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (court: Court) => {
    setEditingId(court.id);
    setFormData({
      name: court.name,
      description: court.description,
      pricePerHour: typeof court.pricePerHour === 'string' ? parseInt(court.pricePerHour) : court.pricePerHour,
    });
    setShowForm(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add Court Button */}
      {!showForm && (
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', description: '', pricePerHour: 0 });
            setShowForm(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + Thêm sân mới
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Chỉnh sửa sân' : 'Thêm sân mới'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên sân *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="VD: Sân A1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Mô tả sân cầu lông"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá / Giờ (VND) *
              </label>
              <input
                type="number"
                value={formData.pricePerHour}
                onChange={(e) => setFormData({ ...formData, pricePerHour: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="100000"
                min="0"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
              >
                {editingId ? 'Cập nhật' : 'Thêm'} sân
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Courts List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">#</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tên sân</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Mô tả</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Giá / Giờ</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Trạng thái</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {courts.map((court, index) => (
              <tr key={court.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{court.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{court.description || '—'}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {typeof court.pricePerHour === 'string' 
                    ? parseInt(court.pricePerHour).toLocaleString('vi-VN')
                    : court.pricePerHour.toLocaleString('vi-VN')} VND
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    court.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {court.isActive ? '✓ Hoạt động' : '✕ Tạm dừng'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => handleEdit(court)}
                    className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors text-xs font-medium"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Xác nhận xóa sân này?')) {
                        deleteMutation.mutate(court.id);
                      }
                    }}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-xs font-medium"
                  >
                    🗑️ Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CourtManagement;
