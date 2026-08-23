import { asNumber, clamp, timestampMs } from '../format';
import {
  ModelUsageRow,
  MonthlyUsage,
  QuotaSnapshot,
  UsageRecord,
  UsageSummary,
  UsageWindow,
} from '../types';
import {
  RawCreditsResponse,
  RawSummaryResponse,
  RawUsageRecord,
} from './client';

export const GOAT_MONTHLY_CREDITS = 70;

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeCreatedAt(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }
  const milliseconds = timestampMs(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : '';
}

function normalizeWindow(
  raw: {
    used?: unknown;
    cap?: unknown;
    exceeded?: boolean | null;
    resetAt?: unknown;
  } | undefined,
  fallbackCap: number
): UsageWindow {
  const used = Math.max(0, asNumber(raw?.used));
  const cap = Math.max(0, asNumber(raw?.cap, fallbackCap));
  const percent = cap > 0 ? clamp((used / cap) * 100) : 0;
  return {
    used,
    cap,
    percent,
    remaining: Math.max(0, cap - used),
    exceeded: raw?.exceeded ?? null,
    resetAt: optionalNumber(raw?.resetAt),
  };
}

function normalizeMonthly(
  credits: RawCreditsResponse['credits'] | undefined,
  summary: RawSummaryResponse | undefined
): MonthlyUsage {
  const summaryUsed = optionalNumber(summary?.totalMonthlyCredits);
  const creditsRemaining = optionalNumber(credits?.monthlyCredits);
  const hasUsageData = summaryUsed !== undefined || creditsRemaining !== undefined;
  const used = Math.max(
    0,
    summaryUsed ?? (creditsRemaining === undefined ? 0 : GOAT_MONTHLY_CREDITS - creditsRemaining)
  );
  const inferredCap =
    creditsRemaining === undefined
      ? hasUsageData
        ? Math.max(GOAT_MONTHLY_CREDITS, used)
        : 0
      : Math.max(GOAT_MONTHLY_CREDITS, used + creditsRemaining);
  const cap = inferredCap > 0 ? inferredCap : GOAT_MONTHLY_CREDITS;
  const remaining = Math.max(
    0,
    creditsRemaining === undefined ? cap - used : creditsRemaining
  );

  return {
    used,
    cap,
    percent: cap > 0 ? clamp((used / cap) * 100) : 0,
    remaining,
  };
}

export function normalizeQuota(
  credits: RawCreditsResponse,
  summary?: RawSummaryResponse,
  fetchedAt = Date.now()
): QuotaSnapshot {
  return {
    fiveHour: normalizeWindow(credits.windowLimits?.fiveHour, 14),
    weekly: normalizeWindow(credits.windowLimits?.weekly, 35),
    monthly: normalizeMonthly(credits.credits, summary),
    limited: credits.windowLimits?.limited ?? true,
    fetchedAt,
  };
}

export function normalizeSummary(raw: RawSummaryResponse | undefined): UsageSummary {
  return {
    totalCount: Math.max(0, Math.round(asNumber(raw?.totalCount))),
    totalCost: Math.max(0, asNumber(raw?.totalCost)),
    averageCost: Math.max(0, asNumber(raw?.averageCost)),
    successRate: clamp(asNumber(raw?.successRate)),
    completedCount: Math.max(0, Math.round(asNumber(raw?.completedCount))),
    failedCount: Math.max(0, Math.round(asNumber(raw?.failedCount))),
    totalTokensIn: Math.max(0, Math.round(asNumber(raw?.totalTokensIn))),
    totalTokensOut: Math.max(0, Math.round(asNumber(raw?.totalTokensOut))),
    totalTokens: Math.max(0, Math.round(asNumber(raw?.totalTokens))),
    totalCredits: Math.max(0, asNumber(raw?.totalCredits)),
    totalFreeCredits: Math.max(0, asNumber(raw?.totalFreeCredits)),
    totalMonthlyCredits: Math.max(0, asNumber(raw?.totalMonthlyCredits)),
    periodBasis: raw?.periodBasis || 'billing-period',
  };
}

