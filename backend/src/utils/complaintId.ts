// Pure formatting logic for CleanConnect's own permanent complaint
// reference (e.g. "CMP-0012") — the same pattern as
// utils/cleanConnectId.ts for toilets. No Prisma/database dependency
// here; the DB-touching "what's the next available number" query
// lives in complaint.service.ts's getNextComplaintCode().
export function formatComplaintCode(sequenceNumber: number): string {
  return `CMP-${String(sequenceNumber).padStart(4, '0')}`;
}
