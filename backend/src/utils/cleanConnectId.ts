// Pure formatting logic for CleanConnect's own permanent toilet
// identifier. Deliberately has no Prisma/database dependency — the
// DB-touching "what's the next available number" query lives in
// toilet.service.ts's getNextCleanConnectId(), which calls this.
export function formatCleanConnectId(sequenceNumber: number): string {
  return `CC-PMC-${String(sequenceNumber).padStart(4, '0')}`;
}
