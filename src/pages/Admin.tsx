import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { Shield, Users, Package, Trash2, Activity, MessageSquare, CreditCard, Clock, Flag, AlertTriangle } from 'lucide-react';
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
  // --- NEW SECURITY IMPORTS ---
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
  const { onlineUsers = [] } = useSocket();

  // --- NEW ROUTE PROTECTION ---
  useEffect(() => {
    // If they are not logged in, or their role is not admin, kick them to the home page
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
      setStats(statsRes.data);
      setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
      announce('Admin dashboard loaded.');
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setUsers([]);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data if they are an admin
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const resolveReport = async (reportId: number) => {
    try {
      await api.post(`/admin/reports/${reportId}/resolve`);
      setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
    } catch (error) {
      console.error('Error resolving report:', error);
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
    }
  };

  // --- PREVENT UI FLASH ---
  // If the redirect hasn't happened yet, return null so they don't see the dashboard
  if (!user || user.role !== 'admin') return null;

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Initializing Console...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <header className="flex items-center gap-5 mb-10">
        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Console</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">System Management</p>
        </div>
      </header>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {[
          { label: 'Total Users', val: stats?.totalUsers, icon: <Users className="h-4 w-4 text-indigo-600" />, sub: `${onlineUsers.length} Live` },
          { label: 'Reports', val: stats?.totalReports, icon: <Flag className="h-4 w-4 text-red-600" />, danger: (stats?.totalReports || 0) > 0 },
          { label: 'Listings', val: stats?.totalListings, icon: <Package className="h-4 w-4 text-emerald-600" /> },
          { label: 'Messages', val: stats?.totalMessages, icon: <MessageSquare className="h-4 w-4 text-amber-600" /> },
          { label: 'Volume', val: stats?.totalTransactions, icon: <CreditCard className="h-4 w-4 text-purple-600" /> },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{s.icon}</div>
              {s.sub && <span className="text-[9px] font-black text-green-500 uppercase">{s.sub}</span>}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
            <h3 className={`text-xl font-black ${s.danger ? 'text-red-600' : 'text-slate-900 dark:text-slate-50'}`}>{s.val || 0}</h3>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="flex gap-6 mb-8 border-b border-slate-100 dark:border-slate-800">
        {['users', 'reports', 'errors'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-4 px-1 text-xs font-black uppercase tracking-widest relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Identity</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Registry</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(Array.isArray(users) ? users : []).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-black">{u.name.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{u.name}</p>
                          <p className="text-[10px] font-medium text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'admin' && (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setWarningUserId(u.id)} className="p-2 text-slate-300 hover:text-amber-500"><AlertTriangle className="h-4 w-4" /></button>
                          <button onClick={() => setUserToDelete(u.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Reported</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(Array.isArray(reports) ? reports : []).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-50">{r.reported_name}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{r.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${r.status === 'pending' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.status === 'pending' && (
                        <div className="flex items-center justify-end gap-4">
                          <button 
                            onClick={() => setWarningUserId(r.reported_id)} 
                            className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-500 transition-colors"
                          >
                            Issue Warning
                          </button>
                          <button 
                            onClick={() => resolveReport(r.id)} 
                            className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-500 transition-colors"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {(Array.isArray(stats?.recentErrors) ? stats.recentErrors : []).map((err, i) => (
              <div key={i} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-black uppercase text-red-600">Incident Report</span>
                  <span className="text-[9px] font-bold text-slate-400">{new Date(err.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{err.message}</p>
                {err.path && <p className="text-[10px] font-mono text-red-400 mt-1">{err.path}</p>}
              </div>
            ))}
            {(!stats?.recentErrors || stats.recentErrors.length === 0) && (
              <div className="py-10 text-center">
                <Activity className="h-10 w-10 text-green-500 mx-auto mb-3 opacity-20" />
                <p className="text-xs font-black uppercase text-slate-400">All Systems Nominal</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WARNING MODAL */}
      {warningUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-black mb-2 text-slate-900 dark:text-slate-50">Issue Warning</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">User Violation Protocol</p>
            <textarea
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-indigo-500 min-h-[120px] mb-6"
              placeholder="Detail the violation..."
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setWarningUserId(null)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
              <button 
                onClick={sendWarning} 
                disabled={sendingWarning || !warningMessage.trim()}
                className="flex-1 bg-amber-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-100 dark:shadow-none"
              >
                {sendingWarning ? 'Sending...' : 'Confirm Warning'}
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
        message="Permanently remove this identity and all associated assets?"
        confirmText="Confirm Deletion"
        type="danger"
      />
    </div>
  );
};

export default Admin;