import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { supabase } from '../lib/supabase';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { announce } = useAccessibility();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            // SECURED: Everyone is safely initialized as a student by default
            role: 'student' 
          }
        }
      });
      if (error) throw error;
      
      const msg = 'Account created successfully! Please check your inbox or spam folder for a verification email.';
      setSuccessMessage(msg);
      announce(msg);
      
      // Clear the form
      setName('');
      setEmail('');
      setPassword('');

      // Give the user time to read the message before redirecting
      setTimeout(() => {
        navigate('/login');
      }, 6000);

    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      announce(msg, 'assertive');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="bg-slate-100 dark:bg-slate-800 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-slate-900 dark:text-white" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Create Account</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Join your campus community today</p>
        </div>

        {error && (
          <div 
            id="register-error"
            className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-3"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-6 rounded-2xl mb-6 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-500">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" aria-hidden="true" />
            <span className="text-base font-black leading-snug">{successMessage}</span>
            <span className="text-xs font-bold mt-2 opacity-80 uppercase tracking-widest">Redirecting to login...</span>
          </div>
        ) : (
          <>
            {/* Informational Banner replacing the Google Button */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-white">Google Auth is currently unavailable.</span>
                <br />
                Please manually type your email and password to sign up.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <input
                    id="name"
                    type="text"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white placeholder:text-slate-400"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-describedby={error ? "register-error" : undefined}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white placeholder:text-slate-400"
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-describedby={error ? "register-error" : undefined}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <input
                    id="password"
                    type="password"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all dark:text-white placeholder:text-slate-400"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby={error ? "register-error" : undefined}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 h-14 rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-50 transition-all mt-4"
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-slate-900 dark:text-white hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;