// Auth Context - Real API Integration
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Hotel, LoginRequest, SignupRequest } from '@/types/api';
import { authApi } from '@/api/auth';
import { apiClient, tokenStorage } from '@/api/client';

interface AuthContextType {
  user: User | null;
  hotel: Hotel | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  setHotel: (hotel: Hotel) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      if (tokenStorage.hasTokens()) {
        try {
          // Fetch current user from backend
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);

          // Fetch hotel data
          try {
            const hotelData = await apiClient.get<Hotel>('/hotels/me');
            setHotel(hotelData);
          } catch {
            console.log('Could not fetch hotel data');
          }
        } catch {
          // Token invalid or expired
          tokenStorage.clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      // Call real login API
      await authApi.login(credentials);

      // Fetch user data after successful login
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);

      // Fetch hotel data
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
      await authApi.logout();
    } catch {
      // Ignore errors, clear local state anyway
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
