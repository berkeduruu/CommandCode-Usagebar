import * as vscode from 'vscode';
import {
  clearApiKey,
  clearSessionCookie,
  resolveCredentials,
  saveApiKey,
  saveSessionCookie,
} from './auth';
import {
  CommandCodeApi,
  CommandCodeApiError,
  RawSummaryResponse,
} from './api/client';
import {
  aggregateModelUsage,
  normalizeQuota,
  normalizeSummary,
  normalizeUsageRecord,
  summarizeUsageRecords,
} from './api/commandcode';
import { log } from './log';
import {
  CommandCodeCredentials,
  DashboardSnapshot,
  DateRange,
  DateRangePreset,
  HoverData,
  QuotaSnapshot,
  UsageRecord,
  UsageSummary,
} from './types';
import { endOfUtcDay, startOfUtcDay, timestampMs } from './format';

export class UsageManager {
  private credentials: CommandCodeCredentials | undefined;
  private quotas: QuotaSnapshot | undefined;
  private summary: UsageSummary | undefined;
  private usages: UsageRecord[] = [];
  private hoverData: HoverData = {
    todayTotalTokens: 0,
    todayPlanSpend: 0,
    recentUsages: [],
  };
  private detailError: string | undefined;
  private refreshTimer: NodeJS.Timeout | undefined;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  onUpdate(listener: () => void): vscode.Disposable {
    this.listeners.add(listener);
    return new vscode.Disposable(() => this.listeners.delete(listener));
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  async initialize(): Promise<void> {
    await this.refresh();
    this.startTimer();
  }

  private startTimer(): void {
    const configuredSeconds = vscode.workspace
      .getConfiguration('commandCodeUsage')
      .get<number>('refreshIntervalSeconds', 60);
    const seconds = Number.isFinite(configuredSeconds)
      ? Math.max(15, configuredSeconds)
      : 60;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.refreshTimer = setInterval(() => {
      void this.refresh().catch(() => undefined);
    }, seconds * 1000);
  }

  private historyLimit(): number {
    const configured = vscode.workspace
      .getConfiguration('commandCodeUsage')
      .get<number>('historyLimit', 100);
    return Math.min(500, Math.max(10, Math.round(configured)));
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  getQuota(): QuotaSnapshot | undefined {
    return this.quotas;
  }

  getHoverData(): HoverData {
    return this.hoverData;
  }

  getDetailError(): string | undefined {
    return this.detailError;
  }

  async setApiKey(value: string): Promise<void> {
    const apiKey = value.replace(/^Bearer\s+/i, '').trim();
    if (!apiKey) {
      throw new Error('API key cannot be empty');
    }

    const probe = new CommandCodeApi({
      apiKey,
      sessionCookie: this.credentials?.sessionCookie,
      source: 'secret',
    });
    await probe.fetchCredits();
    await saveApiKey(this.context, apiKey);
    this.credentials = { ...this.credentials, apiKey, source: 'secret' };
    await this.refresh();
  }

  async setSessionCookie(value: string): Promise<void> {
    const cookie = value.trim().replace(/^Cookie:\s*/i, '');
    if (!cookie) {
      throw new Error('Session cookie cannot be empty');
    }

    const probe = new CommandCodeApi({
      apiKey: this.credentials?.apiKey,
      sessionCookie: cookie,
      source: 'secret',
    });
    await probe.fetchCredits();
    await saveSessionCookie(this.context, cookie);
    this.credentials = { ...this.credentials, sessionCookie: cookie, source: 'secret' };
    await this.refresh();
  }

  async clearApiKey(): Promise<void> {
    await clearApiKey(this.context);
    await this.refresh();
  }

  async clearSessionCookie(): Promise<void> {
    await clearSessionCookie(this.context);
    await this.refresh();
  }

  private clearData(): void {
    this.quotas = undefined;
    this.summary = undefined;
    this.usages = [];
    this.detailError = undefined;
    this.hoverData = {
      todayTotalTokens: 0,
      todayPlanSpend: 0,
      recentUsages: [],
    };
  }

  async refresh(): Promise<void> {
    this.credentials = await resolveCredentials(this.context);
    if (!this.credentials) {
      this.clearData();
      this.notify();
      return;
    }

    const api = new CommandCodeApi(this.credentials);
    let rawCredits;
    try {
      rawCredits = await api.fetchCredits();
    } catch (error) {
      if (this.quotas) {
        this.detailError = 'Could not refresh quota data; showing the last known values.';
        this.notify();
      } else {
        this.clearData();
        this.notify();
      }
      throw error;
    }

    const [summaryResult, usageResult] = await Promise.allSettled([
      api.fetchSummary(),
      api.fetchUsages(10),
    ]);

    const rawSummary =
      summaryResult.status === 'fulfilled' ? summaryResult.value : undefined;
    const rawUsages =
      usageResult.status === 'fulfilled' ? usageResult.value.usages ?? [] : [];
    const freshRecords = rawUsages.map(normalizeUsageRecord).sort(sortNewestFirst);
    const records =
      freshRecords.length > 0 || this.usages.length === 0 ? freshRecords : this.usages;
    const emptyUsageWarning =
      usageResult.status === 'fulfilled' &&
      freshRecords.length === 0 &&
      this.usages.length > 0
        ? 'Usage endpoint returned no records; showing the last known history.'
        : undefined;

    this.quotas = normalizeQuota(rawCredits, rawSummary);
    this.usages = records;
    this.summary = rawSummary
      ? normalizeSummary(rawSummary)
      : summarizeUsageRecords(records);
    this.detailError =
      this.buildDetailError(summaryResult, usageResult) ?? emptyUsageWarning;
    this.hoverData = buildHoverData(records);
    this.notify();

    if (this.detailError) {
      log(this.detailError);
    }
  }

  private buildDetailError(
    summaryResult: PromiseSettledResult<RawSummaryResponse>,
    usageResult: PromiseSettledResult<unknown>
  ): string | undefined {
    const rejected = [summaryResult, usageResult].filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    if (rejected.length === 0) {
      return undefined;
    }

    const authRejected = rejected.some(
      (result) =>
        result.reason instanceof CommandCodeApiError &&
        (result.reason.statusCode === 401 || result.reason.statusCode === 403)
    );
    if (authRejected) {
      return 'Quota is available, but detailed Studio usage needs a session cookie. Run “CommandCode Usagebar: Set Studio Session Cookie”.';
    }
    return 'Some detailed CommandCode usage data could not be loaded.';
  }

  buildDateRange(
    preset: DateRangePreset,
    customStart?: string,
    customEnd?: string
  ): DateRange {
    const now = Date.now();
    if (preset === 'custom' && customStart && customEnd) {
      const startDate = new Date(`${customStart}T00:00:00Z`);
      const endDate = new Date(`${customEnd}T00:00:00Z`);
      const start = startOfUtcDay(startDate);
      const end = endOfUtcDay(endDate);
      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        end < start
      ) {
        throw new Error('Custom range end must be on or after the start date.');
      }
      return { preset, startMs: start, endMs: end };
    }
    if (preset === '1d') {
      return { preset, startMs: startOfUtcDay(), endMs: now };
    }
    if (preset === '7d') {
      return { preset, startMs: now - 7 * 24 * 60 * 60 * 1000, endMs: now };
    }
    return { preset, startMs: now - 30 * 24 * 60 * 60 * 1000, endMs: now };
  }

  async loadDashboard(range: DateRange): Promise<DashboardSnapshot> {
    if (!this.credentials) {
      this.credentials = await resolveCredentials(this.context);
    }
    if (!this.credentials) {
      throw new Error('No CommandCode credentials found');
    }

    const api = new CommandCodeApi(this.credentials);
    let rawCredits;
    let quotas: QuotaSnapshot;
    let quotaError: string | undefined;
    try {
      rawCredits = await api.fetchCredits();
      quotas = normalizeQuota(rawCredits);
    } catch (error) {
      if (!this.quotas) {
        throw error;
      }
      quotas = this.quotas;
      quotaError = 'Could not refresh quota data; showing the last known values.';
    }
    const [summaryResult, usageResult] = await Promise.allSettled([
      api.fetchSummary(),
      api.fetchAllUsages(this.historyLimit(), 20, range.startMs),
    ]);

    const rawSummary =
      summaryResult.status === 'fulfilled' ? summaryResult.value : undefined;
    const freshRecords =
      usageResult.status === 'fulfilled'
        ? usageResult.value.map(normalizeUsageRecord).sort(sortNewestFirst)
        : [];
    const records =
      freshRecords.length > 0 || this.usages.length === 0
        ? freshRecords
        : this.usages;
    const emptyUsageWarning =
      usageResult.status === 'fulfilled' &&
      freshRecords.length === 0 &&
      this.usages.length > 0
        ? 'Usage endpoint returned no records; showing the last known history.'
        : undefined;
    const normalizedSummary = rawSummary
      ? normalizeSummary(rawSummary)
      : this.summary ?? summarizeUsageRecords(records);
    if (rawCredits) {
      quotas = normalizeQuota(rawCredits, rawSummary);
    }
    const detailError =
      quotaError ??
      this.buildDetailError(summaryResult, usageResult) ??
      emptyUsageWarning;

    return {
      quotas,
      summary: normalizedSummary,
      models: aggregateModelUsage(records, quotas.monthly.cap),
      usages: records,
      fetchedAt: Date.now(),
      detailError,
    };
  }
}

function sortNewestFirst(a: UsageRecord, b: UsageRecord): number {
  return timestampMs(b.createdAt) - timestampMs(a.createdAt);
}

function buildHoverData(records: UsageRecord[]): HoverData {
  const todayStart = startOfUtcDay();
  const todayEnd = endOfUtcDay();
  const today = records.filter((record) => {
    const timestamp = timestampMs(record.createdAt);
    return timestamp >= todayStart && timestamp <= todayEnd;
  });

  return {
    todayTotalTokens: today.reduce((sum, record) => sum + record.tokensTotal, 0),
    todayPlanSpend: today.reduce((sum, record) => sum + record.planPoolDraw, 0),
    recentUsages: records.slice(0, 5),
  };
}
