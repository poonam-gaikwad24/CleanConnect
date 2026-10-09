import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTaskById, MaintenanceTask, requestRevision, verifyTask } from '../api/maintenanceTasks';
import { categoryLabel } from '../utils/complaintLabels';
import { taskStatusLabel } from '../utils/taskLabels';

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
    <div className="mx-auto max-w-xl p-6">
      <Link to={`/complaints/${task?.complaintId ?? ''}`} className="text-sm text-slate-500 hover:underline">
        ← Back to complaint
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
              <dt className="font-medium text-slate-500">Category</dt>
              <dd className="text-slate-800">{categoryLabel(task.complaint.category)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Citizen's description</dt>
              <dd className="whitespace-pre-wrap text-slate-800">{task.complaint.description}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Assigned staff</dt>
              <dd className="text-slate-800">
                {task.assignedStaff.name} ({task.assignedStaff.email})
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Task instruction</dt>
              <dd className="whitespace-pre-wrap text-slate-800">{task.taskInstruction}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Task status</dt>
              <dd className="text-slate-800">{taskStatusLabel(task.status)}</dd>
            </div>
            {task.staffComment && (
              <div>
                <dt className="font-medium text-slate-500">Staff comment</dt>
                <dd className="whitespace-pre-wrap text-slate-800">{task.staffComment}</dd>
              </div>
            )}
            {task.adminComment && (
              <div>
                <dt className="font-medium text-slate-500">Admin comment</dt>
                <dd className="whitespace-pre-wrap text-slate-800">{task.adminComment}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {task.complaint.imageUrl && (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-500">Citizen evidence</p>
                <img
                  src={task.complaint.imageUrl}
                  alt="Citizen evidence"
                  className="max-h-56 w-full rounded border border-slate-200 object-contain"
                />
              </div>
            )}
            {task.proofImageUrl && (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-500">Staff proof of work</p>
                <img
                  src={task.proofImageUrl}
                  alt="Staff proof of work"
                  className="max-h-56 w-full rounded border border-slate-200 object-contain"
                />
              </div>
            )}
          </div>

          {task.status === 'SUBMITTED' && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              {mode === 'none' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setMode('verify')}
                    className="rounded bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800"
                  >
                    Verify &amp; Resolve
                  </button>
                  <button
                    onClick={() => setMode('revision')}
                    className="rounded bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
                  >
                    Request Further Action
                  </button>
                </div>
              )}

              {mode === 'verify' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="verifyComment">
                    Comment (optional)
                  </label>
                  <textarea
                    id="verifyComment"
                    rows={2}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleVerify}
                      disabled={actionPending}
                      className="rounded bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800 disabled:opacity-50"
                    >
                      Confirm Verify &amp; Resolve
                    </button>
                    <button
                      onClick={() => setMode('none')}
                      className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {mode === 'revision' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="revisionComment">
                    Reason for further action *
                  </label>
                  <textarea
                    id="revisionComment"
                    rows={2}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    required
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleRevision}
                      disabled={actionPending || !adminComment.trim()}
                      className="rounded bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Confirm Request
                    </button>
                    <button
                      onClick={() => setMode('none')}
                      className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminTaskDetails;
