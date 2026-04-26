export interface TicketRecord {
  id: number;
  username: string;
  character: string;
  request: string;
  submittedAt: string; // ISO 8601
  handler: string | null; // null = N/A (not handled)
  categoryId?: number | null; // Optional category ID
}

export interface ImportResult {
  inserted: number;
  duplicates: number;
  total: number;
}

export interface TicketCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  description?: string;
  keywords: string;
  weight: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OverviewStats {
  totalTickets: number;
  respondedTickets: number;
  unrespondedTickets: number;
  responseRate: number; // 0-100
  uniqueHandlers: number;
}

export interface HourlyBucket {
  hour: number; // 0-23
  count: number;
}

export interface HandlerStat {
  handler: string;
  ticketsHandled: number;
  percentage: number; // 0-100
}

export interface VolumeBucket {
  label: string; // date label (e.g. "2026-03-11", "Week 10", "March 2026")
  count: number;
  responded: number;
  unresponded: number;
}

export interface KeywordStat {
  word: string;
  count: number;
}

export interface DashboardFilters {
  from: string; // ISO date
  to: string; // ISO date
  groupBy: "day" | "week" | "month";
}

export interface TicketRow {
  id: number;
  username: string;
  character: string;
  request: string;
  submitted_at: string;
  handler: string | null;
  imported_at: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
}

// ─── New stats types ─────────────────────────────────────

export interface DayOfWeekBucket {
  day: number; // 0=Sunday, 1=Monday, ...6=Saturday
  dayName: string;
  count: number;
}

export interface TopUser {
  username: string;
  character: string;
  ticketCount: number;
  respondedCount: number;
}

export interface HandlerHourly {
  handler: string;
  hours: number[]; // 24 values, one per hour
}

export interface PeriodComparison {
  current: { total: number; responded: number; handlers: number };
  previous: { total: number; responded: number; handlers: number };
  changes: { total: number; responded: number; handlers: number }; // percentages
}

export interface AdvancedStats {
  avgTicketsPerDay: number;
  peakHour: number;
  peakHourCount: number;
  busiestDay: string;
  busiestDayCount: number;
  uniqueUsers: number;
  avgPerHandler: number;
}

// ─── Auth & User types ──────────────────────────────────

export interface UserRecord {
  id: number;
  username: string;
  display_name: string | null;
  role: "admin" | "manager" | "viewer";
  can_import: boolean | null;
  can_delete_range: boolean | null;
  can_delete_all: boolean | null;
  can_export: boolean | null;
  can_manage_users: boolean | null;
  can_view_audit: boolean | null;
  can_manage_categories: boolean | null;
  can_manage_support: boolean | null;
  totp_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: number;
  username: string;
  role: "admin" | "manager" | "viewer";
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
