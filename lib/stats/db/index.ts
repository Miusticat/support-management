// Tracker-compatible tagged-template SQL wrapper backed by Prisma's $queryRaw.
// Lets us reuse support-tracker's SQL verbatim against the same Postgres DB
// that powers the management app (models have @@map to tracker table names).
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Tracker code uses a Neon-style tagged-template SQL helper:
//   sql`SELECT ${sql.unsafe(rawColumnList)} FROM t WHERE id = ${id}`
// We back it with Prisma's $queryRaw, mapping `sql.unsafe(str)` to
// `Prisma.raw(str)` so the literal SQL fragment is inlined safely.
type SqlTag = (<T = unknown>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T>) & {
  unsafe: (raw: string) => Prisma.Sql;
};

export type SQL = SqlTag;

let _sql: SQL | null = null;

export function getSql(): SQL {
  if (!_sql) {
    const tag = ((strings: TemplateStringsArray, ...values: unknown[]) =>
      (prisma.$queryRaw as unknown as (
        s: TemplateStringsArray,
        ...v: unknown[]
      ) => Promise<unknown>)(strings, ...values)) as SqlTag;
    tag.unsafe = (raw: string) => Prisma.raw(raw);
    _sql = tag;
  }
  return _sql;
}
