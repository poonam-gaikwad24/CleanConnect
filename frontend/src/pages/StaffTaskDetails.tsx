import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTaskById, MaintenanceTask, startTask, submitTask } from '../api/maintenanceTasks';
import { CategoryBadge, TaskStatusBadge } from '../components/StatusBadges';
import TaskProgress from '../components/TaskProgress';
import Alert from '../components/ui/Alert';
import Field from '../components/ui/Field';
import { ArrowLeftIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import { LoadingState } from '../components/ui/States';

const MAX_IMAGE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function StaffTaskDetails() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  const [staffComment, setStaffComment] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

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
      .catch(() => setError('Task not found, or it is not assigned to you.'))
      .finally(() => setLoading(false));
  }

  async function handleStart() {
    if (!task) return;
    setActionPending(true);
    try {
      const updated = await startTask(task.id);
      setTask(updated);
    } catch {
      setError('Could not start the task.');
    } finally {
      setActionPending(false);
    }
  }

  function handleImageChange(file: File | null) {
    setImageError(null);
    if (!file) {
      setImage(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Only JPEG, PNG, or WEBP images are allowed.');
      setImage(null);
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageError(`Image must be under ${MAX_IMAGE_MB}MB.`);
      setImage(null);
      return;
    }
    setImage(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!task || !image) return;

    setActionPending(true);
    setError(null);

    try {
      const updated = await submitTask(task.id, { staffComment: staffComment || undefined, image });
      setTask(updated);
      setStaffComment('');
      setImage(null);
    } catch {
      setError('Could not submit the work. Please try again.');
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
          to="/staff/tasks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-brand-800 hover:underline"
        >
          <ArrowLeftIcon />
          Back to My Tasks
        </Link>
      )}

      {task && (
        <>
          <PageHeader
            back={{ to: '/staff/tasks', label: 'Back to My Tasks' }}
            eyebrow={`${task.taskCode} · Complaint #${task.complaint.complaintCode}`}
            title={`${task.complaint.toilet.cleanConnectId ?? 'ID pending'} — ${task.complaint.toilet.location}`}
            actions={<TaskStatusBadge status={task.status} />}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <section aria-labelledby="task-heading" className="card p-5 lg:col-span-2">
              <h2 id="task-heading" className="mb-4 text-base font-semibold text-slate-900">
                Task details
              </h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Task instruction</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-900">{task.taskInstruction}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Complaint category</dt>
                  <dd className="mt-1">
                    <CategoryBadge category={task.complaint.category} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Citizen's description</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-900">{task.complaint.description}</dd>
                </div>
                {task.adminComment && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Admin feedback</dt>
                    <dd className="mt-1 text-slate-900">{task.adminComment}</dd>
                  </div>
                )}
              </dl>

              {task.complaint.imageUrl && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                    Citizen's evidence photo
                  </p>
                  <img
                    src={task.complaint.imageUrl}
                    alt="Citizen evidence"
                    className="max-h-64 max-w-full rounded-md border border-slate-200 object-contain"
                  />
                </div>
              )}
            </section>

            <div className="space-y-6">
              <section aria-labelledby="progress-heading" className="card p-5">
                <h2 id="progress-heading" className="mb-4 text-base font-semibold text-slate-900">
                  Progress
                </h2>
                <TaskProgress status={task.status} />
              </section>

              <section aria-labelledby="action-heading" className="card p-5">
                <h2 id="action-heading" className="mb-3 text-base font-semibold text-slate-900">
                  Your next step
                </h2>

                {(task.status === 'ASSIGNED' || task.status === 'REVISION_REQUIRED') && (
                  <div className="space-y-3">
                    {task.status === 'REVISION_REQUIRED' && (
                      <Alert tone="warning">
                        An admin asked for further action on this task. Check the admin feedback, then
                        start the task again.
                      </Alert>
                    )}
                    <button
                      onClick={handleStart}
                      disabled={actionPending}
                      className="btn btn-primary btn-block"
                    >
                      Start Task
                    </button>
                  </div>
                )}

                {task.status === 'IN_PROGRESS' && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Field
                      label="Proof-of-work photo *"
                      error={imageError}
                      help={`JPEG, PNG or WEBP, up to ${MAX_IMAGE_MB}MB. Evidence the work was performed.`}
                    >
                      <input
                        id="proof"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="block w-full text-sm text-slate-800 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-50"
                        onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                        required
                      />
                    </Field>
                    <Field label="Comment (optional)">
                      <textarea
                        id="comment"
                        rows={3}
                        className="field"
                        value={staffComment}
                        onChange={(e) => setStaffComment(e.target.value)}
                        maxLength={1000}
                      />
                    </Field>
                    <button
                      type="submit"
                      disabled={actionPending || !image}
                      className="btn btn-primary btn-block"
                    >
                      {actionPending ? 'Submitting…' : 'Submit Work'}
                    </button>
                  </form>
                )}

                {(task.status === 'SUBMITTED' || task.status === 'VERIFIED') && (
                  <div className="space-y-3">
                    <Alert tone={task.status === 'VERIFIED' ? 'success' : 'info'}>
                      {task.status === 'SUBMITTED'
                        ? 'Your work is submitted and waiting for admin review.'
                        : 'This task has been verified by an admin.'}
                    </Alert>
                    {task.proofImageUrl && (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                          Your proof photo
                        </p>
                        <img
                          src={task.proofImageUrl}
                          alt="Proof of work"
                          className="max-h-64 max-w-full rounded-md border border-slate-200 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

export default StaffTaskDetails;
