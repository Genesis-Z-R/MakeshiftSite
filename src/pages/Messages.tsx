import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { format } from 'date-fns';
import { Send, MessageSquare, AlertTriangle, ArrowLeft } from 'lucide-react';

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  listing_id: number;
  content: string;
  created_at: string;
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

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { socket, clearNotifications } = useSocket() as any; 
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (clearNotifications) {
      clearNotifications();
    }
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
        
        if (clearNotifications) {
          clearNotifications();
        }
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
        content: newMessage
      };

      const response = await api.post('/messages', messageData);
      const savedMsg = response.data;
      
      if (socket) {
        socket.emit('send_message', savedMsg);
      }

      setNewMessage('');
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
    // Reverted the container height back to normal, since the chat window will now break out of it!
    <div className="max-w-6xl mx-auto h-[calc(100dvh-7rem)] md:h-[calc(100vh-12rem)] flex bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
      
      {/* SIDEBAR */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r-0 md:border-r border-slate-100 dark:border-slate-800 flex-col bg-white dark:bg-slate-900`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto pb-6 md:pb-0">
          {Array.isArray(conversations) && conversations.length > 0 ? (
            conversations.map(conv => (
              <button
                key={`${conv.other_user_id}_${conv.listing_id}`}
                onClick={() => {
                  setSelectedConv(conv);
                  fetchMessages(conv);
                  setIsTyping(false);
                }}
                className={`w-full p-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${
                  selectedConv?.other_user_id === conv.other_user_id && selectedConv?.listing_id === conv.listing_id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-r-4 border-indigo-600'
                    : ''
                }`}
              >
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-indigo-100 dark:shadow-none">
                  {(conv.other_user_name ? conv.other_user_name.charAt(0) : 'U').toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 truncate">
                      {conv.other_user_name || 'Unknown User'}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {conv.last_message_time ? format(new Date(conv.last_message_time), 'MMM d') : ''}
                    </span>
                  </div>
                  <p className="text-xs font-black text-indigo-600 truncate mb-1 uppercase tracking-tighter">
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
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* CHAT AREA: 
        The magic happens here! On mobile, it becomes "fixed inset-0 z-[100]" 
        which forces it to overlay the ENTIRE screen above all navbars.
        On desktop (md:), it goes back to normal relative positioning.
      */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex fixed inset-0 z-[100] md:relative md:z-auto md:inset-auto'} flex-1 flex-col bg-slate-50 dark:bg-slate-900 w-full`}>
        {selectedConv ? (
          <>
            <div className="p-4 pt-6 md:p-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm md:shadow-none z-10">
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => setSelectedConv(null)}
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Back to messages"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>

                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">
                  {(selectedConv.other_user_name ? selectedConv.other_user_name.charAt(0) : 'U').toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-50 max-w-[150px] md:max-w-xs truncate">
                    {selectedConv.other_user_name || 'Unknown User'}
                  </h3>
                  <p className="text-[10px] md:text-xs text-indigo-600 font-black uppercase tracking-widest max-w-[150px] md:max-w-xs truncate">
                    {selectedConv.listing_title}
                  </p>
                </div>
              </div>

              <button 
                onClick={handleReport}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                title="Report User"
              >
                <AlertTriangle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {Array.isArray(messages) && messages.map((msg, idx) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div key={`msg-${msg.id || idx}`} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] md:max-w-[75%] p-3.5 md:p-4 rounded-[1.5rem] text-sm font-medium shadow-sm ${
                        isOwn
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1.5 font-black uppercase tracking-tighter ${isOwn ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {isTyping && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-[1.5rem] rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Form padded at the bottom to ensure it clears the iOS swipe indicator */}
            <div className="p-4 pb-6 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 md:px-6 md:py-4 text-sm font-bold text-slate-900 dark:text-slate-50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 text-white p-3 md:p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 active:scale-95 flex-shrink-0"
                >
                  <Send className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 hidden md:flex">
            <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-indigo-600" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-slate-50 mb-2">Select a conversation</p>
            <p className="text-sm font-bold">Pick a message from the sidebar to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;