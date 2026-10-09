import apiClient from './client';
import { PublicUser } from './auth';

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
}

// ADMIN-only — see backend/src/routes/staff.routes.ts. The backend
// never accepts a `role` field here any more than public registration
// does; it always creates Role.STAFF server-side.
export async function createStaffAccount(input: CreateStaffInput): Promise<PublicUser> {
  const { data } = await apiClient.post<{ user: PublicUser }>('/admin/staff', input);
  return data.user;
}

export async function listStaff(): Promise<PublicUser[]> {
  const { data } = await apiClient.get<{ users: PublicUser[] }>('/admin/staff');
  return data.users;
}
