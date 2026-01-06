import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

/**
 * 🤖 AI Chat Widget Component
 * 
 * Features:
 * - Floating button at bottom-right corner
 * - Expandable chat window
 * - Message bubbles (user right, bot left)
 * - Typing indicator
 * - Auto-scroll to newest message
 * - Glassmorphism design
 */

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestedActions?: string[]; // Quick action buttons
  bookingCard?: any; // Booking preview data
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Quick Actions Categories and Templates
const QUICK_ACTIONS = {
  check: {
    icon: '🔍',
    title: 'Kiểm tra sân',
    actions: [
      'Hôm nay còn sân không?',
      'Sân nào đang trống?',
      'Kiểm tra sân tối nay',
      'Xem lịch sân tuần này'
    ]
  },
  bookings: {
    icon: '📅',
    title: 'Lịch của tôi',
    actions: [
      'Tôi đã đặt sân gì?',
      'Lịch sử đặt sân của tôi',
      'Đơn đặt sân sắp tới',
      'Hủy đơn đặt sân'
    ]
  },
  wallet: {
    icon: '💰',
    title: 'Ví tiền',
    actions: [
      'Số dư ví của tôi?',
      'Nạp tiền vào ví',
      'Lịch sử giao dịch',
      'Hoàn tiền như thế nào?'
    ]
  },
  pricing: {
    icon: '💵',
    title: 'Bảng giá',
    actions: [
      'Giá sân bao nhiêu?',
      'Khung giờ nào rẻ nhất?',
      'Có chương trình khuyến mãi không?',
      'Giá thuê theo tháng'
    ]
  }
};

