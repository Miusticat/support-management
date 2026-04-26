// Tracker-compatible tagged-template SQL wrapper backed by Prisma's $queryRaw.
// Lets us reuse support-tracker's SQL verbatim against the same Postgres DB
// that powers the management app (models have @@map to tracker table names).
import { prisma } from "@/lib/prisma";

type SqlTag = <T = unknown>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T>;

export type SQL = SqlTag;

let _sql: SQL | null = null;

export function getSql(): SQL {
  if (!_sql) {
    _sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
      (prisma.$queryRaw as unknown as SqlTag)(strings, ...values)) as SQL;
  }
  return _sql;
}
