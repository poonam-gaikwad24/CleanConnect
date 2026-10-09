import apiClient from './client';

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  reviewerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToiletReviews {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
}

export interface ReviewInput {
  rating: number;
  comment?: string;
}

// Public — no auth required, same as the toilet details it appears
// on. toiletId accepts either the Toilet's own id or its
// cleanConnectId, same as GET /api/toilets/:id.
export async function getToiletReviews(toiletId: string): Promise<ToiletReviews> {
  const { data } = await apiClient.get<ToiletReviews>(`/reviews/toilet/${toiletId}`);
  return data;
}

// CITIZEN-only. The backend rejects a second review for the same
// toilet from the same user — see review.service.ts.
export async function createReview(toiletId: string, input: ReviewInput): Promise<Review> {
  const { data } = await apiClient.post<{ review: Review }>(`/reviews/toilet/${toiletId}`, input);
  return data.review;
}

// Owner-only, enforced by the backend.
export async function updateReview(id: string, input: ReviewInput): Promise<Review> {
  const { data } = await apiClient.put<{ review: Review }>(`/reviews/${id}`, input);
  return data.review;
}

// Owner or ADMIN, enforced by the backend.
export async function deleteReview(id: string): Promise<void> {
  await apiClient.delete(`/reviews/${id}`);
}
