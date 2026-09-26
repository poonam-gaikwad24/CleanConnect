import apiClient from './client';

export interface Toilet {
  id: string;
  cleanConnectId: string | null;
  externalId: string | null;
  ward: number | null;
  type: string | null;
  location: string;
  landmark: string | null;
  status: string | null;
  isMonetized: boolean | null;
  hasIct: boolean | null;
  hasGoogleMapsListing: boolean | null;
  hasIec: boolean | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedToilets {
  data: Toilet[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListToiletsParams {
  ward?: number;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listToilets(params: ListToiletsParams = {}): Promise<PaginatedToilets> {
  const { data } = await apiClient.get<PaginatedToilets>('/toilets', { params });
  return data;
}

export async function getToiletById(id: string): Promise<Toilet> {
  const { data } = await apiClient.get<{ toilet: Toilet }>(`/toilets/${id}`);
  return data.toilet;
}

// Module 6: Admin-only direct toilet creation (the second of the two
// supported ways an official Toilet comes into existence — the other
// being toiletRequests.ts's approveToiletRequest). Deliberately does
// NOT accept cleanConnectId — the backend always generates it via the
// same getNextCleanConnectId() used everywhere else; see
// backend/src/services/toilet.service.ts.
export interface CreateToiletInput {
  externalId?: string;
  ward?: number | null;
  type?: string | null;
  location: string;
  landmark?: string | null;
  status?: string | null;
  isMonetized?: boolean | null;
  hasIct?: boolean | null;
  hasGoogleMapsListing?: boolean | null;
  hasIec?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function createToilet(input: CreateToiletInput): Promise<Toilet> {
  const { data } = await apiClient.post<{ toilet: Toilet }>('/toilets', input);
  return data.toilet;
}
