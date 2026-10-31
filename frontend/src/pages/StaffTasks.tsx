import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyTasks, MaintenanceTask } from '../api/maintenanceTasks';
import { taskStatusLabel } from '../utils/taskLabels';
import { TaskStatusBadge } from '../components/StatusBadges';
import Alert from '../components/ui/Alert';
import { WrenchIcon } from '../components/ui/icons';
import ListCard from '../components/ui/ListCard';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, LoadingState } from '../components/ui/States';

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
    <PageContainer>
      <PageHeader title="My Tasks" subtitle="Maintenance work assigned to you." />

      {loading && <LoadingState label="Loading your tasks…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {tasks && tasks.length === 0 && (
        <EmptyState
          icon={<WrenchIcon className="h-5 w-5" />}
          title="No maintenance tasks assigned to you yet."
          description="When an administrator assigns you a task, it will appear here."
        />
      )}

      {tasks && tasks.length > 0 && (
        <ul className="grid gap-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <ListCard
                to={`/staff/tasks/${task.id}`}
                eyebrow={`${task.taskCode} · Complaint #${task.complaint.complaintCode}`}
                title={`${task.complaint.toilet.cleanConnectId ?? 'ID pending'} — ${task.complaint.toilet.location}`}
                meta={<p>{task.taskInstruction}</p>}
                badges={<TaskStatusBadge status={task.status} />}
              />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

export default StaffTasks;
