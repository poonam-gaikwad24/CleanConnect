import { FormEvent, useEffect, useState } from 'react';
import {
  createReview,
  deleteReview,
  getToiletReviews,
  Review,
  ToiletReviews as ToiletReviewsData,
  updateReview,
} from '../api/reviews';
import { useAuth } from '../context/AuthContext';
import { canDeleteReview } from '../utils/reviewPermissions';
import SectionCard from './SectionCard';
import StarRating from './StarRating';
import Alert from './ui/Alert';
import Field from './ui/Field';
import { LoadingState } from './ui/States';

interface ToiletReviewsProps {
  toiletId: string;
  // Called after a review is created, edited or deleted, so a sibling
  // that depends on reviews (the Module 9 health score) can refresh.
  onReviewsChanged?: () => void;
}

function timeAgo(dateString: string): string {
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return new Date(dateString).toLocaleDateString();
}

function ToiletReviews({ toiletId, onReviewsChanged }: ToiletReviewsProps) {
  const { user } = useAuth();
  const [data, setData] = useState<ToiletReviewsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Submission/edit form state — shared between "write a new review"
  // and "edit my existing review" (same shape, same endpoint schema).
  const [editing, setEditing] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion state is separate from the form's: the old code reported a
  // failed delete through formError, which is only rendered inside the
  // edit form — so the message was never visible. deletingId also lets
  // each row show its own busy state.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getToiletReviews(toiletId)
      .then(setData)
      .catch(() => setError('Could not load reviews.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [toiletId]);

  const myReview: Review | undefined = data?.reviews.find((r) => r.userId === user?.id);

  function startEdit(review?: Review) {
    setFormRating(review?.rating ?? 0);
    setFormComment(review?.comment ?? '');
    setFormError(null);
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (formRating < 1) {
      setFormError('Please select a star rating.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (myReview) {
        await updateReview(myReview.id, { rating: formRating, comment: formComment || undefined });
      } else {
        await createReview(toiletId, { rating: formRating, comment: formComment || undefined });
      }
      setEditing(false);
      load();
      onReviewsChanged?.();
    } catch {
      setFormError('Could not save your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // One delete path for both a citizen's own review and an admin's
  // moderation delete. The permission check here only decides whether
  // to attempt it; the backend is what actually enforces the rule.
  async function removeReview(review: Review) {
    if (!canDeleteReview(user, review.userId)) return;
    if (!window.confirm('Delete this review? This cannot be undone.')) return;

    setDeletingId(review.id);
    setDeleteError(null);

    try {
      await deleteReview(review.id);
      // Reloading re-fetches the list AND the average/count, which the
      // backend recomputes from the remaining Review rows.
      load();
      onReviewsChanged?.();
    } catch {
      setDeleteError('Could not delete the review. You may not have permission, or it may already be removed.');
    } finally {
      setDeletingId(null);
    }
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <SectionCard title="Ratings & Reviews" headingId="toilet-reviews-heading">
      {loading && <LoadingState label="Loading reviews…" className="py-2" />}
      {error && <Alert tone="error">{error}</Alert>}

      {data && (
        <>
          {data.reviewCount > 0 ? (
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <StarRating value={Math.round(data.averageRating)} size="lg" />
              <span className="text-xl font-bold text-slate-900">
                {data.averageRating.toFixed(1)} / 5
              </span>
              <span className="text-sm text-slate-700">
                Based on {data.reviewCount} review{data.reviewCount === 1 ? '' : 's'}
              </span>
            </div>
          ) : (
            <p className="mb-5 rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-700">
              No reviews yet. Be the first to review this toilet.
            </p>
          )}

          {/* Rating is citizen feedback, not a maintenance signal — it
              never feeds into Complaint/MaintenanceTask and is shown
              purely as public experience context (see Module 8 spec). */}

          {user?.role === 'CITIZEN' && !editing && (
            <div className="mb-5 rounded-md border border-brand-200 bg-brand-50 p-4">
              {myReview ? (
                <>
                  <p className="mb-1 text-sm font-semibold text-slate-900">Your Review</p>
                  <StarRating value={myReview.rating} />
                  {myReview.comment && (
                    <p className="mt-1 text-sm text-slate-800">{myReview.comment}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => startEdit(myReview)} className="btn btn-secondary btn-sm">
                      Edit Review
                    </button>
                    <button
                      onClick={() => removeReview(myReview)}
                      disabled={deletingId !== null}
                      className="btn btn-outline-danger btn-sm"
                    >
                      Delete Review
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => startEdit()} className="btn btn-primary">
                  Rate this toilet
                </button>
              )}
            </div>
          )}

          {user?.role === 'CITIZEN' && editing && (
            <form
              onSubmit={handleSubmit}
              className="mb-5 space-y-4 rounded-md border border-brand-200 bg-brand-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">
                {myReview ? 'Edit your review' : 'Rate this toilet'}
              </p>
              <div>
                <p className="label">Your Rating</p>
                <StarRating value={formRating} onChange={setFormRating} size="lg" />
              </div>
              <Field label="Write a review (optional)">
                <textarea
                  id="reviewComment"
                  rows={3}
                  maxLength={500}
                  className="field"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                />
              </Field>
              {formError && <Alert tone="error">{formError}</Alert>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={submitting || formRating < 1}
                  className="btn btn-primary"
                >
                  {submitting ? 'Saving…' : 'Submit Review'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {deleteError && <Alert tone="error" className="mb-4">{deleteError}</Alert>}

          {data.reviews.length > 0 && (
            <ul className="space-y-3">
              {data.reviews.map((review) => (
                <li key={review.id} className="rounded-md border border-slate-200 bg-white p-4">
                  <StarRating value={review.rating} />
                  {review.comment && <p className="mt-1.5 text-sm text-slate-800">{review.comment}</p>}
                  <p className="mt-1.5 text-xs text-slate-600">
                    {review.reviewerName} · {timeAgo(review.createdAt)}
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => removeReview(review)}
                      disabled={deletingId !== null}
                      aria-label={`Delete review by ${review.reviewerName} (admin)`}
                      className="btn btn-outline-danger btn-sm mt-3"
                    >
                      {deletingId === review.id ? 'Deleting…' : 'Delete review (admin)'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </SectionCard>
  );
}

export default ToiletReviews;
