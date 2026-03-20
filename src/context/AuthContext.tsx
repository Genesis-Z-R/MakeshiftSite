import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLiveUser = async (supabaseUser: SupabaseUser | null) => {
    if (!supabaseUser) {
      setUser(null);
      return;
    }

    let liveUser: User = {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      email: supabaseUser.email || '',
      role: supabaseUser.user_metadata?.role || 'student', 
    };

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', supabaseUser.id)
        .single();

      if (data && !error) {
        liveUser.role = data.role; 
        if (data.name) liveUser.name = data.name; 
      }
    } catch (err) {
      console.error("Error fetching live user data:", err);
    }

    setUser(liveUser);
  };

  useEffect(() => {
    let mounted = true; // FIXED: Added safety flag to stop memory leaks and freezing

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          await fetchLiveUser(session?.user ?? null);
          if (session?.access_token) {
            localStorage.setItem('token', session.access_token);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      await fetchLiveUser(session?.user ?? null);
      
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token);
      } else {
        localStorage.removeItem('token');
      }
      
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false; 
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};