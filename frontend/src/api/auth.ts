import apiClient from './client';

export type Role = 'CITIZEN' | 'ADMIN' | 'STAFF';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
  return data;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', input);
  return data;
}

export async function getCurrentUser(): Promise<PublicUser> {
  const { data } = await apiClient.get<{ user: PublicUser }>('/auth/me');
  return data.user;
}