type QuickActionCategory = keyof typeof QUICK_ACTIONS;

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Xin chào! 👋 Tôi là Smart Court AI - trợ lý ảo của bạn. Tôi có thể giúp bạn đặt sân, tư vấn khung giờ, hoặc giải đáp thắc mắc. Hãy hỏi tôi bất cứ điều gì nhé! 🏸',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<QuickActionCategory | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { accessToken } = useAuthStore();
  // ✅ Fallback: Get token from localStorage if not in store (after old persist format)
  const token = accessToken || localStorage.getItem('access_token');

  // Load chat history when widget opens
  useEffect(() => {
    if (isOpen && !historyLoaded && token) {
      loadChatHistory();
    }
  }, [isOpen, historyLoaded, token]);

  // Load chat history from backend
  const loadChatHistory = async () => {
    try {
      console.log('📜 Loading chat history...');
      const response = await fetch(`${API_BASE_URL}/chat/history?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Chat history loaded:', data.messages.length, 'messages');
        
        if (data.messages && data.messages.length > 0) {
          // Convert timestamp strings to Date objects
          const messagesWithDates = data.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          
          // Replace welcome message with history
          setMessages(messagesWithDates);
        }
        setHistoryLoaded(true);
      }
    } catch (error) {
      console.error('❌ Failed to load chat history:', error);
      setHistoryLoaded(true); // Don't retry
    }
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Send message to API
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Log for debugging
      console.log('📤 Sending chat request:', userMessage.content);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      console.log('🔍 Token value:', token); // Debug: see actual token

      // 🆕 Build history from previous messages (exclude welcome message)
      // Format: [{ role: 'user' | 'model', parts: [{ text: string }] }]
      const history = messages
        .filter(m => m.id !== '1') // Exclude welcome message
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));
      
      console.log('📜 History length:', history.length);

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          message: userMessage.content,
          history: history,
        }),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        
        if (response.status === 401) {
          throw new Error('Bạn cần đăng nhập để sử dụng chat');
        }
        throw new Error(`Lỗi server: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ AI Response received:', data);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.reply,
        sender: 'bot',
        timestamp: new Date(),
        suggestedActions: data.suggestedActions, // Quick action buttons
        bookingCard: data.bookingCard, // Booking preview
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Show notification dot if chat is closed
      if (!isOpen) {
        setHasNewMessage(true);
      }
    } catch (error) {
      console.error('❌ Chat error:', error);
      
      let errorText = 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau! 🙏';
      
      if (error instanceof Error) {
        if (error.message.includes('đăng nhập')) {
          errorText = 'Bạn cần đăng nhập để sử dụng tính năng chat! 🔒';
        } else if (error.message.includes('Lỗi server')) {
          errorText = 'Server đang bận, vui lòng thử lại sau! ⚠️';
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorText,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessage(false);
    }
  };

  // Handle quick action click - send message immediately
  const handleQuickAction = (action: string) => {
    setInputValue(action);
    setActiveCategory(null);
    // Send immediately
    setTimeout(() => {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: action,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);

      // Call API (same logic as sendMessage)
      (async () => {
        try {
          const history = messages
            .filter(m => m.id !== '1')
            .map(m => ({
              role: m.sender === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }],
            }));

          const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              message: action,
              history: history,
            }),
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Bạn cần đăng nhập để sử dụng chat');
            }
            throw new Error(`Lỗi server: ${response.status}`);
          }

          const data = await response.json();
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.reply,
            sender: 'bot',
            timestamp: new Date(),
            suggestedActions: data.suggestedActions,
            bookingCard: data.bookingCard,
          };

          setMessages(prev => [...prev, botMessage]);
          if (!isOpen) {
            setHasNewMessage(true);
          }
        } catch (error) {
          console.error('❌ Chat error:', error);
          let errorText = 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau! 🙏';
          if (error instanceof Error && error.message.includes('đăng nhập')) {
            errorText = 'Bạn cần đăng nhập để sử dụng tính năng chat! 🔒';
          }
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: errorText,
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }
      })();
    }, 0);
  };

  // Quick suggestion buttons
  const suggestions = [
    'Giờ mở cửa?',
    'Giá thuê sân?',
    'Cách đặt sân?',
  ];

  // Clear chat history
  const clearChat = async () => {
    try {
      // Call API to clear history on backend
      if (token) {
        const response = await fetch(`${API_BASE_URL}/chat/history`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Cleared ${data.cleared} messages from backend`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to clear chat history:', error);
    }

    // Reset frontend state
    setMessages([
      {
        id: '1',
        content: 'Xin chào! 👋 Tôi là Smart Court AI - trợ lý ảo của bạn. Tôi có thể giúp bạn đặt sân, tư vấn khung giờ, hoặc giải đáp thắc mắc. Hãy hỏi tôi bất cứ điều gì nhé! 🏸',
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
    setHistoryLoaded(false);
    setShowQuickActions(true);
  };

  return (
    <>
      {/* ==================== CHAT WINDOW ==================== */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50',
          'w-[360px] h-[520px]',
          'bg-white/95 backdrop-blur-xl',
          'rounded-2xl shadow-2xl shadow-slate-300/50',
          'border border-slate-200/60',
          'flex flex-col overflow-hidden',
          'transition-all duration-300 ease-out',
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Smart Court AI</h3>
              <p className="text-blue-100 text-xs flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Đang hoạt động
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Clear Chat Button */}
            <button
              onClick={clearChat}
              title="Xóa lịch sử chat"
              className="p-2 hover:bg-white/20 rounded-xl transition-colors group"
            >
              <svg className="w-4 h-4 text-white group-hover:text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            {/* Close Button */}
            <button
              onClick={toggleChat}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {/* Bot Avatar */}
              {message.sender === 'bot' && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-2 flex-shrink-0 shadow-md">
                  <span className="text-sm">🤖</span>
                </div>
              )}
              
              {/* Message Bubble */}
              <div
                className={cn(
                  'max-w-[75%] px-4 py-2.5 rounded-2xl',
                  'transition-all duration-200',
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-md shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-700 rounded-bl-md shadow-md border border-slate-100'
                )}
              >
                {/* Render markdown for bot messages, plain text for user */}
                {message.sender === 'bot' ? (
                  <div className="text-sm leading-relaxed prose prose-sm prose-slate max-w-none
                    prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
                    prose-headings:my-1 prose-headings:text-slate-800
                    prose-strong:text-blue-600 prose-strong:font-semibold
                    prose-table:text-xs prose-th:px-2 prose-td:px-2
                    [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                )}
                <p className={cn(
                  'text-[10px] mt-1',
                  message.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                )}>
                  {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Quick Action Buttons */}
              {message.sender === 'bot' && message.suggestedActions && message.suggestedActions.length > 0 && (
                <div className="w-full max-w-[75%] mt-2 flex flex-wrap gap-2">
                  {message.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputValue(action);
                        sendMessage();
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 hover:shadow-sm"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}

              {/* User Avatar */}
              {message.sender === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center ml-2 flex-shrink-0 shadow-md">
                  <span className="text-sm">👤</span>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-2 shadow-md">
                <span className="text-sm">🤖</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-md border border-slate-100">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions Panel - Always visible above input */}
        {showQuickActions && (
          <div className="px-3 py-3 border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white">
            {/* Toggle Button */}
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="w-full flex items-center justify-between px-3 py-2 mb-2 text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              <span className="flex items-center gap-2">
                ⚡ Câu hỏi nhanh
              </span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Categories View */}
            {!activeCategory && (
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(QUICK_ACTIONS) as QuickActionCategory[]).map((key) => {
                  const category = QUICK_ACTIONS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key)}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all duration-200 hover:shadow-md group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{category.icon}</span>
                      <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 text-center">
                        {category.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Actions View */}
            {activeCategory && (
              <div className="space-y-2">
                {/* Back Button */}
                <button
                  onClick={() => setActiveCategory(null)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Quay lại
                </button>

                {/* Category Title */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <span className="text-xl">{QUICK_ACTIONS[activeCategory].icon}</span>
                  <span className="text-sm font-semibold text-blue-700">
                    {QUICK_ACTIONS[activeCategory].title}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-1.5">
                  {QUICK_ACTIONS[activeCategory].actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action)}
                      disabled={isLoading}
                      className="w-full text-left px-3 py-2.5 text-sm bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-slate-700 hover:text-blue-600 rounded-lg border border-slate-200 hover:border-blue-300 transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsed Quick Actions Toggle */}
        {!showQuickActions && (
          <div className="px-3 py-2 border-t border-slate-200 bg-white">
            <button
              onClick={() => setShowQuickActions(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hiện câu hỏi nhanh
            </button>
          </div>
        )}

        {/* Quick Suggestions - Only show for new users */}
        {messages.length <= 2 && false && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500 mb-2">Gợi ý câu hỏi:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInputValue(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-xs bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-full border border-slate-200 hover:border-blue-300 transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 border-t border-slate-200/60 bg-white">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              disabled={isLoading}
              className={cn(
                'flex-1 px-4 py-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl',
                'text-sm text-slate-700 placeholder-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                'p-2.5 rounded-xl transition-all duration-300',
                'bg-gradient-to-r from-blue-600 to-blue-500',
                'hover:from-blue-500 hover:to-blue-400',
                'shadow-md shadow-blue-500/30',
                'hover:shadow-lg hover:shadow-blue-500/40',
                'hover:-translate-y-0.5 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
              )}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== FLOATING BUTTON ==================== */}
      <button
        onClick={toggleChat}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600',
          'shadow-xl shadow-blue-500/40',
          'flex items-center justify-center',
          'transition-all duration-300 ease-out',
          'hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/50',
          'active:scale-95',
          isOpen && 'rotate-90'
        )}
      >
        {/* Notification Dot */}
        {hasNewMessage && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
        
        {/* Icon */}
        <span className="text-2xl">
          {isOpen ? '✕' : '💬'}
        </span>
      </button>

      {/* ==================== PULSE RING ANIMATION ==================== */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-14 h-14 pointer-events-none">
          <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></span>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
