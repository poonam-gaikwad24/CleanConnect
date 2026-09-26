import apiClient from './client';
import { Toilet } from './toilets';

export type ComplaintCategory = 'CLEANLINESS' | 'WATER_SHORTAGE' | 'BROKEN_INFRASTRUCTURE' | 'OTHER';
export type ComplaintStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

export interface Complaint {
  id: string;
  complaintCode: string;
  toiletId: string;
  toilet: Toilet;
  userId: string;
  description: string;
  category: ComplaintCategory;
  imageUrl: string | null;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedComplaints {
  data: Complaint[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateComplaintInput {
  toiletId: string;
  description: string;
  category: ComplaintCategory;
  image?: File | null;
}

// Sent as multipart/form-data (not JSON) so the optional photo can
// ride alongside the text fields in one request. apiClient's default
// 'Content-Type: application/json' header is explicitly cleared here
// so the browser can set 'multipart/form-data' itself, including the
// required boundary — axios/the browser can't add that boundary if we
// hardcode the header ourselves.
export async function createComplaint(input: CreateComplaintInput): Promise<Complaint> {
  const formData = new FormData();
  formData.append('toiletId', input.toiletId);
  formData.append('description', input.description);
  formData.append('category', input.category);
  if (input.image) formData.append('image', input.image);

  const { data } = await apiClient.post<{ complaint: Complaint }>('/complaints', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.complaint;
}

export async function listMyComplaints(): Promise<Complaint[]> {
  const { data } = await apiClient.get<{ complaints: Complaint[] }>('/complaints/my');
  return data.complaints;
}

export async function getComplaintById(id: string): Promise<Complaint> {
  const { data } = await apiClient.get<{ complaint: Complaint }>(`/complaints/${id}`);
  return data.complaint;
}

export interface ListComplaintsParams {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  page?: number;
  limit?: number;
}

export async function listComplaints(params: ListComplaintsParams = {}): Promise<PaginatedComplaints> {
  const { data } = await apiClient.get<PaginatedComplaints>('/complaints', { params });
  return data;
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus): Promise<Complaint> {
  const { data } = await apiClient.patch<{ complaint: Complaint }>(`/complaints/${id}/status`, {
    status,
  });
  return data.complaint;
}
