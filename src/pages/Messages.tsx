import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { MessageSquare, User, Package, Clock, Send, Search } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  listing_id: number;
  content: string;
  created_at: string;
  sender_name: string;
  receiver_name: string;
  listing_title: string;
}

interface Conversation {
  listing_id: number;
  listing_title: string;
  other_user_id: number;
  other_user_name: string;
  last_message: string;
  last_time: string;
  messages: Message[];
}

const Messages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const { socket, clearNotifications } = useSocket();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearNotifications();
  }, [clearNotifications]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedConv]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get('/messages');
        const msgs: Message[] = response.data;
        
        // Group messages into conversations
        const groups: { [key: string]: Conversation } = {};
        msgs.forEach(msg => {
          const otherUserId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
          const otherUserName = msg.sender_id === user?.id ? msg.receiver_name : msg.sender_name;
          const key = `${msg.listing_id}-${otherUserId}`;
          
          if (!groups[key]) {
            groups[key] = {
              listing_id: msg.listing_id,
              listing_title: msg.listing_title,
              other_user_id: otherUserId,
              other_user_name: otherUserName,
              last_message: msg.content,
              last_time: msg.created_at,
              messages: []
            };
          }
          groups[key].messages.push(msg);
        });

        // Sort messages within each group by time
        Object.values(groups).forEach(group => {
          group.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const last = group.messages[group.messages.length - 1];
          group.last_message = last.content;
          group.last_time = last.created_at;
        });

        const sortedConvs = Object.values(groups).sort((a, b) => 
          new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
        );

        setConversations(sortedConvs);
        if (sortedConvs.length > 0 && !selectedConv) {
          setSelectedConv(sortedConvs[0]);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [user?.id]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (data: any) => {
        const otherUserId = data.sender_id === user?.id ? data.receiver_id : data.sender_id;
        const key = `${data.listing_id}-${otherUserId}`;
        
        setConversations(prev => {
          const existing = prev.find(c => `${c.listing_id}-${c.other_user_id}` === key);
          if (existing) {
            const updated = prev.map(c => {
              if (`${c.listing_id}-${c.other_user_id}` === key) {
                const newMessages = [...c.messages, data];
                return {
                  ...c,
                  messages: newMessages,
                  last_message: data.content,
                  last_time: data.created_at || new Date().toISOString()
                };
              }
              return c;
            });
            return updated.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
          } else {
            // New conversation
            const newConv: Conversation = {
              listing_id: data.listing_id,
              listing_title: data.listing_title,
              other_user_id: otherUserId,
              other_user_name: data.sender_name,
              last_message: data.content,
              last_time: data.created_at || new Date().toISOString(),
              messages: [data]
            };
            return [newConv, ...prev];
          }
        });

        if (selectedConv && `${selectedConv.listing_id}-${selectedConv.other_user_id}` === key) {
          setSelectedConv(prev => {
            if (!prev) return null;
            return {
              ...prev,
              messages: [...prev.messages, data]
            };
          });
        }
      };

      socket.on('new_message', handleNewMessage);
      return () => {
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [socket, user?.id, selectedConv]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedConv || !user) return;

    const messageData = {
      receiver_id: selectedConv.other_user_id,
      listing_id: selectedConv.listing_id,
      content: reply
    };

    try {
      await api.post('/messages', messageData);
      
      const socketData = {
        ...messageData,
        sender_id: user.id,
        sender_name: user.name,
        receiver_name: selectedConv.other_user_name,
        listing_title: selectedConv.listing_title,
        created_at: new Date().toISOString()
      };

      if (socket) {
        socket.emit('send_message', socketData);
      }

      // Optimistically update local state
      setConversations(prev => {
        return prev.map(c => {
          if (c.listing_id === selectedConv.listing_id && c.other_user_id === selectedConv.other_user_id) {
            return {
              ...c,
              messages: [...c.messages, socketData as Message],
              last_message: reply,
              last_time: socketData.created_at
            };
          }
          return c;
        }).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
      });

      setSelectedConv(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, socketData as Message]
        };
      });

      setReply('');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-20 text-center">Loading conversations...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-indigo-600" />
          Messages
        </h1>
      </div>

      <div className="flex-grow flex bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/30">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search chats..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-grow overflow-y-auto">
            {conversations.length > 0 ? (
              conversations.map((conv) => (
                <button
                  key={`${conv.listing_id}-${conv.other_user_id}`}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-white transition-colors text-left border-b border-gray-50 ${
                    selectedConv?.listing_id === conv.listing_id && selectedConv?.other_user_id === conv.other_user_id
                      ? 'bg-white border-l-4 border-l-indigo-600'
                      : ''
                  }`}
                >
                  <div className="h-12 w-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold shrink-0">
                    {conv.other_user_name.charAt(0)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-gray-900 truncate">{conv.other_user_name}</h3>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(conv.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 font-bold truncate mb-1">{conv.listing_title}</p>
                    <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-grow flex flex-col bg-white">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {selectedConv.other_user_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">{selectedConv.other_user_name}</h2>
                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                      <Package className="h-3 w-3" />
                      {selectedConv.listing_title}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div 
                ref={scrollRef}
                className="flex-grow overflow-y-auto p-6 space-y-4 bg-gray-50/30"
              >
                {selectedConv.messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-2 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!reply.trim()}
                    className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12 text-gray-400">
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                <MessageSquare className="h-12 w-12 text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-sm max-w-xs">Pick a chat from the sidebar to start messaging in real-time.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
