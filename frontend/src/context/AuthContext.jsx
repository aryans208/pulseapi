import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pulseapi_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('pulseapi_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await authApi.getProfile();
          if (res.data?.data?.user) {
            setUser(res.data.data.user);
            localStorage.setItem('pulseapi_user', JSON.stringify(res.data.data.user));
          }
        } catch (err) {
          console.error('[Auth Init Error] Token invalid or expired:', err.message);
          localStorage.removeItem('pulseapi_token');
          localStorage.removeItem('pulseapi_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { user: loggedInUser, token: authToken } = res.data.data;
    
    localStorage.setItem('pulseapi_token', authToken);
    localStorage.setItem('pulseapi_user', JSON.stringify(loggedInUser));
    
    setToken(authToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    const { user: registeredUser, token: authToken } = res.data.data;
    
    localStorage.setItem('pulseapi_token', authToken);
    localStorage.setItem('pulseapi_user', JSON.stringify(registeredUser));
    
    setToken(authToken);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = () => {
    localStorage.removeItem('pulseapi_token');
    localStorage.removeItem('pulseapi_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
