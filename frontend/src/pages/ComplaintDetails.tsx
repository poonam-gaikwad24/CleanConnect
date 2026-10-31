import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Complaint, getComplaintById, updateComplaintStatus } from '../api/complaints';
import { assignTask } from '../api/maintenanceTasks';
import { listStaff } from '../api/staff';
import { PublicUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { buildGoogleMapsSearchUrl } from '../utils/googleMapsLink';
import { ALL_STATUSES, categoryLabel, statusLabel } from '../utils/complaintLabels';
import { taskStatusLabel } from '../utils/taskLabels';
import { CategoryBadge, ComplaintStatusBadge, TaskStatusBadge } from '../components/StatusBadges';
import Alert from '../components/ui/Alert';
import Field from '../components/ui/Field';
import { ArrowLeftIcon, ExternalLinkIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import { LoadingState } from '../components/ui/States';

function ComplaintDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Module 7: assignment form state, only ever used by an admin on a
  // complaint that has no maintenanceTask yet.
  const [staffList, setStaffList] = useState<PublicUser[]>([]);
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [taskInstruction, setTaskInstruction] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    getComplaintById(id)
      .then(setComplaint)
      .catch(() => setError('Complaint not found, or you do not have access to it.'))
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = user?.role === 'ADMIN';

  // Only an admin needs the staff list, and only when there's an
  // actual assignment decision to make (no task yet).
  useEffect(() => {
    if (!isAdmin || !complaint || complaint.maintenanceTask) return;

    listStaff()
      .then(setStaffList)
      .catch(() => setStaffList([]));
  }, [isAdmin, complaint]);

  async function handleStatusChange(status: Complaint['status']) {
    if (!complaint) return;
    setUpdating(true);
    try {
      const updated = await updateComplaintStatus(complaint.id, status);
      setComplaint(updated);
    } catch {
      setError('Could not update status.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!complaint || !assignedStaffId || !taskInstruction.trim()) return;

    setAssigning(true);
    setAssignError(null);

    try {
      const task = await assignTask({
        complaintId: complaint.id,
        assignedStaffId,
        taskInstruction,
      });
      // assignTask also moves the complaint to IN_PROGRESS on the
      // backend (one transaction — see maintenanceTask.service.ts), so
      // reflect both locally rather than refetching.
      setComplaint({
        ...complaint,
        status: 'IN_PROGRESS',
        maintenanceTask: {
          id: task.id,
          taskCode: task.taskCode,
          status: task.status,
          assignedStaff: task.assignedStaff,
        },
      });
    } catch {
      setAssignError('Could not assign this task. That staff member may no longer be valid.');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <PageContainer>
      {loading && <LoadingState label="Loading complaint…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {!complaint && !loading && (
        <Link
          to={isAdmin ? '/admin/complaints' : '/my-complaints'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-brand-800 hover:underline"
        >
          <ArrowLeftIcon />
          Back to list
        </Link>
      )}

      {complaint && (
        <>
          <PageHeader
            back={{ to: isAdmin ? '/admin/complaints' : '/my-complaints', label: 'Back to list' }}
            eyebrow={`Complaint #${complaint.complaintCode}`}
            title={`${complaint.toilet.cleanConnectId ?? 'ID pending'} — ${complaint.toilet.location}`}
            actions={
              <a
                href={buildGoogleMapsSearchUrl(complaint.toilet.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                View on Google Maps
                <ExternalLinkIcon />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            }
          />

          <div className={`grid gap-6 ${isAdmin ? 'lg:grid-cols-3' : ''}`}>
            <section aria-labelledby="complaint-heading" className={`card p-5 ${isAdmin ? 'lg:col-span-2' : ''}`}>
              <h2 id="complaint-heading" className="mb-4 text-base font-semibold text-slate-900">
                Complaint
              </h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Description</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-900">{complaint.description}</dd>
                </div>
                <div className="flex flex-wrap gap-x-10 gap-y-4">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Category</dt>
                    <dd className="mt-1">
                      <CategoryBadge category={complaint.category} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Status</dt>
                    <dd className="mt-1">
                      <ComplaintStatusBadge status={complaint.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Reported</dt>
                    <dd className="mt-1 text-slate-900">{new Date(complaint.createdAt).toLocaleString()}</dd>
                  </div>
                </div>
              </dl>

              {complaint.imageUrl && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                    Evidence photo
                  </p>
                  <img
                    src={complaint.imageUrl}
                    alt="Complaint evidence"
                    className="max-h-80 max-w-full rounded-md border border-slate-200 object-contain"
                  />
                </div>
              )}
            </section>

            {isAdmin && (
              <div className="space-y-6">
                <section aria-labelledby="status-heading" className="card p-5">
                  <h2 id="status-heading" className="mb-3 text-base font-semibold text-slate-900">
                    Status
                  </h2>
                  <Field label="Update status">
                    <select
                      id="status"
                      className="field"
                      value={complaint.status}
                      disabled={updating}
                      onChange={(e) => handleStatusChange(e.target.value as Complaint['status'])}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </section>

                <section aria-labelledby="task-heading" className="card p-5">
                  <h2 id="task-heading" className="mb-3 text-base font-semibold text-slate-900">
                    Maintenance task
                  </h2>
                  {complaint.maintenanceTask ? (
                    <>
                      <p className="font-mono text-xs uppercase tracking-wide text-slate-600">
                        {complaint.maintenanceTask.taskCode}
                      </p>
                      <p className="mt-1 text-sm text-slate-900">
                        Assigned to {complaint.maintenanceTask.assignedStaff.name}
                      </p>
                      <p className="mt-2">
                        <TaskStatusBadge status={complaint.maintenanceTask.status} />
                      </p>
                      <Link
                        to={`/admin/tasks/${complaint.maintenanceTask.id}`}
                        className="btn btn-secondary btn-sm mt-4"
                      >
                        View task details →
                      </Link>
                    </>
                  ) : (
                    <form onSubmit={handleAssign} className="space-y-4">
                      <p className="text-sm font-medium text-slate-800">Assign Maintenance Task</p>
                      <div>
                        <Field label="Staff member">
                          <select
                            id="assignedStaff"
                            className="field"
                            value={assignedStaffId}
                            onChange={(e) => setAssignedStaffId(e.target.value)}
                            required
                          >
                            <option value="" disabled>
                              {staffList.length === 0 ? 'No staff accounts yet' : 'Select a staff member…'}
                            </option>
                            {staffList.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} ({member.email})
                              </option>
                            ))}
                          </select>
                        </Field>
                        {staffList.length === 0 && (
                          <p className="help-text">
                            <Link to="/admin/staff" className="link">
                              Create a staff account
                            </Link>{' '}
                            first.
                          </p>
                        )}
                      </div>
                      <Field label="Task instruction">
                        <textarea
                          id="taskInstruction"
                          rows={3}
                          className="field"
                          placeholder="What should the staff member do?"
                          value={taskInstruction}
                          onChange={(e) => setTaskInstruction(e.target.value)}
                          required
                        />
                      </Field>
                      {assignError && <Alert tone="error">{assignError}</Alert>}
                      <button
                        type="submit"
                        disabled={assigning || !assignedStaffId || !taskInstruction.trim()}
                        className="btn btn-primary btn-block"
                      >
                        {assigning ? 'Assigning…' : 'Assign Task'}
                      </button>
                    </form>
                  )}
                </section>
              </div>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}

export default ComplaintDetails;
