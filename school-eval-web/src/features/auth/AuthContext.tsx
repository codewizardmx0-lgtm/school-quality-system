/**
 * سياق المصادقة وإدارة الجلسة (Auth Context & Provider)
 * 
 * يدمج TanStack Query مع React Context API:
 * 1. يتولى تسجيل الدخول واستخراج وتخزين الرمز في sessionStorage.
 * 2. يستعلم عن بيانات المستخدم من /api/v1/auth/me تلقائيًا عند توفر الرمز.
 * 3. يتيح دوال login و logout وحالة المصادقة لكافة مكوّنات التطبيق.
 * 4. يستمع لأحداث 401 للتحويل الفوري لصفحة الدخول.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, TOKEN_STORAGE_KEY } from '../../api/client';
import type { User, LoginResponseData, ApiResponse } from './types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (credentials: { username: string; password: string }) => Promise<LoginResponseData>;
  logout: () => Promise<void>;
  refetchUser: () => void;
  authError: string | null;
  clearAuthError: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  });
  const [authError, setAuthError] = useState<string | null>(null);

  // استعلام بيانات المستخدم المصادق عبر /api/v1/auth/me
  const {
    data: meResponse,
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = useQuery<ApiResponse<User>>({
    queryKey: ['auth', 'me', token],
    queryFn: () => apiClient<User>('/auth/me'),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const user = meResponse?.data || null;

  // الاستماع لحدث 401 (انتهاء الجلسة أو عدم الصلاحية)
  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      setToken(null);
      queryClient.clear();
      setAuthError(customEvent.detail?.message || 'انتهت الجلسة لعدم النشاط. يرجى تسجيل الدخول مجددًا.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [queryClient]);

  // طفرة تسجيل الدخول (Login Mutation)
  const loginMutation = useMutation<LoginResponseData, Error, { username: string; password: string }>({
    mutationFn: async (credentials) => {
      setAuthError(null);
      const res = await apiClient<LoginResponseData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (!res.data) {
        throw new Error('لم يتم استلام بيانات الدخول من الخادم.');
      }

      return res.data;
    },
    onSuccess: (data) => {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      // تحديث كاش المستخدم مباشرة
      queryClient.setQueryData(['auth', 'me', data.token], {
        data: data.user,
        message: null,
        errors: null,
        meta: null,
      });
    },
  });

  // طفرة تسجيل الخروج (Logout Mutation)
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        if (token) {
          await apiClient<null>('/auth/logout', { method: 'POST' });
        }
      } finally {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        queryClient.clear();
      }
    },
    onSuccess: () => {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      queryClient.clear();
    },
  });

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading: !!token && isUserLoading,
    isLoggingOut: logoutMutation.isPending,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    refetchUser,
    authError,
    clearAuthError: () => setAuthError(null),
    hasPermission: (permission: string) => user?.permissions?.includes(permission) ?? false,
  }), [user, token, isUserLoading, logoutMutation.isPending, loginMutation.mutateAsync, logoutMutation.mutateAsync, refetchUser, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
