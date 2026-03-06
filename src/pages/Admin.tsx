import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Users, Package, Trash2, AlertCircle, Activity, MessageSquare, CreditCard, Clock } from 'lucide-react';
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
  onlineUsers: number;
  recentErrors: { timestamp: string; message: string; path?: string }[];
}

const Admin: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const { onlineCount } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/stats')
        ]);
        setUsers(usersRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const deleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/admin/users/${userToDelete}`);
      setUsers(users.filter(u => u.id !== userToDelete));
      // Refresh stats after deletion
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-12">
        <div className="bg-indigo-600 p-3 rounded-2xl">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Manage users and platform content</p>
        </div>
      </div>

      {/* System Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-indigo-50 p-2 rounded-xl">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
              <Activity className="h-3 w-3" /> {onlineCount} Online
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Total Users</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-50 p-2 rounded-xl">
              <Package className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Active Listings</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats?.totalListings || 0}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-2 rounded-xl">
              <MessageSquare className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Total Messages</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats?.totalMessages || 0}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-50 p-2 rounded-xl">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Transactions</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats?.totalTransactions || 0}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900">User Management</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                  <th className="px-8 py-4">User</th>
                  <th className="px-8 py-4">Role</th>
                  <th className="px-8 py-4">Joined</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                        user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-4 text-right">
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => setUserToDelete(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health / Errors */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h2 className="font-bold text-gray-900">Recent Errors</h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto max-h-[600px]">
            {stats?.recentErrors && stats.recentErrors.length > 0 ? (
              <div className="space-y-4">
                {stats.recentErrors.map((error, idx) => (
                  <div key={idx} className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Error</span>
                      <span className="text-[10px] text-red-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(error.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-red-900 mb-1">{error.message}</p>
                    {error.path && (
                      <p className="text-[10px] font-mono text-red-500 bg-white/50 px-2 py-1 rounded inline-block">
                        {error.path}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <p className="font-bold text-gray-900">System Healthy</p>
                <p className="text-sm text-gray-500">No recent errors detected</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
