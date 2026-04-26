// Ticket-scoped audit log (separate from the sanctions audit).
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type AuditAction =
  | "import_data"
  | "delete_range"
  | "delete_all"
  | "export_data"
  | "category_create"
  | "category_update"
  | "category_delete"
  | "support_member_create"
  | "support_member_update"
  | "support_member_delete"
  | "view_audit";

export interface AuditEntry {
  id: number;
  user_id: string | null;
  username: string;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export async function logAudit(entry: {
  user_id?: string | number | null;
  username: string;
  action: AuditAction | string;
  details?: Record<string, unknown>;
  ip_address?: string;
}): Promise<void> {
  await prisma.ticketAuditLog.create({
    data: {
      userId: entry.user_id != null ? String(entry.user_id) : null,
      username: entry.username,
      action: entry.action,
      details: entry.details
        ? (entry.details as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ipAddress: entry.ip_address ?? null,
    },
  });
}

export async function getAuditLog(opts: {
  limit?: number;
  offset?: number;
  action?: string;
  username?: string;
  from?: string;
  to?: string;
}): Promise<{ entries: AuditEntry[]; total: number }> {
  const limit = opts.limit || 50;
  const offset = opts.offset || 0;

  const where: Record<string, unknown> = {};
  if (opts.action) where.action = opts.action;
  if (opts.username) where.username = opts.username;
  if (opts.from || opts.to) {
    const gte = opts.from ? new Date(opts.from) : undefined;
    const lt = opts.to ? new Date(opts.to) : undefined;
    where.createdAt = { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) };
  }

  const [rows, total] = await Promise.all([
    prisma.ticketAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.ticketAuditLog.count({ where }),
  ]);

  const entries: AuditEntry[] = rows.map((r: {
    id: number;
    userId: string | null;
    username: string;
    action: string;
    details: Prisma.JsonValue | null;
    ipAddress: string | null;
    createdAt: Date;
  }) => ({
    id: r.id,
    user_id: r.userId,
    username: r.username,
    action: r.action,
    details: (r.details as Record<string, unknown> | null) ?? null,
    ip_address: r.ipAddress,
    created_at: r.createdAt.toISOString(),
  }));

  return { entries, total };
}
