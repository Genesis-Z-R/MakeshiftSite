import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { Shield, Users, Package, Trash2, AlertCircle, Activity, MessageSquare, CreditCard, Clock, Flag, AlertTriangle } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useSocket } from '../context/SocketContext';

interface AdminUser {
  id: number;
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
  onlineUsers: number;
  recentErrors: { timestamp: string; message: string; path?: string }[];
}

interface Report {
  id: number;
  reporter_id: number;
  reported_id: number;
  reason: string;
  status: string;
  created_at: string;
  reporter_name: string;
  reported_name: string;
}

const Admin: React.FC = () => {
  const { announce } = useAccessibility();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'errors'>('users');
  const [warningUserId, setWarningUserId] = useState<number | null>(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);
  const { onlineUsers } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, statsRes, reportsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/stats'),
          api.get('/admin/reports')
        ]);
        setUsers(usersRes.data);
        setStats(statsRes.data);
        setReports(reportsRes.data);
        announce('Admin dashboard loaded successfully.');
      } catch (error) {
        console.error('Error fetching admin data:', error);
        announce('Failed to load admin data.', 'assertive');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
      await api.post('/admin/warnings', {
        user_id: warningUserId,
        message: warningMessage
      });
      announce('Warning sent successfully.');
      setWarningUserId(null);
      setWarningMessage('');
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
      // Refresh stats after deletion
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);
      announce('User deleted successfully.');
    } catch (error) {
      console.error('Error deleting user:', error);
      announce('Failed to delete user.', 'assertive');
    } finally {
      setUserToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center" role="status">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Loading admin dashboard...</p>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="flex items-center gap-4 mb-12">
        <div className="bg-indigo-600 dark:bg-indigo-500 p-3 rounded-2xl">
          <Shield className="h-8 w-8 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage users and platform content</p>
        </div>
      </header>

      {/* System Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" aria-label="System Statistics">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-xl">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            </div>
            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full flex items-center gap-1">
              <Activity className="h-3 w-3" aria-hidden="true" /> {onlineUsers.length} Online
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Users</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stats?.totalUsers || 0}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-xl">
              <Flag className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Pending Reports</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stats?.totalReports || 0}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl">
              <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Listings</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stats?.totalListings || 0}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-xl">
              <MessageSquare className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Messages</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stats?.totalMessages || 0}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-xl">
              <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Transactions</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stats?.totalTransactions || 0}</h3>
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'users' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Users
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'reports' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Reports
          {stats?.totalReports && stats.totalReports > 0 ? (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{stats.totalReports}</span>
          ) : null}
          {activeTab === 'reports' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'errors' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
        >
          System Errors
          {activeTab === 'errors' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'users' && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <h2 className="font-bold text-slate-900 dark:text-slate-50">User Management</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                    <th className="px-8 py-4">User</th>
                    <th className="px-8 py-4">Role</th>
                    <th className="px-8 py-4">Joined</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-50">{user.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                          user.role === 'admin' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role !== 'admin' && (
                            <>
                              <button
                                onClick={() => setWarningUserId(user.id)}
                                className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                                title="Send Warning"
                              >
                                <AlertTriangle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => setUserToDelete(user.id)}
                                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                aria-label={`Delete user ${user.name}`}
                              >
                                <Trash2 className="h-5 w-5" aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50">
              <Flag className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
              <h2 className="font-bold text-slate-900 dark:text-slate-50">User Reports</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                    <th className="px-8 py-4">Reporter</th>
                    <th className="px-8 py-4">Reported User</th>
                    <th className="px-8 py-4">Reason</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reports.length > 0 ? reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-8 py-4 text-sm font-medium text-slate-900 dark:text-slate-50">{report.reporter_name}</td>
                      <td className="px-8 py-4 text-sm font-medium text-slate-900 dark:text-slate-50">{report.reported_name}</td>
                      <td className="px-8 py-4 text-sm text-slate-500 dark:text-slate-400">{report.reason}</td>
                      <td className="px-8 py-4">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                          report.status === 'pending' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        {report.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setWarningUserId(report.reported_id)}
                              className="text-xs font-bold text-amber-600 hover:underline"
                            >
                              Warn
                            </button>
                            <button
                              onClick={() => resolveReport(report.id)}
                              className="text-xs font-bold text-indigo-600 hover:underline"
                            >
                              Resolve
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-400 dark:text-slate-500">No reports found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'errors' && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col transition-colors duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
              <h2 className="font-bold text-slate-900 dark:text-slate-50">Recent Errors</h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto max-h-[600px]">
              {stats?.recentErrors && stats.recentErrors.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentErrors.map((error, idx) => (
                    <div key={idx} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Error</span>
                        <span className="text-[10px] text-red-400 dark:text-red-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" /> {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">{error.message}</p>
                      {error.path && (
                        <p className="text-[10px] font-mono text-red-500 dark:text-red-400 bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded inline-block">
                          {error.path}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-full mb-4">
                    <Activity className="h-8 w-8 text-green-600 dark:text-green-400" aria-hidden="true" />
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">System Healthy</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">No recent errors detected</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Warning Modal */}
      {warningUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Send Warning</h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Send a formal warning to <strong>{users.find(u => u.id === warningUserId)?.name}</strong>. This will be visible on their profile.
            </p>
            <textarea
              className="w-full input-field min-h-[100px] mb-4 p-3 text-sm"
              placeholder="Warning message..."
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setWarningUserId(null)}
                className="flex-grow py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendWarning}
                disabled={sendingWarning || !warningMessage.trim()}
                className="flex-grow py-2 px-4 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
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
        message="Are you sure you want to delete this user? All their listings and data will be permanently removed."
        confirmText="Delete User"
        type="danger"
      />
    </div>
  );
};

export default Admin;
