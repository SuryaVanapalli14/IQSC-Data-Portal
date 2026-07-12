import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Global Axios Interceptor for Session Invalidation
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Force logout on any 401 (Session invalidated or user deleted)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

interface User {
  id: string;
  email: string;
  name: string;
  role: 'IQAC_ADMIN' | 'FACULTY' | 'HOD';
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>((localStorage.getItem('theme') as any) || 'light');
  const [fontSize, setFontSize] = useState<number>(Number(localStorage.getItem('fontSize')) || 16);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(localStorage.getItem('sidebarCollapsed') === 'true');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`);
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);
  
  // Heartbeat to check session status periodically
  useEffect(() => {
    if (!user) return;
    
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        // Interceptor will handle the 401
      }
    };

    const interval = setInterval(checkSession, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [user]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      setUser, 
      theme, 
      toggleTheme, 
      fontSize, 
      setFontSize, 
      isSidebarCollapsed, 
      setIsSidebarCollapsed, 
      logout 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};


