// Pure formatting logic for CleanConnect's own permanent toilet
// registration-request reference (e.g. "REQ-0012") — the same pattern
// as utils/cleanConnectId.ts and utils/complaintId.ts. No
// Prisma/database dependency here; the DB-touching "what's the next
// available number" query lives in toiletRequest.service.ts's
// getNextRequestCode().
export function formatRequestCode(sequenceNumber: number): string {
  return `REQ-${String(sequenceNumber).padStart(4, '0')}`;
}
