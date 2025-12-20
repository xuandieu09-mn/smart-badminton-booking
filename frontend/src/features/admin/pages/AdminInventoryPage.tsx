import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../../store/authStore';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
}

interface InventoryAction {
  id: number;
  type: string;
  quantityChange?: number;
  oldPrice?: number;
  newPrice?: number;
  reason?: string;
  createdAt: string;
  product: Product;
  performedByUser: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  sale?: {
    id: number;
    saleCode: string;
    totalAmount: number;
    customerName?: string;
  };
}

interface Sale {
  id: number;
  saleCode: string;
  totalAmount: number;
  paymentMethod: string;
  customerName?: string;
  createdAt: string;
  staff: {
    id: number;
    name: string;
    email: string;
  };
  items: {
    id: number;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product: {
      id: number;
      name: string;
      category: string;
    };
  }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  SHUTTLECOCK: '🏸 Ống cầu',
  BEVERAGE: '🥤 Nước uống',
  ACCESSORY: '🎾 Phụ kiện',
  EQUIPMENT: '⚡ Dụng cụ',
  OTHER: '📦 Khác',
};

const ACTION_LABELS: Record<string, string> = {
  RESTOCK: '📥 Nhập hàng',
  PRICE_UPDATE: '💰 Sửa giá',
  DAMAGE: '❌ Hủy hàng',
  SALE: '🛒 Bán hàng',
};

const ACTION_COLORS: Record<string, string> = {
  RESTOCK: 'bg-green-100 text-green-800 border-green-300',
  PRICE_UPDATE: 'bg-blue-100 text-blue-800 border-blue-300',
  DAMAGE: 'bg-red-100 text-red-800 border-red-300',
  SALE: 'bg-purple-100 text-purple-800 border-purple-300',
};

