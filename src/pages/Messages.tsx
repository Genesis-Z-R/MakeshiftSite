import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { format } from 'date-fns';
import { Send, MessageSquare } from 'lucide-react';

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
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const response = await api.get('/messages');
      const rawMessages: Message[] = Array.isArray(response.data) ? response.data : [];
      
      const convs: Record<string, Conversation> = {};
      
      rawMessages.forEach(msg => {
        const isSender = msg.sender_id === user.id;
        const otherId = isSender ? msg.receiver_id : msg.sender_id;
        const otherName = isSender ? (msg.receiver_name || 'User') : (msg.sender_name || 'User');
        const key = `${otherId}_${msg.listing_id}`;

        if (!convs[key]) {
          convs[key] = {
            other_user_id: otherId,
            other_user_name: otherName,
            listing_id: msg.listing_id,
            listing_title: msg.listing_title || 'Unknown Listing',
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0
          };
        }
      });

      setConversations(Object.values(convs));
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
      socket.on('new_message', (message: Message) => {
        if (
          selectedConv &&
          message.listing_id === selectedConv.listing_id &&
          (message.sender_id === selectedConv.other_user_id || message.receiver_id === selectedConv.other_user_id)
        ) {
          setMessages(prev => [...prev, message]);
        }
        fetchConversations();
      });

      return () => {
        socket.off('new_message');
      };
    }
  }, [socket, selectedConv]);

  const fetchMessages = async (conv: Conversation) => {
    try {
      const response = await api.get(`/messages/${conv.other_user_id}?listing_id=${conv.listing_id}`);
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
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

      await api.post('/messages', messageData);
      
      const optimisticMsg: Message = {
        id: Date.now(),
        sender_id: user.id,
        receiver_id: selectedConv.other_user_id,
        listing_id: selectedConv.listing_id,
        content: newMessage,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setNewMessage('');
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
      
      {/* Sidebar */}
      <div className="w-1/3 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 ? (
            conversations.map(conv => (
              <button
                key={`${conv.other_user_id}_${conv.listing_id}`}
                onClick={() => {
                  setSelectedConv(conv);
                  fetchMessages(conv);
                }}
                className={`w-full p-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${
                  selectedConv?.other_user_id === conv.other_user_id && selectedConv?.listing_id === conv.listing_id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-r-4 border-indigo-600'
                    : ''
                }`}
              >
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-indigo-100 dark:shadow-none">
                  {(conv.other_user_name || 'U').charAt(0)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 truncate">
                      {conv.other_user_name || 'Unknown User'}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {format(new Date(conv.last_message_time), 'MMM d')}
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

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-black/20">
        {selectedConv ? (
          <>
            <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">
                  {(selectedConv.other_user_name || 'U').charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-50">
                    {selectedConv.other_user_name || 'Unknown User'}
                  </h3>
                  <p className="text-xs text-indigo-600 font-black uppercase tracking-widest">
                    {selectedConv.listing_title}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] p-4 rounded-[1.5rem] text-sm font-medium shadow-sm ${
                        isOwn
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-2 font-black uppercase tracking-tighter ${isOwn ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 active:scale-95"
                >
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
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