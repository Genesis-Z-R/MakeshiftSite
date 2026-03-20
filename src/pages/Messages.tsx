import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { format } from 'date-fns';
import { Send, MessageSquare, AlertTriangle, ArrowLeft, X, Reply } from 'lucide-react';

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  listing_id: number;
  content: string;
  created_at: string;
  reply_to_id?: number;
  sender_name?: string;
  receiver_name?: string;
  listing_title?: string;
}

interface Conversation {
  other_user_id: string;
  other_user_name: string;
  listing_id: number;
  listing_title: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

// --- ISOLATED BUBBLE COMPONENT ---
const MessageBubble = ({ 
  msg, 
  isOwn, 
  onReply, 
  allMessages,
  otherUserName 
}: { 
  msg: Message, 
  isOwn: boolean, 
  onReply: (m: Message) => void,
  allMessages: Message[],
  otherUserName: string
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX.current;
    
    if (diff > 0 && diff < 70) {
      setOffsetX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offsetX > 50) {
      onReply(msg);
    }
    setOffsetX(0); 
  };

  const quotedMsg = msg.reply_to_id ? allMessages.find(m => m.id === msg.reply_to_id) : null;

  return (
    <div className={`relative flex w-full items-center group mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      
      {/* MOBILE: Hidden Reply Icon */}
      <div 
        className={`absolute left-0 flex md:hidden items-center justify-center transition-opacity duration-100 ${isOwn ? '-ml-10' : ''}`}
        style={{ opacity: Math.min(offsetX / 50, 1) }}
      >
        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
          <Reply className="w-4 h-4 text-slate-900 dark:text-white" />
        </div>
      </div>

      {/* DESKTOP: Hover Reply Button */}
      {isOwn && (
        <button
          onClick={() => onReply(msg)}
          className="hidden md:flex opacity-0 group-hover:opacity-100 mr-2 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
          title="Reply"
        >
          <Reply className="w-4 h-4" />
        </button>
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(${offsetX}px)`, 
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
        }}
        className={`max-w-[85%] md:max-w-[70%] p-3.5 rounded-2xl text-sm md:text-base shadow-sm z-10 ${
          isOwn
            ? 'bg-slate-900 text-white rounded-tr-sm dark:bg-white dark:text-slate-900'
            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-800 rounded-tl-sm'
        }`}
      >
        {quotedMsg && (
          <div className={`mb-2 p-2.5 rounded-xl text-xs border-l-4 ${
            isOwn 
              ? 'bg-slate-800 border-slate-500 text-slate-200 dark:bg-slate-100 dark:border-slate-300 dark:text-slate-600' 
              : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
          }`}>
            <p className={`font-black mb-0.5 ${isOwn ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>
              {quotedMsg.sender_id === msg.sender_id ? 'You' : otherUserName}
            </p>
            <p className="truncate opacity-90">{quotedMsg.content}</p>
          </div>
        )}

        <p className="leading-snug">{msg.content}</p>
        <p className={`text-[10px] mt-1.5 font-bold tracking-widest uppercase ${isOwn ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400'}`}>
          {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}
        </p>
      </div>

      {/* DESKTOP: Hover Reply Button (Right side) */}
      {!isOwn && (
        <button
          onClick={() => onReply(msg)}
          className="hidden md:flex opacity-0 group-hover:opacity-100 ml-2 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
          title="Reply"
        >
          <Reply className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// --- MAIN MESSAGES COMPONENT ---
const Messages: React.FC = () => {
  const { user } = useAuth();
  const { socket, clearNotifications } = useSocket() as any; 
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (clearNotifications) clearNotifications();
  }, [clearNotifications]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const response = await api.get('/messages');
      setConversations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message: Message) => {
        if (
          selectedConv &&
          Number(message.listing_id) === Number(selectedConv.listing_id) &&
          (message.sender_id === selectedConv.other_user_id || message.receiver_id === selectedConv.other_user_id)
        ) {
          setMessages(prev => {
            if (prev.find(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
          setIsTyping(false); 
        }
        fetchConversations();
        if (clearNotifications) clearNotifications();
      };

      const handleTyping = (data: any) => {
        if (selectedConv && data.sender_id === selectedConv.other_user_id && Number(data.listing_id) === Number(selectedConv.listing_id)) {
          setIsTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('typing', handleTyping);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('typing', handleTyping);
      };
    }
  }, [socket, selectedConv, clearNotifications]);

  const fetchMessages = async (conv: Conversation) => {
    try {
      const response = await api.get(`/messages/${conv.other_user_id}?listing_id=${conv.listing_id}`);
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (socket && selectedConv && user) {
      socket.emit('typing', {
        sender_id: user.id,
        receiver_id: selectedConv.other_user_id,
        listing_id: selectedConv.listing_id
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || !user) return;

    try {
      const messageData = {
        receiver_id: selectedConv.other_user_id,
        listing_id: selectedConv.listing_id,
        content: newMessage,
        reply_to_id: replyingTo?.id || null 
      };

      const response = await api.post('/messages', messageData);
      const savedMsg = response.data;
      
      if (socket) socket.emit('send_message', savedMsg);

      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleReport = async () => {
    if (!selectedConv) return;
    const reason = window.prompt(`Why are you reporting ${selectedConv.other_user_name || 'this user'}?`);
    if (!reason || !reason.trim()) return;

    try {
      await api.post('/reports', {
        reported_id: selectedConv.other_user_id,
        reason: reason
      });
      alert('Report submitted successfully. Our admin team will review this shortly.');
    } catch (error) {
      console.error('Error reporting user:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  return (
    // FIXED: Using 100dvh for accurate mobile height, preventing the send button from hiding
    <div className="h-[calc(100dvh-5rem)] md:h-[calc(100vh-6rem)] w-full max-w-[1400px] mx-auto md:py-6 md:px-4">
      <div className="flex w-full h-full bg-white dark:bg-slate-950 md:rounded-[2rem] md:border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        
        {/* SIDEBAR */}
        <div className={`w-full md:w-[350px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex-col bg-slate-50 dark:bg-slate-950 ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {Array.isArray(conversations) && conversations.length > 0 ? (
              conversations.map(conv => (
                <button
                  key={`${conv.other_user_id}_${conv.listing_id}`}
                  onClick={() => {
                    setSelectedConv(conv);
                    fetchMessages(conv);
                    setIsTyping(false);
                  }}
                  className={`w-full p-4 flex items-start gap-4 border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 transition-colors ${
                    selectedConv?.other_user_id === conv.other_user_id && selectedConv?.listing_id === conv.listing_id
                      ? 'bg-white dark:bg-slate-900 border-l-4 border-l-slate-900 dark:border-l-white'
                      : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-900 dark:text-white font-black shrink-0">
                    {(conv.other_user_name ? conv.other_user_name.charAt(0) : 'U').toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">
                        {conv.other_user_name || 'Unknown User'}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {conv.last_message_time ? format(new Date(conv.last_message_time), 'MMM d') : ''}
                      </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate mb-1">
                      {conv.listing_title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate font-medium">
                      {conv.last_message}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-bold">No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className={`flex-1 flex-col bg-white dark:bg-slate-900 min-w-0 ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="h-16 md:h-20 shrink-0 px-4 md:px-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedConv(null)}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>

                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-900 dark:text-white font-black shrink-0">
                    {(selectedConv.other_user_name ? selectedConv.other_user_name.charAt(0) : 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">
                      {selectedConv.other_user_name || 'Unknown User'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate">
                      {selectedConv.listing_title}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={handleReport}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  title="Report User"
                >
                  <AlertTriangle className="w-5 h-5" />
                </button>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900">
                {Array.isArray(messages) && messages.map((msg, idx) => (
                  <MessageBubble 
                    key={`msg-${msg.id || idx}`}
                    msg={msg}
                    isOwn={msg.sender_id === user?.id}
                    onReply={(m) => setReplyingTo(m)}
                    allMessages={messages}
                    otherUserName={selectedConv.other_user_name}
                  />
                ))}
                
                {isTyping && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area (Sticky Bottom) */}
              <div className="shrink-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-3 md:p-4 z-20">
                
                {/* FIXED: Reply Preview is now solidly above the input, structurally impossible to overlap */}
                {replyingTo && (
                  <div className="mb-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="border-l-4 border-slate-900 dark:border-white pl-3 flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-0.5">
                        Replying to {replyingTo.sender_id === user?.id ? 'yourself' : selectedConv.other_user_name}
                      </p>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                        {replyingTo.content}
                      </p>
                    </div>
                    <button 
                      onClick={() => setReplyingTo(null)}
                      className="p-2 shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-4 py-3 md:py-4 text-sm md:text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all placeholder:text-slate-500"
                  />
                  {/* FIXED: shrink-0 prevents the send button from squishing on small screens */}
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="shrink-0 bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-3 md:px-5 md:py-4 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 active:scale-95 flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950">
              <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white mb-2">Your Messages</p>
              <p className="text-sm font-medium">Select a conversation to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;