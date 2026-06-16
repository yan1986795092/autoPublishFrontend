import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Refresh token 单例模块
 *
 * 背景：项目中有两个 axios 客户端（apiClient 和 agentApiClient），各自注册了
 * 401 拦截器。如果两个 client 几乎同时遇到 401，会各自发起 /auth/refresh 请求，
 * 导致后端并发刷新 + 旧 refresh token 立即失效。
 *
 * 这里把 refresh 流程集中：第一个到达的 401 启动刷新，后续请求等待该 promise
 * resolve 后用新 access token 重试，避免竞态。
 */
let inflightRefresh: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  // 如果已经有一个刷新请求在飞，复用同一个 promise
  if (inflightRefresh) return inflightRefresh;

  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  inflightRefresh = (async (): Promise<string | null> => {
    try {
      const response = await axios.post<{ success: boolean; data: { access_token: string } }>(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        { refresh_token: refreshToken }
      );
      if (response.data.success && response.data.data) {
        const newAccess = response.data.data.access_token;
        useAuthStore.getState().setTokens(newAccess, refreshToken);
        return newAccess;
      }
      useAuthStore.getState().logout();
      return null;
    } catch {
      useAuthStore.getState().logout();
      return null;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

/** 给 axios 拦截器使用的统一 401 处理：刷新成功后用新 token 重试原请求 */
export async function handleUnauthorizedRetry(
  client: ReturnType<typeof axios.create>,
  originalRequest: any
): Promise<any> {
  if (originalRequest?._retry) {
    return Promise.reject(new Error('Request already retried'));
  }
  originalRequest._retry = true;
  const newToken = await refreshAccessToken();
  if (!newToken) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(new Error('Failed to refresh access token'));
  }
  if (originalRequest.headers) {
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
  }
  return client(originalRequest);
}
