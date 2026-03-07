import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { MessageSquare, User, Package, Clock, Send, Search, Flag, AlertTriangle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';

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
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const { socket, clearNotifications, onlineUsers, typingUsers } = useSocket();
  const { user } = useAuth();
  const { announce } = useAccessibility();
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    clearNotifications();
  }, [clearNotifications]);

  // Join/Leave rooms when selected conversation changes
  useEffect(() => {
    if (socket && selectedConv && user) {
      const roomName = `chat_${Math.min(user.id, selectedConv.other_user_id)}_${Math.max(user.id, selectedConv.other_user_id)}_${selectedConv.listing_id}`;
      socket.emit('join_room', roomName);
      
      return () => {
        socket.emit('leave_room', roomName);
      };
    }
  }, [socket, selectedConv, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedConv, typingUsers]);

  const handleTyping = () => {
    if (!socket || !selectedConv || !user) return;

    socket.emit('typing', {
      receiver_id: selectedConv.other_user_id,
      listing_id: selectedConv.listing_id
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        receiver_id: selectedConv.other_user_id,
        listing_id: selectedConv.listing_id
      });
    }, 2000);
  };

  const handleReportUser = async () => {
    if (!selectedConv || !reportReason.trim()) return;
    setReporting(true);
    try {
      await api.post('/reports', {
        reported_id: selectedConv.other_user_id,
        reason: reportReason
      });
      announce('User reported successfully.');
      setShowReportModal(false);
      setReportReason('');
    } catch (error) {
      console.error('Error reporting user:', error);
      announce('Failed to report user.', 'assertive');
    } finally {
      setReporting(false);
    }
  };

  const isOtherUserOnline = (otherUserId: number) => onlineUsers.includes(otherUserId);
  const isOtherUserTyping = selectedConv ? typingUsers.has(`${selectedConv.other_user_id}_${selectedConv.listing_id}`) : false;

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
        announce(`Loaded ${sortedConvs.length} conversations.`);
      } catch (error) {
        console.error('Error fetching messages:', error);
        announce('Failed to load messages.', 'assertive');
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
                // Check for duplicate message (simple check by content and timestamp)
                const isDuplicate = c.messages.some(m => 
                  m.content === data.content && 
                  Math.abs(new Date(m.created_at).getTime() - new Date(data.created_at).getTime()) < 1000
                );
                if (isDuplicate) return c;

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
            // Check for duplicate in selected conversation
            const isDuplicate = prev.messages.some(m => 
              m.content === data.content && 
              Math.abs(new Date(m.created_at).getTime() - new Date(data.created_at).getTime()) < 1000
            );
            if (isDuplicate) return prev;

            return {
              ...prev,
              messages: [...prev.messages, data]
            };
          });
          announce(`New message from ${data.sender_name}: ${data.content}`);
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
        const roomName = `chat_${Math.min(user.id, selectedConv.other_user_id)}_${Math.max(user.id, selectedConv.other_user_id)}_${selectedConv.listing_id}`;
        socket.emit('send_message', socketData);
        socket.emit('stop_typing', {
          receiver_id: selectedConv.other_user_id,
          listing_id: selectedConv.listing_id
        });
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
      announce('Message sent.');
    } catch (error) {
      console.error('Error sending reply:', error);
      announce('Failed to send message.', 'assertive');
    }
  };

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-slate-900 dark:text-slate-50" role="status">Loading conversations...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-120px)] flex flex-col">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Messages
        </h1>
      </header>

      <div className="flex-grow flex bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden transition-colors duration-200">
        {/* Sidebar */}
        <aside className="w-1/3 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-900/50">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <label htmlFor="chat-search" className="sr-only">Search chats</label>
              <input 
                id="chat-search"
                type="text" 
                placeholder="Search chats..." 
                className="input-field pl-10 pr-4 py-2 text-sm"
              />
            </div>
          </div>
          <nav className="flex-grow overflow-y-auto" aria-label="Conversations list">
            {conversations.length > 0 ? (
              conversations.map((conv) => (
                <button
                  key={`${conv.listing_id}-${conv.other_user_id}`}
                  onClick={() => setSelectedConv(conv)}
                  aria-selected={selectedConv?.listing_id === conv.listing_id && selectedConv?.other_user_id === conv.other_user_id}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-white dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-50 dark:border-slate-800/50 ${
                    selectedConv?.listing_id === conv.listing_id && selectedConv?.other_user_id === conv.other_user_id
                      ? 'bg-white dark:bg-slate-800 border-l-4 border-l-indigo-600 dark:border-l-indigo-400'
                      : ''
                  }`}
                >
                  <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 relative">
                    {conv.other_user_name.charAt(0)}
                    {isOtherUserOnline(conv.other_user_id) && (
                      <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" aria-label="Online"></span>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-slate-50 truncate">{conv.other_user_name}</h3>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {new Date(conv.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold truncate mb-1">{conv.listing_title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{conv.last_message}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
          </nav>
        </aside>

        {/* Chat Area */}
        <main className="flex-grow flex flex-col bg-white dark:bg-slate-900" aria-label="Chat window">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold relative">
                    {selectedConv.other_user_name.charAt(0)}
                    {isOtherUserOnline(selectedConv.other_user_id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-slate-900 dark:text-slate-50">{selectedConv.other_user_name}</h2>
                      {isOtherUserOnline(selectedConv.other_user_id) ? (
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Offline</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                      <Package className="h-3 w-3" aria-hidden="true" />
                      {selectedConv.listing_title}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Report User"
                >
                  <Flag className="h-5 w-5" />
                </button>
              </div>

              {/* Messages List */}
              <div 
                ref={scrollRef}
                className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-950/20"
                aria-live="polite"
              >
                {selectedConv.messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                        isMe 
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-2 ${isMe ? 'text-indigo-200 dark:text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {isOtherUserTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 rounded-tl-none flex gap-1 items-center">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <label htmlFor="reply-input" className="sr-only">Type your message</label>
                  <input
                    id="reply-input"
                    type="text"
                    value={reply}
                    onChange={(e) => {
                      setReply(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type your message..."
                    className="flex-grow input-field py-3 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!reply.trim()}
                    className="bg-indigo-600 dark:bg-indigo-500 text-white p-3 rounded-2xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12 text-slate-400 dark:text-slate-500">
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-full mb-4">
                <MessageSquare className="h-12 w-12 text-slate-200 dark:text-slate-700" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Select a conversation</h3>
              <p className="text-sm max-w-xs">Pick a chat from the sidebar to start messaging in real-time.</p>
            </div>
          )}
        </main>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Report User</h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Please provide a reason for reporting <strong>{selectedConv?.other_user_name}</strong>. Our team will review it shortly.
            </p>
            <textarea
              className="w-full input-field min-h-[100px] mb-4 p-3 text-sm"
              placeholder="Reason for reporting..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-grow py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReportUser}
                disabled={reporting || !reportReason.trim()}
                className="flex-grow py-2 px-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {reporting ? 'Reporting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
