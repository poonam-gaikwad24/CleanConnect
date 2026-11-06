import apiClient from './client';

// Module 9: mirrors the backend's utils/toiletHealth.ts output.
export type HealthLabel = 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION';
export type HealthConfidence = 'INSUFFICIENT' | 'LIMITED' | 'SUFFICIENT';

export interface HealthFactor {
  key: 'OPEN_ISSUES' | 'CITIZEN_EXPERIENCE' | 'VERIFIED_MAINTENANCE';
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface ToiletHealth {
  // null when there is no data at all (confidence === 'INSUFFICIENT').
  score: number | null;
  label: HealthLabel | null;
  confidence: HealthConfidence;
  evidenceCount: number;
  factors: HealthFactor[];
  notes: string[];
}

export type ToiletHealthSummary = Pick<
  ToiletHealth,
  'score' | 'label' | 'confidence' | 'evidenceCount'
>;

export interface ToiletHealthResponse {
  toiletId: string;
  cleanConnectId: string | null;
  health: ToiletHealth;
}

// Public. Accepts the toilet id or its cleanConnectId.
export async function getToiletHealth(toiletId: string): Promise<ToiletHealthResponse> {
  const { data } = await apiClient.get<ToiletHealthResponse>(`/toilets/${toiletId}/health`);
  return data;
}

// Public. Summaries for a page of toilets in ONE request (max 50 ids),
// keyed by Toilet.id. Toilets that do not exist are absent from the map.
export async function getToiletHealthSummaries(
  toiletIds: string[]
): Promise<Record<string, ToiletHealthSummary>> {
  if (toiletIds.length === 0) return {};
  const { data } = await apiClient.get<{ count: number; results: Record<string, ToiletHealthSummary> }>(
    '/toilets/health',
    { params: { ids: toiletIds.join(',') } }
  );
  return data.results;
}
