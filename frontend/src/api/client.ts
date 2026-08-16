import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";
import type { ApiErrorBody, AuthResponse } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,

  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient

      .post<AuthResponse>("/auth/refresh")
      .then((response) => {
        useAuthStore.getState().setSession(response.data.accessToken, response.data.user);
        return response.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;
    const isUnauthorized = error.response?.status === 401;
    const isExemptPath = NO_REFRESH_PATHS.some((path) => config?.url?.startsWith(path));

    if (isUnauthorized && config && !config._retried && !isExemptPath) {
      config._retried = true;

      try {
        await refreshAccessToken();

        return apiClient(config);
      } catch {
        useAuthStore.getState().clearSession();
      }
    }

    return Promise.reject(error);
  },
);

export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiClient.get<T>(path);
  return response.data;
}

export async function apiPost<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
): Promise<TResponse> {
  const response = await apiClient.post<TResponse>(path, body);
  return response.data;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return "Cannot reach the server. Is the backend running?";
    }
    if (error.response.data?.message) {
      return error.response.data.message;
    }
  }

  return fallback;
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.fieldErrors ?? {};
  }

  return {};
}
