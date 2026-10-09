import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyTasks, MaintenanceTask } from '../api/maintenanceTasks';
import { taskStatusLabel } from '../utils/taskLabels';

function StaffTasks() {
  const [tasks, setTasks] = useState<MaintenanceTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyTasks()
      .then(setTasks)
      .catch(() => setError('Could not load your tasks.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-800">My Tasks</h1>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {tasks && tasks.length === 0 && (
        <p className="text-slate-500">No maintenance tasks assigned to you yet.</p>
      )}

      {tasks && tasks.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {tasks.map((task) => (
            <li key={task.id} className="p-4 hover:bg-slate-50">
              <Link to={`/staff/tasks/${task.id}`} className="block">
                <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                  {task.taskCode} · Complaint #{task.complaint.complaintCode}
                </p>
                <p className="font-medium text-slate-800">
                  {task.complaint.toilet.cleanConnectId ?? 'ID pending'} —{' '}
                  {task.complaint.toilet.location}
                </p>
                <p className="text-sm text-slate-500">{task.taskInstruction}</p>
                <p className="text-sm font-medium text-slate-600">
                  Status: {taskStatusLabel(task.status)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default StaffTasks;
