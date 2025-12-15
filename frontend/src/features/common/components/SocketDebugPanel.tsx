import React, { useEffect, useState } from 'react';
import { socketService } from '@/services/socket.service';
import { useAuthStore } from '@/store/authStore';

export const SocketDebugPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`].slice(-20)); // Keep last 20 logs
  };

  useEffect(() => {
    // Check connection status
    const checkInterval = setInterval(() => {
      const connected = socketService.isConnected();
      setIsConnected(connected);
      if (!connected && user) {
        addLog('⚠️ Socket disconnected, reconnecting...');
        socketService.connect(user.id);
      }
    }, 2000);

    // Listen to all socket events
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('connect', () => {
        addLog(`✅ Connected! Socket ID: ${socket.id}`);
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        addLog('❌ Disconnected');
        setIsConnected(false);
      });

      socket.on('booking:status-changed', (payload) => {
        addLog(`📢 Status Changed: ${JSON.stringify(payload)}`);
      });

      socket.on('booking:refund-received', (payload) => {
        addLog(`💰 Refund: ${JSON.stringify(payload)}`);
      });

      socket.on('notification', (notification) => {
        addLog(`🔔 Notification: ${JSON.stringify(notification)}`);
      });

      socket.on('court:status-update', (payload) => {
        addLog(`🎾 Court Update: ${JSON.stringify(payload)}`);
      });
    }

    return () => {
      clearInterval(checkInterval);
      socket?.off('connect');
      socket?.off('disconnect');
      socket?.off('booking:status-changed');
      socket?.off('booking:refund-received');
      socket?.off('notification');
      socket?.off('court:status-update');
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-900 text-white rounded-lg shadow-2xl p-4 max-h-96 overflow-hidden flex flex-col z-50">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
          />
          Socket Debug
        </h3>
        <div className="text-xs text-gray-400">
          User ID: {user.id} | Socket:{' '}
          {isConnected ? socketService.getSocket()?.id?.slice(0, 8) : 'N/A'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            Waiting for events...
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              className="bg-gray-800 p-2 rounded text-gray-300 break-all"
            >
              {log}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 mt-3 pt-2 border-t border-gray-700">
        <button
          onClick={() => {
            if (user) socketService.connect(user.id);
            addLog('🔄 Manual reconnect triggered');
          }}
          className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs"
        >
          Reconnect
        </button>
        <button
          onClick={() => setLogs([])}
          className="flex-1 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-xs"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
