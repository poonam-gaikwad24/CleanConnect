import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Complaint, listMyComplaints } from '../api/complaints';
import { categoryLabel, statusLabel } from '../utils/complaintLabels';
import { CategoryBadge, ComplaintStatusBadge } from '../components/StatusBadges';
import Alert from '../components/ui/Alert';
import { ClipboardIcon, PlusIcon } from '../components/ui/icons';
import ListCard from '../components/ui/ListCard';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, LoadingState } from '../components/ui/States';

function MyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyComplaints()
      .then(setComplaints)
      .catch(() => setError('Could not load your complaints.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="My Complaints"
        subtitle="Issues you have reported, and where each one stands."
        actions={
          <Link to="/complaints/create" className="btn btn-primary">
            <PlusIcon />
            Report an Issue
          </Link>
        }
      />

      {loading && <LoadingState label="Loading your complaints…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {complaints && complaints.length === 0 && (
        <EmptyState
          icon={<ClipboardIcon className="h-5 w-5" />}
          title="You haven't reported any issues yet."
          description="When you report a problem with a toilet, you can follow its progress here."
          action={
            <Link to="/complaints/create" className="btn btn-primary">
              Report an Issue
            </Link>
          }
        />
      )}

      {complaints && complaints.length > 0 && (
        <ul className="grid gap-3">
          {complaints.map((complaint) => (
            <li key={complaint.id}>
              <ListCard
                to={`/complaints/${complaint.id}`}
                eyebrow={`Complaint #${complaint.complaintCode}`}
                title={`Toilet: ${complaint.toilet.cleanConnectId ?? 'ID pending'} — ${complaint.toilet.location}`}
                meta={<p>Reported {new Date(complaint.createdAt).toLocaleDateString()}</p>}
                badges={
                  <>
                    <ComplaintStatusBadge status={complaint.status} />
                    <CategoryBadge category={complaint.category} />
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

export default MyComplaints;
