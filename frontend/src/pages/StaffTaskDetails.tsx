import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTaskById, MaintenanceTask, startTask, submitTask } from '../api/maintenanceTasks';
import { categoryLabel } from '../utils/complaintLabels';
import { taskStatusLabel } from '../utils/taskLabels';

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
    <div className="mx-auto max-w-xl p-6">
      <Link to="/staff/tasks" className="text-sm text-slate-500 hover:underline">
        ← Back to My Tasks
      </Link>

      {loading && <p className="mt-4 text-slate-500">Loading…</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {task && (
        <div className="mt-4 rounded border border-slate-200 bg-white p-6">
          <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
            {task.taskCode} · Complaint #{task.complaint.complaintCode}
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">
            {task.complaint.toilet.cleanConnectId ?? 'ID pending'} — {task.complaint.toilet.location}
          </h1>

          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Task instruction</dt>
              <dd className="whitespace-pre-wrap text-slate-800">{task.taskInstruction}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Complaint category</dt>
              <dd className="text-slate-800">{categoryLabel(task.complaint.category)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Citizen's description</dt>
              <dd className="whitespace-pre-wrap text-slate-800">{task.complaint.description}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Status</dt>
              <dd className="text-slate-800">{taskStatusLabel(task.status)}</dd>
            </div>
            {task.adminComment && (
              <div>
                <dt className="font-medium text-slate-500">Admin feedback</dt>
                <dd className="text-slate-800">{task.adminComment}</dd>
              </div>
            )}
          </dl>

          {task.complaint.imageUrl && (
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-slate-500">Citizen's evidence photo</p>
              <img
                src={task.complaint.imageUrl}
                alt="Citizen evidence"
                className="max-h-64 rounded border border-slate-200 object-contain"
              />
            </div>
          )}

          {(task.status === 'ASSIGNED' || task.status === 'REVISION_REQUIRED') && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <button
                onClick={handleStart}
                disabled={actionPending}
                className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
              >
                Start Task
              </button>
            </div>
          )}

          {task.status === 'IN_PROGRESS' && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t border-slate-200 pt-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="proof">
                  Proof-of-work photo *
                </label>
                <input
                  id="proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-sm"
                  onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                  required
                />
                <p className="mt-1 text-xs text-slate-400">
                  JPEG, PNG or WEBP, up to {MAX_IMAGE_MB}MB. Evidence the work was performed.
                </p>
                {imageError && <p className="mt-1 text-sm text-red-600">{imageError}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="comment">
                  Comment (optional)
                </label>
                <textarea
                  id="comment"
                  rows={3}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={staffComment}
                  onChange={(e) => setStaffComment(e.target.value)}
                  maxLength={1000}
                />
              </div>
              <button
                type="submit"
                disabled={actionPending || !image}
                className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {actionPending ? 'Submitting…' : 'Submit Work'}
              </button>
            </form>
          )}

          {(task.status === 'SUBMITTED' || task.status === 'VERIFIED') && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">
                {task.status === 'SUBMITTED'
                  ? 'Your work is submitted and waiting for admin review.'
                  : 'This task has been verified by an admin.'}
              </p>
              {task.proofImageUrl && (
                <div className="mt-3">
                  <p className="mb-1 text-sm font-medium text-slate-500">Your proof photo</p>
                  <img
                    src={task.proofImageUrl}
                    alt="Proof of work"
                    className="max-h-64 rounded border border-slate-200 object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StaffTaskDetails;
