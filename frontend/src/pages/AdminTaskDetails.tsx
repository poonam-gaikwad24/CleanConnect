import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTaskById, MaintenanceTask, requestRevision, verifyTask } from '../api/maintenanceTasks';
import { CategoryBadge, TaskStatusBadge } from '../components/StatusBadges';
import TaskProgress from '../components/TaskProgress';
import Alert from '../components/ui/Alert';
import Field from '../components/ui/Field';
import { ArrowLeftIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import { LoadingState } from '../components/ui/States';

function AdminTaskDetails() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [mode, setMode] = useState<'none' | 'verify' | 'revision'>('none');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(null);

    getTaskById(id)
      .then(setTask)
      .catch(() => setError('Task not found.'))
      .finally(() => setLoading(false));
  }

  async function handleVerify() {
    if (!task) return;
    setActionPending(true);
    setError(null);
    try {
      const updated = await verifyTask(task.id, adminComment || undefined);
      setTask(updated);
      setAdminComment('');
      setMode('none');
    } catch {
      setError('Could not verify this task.');
    } finally {
      setActionPending(false);
    }
  }

  async function handleRevision() {
    if (!task || !adminComment.trim()) return;
    setActionPending(true);
    setError(null);
    try {
      const updated = await requestRevision(task.id, adminComment);
      setTask(updated);
      setAdminComment('');
      setMode('none');
    } catch {
      setError('Could not request revision.');
    } finally {
      setActionPending(false);
    }
  }

  return (
    <PageContainer>
      {loading && <LoadingState label="Loading task…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {!task && (
        <Link
          to="/admin/complaints"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-brand-800 hover:underline"
        >
          <ArrowLeftIcon />
          Back to complaints
        </Link>
      )}

      {task && (
        <>
          <PageHeader
            back={{ to: `/complaints/${task.complaintId}`, label: 'Back to complaint' }}
            eyebrow={`${task.taskCode} · Complaint #${task.complaint.complaintCode}`}
            title={`${task.complaint.toilet.cleanConnectId ?? 'ID pending'} — ${task.complaint.toilet.location}`}
            actions={<TaskStatusBadge status={task.status} />}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section aria-labelledby="task-heading" className="card p-5">
                <h2 id="task-heading" className="mb-4 text-base font-semibold text-slate-900">
                  Task details
                </h2>
                <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Category</dt>
                    <dd className="mt-1">
                      <CategoryBadge category={task.complaint.category} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Assigned staff</dt>
                    <dd className="mt-1 break-words text-slate-900">
                      {task.assignedStaff.name} ({task.assignedStaff.email})
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Citizen's description</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-900">{task.complaint.description}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Task instruction</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-900">{task.taskInstruction}</dd>
                  </div>
                  {task.staffComment && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Staff comment</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-slate-900">{task.staffComment}</dd>
                    </div>
                  )}
                  {task.adminComment && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Admin comment</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-slate-900">{task.adminComment}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {(task.complaint.imageUrl || task.proofImageUrl) && (
                <section aria-labelledby="evidence-heading" className="card p-5">
                  <h2 id="evidence-heading" className="mb-4 text-base font-semibold text-slate-900">
                    Evidence
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {task.complaint.imageUrl && (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                          Citizen evidence
                        </p>
                        <img
                          src={task.complaint.imageUrl}
                          alt="Citizen evidence"
                          className="max-h-56 w-full rounded-md border border-slate-200 object-contain"
                        />
                      </div>
                    )}
                    {task.proofImageUrl && (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                          Staff proof of work
                        </p>
                        <img
                          src={task.proofImageUrl}
                          alt="Staff proof of work"
                          className="max-h-56 w-full rounded-md border border-slate-200 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <section aria-labelledby="progress-heading" className="card p-5">
                <h2 id="progress-heading" className="mb-4 text-base font-semibold text-slate-900">
                  Progress
                </h2>
                <TaskProgress status={task.status} />
              </section>

              {task.status === 'SUBMITTED' && (
                <section aria-labelledby="review-heading" className="card p-5">
                  <h2 id="review-heading" className="mb-3 text-base font-semibold text-slate-900">
                    Review the work
                  </h2>

                  {mode === 'none' && (
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setMode('verify')} className="btn btn-primary">
                        Verify &amp; Resolve
                      </button>
                      <button onClick={() => setMode('revision')} className="btn btn-secondary">
                        Request Further Action
                      </button>
                    </div>
                  )}

                  {mode === 'verify' && (
                    <div className="space-y-3">
                      <Field label="Comment (optional)">
                        <textarea
                          id="verifyComment"
                          rows={2}
                          className="field"
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={handleVerify} disabled={actionPending} className="btn btn-primary">
                          Confirm Verify &amp; Resolve
                        </button>
                        <button onClick={() => setMode('none')} className="btn btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === 'revision' && (
                    <div className="space-y-3">
                      <Field label="Reason for further action *">
                        <textarea
                          id="revisionComment"
                          rows={2}
                          className="field"
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                          required
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleRevision}
                          disabled={actionPending || !adminComment.trim()}
                          className="btn btn-primary"
                        >
                          Confirm Request
                        </button>
                        <button onClick={() => setMode('none')} className="btn btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

export default AdminTaskDetails;
