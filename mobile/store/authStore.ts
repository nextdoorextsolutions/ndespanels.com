import { create } from 'zustand';
import { getAuthToken, getUserData, setAuthToken, setUserData, clearAuth } from '../lib/auth';

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  salesRepCode?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setToken: (token) => set({ token }),

  loadAuth: async () => {
    try {
      const token = await getAuthToken();
      const user = await getUserData();
      
      if (token && user) {
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      
      const response = await fetch(__DEV__ 
        ? 'http://localhost:3000/api/auth/login' 
        : 'https://ndespanels.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }
      
      await setAuthToken(data.token);
      await setUserData(data.user);
      
      set({ 
        user: data.user, 
        token: data.token, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await clearAuth();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      console.error('Logout error:', error);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
