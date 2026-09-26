import { RequestStatus } from '../api/toiletRequests';

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function requestStatusLabel(status: RequestStatus): string {
  return STATUS_LABELS[status];
}

export const ALL_REQUEST_STATUSES: RequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
