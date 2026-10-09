// Pure formatting logic for CleanConnect's own permanent maintenance
// task reference (e.g. "TASK-0012") — the same pattern as
// utils/cleanConnectId.ts / complaintId.ts / toiletRequestId.ts. No
// Prisma/database dependency here; the DB-touching "what's the next
// available number" query lives in maintenanceTask.service.ts's
// getNextTaskCode().
export function formatTaskCode(sequenceNumber: number): string {
  return `TASK-${String(sequenceNumber).padStart(4, '0')}`;
}