const AdminInventoryPage: React.FC = () => {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'sales'>('overview');

  // Modals
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [restockQty, setRestockQty] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [damageQty, setDamageQty] = useState('');
  const [damageReason, setDamageReason] = useState('');

  // Filters
  const [historyFilter, setHistoryFilter] = useState<string>('');
  const [salesFilter, setSalesFilter] = useState<string>('');

  // ==================== API CALLS ====================
  const { data: stats } = useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: async () => {
      const { data } = await API.get('/inventory/stats', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await API.get('/pos/products', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data.products as Product[];
    },
  });

  const { data: historyData } = useQuery({
    queryKey: ['inventory', 'history', historyFilter],
    queryFn: async () => {
      const { data } = await API.get('/inventory/history', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: historyFilter ? { type: historyFilter } : {},
      });
      return data.actions as InventoryAction[];
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ['inventory', 'sales'],
    queryFn: async () => {
      const { data } = await API.get('/inventory/sales', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    },
  });

  // ==================== MUTATIONS ====================
  const restockMutation = useMutation({
    mutationFn: async (payload: { productId: number; quantity: number }) => {
      const { data } = await API.post('/inventory/restock', payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowRestockModal(false);
      setRestockQty('');
      setSelectedProduct(null);
      alert('✅ Nhập hàng thành công!');
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async (payload: { productId: number; newPrice: number }) => {
      const { data } = await API.post('/inventory/update-price', payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowPriceModal(false);
      setNewPrice('');
      setSelectedProduct(null);
      alert('✅ Cập nhật giá thành công!');
    },
  });

  const damageMutation = useMutation({
    mutationFn: async (payload: {
      productId: number;
      quantity: number;
      reason: string;
    }) => {
      const { data } = await API.post('/inventory/damage', payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowDamageModal(false);
      setDamageQty('');
      setDamageReason('');
      setSelectedProduct(null);
      alert('✅ Báo hư tổn thành công!');
    },
  });

  // ==================== HANDLERS ====================
  const handleRestock = (product: Product) => {
    setSelectedProduct(product);
    setShowRestockModal(true);
  };

  const handleUpdatePrice = (product: Product) => {
    setSelectedProduct(product);
    setNewPrice(product.price.toString());
    setShowPriceModal(true);
  };

  const handleDamage = (product: Product) => {
    setSelectedProduct(product);
    setShowDamageModal(true);
  };

  const submitRestock = () => {
    if (!selectedProduct || !restockQty) return;
    restockMutation.mutate({
      productId: selectedProduct.id,
      quantity: parseInt(restockQty),
    });
  };

  const submitUpdatePrice = () => {
    if (!selectedProduct || !newPrice) return;
    updatePriceMutation.mutate({
      productId: selectedProduct.id,
      newPrice: parseFloat(newPrice),
    });
  };

  const submitDamage = () => {
    if (!selectedProduct || !damageQty || !damageReason) return;
    damageMutation.mutate({
      productId: selectedProduct.id,
      quantity: parseInt(damageQty),
      reason: damageReason,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📦 Quản lý kho hàng
          </h1>
          <p className="text-gray-600">
            Nhập hàng, sửa giá, theo dõi lịch sử bán hàng và quản lý tồn kho
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <div className="text-sm text-gray-600 mb-1">Tổng sản phẩm</div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalProducts}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
              <div className="text-sm text-gray-600 mb-1">Sắp hết hàng</div>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.lowStock}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
              <div className="text-sm text-gray-600 mb-1">Hết hàng</div>
              <div className="text-3xl font-bold text-red-600">
                {stats.outOfStock}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <div className="text-sm text-gray-600 mb-1">Giá trị kho</div>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('vi-VN').format(stats.totalValue)}đ
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Tổng quan kho
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📜 Lịch sử kho
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'sales'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💰 Lịch sử bán hàng
            </button>
          </div>

          <div className="p-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Sản phẩm
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Danh mục
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Giá
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Tồn kho
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products?.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-xs text-gray-500">
                                {product.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                              {CATEGORY_LABELS[product.category]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                            {new Intl.NumberFormat('vi-VN').format(product.price)}đ
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`px-2 py-1 text-sm font-bold rounded ${
                                product.stock === 0
                                  ? 'bg-red-100 text-red-700'
                                  : product.stock < 10
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm space-x-2">
                            <button
                              onClick={() => handleRestock(product)}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              📥 Nhập
                            </button>
                            <button
                              onClick={() => handleUpdatePrice(product)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              💰 Sửa giá
                            </button>
                            <button
                              onClick={() => handleDamage(product)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              ❌ Hủy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div>
                <div className="mb-4">
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Tất cả hành động</option>
                    <option value="RESTOCK">Nhập hàng</option>
                    <option value="PRICE_UPDATE">Sửa giá</option>
                    <option value="DAMAGE">Hủy hàng</option>
                    <option value="SALE">Bán hàng</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {historyData?.map((action) => (
                    <div
                      key={action.id}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-bold border ${ACTION_COLORS[action.type]}`}
                            >
                              {ACTION_LABELS[action.type]}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(action.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>

                          <div className="mb-2">
                            <span className="font-medium text-gray-900">
                              {action.product.name}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({CATEGORY_LABELS[action.product.category]})
                            </span>
                          </div>

                          {action.type === 'RESTOCK' && (
                            <div className="text-sm text-green-600 font-medium">
                              +{action.quantityChange} sản phẩm
                            </div>
                          )}

                          {action.type === 'PRICE_UPDATE' && (
                            <div className="text-sm text-blue-600 font-medium">
                              {new Intl.NumberFormat('vi-VN').format(action.oldPrice!)}đ
                              {' → '}
                              {new Intl.NumberFormat('vi-VN').format(action.newPrice!)}đ
                            </div>
                          )}

                          {action.type === 'DAMAGE' && (
                            <div>
                              <div className="text-sm text-red-600 font-medium">
                                -{Math.abs(action.quantityChange!)} sản phẩm
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Lý do: {action.reason}
                              </div>
                            </div>
                          )}

                          {action.type === 'SALE' && action.sale && (
                            <div className="text-sm text-purple-600 font-medium">
                              Đơn hàng: {action.sale.saleCode} -{' '}
                              {action.sale.customerName || 'Khách lẻ'}
                            </div>
                          )}

                          <div className="text-xs text-gray-500 mt-2">
                            Thực hiện bởi: {action.performedByUser.name} (
                            {action.performedByUser.role})
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SALES TAB */}
            {activeTab === 'sales' && (
              <div>
                <div className="mb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Tổng đơn hàng</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {salesData?.total || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Tổng doanh thu</div>
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('vi-VN').format(
                          salesData?.totalRevenue || 0,
                        )}
                        đ
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {salesData?.sales?.map((sale: Sale) => (
                    <div
                      key={sale.id}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-bold text-lg text-gray-900">
                            {sale.saleCode}
                          </div>
                          <div className="text-sm text-gray-600">
                            {sale.customerName || 'Khách lẻ'} •{' '}
                            {new Date(sale.createdAt).toLocaleString('vi-VN')}
                          </div>
                          <div className="text-sm text-gray-600">
                            Nhân viên: {sale.staff.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat('vi-VN').format(
                              Number(sale.totalAmount),
                            )}
                            đ
                          </div>
                          <div className="text-sm text-gray-500">
                            {sale.paymentMethod}
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Chi tiết:
                        </div>
                        {sale.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm py-1"
                          >
                            <span className="text-gray-700">
                              {item.product.name} x{item.quantity}
                            </span>
                            <span className="font-medium text-gray-900">
                              {new Intl.NumberFormat('vi-VN').format(
                                Number(item.subtotal),
                              )}
                              đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {/* Restock Modal */}
      {showRestockModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              📥 Nhập hàng: {selectedProduct.name}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng nhập:
              </label>
              <input
                type="number"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Nhập số lượng"
                min="1"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitRestock}
                disabled={!restockQty || restockMutation.isPending}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {restockMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
              <button
                onClick={() => {
                  setShowRestockModal(false);
                  setRestockQty('');
                  setSelectedProduct(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Update Modal */}
      {showPriceModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              💰 Sửa giá: {selectedProduct.name}
            </h3>
            <div className="mb-2 text-sm text-gray-600">
              Giá hiện tại:{' '}
              {new Intl.NumberFormat('vi-VN').format(selectedProduct.price)}đ
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giá mới:
              </label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Nhập giá mới"
                min="0"
                step="1000"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitUpdatePrice}
                disabled={!newPrice || updatePriceMutation.isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {updatePriceMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
              <button
                onClick={() => {
                  setShowPriceModal(false);
                  setNewPrice('');
                  setSelectedProduct(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Damage Modal */}
      {showDamageModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ❌ Báo hư tổn: {selectedProduct.name}
            </h3>
            <div className="mb-2 text-sm text-gray-600">
              Tồn kho hiện tại: {selectedProduct.stock}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng hủy:
              </label>
              <input
                type="number"
                value={damageQty}
                onChange={(e) => setDamageQty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Nhập số lượng"
                min="1"
                max={selectedProduct.stock}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do:
              </label>
              <textarea
                value={damageReason}
                onChange={(e) => setDamageReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Nhập lý do (hư tổn, hết hạn...)"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitDamage}
                disabled={
                  !damageQty || !damageReason || damageMutation.isPending
                }
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {damageMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
              <button
                onClick={() => {
                  setShowDamageModal(false);
                  setDamageQty('');
                  setDamageReason('');
                  setSelectedProduct(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventoryPage;
