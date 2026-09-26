import { ComplaintCategory, ComplaintStatus } from '../api/complaints';

const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  CLEANLINESS: 'Cleanliness',
  WATER_SHORTAGE: 'Water Shortage',
  BROKEN_INFRASTRUCTURE: 'Broken Infrastructure',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export function categoryLabel(category: ComplaintCategory): string {
  return CATEGORY_LABELS[category];
}

export function statusLabel(status: ComplaintStatus): string {
  return STATUS_LABELS[status];
}

export const ALL_CATEGORIES: ComplaintCategory[] = [
  'CLEANLINESS',
  'WATER_SHORTAGE',
  'BROKEN_INFRASTRUCTURE',
  'OTHER',
];

export const ALL_STATUSES: ComplaintStatus[] = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];
