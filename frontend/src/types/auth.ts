export type Role = "CUSTOMER" | "ADMIN";

export interface User {
  id: number;
  email: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;

  expiresInSeconds: number;
  user: User;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface ApiErrorBody {
  status?: number;
  error?: string;
  message?: string;
  path?: string;

  fieldErrors?: Record<string, string>;
}
