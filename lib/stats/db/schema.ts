// Schema init is handled by Prisma migrations in the management app.
// This shim keeps the ported tracker queries.ts unchanged.
export async function ensureDbInitialized(): Promise<void> {
  // no-op
}
