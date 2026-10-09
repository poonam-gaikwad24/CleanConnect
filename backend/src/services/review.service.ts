import { Review, Role } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { ReviewInput } from '../validators/review.validators';
import { getToiletById } from './toilet.service';

// A review's public shape never carries the reviewer's email or raw
// User record — only a first-name-only display label, computed here
// so no other layer can accidentally leak more. userId is included
// (a bare UUID, not PII) purely so the frontend can tell "this is my
// review" apart from everyone else's and show Edit/Delete only there.
export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  reviewerName: string;
  createdAt: Date;
  updatedAt: Date;
}

function toPublicReview(review: Review & { user: { name: string } }): PublicReview {
  const firstName = review.user.name.trim().split(/\s+/)[0];

  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    userId: review.userId,
    reviewerName: firstName || 'Citizen',
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export interface ToiletReviews {
  reviews: PublicReview[];
  averageRating: number;
  reviewCount: number;
}

// toiletId accepts either the Toilet's own id or its cleanConnectId —
// same lookup getToiletById already does for complaints/tasks — so a
// QR scan (which lands on /toilets/CC-PMC-XXXX) and a normal browse
// (which may carry the raw id) both work without the caller needing
// to know which one it has.
//
// averageRating/reviewCount are computed fresh from Review rows on
// every call (a Prisma aggregate, not a stored column on Toilet) —
// deliberately so the number can never go stale; see the Review
// model's schema comment for why no column was added to Toilet.
export async function getToiletReviews(toiletIdOrCleanConnectId: string): Promise<ToiletReviews> {
  const toilet = await getToiletById(toiletIdOrCleanConnectId);

  const [reviews, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { toiletId: toilet.id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.review.aggregate({
      where: { toiletId: toilet.id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const rawAverage = aggregate._avg.rating ?? 0;

  return {
    reviews: reviews.map(toPublicReview),
    // Rounded to 1 decimal for display (e.g. 4.3) — the frontend never
    // needs to do its own rounding of a backend-sent float.
    averageRating: Math.round(rawAverage * 10) / 10,
    reviewCount: aggregate._count.rating,
  };
}

export async function createReview(
  userId: string,
  toiletIdOrCleanConnectId: string,
  input: ReviewInput
): Promise<PublicReview> {
  const toilet = await getToiletById(toiletIdOrCleanConnectId);

  // Pre-checked for a clear, friendly error message; the
  // @@unique([userId, toiletId]) constraint in schema.prisma is the
  // actual backstop against a race between two concurrent requests —
  // see the Review model's comment.
  const existing = await prisma.review.findUnique({
    where: { userId_toiletId: { userId, toiletId: toilet.id } },
  });

  if (existing) {
    throw new AppError(
      'You have already reviewed this toilet. Edit your existing review instead.',
      409
    );
  }

  const review = await prisma.review.create({
    data: {
      userId,
      toiletId: toilet.id,
      rating: input.rating,
      comment: input.comment ?? null,
    },
    include: { user: { select: { name: true } } },
  });

  return toPublicReview(review);
}

export interface ReviewRequester {
  id: string;
  role: Role;
}

async function getReviewOrThrow(id: string) {
  const review = await prisma.review.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  return review;
}

// Owner-only — not admin. Module 8 gives admins view + delete, never
// edit-on-someone-else's-behalf (see the Module 8 permission table).
export async function updateReview(
  id: string,
  requesterId: string,
  input: ReviewInput
): Promise<PublicReview> {
  const review = await getReviewOrThrow(id);

  if (review.userId !== requesterId) {
    throw new AppError('You can only edit your own review', 403);
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { rating: input.rating, comment: input.comment ?? null },
    include: { user: { select: { name: true } } },
  });

  return toPublicReview(updated);
}

// Owner OR admin — the one place Module 8 allows acting on someone
// else's review, for basic moderation (per spec: "ADMIN can delete
// inappropriate reviews").
export async function deleteReview(id: string, requester: ReviewRequester): Promise<void> {
  const review = await getReviewOrThrow(id);

  const isOwner = review.userId === requester.id;
  const isAdmin = requester.role === Role.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError('You do not have permission to delete this review', 403);
  }

  await prisma.review.delete({ where: { id } });
}
