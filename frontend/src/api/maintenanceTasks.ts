import apiClient from './client';
import { PublicUser } from './auth';
import { Complaint } from './complaints';

export type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUIRED' | 'VERIFIED';

export interface MaintenanceTask {
  id: string;
  taskCode: string;
  complaintId: string;
  complaint: Complaint;
  assignedStaffId: string;
  assignedStaff: PublicUser;
  taskInstruction: string;
  status: TaskStatus;
  proofImageUrl: string | null;
  staffComment: string | null;
  adminComment: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  verifiedAt: string | null;
}

export interface AssignTaskInput {
  complaintId: string;
  assignedStaffId: string;
  taskInstruction: string;
}

// ADMIN-only.
export async function assignTask(input: AssignTaskInput): Promise<MaintenanceTask> {
  const { data } = await apiClient.post<{ task: MaintenanceTask }>('/maintenance-tasks', input);
  return data.task;
}

// STAFF-only: the signed-in staff member's own tasks.
export async function listMyTasks(): Promise<MaintenanceTask[]> {
  const { data } = await apiClient.get<{ tasks: MaintenanceTask[] }>('/maintenance-tasks/my');
  return data.tasks;
}

// ADMIN, or the assigned STAFF member — enforced by the backend.
export async function getTaskById(id: string): Promise<MaintenanceTask> {
  const { data } = await apiClient.get<{ task: MaintenanceTask }>(`/maintenance-tasks/${id}`);
  return data.task;
}

// Assigned-STAFF-only.
export async function startTask(id: string): Promise<MaintenanceTask> {
  const { data } = await apiClient.patch<{ task: MaintenanceTask }>(
    `/maintenance-tasks/${id}/start`,
    {}
  );
  return data.task;
}

export interface SubmitTaskInput {
  staffComment?: string;
  image: File;
}

// Assigned-STAFF-only. Multipart, same Content-Type-clearing trick as
// api/complaints.ts's createComplaint — a proof photo is required.
export async function submitTask(id: string, input: SubmitTaskInput): Promise<MaintenanceTask> {
  const formData = new FormData();
  if (input.staffComment) formData.append('staffComment', input.staffComment);
  formData.append('image', input.image);

  const { data } = await apiClient.patch<{ task: MaintenanceTask }>(
    `/maintenance-tasks/${id}/submit`,
    formData,
    { headers: { 'Content-Type': undefined } }
  );
  return data.task;
}

// ADMIN-only.
export async function verifyTask(id: string, adminComment?: string): Promise<MaintenanceTask> {
  const { data } = await apiClient.patch<{ task: MaintenanceTask }>(
    `/maintenance-tasks/${id}/verify`,
    { adminComment }
  );
  return data.task;
}

// ADMIN-only; adminComment is required by the backend.
export async function requestRevision(id: string, adminComment: string): Promise<MaintenanceTask> {
  const { data } = await apiClient.patch<{ task: MaintenanceTask }>(
    `/maintenance-tasks/${id}/revision`,
    { adminComment }
  );
  return data.task;
}
