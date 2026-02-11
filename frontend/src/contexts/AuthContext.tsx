// Auth Context - Real API Integration
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Hotel, LoginRequest, SignupRequest } from '@/types/api';
import { authApi } from '@/api/auth';
import { apiClient, tokenStorage } from '@/api/client';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  hotel: Hotel | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  setHotel: (hotel: Hotel) => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        tokenStorage.setTokens({
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
          token_type: 'Bearer',
          expires_in: session.expires_in || 3600,
        });

        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);

          try {
            const hotelData = await apiClient.get<Hotel>('/hotels/me');
            setHotel(hotelData);
          } catch {
            // Silently fail
          }
        } catch (err) {
          console.error('Auth init error:', err);
          supabase.auth.signOut();
          tokenStorage.clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        tokenStorage.setTokens({
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
          token_type: 'Bearer',
          expires_in: session.expires_in || 3600,
        });
      } else {
        tokenStorage.clearTokens();
        setUser(null);
        setHotel(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session created');

      tokenStorage.setTokens({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token || '',
        token_type: 'Bearer',
        expires_in: data.session.expires_in || 3600,
      });

      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);

      try {
        const hotelData = await apiClient.get<Hotel>('/hotels/me');
        setHotel(hotelData);
      } catch {
        // Silently fail
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: SignupRequest) => {
    setIsLoading(true);
    try {
      // Call real signup API
      const response = await authApi.signup(data);
      setUser(response.user);

      // Fetch hotel data after signup
      try {
        const hotelData = await apiClient.get<Hotel>('/hotels/me');
        setHotel(hotelData);
      } catch {
        console.log('Could not fetch hotel data');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore errors
    } finally {
      setUser(null);
      setHotel(null);
      tokenStorage.clearTokens();
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        hotel,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        setHotel,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
