import apiClient from './client';
import { Toilet } from './toilets';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ToiletRequest {
  id: string;
  requestCode: string;
  userId: string;
  location: string;
  landmark: string | null;
  address: string | null;
  description: string | null;
  imageUrl: string | null;
  status: RequestStatus;
  adminNotes: string | null;
  resultingToiletId: string | null;
  resultingToilet: Toilet | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedToiletRequests {
  data: ToiletRequest[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateToiletRequestInput {
  location: string;
  landmark?: string;
  address?: string;
  description?: string;
  image?: File | null;
}

// Multipart/form-data, same reasoning as api/complaints.ts's
// createComplaint — the optional photo rides alongside the text
// fields, so apiClient's default JSON Content-Type header is cleared
// to let the browser set the multipart boundary itself.
export async function createToiletRequest(input: CreateToiletRequestInput): Promise<ToiletRequest> {
  const formData = new FormData();
  formData.append('location', input.location);
  if (input.landmark) formData.append('landmark', input.landmark);
  if (input.address) formData.append('address', input.address);
  if (input.description) formData.append('description', input.description);
  if (input.image) formData.append('image', input.image);

  const { data } = await apiClient.post<{ request: ToiletRequest }>('/toilet-requests', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.request;
}

export async function listMyToiletRequests(): Promise<ToiletRequest[]> {
  const { data } = await apiClient.get<{ requests: ToiletRequest[] }>('/toilet-requests/my');
  return data.requests;
}

export async function getToiletRequestById(id: string): Promise<ToiletRequest> {
  const { data } = await apiClient.get<{ request: ToiletRequest }>(`/toilet-requests/${id}`);
  return data.request;
}

export interface ListToiletRequestsParams {
  status?: RequestStatus;
  page?: number;
  limit?: number;
}

export async function listToiletRequests(
  params: ListToiletRequestsParams = {}
): Promise<PaginatedToiletRequests> {
  const { data } = await apiClient.get<PaginatedToiletRequests>('/toilet-requests', { params });
  return data;
}

export async function approveToiletRequest(id: string, adminNotes?: string): Promise<ToiletRequest> {
  const { data } = await apiClient.patch<{ request: ToiletRequest }>(
    `/toilet-requests/${id}/approve`,
    { adminNotes }
  );
  return data.request;
}

export async function rejectToiletRequest(id: string, adminNotes?: string): Promise<ToiletRequest> {
  const { data } = await apiClient.patch<{ request: ToiletRequest }>(
    `/toilet-requests/${id}/reject`,
    { adminNotes }
  );
  return data.request;
}
