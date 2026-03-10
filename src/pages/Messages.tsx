import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { MessageSquare, User, Package, Clock, Send, Search, Flag, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
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
  other_user_id: string;
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
  const { socket, clearNotifications, onlineUsers, typingUsers } = useSocket();
  const { user } = useAuth();
  const { announce } = useAccessibility();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearNotifications();
  }, [clearNotifications]);

  // Handle auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedConv, typingUsers]);

  // FETCH MESSAGES LOGIC
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get('/messages');
        
        // FIX 1: Defensive check for the array to prevent .forEach crash
        const msgs: Message[] = Array.isArray(response.data) ? response.data : [];
        
        if (msgs.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const groups: { [key: string]: Conversation } = {};
        
        msgs.forEach(msg => {
          // UUIDs are strings, so comparison is now safe
          const otherUserId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
          const otherUserName = msg.sender_id === user?.id ? msg.receiver_name : msg.sender_name;
          const key = `${msg.listing_id}-${otherUserId}`;
          
          if (!groups[key]) {
            groups[key] = {
              listing_id: msg.listing_id,
              listing_title: msg.listing_title,
              other_user_id: otherUserId,
              other_user_name: otherUserName || 'Unknown User',
              last_message: msg.content,
              last_time: msg.created_at,
              messages: []
            };
          }
          groups[key].messages.push(msg);
        });

        const sortedConvs = Object.values(groups).map(group => {
          group.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const last = group.messages[group.messages.length - 1];
          return {
            ...group,
            last_message: last.content,
            last_time: last.created_at
          };
        }).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());

        setConversations(sortedConvs);
        if (sortedConvs.length > 0 && !selectedConv) {
          setSelectedConv(sortedConvs[0]);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setConversations([]); 
        announce('Failed to load messages.', 'assertive');
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchMessages();
  }, [user?.id]);

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
      setReply('');
      announce('Message sent.');
      // The socket listener or a re-fetch will handle the UI update
    } catch (error) {
      announce('Failed to send message.', 'assertive');
    }
  };

  if (loading) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex-grow flex bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Sidebar */}
        <aside className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-slate-100 dark:border-slate-800 flex-col`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h1 className="text-xl font-black">Messages</h1>
          </div>
          <div className="overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={`${conv.listing_id}-${conv.other_user_id}`}
                onClick={() => setSelectedConv(conv)}
                className={`w-full p-4 text-left border-b border-slate-50 dark:border-slate-800 ${
                  selectedConv?.other_user_id === conv.other_user_id ? 'bg-indigo-50 dark:bg-slate-800' : ''
                }`}
              >
                <p className="font-bold">{conv.other_user_name}</p>
                <p className="text-xs text-indigo-600 truncate">{conv.listing_title}</p>
                <p className="text-xs text-slate-500 truncate">{conv.last_message}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-grow flex flex-col bg-white dark:bg-slate-900">
          {selectedConv ? (
            <>
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-bold">{selectedConv.other_user_name}</h2>
                <span className="text-xs font-bold text-indigo-600 uppercase">{selectedConv.listing_title}</span>
              </div>
              <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                {selectedConv.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl ${
                      msg.sender_id === user?.id ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-800'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendReply} className="p-4 border-t flex gap-2">
                <input 
                  type="text" 
                  value={reply} 
                  onChange={(e) => setReply(e.target.value)} 
                  className="flex-grow p-3 rounded-xl border dark:bg-slate-800"
                  placeholder="Type a message..."
                />
                <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl"><Send className="h-5 w-5"/></button>
              </form>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-slate-400">Select a conversation</div>
          )}
        </main>
      </div>
    </div>
  );
};

// FIX 3: ESSENTIAL DEFAULT EXPORT FOR RAILWAY BUILD
export default Messages;
