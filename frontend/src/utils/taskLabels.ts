import { TaskStatus } from '../api/maintenanceTasks';

const STATUS_LABELS: Record<TaskStatus, string> = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted — awaiting review',
  REVISION_REQUIRED: 'Revision Required',
  VERIFIED: 'Verified',
};

export function taskStatusLabel(status: TaskStatus): string {
  return STATUS_LABELS[status];
}
