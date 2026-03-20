import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { Shield, Users, Package, Trash2, Activity, MessageSquare, CreditCard, Flag, AlertTriangle, CheckCircle } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useSocket } from '../context/SocketContext';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface SystemStats {
  totalUsers: number;
  totalListings: number;
  totalMessages: number;
  totalTransactions: number;
  totalReports: number;
  recentErrors: { timestamp: string; message: string; path?: string }[];
}

interface Report {
  id: number;
  reporter_id: string;
  reported_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_name: string;
  reported_name: string;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { announce } = useAccessibility();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'errors'>('users');
  const [warningUserId, setWarningUserId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);
  
  // Safely fallback to an empty array if the socket context is missing
  const { onlineUsers = [] } = useSocket() || {};

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes, reportsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats'),
        api.get('/admin/reports')
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setStats(statsRes.data || null);
      setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
      announce('Admin dashboard loaded.');
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setUsers([]);
      setReports([]);
      announce('Failed to load some dashboard data.', 'assertive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const resolveReport = async (reportId: number) => {
    try {
      await api.post(`/admin/reports/${reportId}/resolve`);
      setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      announce('Report resolved.');
    } catch (error) {
      console.error('Error resolving report:', error);
      announce('Failed to resolve report.', 'assertive');
    }
  };

  const sendWarning = async () => {
    if (!warningUserId || !warningMessage.trim()) return;
    setSendingWarning(true);
    try {
      await api.post('/admin/warnings', { user_id: warningUserId, message: warningMessage });
      setWarningUserId(null);
      setWarningMessage('');
      announce('Warning sent.');
    } catch (error) {
      console.error('Error sending warning:', error);
      announce('Failed to send warning.', 'assertive');
    } finally {
      setSendingWarning(false);
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/admin/users/${userToDelete}`);
      setUsers(users.filter(u => u.id !== userToDelete));
      setUserToDelete(null);
      announce('User deleted.');
    } catch (error) {
      console.error('Error deleting user:', error);
      announce('Failed to delete user.', 'assertive');
    }
  };

  if (!user || user.role !== 'admin') return null;

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full"></div>
        <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Initializing Console...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pb-20">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-900">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 dark:bg-white p-2 rounded-xl shrink-0">
            <Shield className="h-5 w-5 text-white dark:text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Console</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">System Management</p>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Stats Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 p-4 min-w-max max-w-7xl mx-auto">
          {[
            { label: 'Users', val: stats?.totalUsers, icon: <Users className="h-4 w-4" />, sub: `${(onlineUsers || []).length} Live` },
            { label: 'Reports', val: stats?.totalReports, icon: <Flag className="h-4 w-4" />, danger: (stats?.totalReports || 0) > 0 },
            { label: 'Listings', val: stats?.totalListings, icon: <Package className="h-4 w-4" /> },
            { label: 'Messages', val: stats?.totalMessages, icon: <MessageSquare className="h-4 w-4" /> },
            { label: 'Volume', val: stats?.totalTransactions, icon: <CreditCard className="h-4 w-4" /> },
          ].map((s, i) => (
            <div key={i} className="flex flex-col justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 w-32 shrink-0">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-1.5 rounded-lg ${s.danger ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  {s.icon}
                </div>
                {s.sub && <span className="text-[8px] font-black text-green-500 uppercase">{s.sub}</span>}
              </div>
              <div>
                {/* Fallback to 0 if the value is missing */}
                <h3 className={`text-xl font-black leading-none mb-1 ${s.danger ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{s.val ?? 0}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="sticky top-[73px] md:top-[76px] z-30 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-center">
        {['users', 'reports', 'errors'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 max-w-[200px] py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === tab ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto md:px-4 md:py-6">
        
        {/* USERS LIST */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 md:rounded-2xl md:border border-y border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {users.length === 0 ? (
               <div className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                 No users found
               </div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-slate-900 text-sm font-black shrink-0">
                      {/* CRASH FIX: Safe fallback if name is empty */}
                      {(u.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{u.name || 'Unknown User'}</p>
                        {u.role === 'admin' && (
                          <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded uppercase bg-slate-900 dark:bg-white text-white dark:text-slate-900">Admin</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{u.email || 'No email'}</p>
                    </div>
                  </div>
                  {u.role !== 'admin' && (
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button onClick={() => setWarningUserId(u.id)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Issue Warning">
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                      <button onClick={() => setUserToDelete(u.id)} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500 hover:text-red-700 transition-colors" title="Delete User">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* REPORTS LIST */}
        {activeTab === 'reports' && (
          <div className="bg-white dark:bg-slate-900 md:rounded-2xl md:border border-y border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {reports.length === 0 ? (
              <div className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                No active reports
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reported User</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{r.reported_name || 'Unknown'}</h4>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest ${r.status === 'pending' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {r.status || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-300">{r.reason}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">
                      Reported by: {r.reporter_name || 'Anonymous'}
                    </p>
                  </div>

                  {r.status === 'pending' && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setWarningUserId(r.reported_id)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Issue Warning
                      </button>
                      <button onClick={() => resolveReport(r.id)} className="flex-1 py-3 bg-slate-900 dark:bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-white dark:text-slate-900 flex justify-center items-center gap-1 hover:opacity-90 transition-opacity">
                        <CheckCircle className="h-3 w-3" /> Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ERRORS LIST */}
        {activeTab === 'errors' && (
          <div className="p-4 md:p-0 space-y-3">
            {(!stats?.recentErrors || stats.recentErrors.length === 0) ? (
              <div className="py-20 text-center">
                <Activity className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">All Systems Nominal</p>
              </div>
            ) : (
              stats.recentErrors.map((err, i) => (
                <div key={i} className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1">
                      <Activity className="h-3 w-3" /> Incident
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {err.timestamp ? new Date(err.timestamp).toLocaleTimeString() : 'Unknown Time'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{err.message}</p>
                  {err.path && <p className="text-[10px] font-mono text-red-500 break-all">{err.path}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* WARNING MODAL */}
      {warningUserId && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-md p-6 rounded-t-3xl md:rounded-3xl shadow-2xl border-t md:border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-200">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">Issue Warning</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">User Violation Protocol</p>
            
            <textarea
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white min-h-[120px] mb-6 placeholder:text-slate-400"
              placeholder="Detail the terms of service violation..."
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => setWarningUserId(null)} 
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={sendWarning} 
                disabled={sendingWarning || !warningMessage.trim()}
                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
              >
                {sendingWarning ? 'Sending...' : 'Send Warning'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={userToDelete !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={deleteUser}
        title="Delete User"
        message="Permanently remove this identity and all associated assets? This action is irreversible."
        confirmText="Confirm Deletion"
        type="danger"
      />
    </div>
  );
};

export default Admin;