export type DateRangePreset = '1d' | '7d' | '30d' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startMs: number;
  endMs: number;
}

export interface UsageWindow {
  used: number;
  cap: number;
  percent: number;
  remaining: number;
  exceeded: boolean | null;
  resetAt?: number;
}

export interface MonthlyUsage {
  used: number;
  cap: number;
  percent: number;
  remaining: number;
  resetAt?: number;
}

export interface QuotaSnapshot {
  fiveHour: UsageWindow;
  weekly: UsageWindow;
  monthly: MonthlyUsage;
  limited: boolean;
  fetchedAt: number;
}

export interface UsageRecord {
  id: string;
  createdAt: string;
  tokensIn: number;
  tokensOut: number;
  tokensTotal: number;
  creditsTotal: number;
  durationMs: number;
  status: string;
  model: string;
  provider: string;
  planId: string;
  planPoolDraw: number;
  actualCost: number;
  inputCost: number;
  outputCost: number;
  cacheCost: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  type: string;
  mode: string;
}

export interface UsageSummary {
  totalCount: number;
  totalCost: number;
  averageCost: number;
  successRate: number;
  completedCount: number;
  failedCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTokens: number;
  totalCredits: number;
  totalFreeCredits: number;
  totalMonthlyCredits: number;
  periodBasis: string;
}

export interface ModelUsageRow {
  model: string;
  requests: number;
  tokensIn: number;
  tokensOut: number;
  tokensTotal: number;
  actualCost: number;
  planSpend: number;
  planPercent: number;
}

export interface HoverData {
  todayTotalTokens: number;
  todayPlanSpend: number;
  recentUsages: UsageRecord[];
  detailError?: string;
}

export interface DashboardSnapshot {
  quotas: QuotaSnapshot;
  summary: UsageSummary;
  models: ModelUsageRow[];
  usages: UsageRecord[];
  fetchedAt: number;
  detailError?: string;
}

export interface CommandCodeCredentials {
  apiKey?: string;
  sessionCookie?: string;
  source: 'environment' | 'secret' | 'auth-file' | 'mixed';
}
