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
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuthStore();

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

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage.content }),
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

  // Quick suggestion buttons
  const suggestions = [
    'Giờ mở cửa?',
    'Giá thuê sân?',
    'Cách đặt sân?',
  ];

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
          <button
            onClick={toggleChat}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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

        {/* Quick Suggestions */}
        {messages.length <= 2 && (
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
