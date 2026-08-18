import { apiPost } from "./client";
import type { AuthResponse, Credentials, User } from "../types/auth";
import { apiGet } from "./client";

export function register(credentials: Credentials): Promise<AuthResponse> {
  return apiPost<AuthResponse, Credentials>("/auth/register", credentials);
}

export function login(credentials: Credentials): Promise<AuthResponse> {
  return apiPost<AuthResponse, Credentials>("/auth/login", credentials);
}

export function logout(): Promise<void> {
  return apiPost<void>("/auth/logout");
}

export function refreshSession(): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/auth/refresh");
}

export function fetchCurrentUser(): Promise<User> {
  return apiGet<User>("/auth/me");
}
