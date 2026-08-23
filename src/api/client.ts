import { CommandCodeCredentials } from '../types';
import { timestampMs } from '../format';

const EXTENSION_VERSION =
  typeof __EXTENSION_VERSION__ === 'string' ? __EXTENSION_VERSION__ : '0.1.3';

export const COMMAND_CODE_API_ORIGIN = 'https://api.commandcode.ai';

export class CommandCodeApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'CommandCodeApiError';
  }
}

type RequestAuth = {
  apiKey?: string;
  sessionCookie?: string;
};

function authHeaders(auth: RequestAuth): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': `commandcode-goat-usagebar/${EXTENSION_VERSION}`,
  };

  if (auth.sessionCookie) {
    headers.Cookie = auth.sessionCookie;
  } else if (auth.apiKey) {
    headers.Authorization = `Bearer ${auth.apiKey}`;
  }

  return headers;
}

async function requestJson<T>(
  path: string,
  auth: RequestAuth,
  timeoutMs = 10_000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${COMMAND_CODE_API_ORIGIN}${path}`, {
      method: 'GET',
      headers: authHeaders(auth),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new CommandCodeApiError('CommandCode authentication was rejected', response.status);
      }
      throw new CommandCodeApiError(`CommandCode API returned HTTP ${response.status}`, response.status);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new CommandCodeApiError('CommandCode API returned invalid JSON', response.status);
    }
  } catch (error) {
    if (error instanceof CommandCodeApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CommandCodeApiError('CommandCode API request timed out');
    }
    throw new CommandCodeApiError('CommandCode API request failed');
  } finally {
    clearTimeout(timeout);
  }
}

export interface RawCreditsResponse {
  credits?: {
    belowThreshold?: boolean;
    creditThreshold?: number;
    monthlyCredits?: number;
    purchasedCredits?: number;
    premiumMonthlyCredits?: number;
    openSourceMonthlyCredits?: number;
  };
  windowLimits?: {
    limited?: boolean;
    exceeded?: boolean | null;
    fiveHour?: {
      used?: number;
      cap?: number;
      exceeded?: boolean | null;
      resetAt?: number;
    };
    weekly?: {
      used?: number;
      cap?: number;
      exceeded?: boolean | null;
      resetAt?: number;
    };
  };
}

export interface RawUsageRecord {
  id?: string;
  createdAt?: string | number;
  created_at?: string | number;
  tokensIn?: string | number;
  tokens_in?: string | number;
  tokensOut?: string | number;
  tokens_out?: string | number;
  tokensTotal?: string | number;
  tokens_total?: string | number;
  creditsTotal?: string | number;
  credits_total?: string | number;
  durationTotal?: string | number;
  duration_total?: string | number;
  status?: string;
  message?: string | null;
  meta?: {
    totalCost?: number;
    inputCost?: number;
    outputCost?: number;
    cacheCost?: number;
    cache_cost?: number;
    model?: string;
    modelName?: string;
    planPoolDraw?: number;
    plan_pool_draw?: number;
    planId?: string;
    plan_id?: string;
    provider?: string;
    cacheReadInputTokens?: string | number;
    cache_read_input_tokens?: string | number;
    cacheCreationInputTokens?: string | number;
    cache_creation_input_tokens?: string | number;
    total_cost?: number;
    input_cost?: number;
    output_cost?: number;
  };
  type?: string;
  mode?: string;
}

export interface RawUsageResponse {
  usages?: RawUsageRecord[];
  items?: RawUsageRecord[];
  data?:
    | RawUsageRecord[]
    | {
        usages?: RawUsageRecord[];
        items?: RawUsageRecord[];
        nextCursor?: string | null;
      };
  nextCursor?: string | null;
  limit?: number;
  periodBasis?: string;
  window?: {
    days?: number;
    entries?: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function rawRecords(value: unknown): RawUsageRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord) as RawUsageRecord[];
}

export function normalizeUsageResponse(payload: unknown): RawUsageResponse {
  if (Array.isArray(payload)) {
    return { usages: rawRecords(payload) };
  }
  if (!isRecord(payload)) {
    return {};
  }

  const nested = isRecord(payload.data) ? payload.data : undefined;
  const usages =
    rawRecords(payload.usages).length > 0
      ? rawRecords(payload.usages)
      : rawRecords(payload.items).length > 0
        ? rawRecords(payload.items)
        : Array.isArray(payload.data)
          ? rawRecords(payload.data)
          : rawRecords(nested?.usages).length > 0
            ? rawRecords(nested?.usages)
            : rawRecords(nested?.items);
  const nextCursor =
    typeof payload.nextCursor === 'string' || payload.nextCursor === null
      ? payload.nextCursor
      : nested &&
          (typeof nested.nextCursor === 'string' || nested.nextCursor === null)
        ? nested.nextCursor
        : undefined;

  return {
    usages,
    nextCursor,
    limit: typeof payload.limit === 'number' ? payload.limit : undefined,
    periodBasis: typeof payload.periodBasis === 'string' ? payload.periodBasis : undefined,
    window: isRecord(payload.window)
      ? {
          days: typeof payload.window.days === 'number' ? payload.window.days : undefined,
          entries: typeof payload.window.entries === 'number' ? payload.window.entries : undefined,
        }
      : undefined,
  };
}

export interface RawSummaryResponse {
  totalCount?: number;
  totalCost?: number;
  averageCost?: number;
  successRate?: number;
  completedCount?: number;
  failedCount?: number;
  totalTokensIn?: number;
  totalTokensOut?: number;
  totalTokens?: number;
  totalCredits?: number;
  totalFreeCredits?: number;
  totalMonthlyCredits?: number;
  periodBasis?: string;
}

export class CommandCodeApi {
  constructor(private readonly credentials: CommandCodeCredentials) {}

  private async getInternal<T>(path: string): Promise<T> {
    const attempts: RequestAuth[] = [];
    if (this.credentials.sessionCookie) {
      attempts.push({ sessionCookie: this.credentials.sessionCookie });
    }
    if (this.credentials.apiKey) {
      attempts.push({ apiKey: this.credentials.apiKey });
    }
    if (attempts.length === 0) {
      throw new CommandCodeApiError('Detailed usage requires a CommandCode session cookie or API key');
    }

    let lastError: CommandCodeApiError | undefined;
    for (const auth of attempts) {
      try {
        return await requestJson<T>(path, auth);
      } catch (error) {
        if (!(error instanceof CommandCodeApiError)) {
          throw error;
        }
        lastError = error;
        const canRetry =
          (error.statusCode === 401 || error.statusCode === 403) &&
          auth !== attempts.at(-1);
        if (!canRetry) {
          throw error;
        }
      }
    }

    throw lastError ?? new CommandCodeApiError('CommandCode API request failed');
  }

  async fetchCredits(): Promise<RawCreditsResponse> {
    const failures: CommandCodeApiError[] = [];

    if (this.credentials.apiKey) {
      try {
        return await requestJson<RawCreditsResponse>('/alpha/billing/credits', {
          apiKey: this.credentials.apiKey,
        });
      } catch (error) {
        if (error instanceof CommandCodeApiError) {
          failures.push(error);
        }
      }
    }

    try {
      return await this.getInternal<RawCreditsResponse>('/internal/billing/credits');
    } catch (error) {
      if (error instanceof CommandCodeApiError) {
        failures.push(error);
      }
    }

    const lastFailure = failures.at(-1);
    throw lastFailure ?? new CommandCodeApiError('No CommandCode credentials available');
  }

  async fetchSummary(): Promise<RawSummaryResponse> {
    return this.getInternal<RawSummaryResponse>('/internal/usage/summary');
  }

  async fetchUsages(limit = 100, cursor?: string): Promise<RawUsageResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      params.set('cursor', cursor);
    }
    const payload = await this.getInternal<unknown>(`/internal/usage?${params.toString()}`);
    return normalizeUsageResponse(payload);
  }

  async fetchAllUsages(
    limit = 100,
    maxPages = 20,
    stopBeforeMs?: number
  ): Promise<RawUsageRecord[]> {
    const usages: RawUsageRecord[] = [];
    const seenCursors = new Set<string>();
    const seenIds = new Set<string>();
    let cursor: string | undefined;

    for (let page = 0; page < maxPages; page += 1) {
      const response = await this.fetchUsages(limit, cursor);
      const pageUsages = response.usages ?? [];
      for (const usage of pageUsages) {
        if (usage.id && seenIds.has(usage.id)) {
          continue;
        }
        if (usage.id) {
          seenIds.add(usage.id);
        }
        usages.push(usage);
      }

      if (stopBeforeMs !== undefined && pageUsages.length > 0) {
        const pageTimes = pageUsages
          .map((usage) => {
            const value = usage.createdAt ?? usage.created_at;
            return typeof value === 'string' || typeof value === 'number'
              ? timestampMs(value)
              : Number.NaN;
          })
          .filter((value) => Number.isFinite(value));
        if (
          pageTimes.length === pageUsages.length &&
          Math.max(...pageTimes) < stopBeforeMs
        ) {
          break;
        }
      }

      const nextCursor = response.nextCursor ?? undefined;
      if (!nextCursor || seenCursors.has(nextCursor)) {
        break;
      }
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }

    return usages;
  }
}
