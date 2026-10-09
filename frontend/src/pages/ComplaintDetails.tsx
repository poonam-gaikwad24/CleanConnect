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
    <div className="mx-auto max-w-xl p-6">
      <Link
        to={isAdmin ? '/admin/complaints' : '/my-complaints'}
        className="text-sm text-slate-500 hover:underline"
      >
        ← Back to list
      </Link>

      {loading && <p className="mt-4 text-slate-500">Loading…</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {complaint && (
        <div className="mt-4 rounded border border-slate-200 bg-white p-6">
          <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
            Complaint #{complaint.complaintCode}
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">
            {complaint.toilet.cleanConnectId ?? 'ID pending'} — {complaint.toilet.location}
          </h1>
          <a
            href={buildGoogleMapsSearchUrl(complaint.toilet.location)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            View on Google Maps
          </a>

          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Description</dt>
              <dd className="whitespace-pre-wrap text-slate-800">{complaint.description}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Category</dt>
              <dd className="text-slate-800">{categoryLabel(complaint.category)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Status</dt>
              <dd className="text-slate-800">{statusLabel(complaint.status)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Reported</dt>
              <dd className="text-slate-800">{new Date(complaint.createdAt).toLocaleString()}</dd>
            </div>
          </dl>

          {complaint.imageUrl && (
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-slate-500">Evidence photo</p>
              <img
                src={complaint.imageUrl}
                alt="Complaint evidence"
                className="max-h-80 rounded border border-slate-200 object-contain"
              />
            </div>
          )}

          {isAdmin && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="status">
                Update status
              </label>
              <select
                id="status"
                className="rounded border border-slate-300 px-3 py-2 text-sm"
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
            </div>
          )}

          {isAdmin && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              {complaint.maintenanceTask ? (
                <>
                  <p className="mb-1 text-sm font-medium text-slate-500">Maintenance task</p>
                  <p className="text-sm text-slate-800">
                    {complaint.maintenanceTask.taskCode} — assigned to{' '}
                    {complaint.maintenanceTask.assignedStaff.name} ·{' '}
                    {taskStatusLabel(complaint.maintenanceTask.status)}
                  </p>
                  <Link
                    to={`/admin/tasks/${complaint.maintenanceTask.id}`}
                    className="mt-1 inline-block text-sm text-blue-600 hover:underline"
                  >
                    View task details →
                  </Link>
                </>
              ) : (
                <form onSubmit={handleAssign} className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Assign Maintenance Task</p>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700" htmlFor="assignedStaff">
                      Staff member
                    </label>
                    <select
                      id="assignedStaff"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
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
                    {staffList.length === 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        <Link to="/admin/staff" className="text-blue-600 hover:underline">
                          Create a staff account
                        </Link>{' '}
                        first.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700" htmlFor="taskInstruction">
                      Task instruction
                    </label>
                    <textarea
                      id="taskInstruction"
                      rows={3}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      placeholder="What should the staff member do?"
                      value={taskInstruction}
                      onChange={(e) => setTaskInstruction(e.target.value)}
                      required
                    />
                  </div>
                  {assignError && <p className="text-sm text-red-600">{assignError}</p>}
                  <button
                    type="submit"
                    disabled={assigning || !assignedStaffId || !taskInstruction.trim()}
                    className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {assigning ? 'Assigning…' : 'Assign Task'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ComplaintDetails;
