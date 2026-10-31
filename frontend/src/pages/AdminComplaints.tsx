import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  listComplaints,
  PaginatedComplaints,
} from '../api/complaints';
import { ALL_CATEGORIES, ALL_STATUSES, categoryLabel, statusLabel } from '../utils/complaintLabels';
import { CategoryBadge, ComplaintStatusBadge } from '../components/StatusBadges';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import { ClipboardIcon } from '../components/ui/icons';
import ListCard from '../components/ui/ListCard';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';
import { EmptyState, LoadingState } from '../components/ui/States';

function AdminComplaints() {
  const [result, setResult] = useState<PaginatedComplaints | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ComplaintStatus | ''>('');
  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);

    listComplaints({
      page,
      limit: 20,
      status: status || undefined,
      category: category || undefined,
    })
      .then(setResult)
      .catch(() => setError('Could not load complaints.'))
      .finally(() => setLoading(false));
  }, [page, status, category]);

  return (
    <PageContainer>
      <PageHeader
        title="Complaints (Admin)"
        subtitle="Review reported issues, then assign each one to maintenance staff."
      />

      <div className="card mb-6 flex flex-wrap items-end gap-4 p-4">
        <div className="min-w-[10rem] flex-1 sm:flex-none">
          <label htmlFor="filter-status" className="label">
            Status
          </label>
          <select
            id="filter-status"
            className="field sm:w-52"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ComplaintStatus | '');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[10rem] flex-1 sm:flex-none">
          <label htmlFor="filter-category" className="label">
            Category
          </label>
          <select
            id="filter-category"
            className="field sm:w-60"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as ComplaintCategory | '');
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <LoadingState label="Loading complaints…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {result && (
        <>
          {result.data.length === 0 ? (
            <EmptyState
              icon={<ClipboardIcon className="h-5 w-5" />}
              title="No complaints match these filters."
              description="Try a different status or category."
            />
          ) : (
            <ul className="grid gap-3">
              {result.data.map((complaint: Complaint) => (
                <li key={complaint.id}>
                  <ListCard
                    to={`/complaints/${complaint.id}`}
                    eyebrow={`Complaint #${complaint.complaintCode}`}
                    title={`${complaint.toilet.cleanConnectId ?? 'ID pending'} — ${complaint.toilet.location}`}
                    meta={<p className="line-clamp-2">{complaint.description}</p>}
                    badges={
                      <>
                        <ComplaintStatusBadge status={complaint.status} />
                        <CategoryBadge category={complaint.category} />
                        {complaint.imageUrl && <Badge tone="neutral">Photo attached</Badge>}
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            onPrevious={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </PageContainer>
  );
}

export default AdminComplaints;
