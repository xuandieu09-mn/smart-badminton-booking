import React, { useState, useEffect } from 'react';
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

interface CartItem {
  product: Product;
  quantity: number;
}

interface InvoiceItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  category: string;
}

interface Invoice {
  invoiceCode: string;
  customerName: string;
  paymentMethod: string;
  items: InvoiceItem[];
  totalAmount: number;
  createdAt: string;
  staffName?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  SHUTTLECOCK: '🏸 Ống cầu',
  BEVERAGE: '🥤 Nước uống',
  ACCESSORY: '🎾 Phụ kiện',
  EQUIPMENT: '⚡ Dụng cụ',
  OTHER: '📦 Khác',
};

const CATEGORY_COLORS: Record<string, string> = {
  SHUTTLECOCK: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  BEVERAGE: 'bg-blue-100 text-blue-800 border-blue-300',
  ACCESSORY: 'bg-purple-100 text-purple-800 border-purple-300',
  EQUIPMENT: 'bg-green-100 text-green-800 border-green-300',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-300',
};

const StaffPosPage: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VNPAY'>('CASH');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [printFormat, setPrintFormat] = useState<string>('');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await API.get('/pos/products', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      alert('Lỗi tải danh sách sản phẩm');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && p.stock > 0;
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert(`Không đủ hàng! Tồn kho: ${product.stock}`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((item) => item.product.id !== productId));
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && newQuantity > product.stock) {
      alert(`Không đủ hàng! Tồn kho: ${product.stock}`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  const generateInvoice = async () => {
    if (cart.length === 0) {
      alert('⚠️ Giỏ hàng trống');
      return;
    }

    if (!customerName.trim()) {
      alert('⚠️ Vui lòng nhập tên khách hàng');
      return;
    }

    setIsGeneratingInvoice(true);

    try {
      const { data } = await API.post(
        '/pos/sales/generate-invoice',
        {
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          customerName: customerName.trim(),
          paymentMethod: paymentMethod,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      setInvoice(data.invoice);
      setPrintFormat(data.printFormat);
      setShowInvoiceModal(true);
    } catch (error: any) {
      console.error('Invoice generation error:', error);
      alert('❌ Lỗi tạo hóa đơn: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!printFormat) return;

    // Simulate receipt printing
    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Biên lai bán hàng</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                margin: 0;
                padding: 10px;
                background: white;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                margin: 0;
              }
              @media print {
                body { margin: 0; padding: 5px; }
              }
            </style>
          </head>
          <body>
            <pre>${printFormat}</pre>
            <script>
              window.print();
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleConfirmPayment = async () => {
    if (!invoice) return;

    setLoading(true);

    try {
      const { data } = await API.post(
        '/pos/sales',
        {
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          customerName: customerName.trim(),
          paymentMethod: paymentMethod,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      alert(
        `✅ Thanh toán thành công!\n` +
          `Mã đơn: ${data.sale.saleCode}\n` +
          `Tổng tiền: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}\n` +
          `Thanh toán: ${paymentMethod === 'CASH' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}`,
      );

      // Reset
      setCart([]);
      setCustomerName('');
      setShowInvoiceModal(false);
      setInvoice(null);
      setPrintFormat('');
      fetchProducts();
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert('❌ Lỗi thanh toán: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🛒 POS - Bán hàng tại sân
          </h1>
          <p className="text-gray-600">
            Quản lý bán hàng: ống cầu, nước uống, phụ kiện...
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Products */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Search & Category Filter */}
              <div className="mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Tìm kiếm sản phẩm..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />

                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                      selectedCategory === 'ALL'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Tất cả
                  </button>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                        selectedCategory === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition text-left"
                  >
                    <div
                      className={`inline-block px-2 py-1 rounded-full text-xs font-bold mb-2 border ${CATEGORY_COLORS[product.category]}`}
                    >
                      {CATEGORY_LABELS[product.category]}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">
                        {new Intl.NumberFormat('vi-VN').format(Number(product.price))}đ
                      </span>
                      <span className="text-xs text-gray-500">Kho: {product.stock}</span>
                    </div>
                  </button>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <span className="text-4xl mb-2 block">📦</span>
                  <p>Không tìm thấy sản phẩm</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🛒 Giỏ hàng ({cart.length})
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <span className="text-4xl mb-2 block">🛒</span>
                  <p className="text-sm">Giỏ hàng trống</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {new Intl.NumberFormat('vi-VN').format(
                                Number(item.product.price),
                              )}
                              đ x {item.quantity}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-500 hover:text-red-700 text-xl"
                          >
                            ×
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.product.id,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-16 text-center border border-gray-300 rounded-lg py-1"
                            min="1"
                            max={item.product.stock}
                          />
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                            className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right mt-2">
                          <span className="font-bold text-blue-600">
                            {new Intl.NumberFormat('vi-VN').format(
                              Number(item.product.price) * item.quantity,
                            )}
                            đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Info */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tên khách hàng:
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nhập tên khách hàng"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />

                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Thanh toán:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CASH')}
                        className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition ${
                          paymentMethod === 'CASH'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        💵 Tiền mặt
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('VNPAY')}
                        className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition ${
                          paymentMethod === 'VNPAY'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        💳 Chuyển khoản
                      </button>
                    </div>
                  </div>
                  </div>

                  {/* Total */}
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Tổng cộng:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(totalAmount)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Thanh toán: 💵 Tiền mặt
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={generateInvoice}
                    disabled={isGeneratingInvoice}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105"
                  >
                    {isGeneratingInvoice ? '⏳ Đang tạo hóa đơn...' : '📄 Tạo hóa đơn'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && invoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 sticky top-0">
              <h2 className="text-2xl font-bold">📄 Biên Lai Bán Hàng</h2>
              <p className="text-blue-100 text-sm mt-1">Mã HĐ: {invoice.invoiceCode}</p>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Invoice Info */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 uppercase font-semibold">
                      Khách hàng
                    </label>
                    <p className="text-lg font-bold text-gray-900">{invoice.customerName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 uppercase font-semibold">
                      Nhân viên
                    </label>
                    <p className="text-lg font-bold text-gray-900">{invoice.staffName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 uppercase font-semibold">
                      Thời gian
                    </label>
                    <p className="text-sm text-gray-900">{invoice.createdAt}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 uppercase font-semibold">
                      Thanh toán
                    </label>
                    <p className="text-sm text-gray-900">
                      {invoice.paymentMethod === 'CASH' ? '💵 Tiền mặt' : '💳 Chuyển khoản'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Chi tiết sản phẩm:</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b-2 border-gray-300">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Sản phẩm</th>
                        <th className="text-center px-3 py-2 font-semibold w-16">SL</th>
                        <th className="text-right px-3 py-2 font-semibold w-28">Đơn giá</th>
                        <th className="text-right px-3 py-2 font-semibold w-32">Tổng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item) => (
                        <tr key={item.productId} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-3 py-2">{item.productName}</td>
                          <td className="text-center px-3 py-2 font-semibold">{item.quantity}</td>
                          <td className="text-right px-3 py-2">
                            {new Intl.NumberFormat('vi-VN').format(item.price)}đ
                          </td>
                          <td className="text-right px-3 py-2 font-bold text-blue-600">
                            {new Intl.NumberFormat('vi-VN').format(item.subtotal)}đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">TỔNG CỘNG:</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(invoice.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Receipt Preview */}
              <div className="mb-6 bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre-wrap break-words">{printFormat}</pre>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handlePrintInvoice}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition"
                >
                  🖨️ In hóa đơn
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? '⏳ Đang xử lý...' : '✅ Xác nhận thanh toán'}
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition"
                >
                  ❌ Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPosPage;
