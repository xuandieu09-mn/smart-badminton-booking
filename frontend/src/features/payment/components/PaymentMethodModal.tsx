import { useState } from 'react';

export type PaymentGateway = 'WALLET' | 'VNPAY' | 'MOMO';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: PaymentGateway) => void;
  walletBalance: number;
  bookingAmount: number;
  isProcessing?: boolean;
}

export default function PaymentMethodModal({
  isOpen,
  onClose,
  onSelectMethod,
  walletBalance,
  bookingAmount,
  isProcessing = false,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentGateway>('WALLET');
  const hasEnoughBalance = walletBalance >= bookingAmount;

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectMethod(selectedMethod);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative animate-fadeIn">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50 text-2xl"
        >
          ×
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            💳 Chọn phương thức thanh toán
          </h2>
          <p className="text-gray-600 mt-2">
            Số tiền thanh toán:{' '}
            <span className="font-semibold text-green-600">
              {bookingAmount.toLocaleString('vi-VN')} VNĐ
            </span>
          </p>
        </div>

        {/* Payment methods */}
        <div className="space-y-3 mb-6">
          {/* Wallet */}
          <button
            onClick={() => setSelectedMethod('WALLET')}
            disabled={!hasEnoughBalance || isProcessing}
            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
              selectedMethod === 'WALLET'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${
              !hasEnoughBalance
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Ví của tôi</h3>
                  <p className="text-sm text-gray-600">
                    Số dư: {walletBalance.toLocaleString('vi-VN')} VNĐ
                  </p>
                </div>
              </div>
              {selectedMethod === 'WALLET' && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            {!hasEnoughBalance && (
              <p className="text-red-500 text-sm mt-2">
                ⚠️ Số dư không đủ. Vui lòng nạp thêm hoặc chọn phương thức khác.
              </p>
            )}
          </button>

          {/* VNPay */}
          <button
            onClick={() => setSelectedMethod('VNPAY')}
            disabled={isProcessing}
            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
              selectedMethod === 'VNPAY'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🏦</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">VNPay</h3>
                  <p className="text-sm text-gray-600">
                    Thanh toán qua cổng VNPay
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ✅ Sandbox đã kích hoạt
                  </p>
                </div>
              </div>
              {selectedMethod === 'VNPAY' && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
          </button>

          {/* MoMo (Coming soon) */}
          <button
            disabled
            className="w-full p-4 border-2 border-gray-200 rounded-lg text-left opacity-50 cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">📱</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">MoMo</h3>
                  <p className="text-sm text-gray-600">Sắp ra mắt</p>
                </div>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                Coming soon
              </span>
            </div>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              (selectedMethod === 'WALLET' && !hasEnoughBalance) || isProcessing
            }
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
          </button>
        </div>
      </div>
    </div>
  );
}
