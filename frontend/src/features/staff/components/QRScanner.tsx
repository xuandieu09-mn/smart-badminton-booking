import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          // Prefer back camera if available
          const backCamera = devices.find((device) =>
            device.label.toLowerCase().includes('back'),
          );
          setSelectedCamera(backCamera?.id || devices[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to get cameras:', err);
        onError?.('Không thể truy cập camera. Vui lòng cấp quyền truy cập.');
      });

    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch((err) => console.error('Failed to stop scanner:', err));
      }
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      onError?.('No camera selected');
      return;
    }

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Successfully scanned
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Scanning error (not critical, happens continuously)
          // Only log in console, don't show to user
          console.debug('QR scan error:', errorMessage);
        },
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start scanner:', err);
      onError?.('Không thể khởi động scanner. Vui lòng thử lại.');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Camera Selection */}
      {cameras.length > 1 && !isScanning && (
        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
          <label className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-3">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Chọn camera:
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all text-base font-medium"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner Container */}
      <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800">
        <div id="qr-reader" className="w-full min-h-[400px]"></div>

        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-sm">
            <div className="text-center text-white px-6">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                <svg
                  className="w-32 h-32 relative z-10 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Sẵn sàng quét QR</h3>
              <p className="text-gray-300 text-sm">Nhấn nút bên dưới để bắt đầu</p>
            </div>
          </div>
        )}
        
        {isScanning && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-green-500 text-white px-6 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
              <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
              <span className="font-semibold">Đang quét...</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!isScanning ? (
          <button
            onClick={startScanning}
            disabled={!selectedCamera}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-5 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Bật Camera</span>
            </span>
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-5 rounded-xl font-bold hover:from-red-700 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl"
          >
            <span className="flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              <span>Dừng Quét</span>
            </span>
          </button>
        )}
      </div>

      {/* Instructions */}
      {isScanning && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5 shadow-md">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-blue-900 text-base mb-2">📱 Hướng dẫn quét</h4>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  <span>Đưa mã QR vào khung hình màu xanh</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  <span>Giữ camera ổn định và đủ ánh sáng</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  <span>Hệ thống sẽ tự động check-in khi quét thành công</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