export function normalizeUsageRecord(raw: RawUsageRecord): UsageRecord {
  const tokensIn = Math.max(0, Math.round(asNumber(raw.tokensIn ?? raw.tokens_in)));
  const tokensOut = Math.max(0, Math.round(asNumber(raw.tokensOut ?? raw.tokens_out)));
  const suppliedTokensTotal = optionalNumber(raw.tokensTotal ?? raw.tokens_total);
  const tokensTotal = Math.max(
    0,
    Math.round(suppliedTokensTotal ?? tokensIn + tokensOut)
  );
  const suppliedCredits = optionalNumber(raw.creditsTotal ?? raw.credits_total);
  const metaCost = optionalNumber(raw.meta?.totalCost ?? raw.meta?.total_cost);
  const actualCost = Math.max(0, suppliedCredits ?? metaCost ?? 0);
  const planPoolDraw = Math.max(
    0,
    optionalNumber(raw.meta?.planPoolDraw ?? raw.meta?.plan_pool_draw) ?? actualCost
  );

  return {
    id: raw.id || '',
    createdAt: normalizeCreatedAt(raw.createdAt ?? raw.created_at),
    tokensIn,
    tokensOut,
    tokensTotal,
    creditsTotal: actualCost,
    durationMs: Math.max(0, asNumber(raw.durationTotal ?? raw.duration_total)),
    status: raw.status || 'unknown',
    model: raw.meta?.model || raw.meta?.modelName || 'Unknown model',
    provider: raw.meta?.provider || 'Unknown provider',
    planId: raw.meta?.planId || raw.meta?.plan_id || 'unknown-plan',
    planPoolDraw,
    actualCost,
    inputCost: Math.max(0, asNumber(raw.meta?.inputCost ?? raw.meta?.input_cost)),
    outputCost: Math.max(0, asNumber(raw.meta?.outputCost ?? raw.meta?.output_cost)),
    cacheCost: Math.max(0, asNumber(raw.meta?.cacheCost ?? raw.meta?.cache_cost)),
    cacheReadTokens: Math.max(
      0,
      Math.round(
        asNumber(raw.meta?.cacheReadInputTokens ?? raw.meta?.cache_read_input_tokens)
      )
    ),
    cacheCreationTokens: Math.max(
      0,
      Math.round(
        asNumber(raw.meta?.cacheCreationInputTokens ?? raw.meta?.cache_creation_input_tokens)
      )
    ),
    type: raw.type || 'unknown',
    mode: raw.mode || 'unknown',
  };
}

export function aggregateModelUsage(
  records: UsageRecord[],
  monthlyCap = GOAT_MONTHLY_CREDITS
): ModelUsageRow[] {
  const byModel = new Map<string, ModelUsageRow>();

  for (const record of records) {
    const current = byModel.get(record.model) ?? {
      model: record.model,
      requests: 0,
      tokensIn: 0,
      tokensOut: 0,
      tokensTotal: 0,
      actualCost: 0,
      planSpend: 0,
      planPercent: 0,
    };

    current.requests += 1;
    current.tokensIn += record.tokensIn;
    current.tokensOut += record.tokensOut;
    current.tokensTotal += record.tokensTotal;
    current.actualCost += record.actualCost;
    current.planSpend += record.planPoolDraw;
    current.planPercent = monthlyCap > 0 ? (current.planSpend / monthlyCap) * 100 : 0;
    byModel.set(record.model, current);
  }

  return [...byModel.values()].sort((a, b) => {
    if (b.planSpend !== a.planSpend) {
      return b.planSpend - a.planSpend;
    }
    return b.tokensTotal - a.tokensTotal;
  });
}

export function summarizeUsageRecords(records: UsageRecord[]): UsageSummary {
  const completedCount = records.filter((record) => record.status.toLowerCase() === 'completed').length;
  const failedCount = records.filter((record) => record.status.toLowerCase() === 'failed').length;
  const totalTokensIn = records.reduce((sum, record) => sum + record.tokensIn, 0);
  const totalTokensOut = records.reduce((sum, record) => sum + record.tokensOut, 0);
  const totalTokens = records.reduce((sum, record) => sum + record.tokensTotal, 0);
  const totalCredits = records.reduce((sum, record) => sum + record.actualCost, 0);
  const totalMonthlyCredits = records.reduce((sum, record) => sum + record.planPoolDraw, 0);

  return {
    totalCount: records.length,
    totalCost: totalMonthlyCredits,
    averageCost: records.length > 0 ? totalMonthlyCredits / records.length : 0,
    successRate: records.length > 0 ? (completedCount / records.length) * 100 : 0,
    completedCount,
    failedCount,
    totalTokensIn,
    totalTokensOut,
    totalTokens,
    totalCredits,
    totalFreeCredits: 0,
    totalMonthlyCredits,
    periodBasis: 'loaded-usage',
  };
}

export interface DailyUsage {
  days: string[];
  tokensByModel: Record<string, Record<string, number>>;
  planSpendByModel: Record<string, Record<string, number>>;
}

export function buildDailyUsage(
  records: UsageRecord[],
  startMs: number,
  endMs: number
): DailyUsage {
  const dayMs = 24 * 60 * 60 * 1000;
  const firstDay = Date.UTC(
    new Date(startMs).getUTCFullYear(),
    new Date(startMs).getUTCMonth(),
    new Date(startMs).getUTCDate()
  );
  const lastDay = Date.UTC(
    new Date(endMs).getUTCFullYear(),
    new Date(endMs).getUTCMonth(),
    new Date(endMs).getUTCDate()
  );
  const days: string[] = [];

  for (let cursor = firstDay; cursor <= lastDay; cursor += dayMs) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
  }

  const tokensByModel: Record<string, Record<string, number>> = {};
  const planSpendByModel: Record<string, Record<string, number>> = {};

  for (const record of records) {
    const timestamp = timestampMs(record.createdAt);
    if (!Number.isFinite(timestamp) || timestamp < startMs || timestamp > endMs) {
      continue;
    }
    const day = new Date(timestamp).toISOString().slice(0, 10);
    tokensByModel[day] ??= {};
    planSpendByModel[day] ??= {};
    tokensByModel[day][record.model] = (tokensByModel[day][record.model] ?? 0) + record.tokensTotal;
    planSpendByModel[day][record.model] =
      (planSpendByModel[day][record.model] ?? 0) + record.planPoolDraw;
  }

  return { days, tokensByModel, planSpendByModel };
}
