import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import api from '../services/api';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { announce } = useAccessibility();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user } = event.data;
        login(token, user);
        announce('Login successful! Welcome back.');
        navigate('/');
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [login, navigate, announce]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/auth/google/url');
      const { url } = response.data;
      
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err: any) {
      setError('Failed to initialize Google login');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.token, response.data.user);
      announce('Login successful! Redirecting to marketplace.');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed';
      setError(msg);
      announce(msg, 'assertive');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-white dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Login to access the campus marketplace</p>
        </div>

        {error && (
          <div 
            id="login-error"
            className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2"
            role="alert"
          >
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" />
            Continue with Google
          </button>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase">Or</span>
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
              <input
                id="email"
                type="email"
                required
                className="input-field pl-10"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
              <input
                id="password"
                type="password"
                required
                className="input-field pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const response = await api.post('/auth/login', { email: 'admin@campus.edu', password: 'password123' });
                login(response.data.token, response.data.user);
                announce('Demo login successful!');
                navigate('/');
              } catch (err) {
                setError('Demo login failed. Try registering.');
              } finally {
                setLoading(false);
              }
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 py-3 rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border border-indigo-100 dark:border-indigo-900/30"
          >
            Quick Login (Admin Demo)
          </button>
        </div>

        <p className="text-center text-slate-500 dark:text-slate-400 mt-8">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
