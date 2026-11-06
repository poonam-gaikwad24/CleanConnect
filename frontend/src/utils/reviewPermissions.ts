import type { Role } from '../api/auth';

// UI hint only — decides whether to SHOW a delete control. The backend
// (review.routes.ts + utils/reviewPermissions.ts there) is the real
// enforcement and rejects anything this would let through.
//   CITIZEN → only their own review · ADMIN → any · STAFF → never
export function canDeleteReview(
  user: { id: string; role: Role } | null | undefined,
  reviewOwnerId: string
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'CITIZEN') return user.id === reviewOwnerId;
  return false;
}
