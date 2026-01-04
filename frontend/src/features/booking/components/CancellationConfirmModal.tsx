interface RefundPolicy {
  timeBeforeBooking: string;
  refundPercentage: number;
  description: string;
}

interface CancellationConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookingCode: string;
  bookingTime: Date;
  paidAmount: number;
  estimatedRefund: {
    percentage: number;
    amount: number;
  };
}

const refundPolicies: RefundPolicy[] = [
  {
    timeBeforeBooking: '>24 giờ',
    refundPercentage: 100,
    description: 'Hoàn 100% số tiền đã thanh toán',
  },
  {
    timeBeforeBooking: '12-24 giờ',
    refundPercentage: 50,
    description: 'Hoàn 50% số tiền đã thanh toán',
  },
  {
    timeBeforeBooking: '<12 giờ',
    refundPercentage: 0,
    description: 'Không được hoàn tiền',
  },
];

export default function CancellationConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  bookingCode,
  bookingTime,
  paidAmount,
  estimatedRefund,
}: CancellationConfirmModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">⚠️ Xác nhận hủy booking</h2>
            <p className="text-sm opacity-90">Mã booking: {bookingCode}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Booking Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Thông tin booking</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>• Thời gian đặt: <span className="font-medium">{formatDateTime(bookingTime)}</span></p>
              <p>• Số tiền đã thanh toán: <span className="font-bold">{formatCurrency(paidAmount)}</span></p>
            </div>
          </div>

          {/* Refund Policy */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">💰 Chính sách hoàn tiền</h3>
            <div className="space-y-2">
              {refundPolicies.map((policy, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    policy.refundPercentage === estimatedRefund.percentage
                      ? 'bg-green-50 border-2 border-green-500'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0 w-24 text-center">
                    <span className="text-xs font-semibold text-gray-600">
                      {policy.timeBeforeBooking}
                    </span>
                  </div>
                  <div className="flex-shrink-0 w-16 text-center">
                    <span
                      className={`text-lg font-bold ${
                        policy.refundPercentage === 100
                          ? 'text-green-600'
                          : policy.refundPercentage === 50
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {policy.refundPercentage}%
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{policy.description}</p>
                  </div>
                  {policy.refundPercentage === estimatedRefund.percentage && (
                    <div className="flex-shrink-0">
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        Hiện tại
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Refund */}
          <div
            className={`rounded-lg p-4 ${
              estimatedRefund.percentage > 0
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-red-50 border-2 border-red-500'
            }`}
          >
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              {estimatedRefund.percentage > 0 ? (
                <>
                  <span className="text-green-700">✅ Bạn sẽ được hoàn tiền</span>
                </>
              ) : (
                <>
                  <span className="text-red-700">❌ Không được hoàn tiền</span>
                </>
              )}
            </h3>
            {estimatedRefund.percentage > 0 ? (
              <div className="space-y-1 text-sm">
                <p className="text-green-800">
                  • Tỷ lệ hoàn: <span className="font-bold">{estimatedRefund.percentage}%</span>
                </p>
                <p className="text-green-800">
                  • Số tiền hoàn:{' '}
                  <span className="font-bold text-lg">{formatCurrency(estimatedRefund.amount)}</span>
                </p>
                <p className="text-green-700 text-xs mt-2">
                  💡 Tiền sẽ được hoàn vào ví điện tử của bạn trong vòng 5 phút
                </p>
              </div>
            ) : (
              <div className="space-y-1 text-sm text-red-800">
                <p>
                  Do bạn hủy booking trong vòng <span className="font-bold">12 giờ trước giờ đá</span>, 
                  hệ thống không thể hoàn lại tiền theo chính sách.
                </p>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-yellow-800 text-xs">
                    <span className="font-semibold">⚠️ Trường hợp đặc biệt:</span> Nếu bạn có lý do chính đáng 
                    (ốm đau, tai nạn, thiên tai...), vui lòng liên hệ Admin qua:
                  </p>
                  <ul className="mt-2 text-yellow-800 text-xs space-y-1 ml-4">
                    <li>• 📧 Email: admin@smartcourt.vn</li>
                    <li>• 📞 Hotline: 1900-xxxx</li>
                    <li>• 💬 Chat với Admin trên hệ thống</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ <span className="font-bold">Lưu ý:</span> Sau khi xác nhận, booking sẽ bị hủy ngay lập tức và 
              <span className="font-bold"> KHÔNG THỂ KHÔI PHỤC</span>.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            🔙 Quay lại
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-lg"
          >
            ✅ Xác nhận hủy booking
          </button>
        </div>
      </div>
    </div>
  );
}
