import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { format } from 'date-fns';
import { Send, User, MessageSquare } from 'lucide-react';

interface Message {
  id: number;
  sender_id: string; // Changed to string to support UUIDs
  receiver_id: string; // Changed to string to support UUIDs
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

  const fetchConversations = async () => {
    try {
      const response = await api.get('/messages');
      // Ensure we always have an array to prevent .map crashes
      const rawMessages: Message[] = Array.isArray(response.data) ? response.data : [];
      
      const convs: Record<string, Conversation> = {};
      
      rawMessages.forEach(msg => {
        const isSender = msg.sender_id === user?.id;
        const otherId = isSender ? msg.receiver_id : msg.sender_id;
        // FIX: Defensive check for missing names to prevent charAt crash
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
      // Backend expects otherUserId as a param
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
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>
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
                className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                  selectedConv?.other_user_id === conv.other_user_id && selectedConv?.listing_id === conv.listing_id
                    ? 'bg-indigo-50 hover:bg-indigo-50'
                    : ''
                }`}
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0">
                  {/* FIX: Use fallback for other_user_name before calling charAt */}
                  {(conv.other_user_name || 'U').charAt(0)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {conv.other_user_name || 'Unknown User'}
                    </h3>
                    <span className="text-xs text-gray-500 shrink-0">
                      {format(new Date(conv.last_message_time), 'MMM d')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-indigo-600 truncate mb-1">
                    {conv.listing_title}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConv ? (
          <>
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                  {(selectedConv.other_user_name || 'U').charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConv.other_user_name || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-indigo-600 font-medium">
                    Re: {selectedConv.listing_title}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                        isOwn
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white text-gray-900 border border-gray-100 rounded-tl-none'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isOwn ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-indigo-600" />
            </div>
            <p className="text-lg font-medium text-gray-900">Select a conversation</p>
            <p className="text-sm">Pick a message from the sidebar to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
