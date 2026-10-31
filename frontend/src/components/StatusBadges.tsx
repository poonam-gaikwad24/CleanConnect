import type { ComplaintCategory, ComplaintStatus } from '../api/complaints';
import type { TaskStatus } from '../api/maintenanceTasks';
import type { RequestStatus } from '../api/toiletRequests';
import { categoryLabel, statusLabel } from '../utils/complaintLabels';
import { requestStatusLabel } from '../utils/requestLabels';
import { taskStatusLabel } from '../utils/taskLabels';
import Badge, { BadgeTone } from './ui/Badge';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from './ui/icons';

// One look for every status in the app. The text always comes from the
// existing label utilities (so wording is unchanged); the tone and icon are
// the extra, non-textual cue.

const COMPLAINT: Record<ComplaintStatus, { tone: BadgeTone; icon: () => JSX.Element }> = {
  PENDING: { tone: 'warning', icon: () => <ClockIcon className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { tone: 'info', icon: () => <WrenchIcon className="h-3.5 w-3.5" /> },
  RESOLVED: { tone: 'success', icon: () => <CheckCircleIcon className="h-3.5 w-3.5" /> },
};

const TASK: Record<TaskStatus, { tone: BadgeTone; icon: () => JSX.Element }> = {
  ASSIGNED: { tone: 'info', icon: () => <ClockIcon className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { tone: 'info', icon: () => <WrenchIcon className="h-3.5 w-3.5" /> },
  SUBMITTED: { tone: 'warning', icon: () => <ClipboardIcon className="h-3.5 w-3.5" /> },
  REVISION_REQUIRED: { tone: 'danger', icon: () => <AlertTriangleIcon className="h-3.5 w-3.5" /> },
  VERIFIED: { tone: 'success', icon: () => <CheckCircleIcon className="h-3.5 w-3.5" /> },
};

const REQUEST: Record<RequestStatus, { tone: BadgeTone; icon: () => JSX.Element }> = {
  PENDING: { tone: 'warning', icon: () => <ClockIcon className="h-3.5 w-3.5" /> },
  APPROVED: { tone: 'success', icon: () => <CheckCircleIcon className="h-3.5 w-3.5" /> },
  REJECTED: { tone: 'danger', icon: () => <XCircleIcon className="h-3.5 w-3.5" /> },
};

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  const s = COMPLAINT[status];
  return <Badge tone={s.tone} icon={s.icon()}>{statusLabel(status)}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const s = TASK[status];
  return <Badge tone={s.tone} icon={s.icon()}>{taskStatusLabel(status)}</Badge>;
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const s = REQUEST[status];
  return <Badge tone={s.tone} icon={s.icon()}>{requestStatusLabel(status)}</Badge>;
}

export function CategoryBadge({ category }: { category: ComplaintCategory }) {
  return <Badge tone="neutral">{categoryLabel(category)}</Badge>;
}
