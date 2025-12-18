import React, { createContext, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('access_token'),
  );
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await API.post('/auth/login', { email, password });
      const { user: userData, access_token } = response.data;
      setUser(userData);
      setToken(access_token);
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      setIsLoading(true);
      try {
        const response = await API.post('/auth/register', {
          email,
          password,
          fullName,
        });
        const { user: userData, access_token } = response.data;
        setUser(userData);
        setToken(access_token);
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user:
          user ||
          (JSON.parse(localStorage.getItem('user') || 'null') as User | null),
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
