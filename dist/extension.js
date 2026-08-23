"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode5 = __toESM(require("vscode"));

// src/webview/dashboardPanel.ts
var vscode = __toESM(require("vscode"));

// src/format.ts
function asNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}
function clamp(value, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, value));
}
function formatTokens(tokens) {
  const value = Math.max(0, Math.round(tokens));
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    const millions = value / 1e6;
    return millions >= 10 ? `${Math.round(millions)}M` : `${millions.toFixed(1)}M`;
  }
  if (value >= 1e3) {
    const thousands = value / 1e3;
    return thousands >= 100 ? `${Math.round(thousands)}K` : `${thousands.toFixed(1)}K`;
  }
  return String(value);
}
function formatUsd(value, zeroLabel = "$0.00") {
  if (!Number.isFinite(value) || value === 0) {
    return zeroLabel;
  }
  const absolute = Math.abs(value);
  const decimals = absolute < 0.01 ? 6 : 2;
  return `$${value.toFixed(decimals).replace(/(\.\d*?[1-9])0+$/, "$1")}`;
}
function formatUtcDateTime(timestamp) {
  const date = new Date(timestampMs(timestamp));
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getUTCMonth()];
  const day = date.getUTCDate();
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${month} ${day}, ${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}
function timestampMs(value) {
  if (typeof value === "number") {
    return value < 1e10 ? value * 1e3 : value;
  }
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    return numeric < 1e10 ? numeric * 1e3 : numeric;
  }
  return Date.parse(trimmed);
}
function formatResetAt(resetAt, now = Date.now()) {
  if (!resetAt || !Number.isFinite(resetAt)) {
    return "Billing period";
  }
  const remainingMs = resetAt - now;
  if (remainingMs <= 0) {
    return "Resetting soon";
  }
  const totalMinutes = Math.ceil(remainingMs / 6e4);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor(totalMinutes % (24 * 60) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  if (days === 0 && minutes > 0) {
    parts.push(`${minutes}m`);
  }
  return `in ${parts.join(" ")}`;
}
function formatProgressBar(percent, dots = 10) {
  const filled = Math.round(clamp(percent) / 100 * dots);
  return `${"\u25CF".repeat(filled)}${"\u25CB".repeat(dots - filled)}`;
}
function startOfUtcDay(date = /* @__PURE__ */ new Date()) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
function endOfUtcDay(date = /* @__PURE__ */ new Date()) {
  return startOfUtcDay(date) + 24 * 60 * 60 * 1e3 - 1;
}
function escapeMarkdown(value) {
  return value.replace(/([\\`*_[\]|])/g, "\\$1").replace(/\r?\n/g, " ");
}

// src/api/commandcode.ts
var GOAT_MONTHLY_CREDITS = 70;
function optionalNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  }
  return void 0;
}
function normalizeCreatedAt(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }
  const milliseconds = timestampMs(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : "";
}
function normalizeWindow(raw, fallbackCap) {
  const used = Math.max(0, asNumber(raw?.used));
  const cap = Math.max(0, asNumber(raw?.cap, fallbackCap));
  const percent = cap > 0 ? clamp(used / cap * 100) : 0;
  return {
    used,
    cap,
    percent,
    remaining: Math.max(0, cap - used),
    exceeded: raw?.exceeded ?? null,
    resetAt: optionalNumber(raw?.resetAt)
  };
}
function normalizeMonthly(credits, summary) {
  const summaryUsed = optionalNumber(summary?.totalMonthlyCredits);
  const creditsRemaining = optionalNumber(credits?.monthlyCredits);
  const hasUsageData = summaryUsed !== void 0 || creditsRemaining !== void 0;
  const used = Math.max(
    0,
    summaryUsed ?? (creditsRemaining === void 0 ? 0 : GOAT_MONTHLY_CREDITS - creditsRemaining)
  );
  const inferredCap = creditsRemaining === void 0 ? hasUsageData ? Math.max(GOAT_MONTHLY_CREDITS, used) : 0 : Math.max(GOAT_MONTHLY_CREDITS, used + creditsRemaining);
  const cap = inferredCap > 0 ? inferredCap : GOAT_MONTHLY_CREDITS;
  const remaining = Math.max(
    0,
    creditsRemaining === void 0 ? cap - used : creditsRemaining
  );
  return {
    used,
    cap,
    percent: cap > 0 ? clamp(used / cap * 100) : 0,
    remaining
  };
}
function normalizeQuota(credits, summary, fetchedAt = Date.now()) {
  return {
    fiveHour: normalizeWindow(credits.windowLimits?.fiveHour, 14),
    weekly: normalizeWindow(credits.windowLimits?.weekly, 35),
    monthly: normalizeMonthly(credits.credits, summary),
    limited: credits.windowLimits?.limited ?? true,
    fetchedAt
  };
}
function normalizeSummary(raw) {
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
    periodBasis: raw?.periodBasis || "billing-period"
  };
}
function normalizeUsageRecord(raw) {
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
    id: raw.id || "",
    createdAt: normalizeCreatedAt(raw.createdAt ?? raw.created_at),
    tokensIn,
    tokensOut,
    tokensTotal,
    creditsTotal: actualCost,
    durationMs: Math.max(0, asNumber(raw.durationTotal ?? raw.duration_total)),
    status: raw.status || "unknown",
    model: raw.meta?.model || raw.meta?.modelName || "Unknown model",
    provider: raw.meta?.provider || "Unknown provider",
    planId: raw.meta?.planId || raw.meta?.plan_id || "unknown-plan",
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
    type: raw.type || "unknown",
    mode: raw.mode || "unknown"
  };
}
function aggregateModelUsage(records, monthlyCap = GOAT_MONTHLY_CREDITS) {
  const byModel = /* @__PURE__ */ new Map();
  for (const record of records) {
    const current = byModel.get(record.model) ?? {
      model: record.model,
      requests: 0,
      tokensIn: 0,
      tokensOut: 0,
      tokensTotal: 0,
      actualCost: 0,
      planSpend: 0,
      planPercent: 0
    };
    current.requests += 1;
    current.tokensIn += record.tokensIn;
    current.tokensOut += record.tokensOut;
    current.tokensTotal += record.tokensTotal;
    current.actualCost += record.actualCost;
    current.planSpend += record.planPoolDraw;
    current.planPercent = monthlyCap > 0 ? current.planSpend / monthlyCap * 100 : 0;
    byModel.set(record.model, current);
  }
  return [...byModel.values()].sort((a, b) => {
    if (b.planSpend !== a.planSpend) {
      return b.planSpend - a.planSpend;
    }
    return b.tokensTotal - a.tokensTotal;
  });
}
function summarizeUsageRecords(records) {
  const completedCount = records.filter((record) => record.status.toLowerCase() === "completed").length;
  const failedCount = records.filter((record) => record.status.toLowerCase() === "failed").length;
  const totalTokensIn = records.reduce((sum, record) => sum + record.tokensIn, 0);
  const totalTokensOut = records.reduce((sum, record) => sum + record.tokensOut, 0);
  const totalTokens = records.reduce((sum, record) => sum + record.tokensTotal, 0);
  const totalCredits = records.reduce((sum, record) => sum + record.actualCost, 0);
  const totalMonthlyCredits = records.reduce((sum, record) => sum + record.planPoolDraw, 0);
  return {
    totalCount: records.length,
    totalCost: totalMonthlyCredits,
    averageCost: records.length > 0 ? totalMonthlyCredits / records.length : 0,
    successRate: records.length > 0 ? completedCount / records.length * 100 : 0,
    completedCount,
    failedCount,
    totalTokensIn,
    totalTokensOut,
    totalTokens,
    totalCredits,
    totalFreeCredits: 0,
    totalMonthlyCredits,
    periodBasis: "loaded-usage"
  };
}
function buildDailyUsage(records, startMs, endMs) {
  const dayMs = 24 * 60 * 60 * 1e3;
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
  const days = [];
  for (let cursor = firstDay; cursor <= lastDay; cursor += dayMs) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
  }
  const tokensByModel = {};
  const planSpendByModel = {};
  for (const record of records) {
    const timestamp = timestampMs(record.createdAt);
    if (!Number.isFinite(timestamp) || timestamp < startMs || timestamp > endMs) {
      continue;
    }
    const day = new Date(timestamp).toISOString().slice(0, 10);
    tokensByModel[day] ??= {};
    planSpendByModel[day] ??= {};
    tokensByModel[day][record.model] = (tokensByModel[day][record.model] ?? 0) + record.tokensTotal;
    planSpendByModel[day][record.model] = (planSpendByModel[day][record.model] ?? 0) + record.planPoolDraw;
  }
  return { days, tokensByModel, planSpendByModel };
}

// src/webview/dashboardPanel.ts
var DashboardPanel = class _DashboardPanel {
  constructor(panel, extensionUri, manager2) {
    this.extensionUri = extensionUri;
    this.manager = manager2;
    this.panel = panel;
    this.panel.webview.html = this.getDashboardHtml();
    this.updateSubscription = this.manager.onUpdate(() => {
      if (this.webviewReady) {
        void this.pushData();
      }
    });
    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "ready") {
        this.webviewReady = true;
        await this.pushData();
        return;
      }
      if (message.type === "refresh") {
        await this.pushData();
        return;
      }
      if (message.type === "setRange") {
        this.currentRange = {
          preset: message.preset,
          customStart: message.customStart,
          customEnd: message.customEnd
        };
        await this.pushData();
      }
    });
    this.panel.onDidDispose(() => {
      this.updateSubscription.dispose();
      _DashboardPanel.current = void 0;
    });
  }
  extensionUri;
  manager;
  static current;
  panel;
  updateSubscription;
  webviewReady = false;
  currentRange = { preset: "7d" };
  static show(extensionUri, manager2) {
    if (_DashboardPanel.current) {
      _DashboardPanel.current.panel.reveal(vscode.ViewColumn.One);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "commandCodeUsageDashboard",
      "CommandCode GOAT Usage",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );
    _DashboardPanel.current = new _DashboardPanel(panel, extensionUri, manager2);
  }
  static dispose() {
    _DashboardPanel.current?.panel.dispose();
    _DashboardPanel.current = void 0;
  }
  async pushData() {
    try {
      const range = this.manager.buildDateRange(
        this.currentRange.preset,
        this.currentRange.customStart,
        this.currentRange.customEnd
      );
      const snapshot = await this.manager.loadDashboard(range);
      await this.panel.webview.postMessage({
        type: "data",
        payload: serializeSnapshot(snapshot, range)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard";
      await this.panel.webview.postMessage({ type: "error", message });
    }
  }
  getDashboardHtml() {
    const chartScriptUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", "chart.umd.min.js")).toString();
    return getDashboardHtml(this.panel.webview.cspSource, chartScriptUri);
  }
};
function enumerateDays(startMs, endMs) {
  const days = [];
  const first = startOfUtcDay(new Date(startMs));
  const last = startOfUtcDay(new Date(endMs));
  for (let cursor = first; cursor <= last; cursor += 24 * 60 * 60 * 1e3) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return days;
}
function serializeSnapshot(snapshot, range) {
  const rangeUsages = snapshot.usages.filter((usage) => {
    const createdAt = timestampMs(usage.createdAt);
    return Number.isFinite(createdAt) && createdAt >= range.startMs && createdAt <= range.endMs;
  });
  const daily = buildDailyUsage(rangeUsages, range.startMs, range.endMs);
  const days = daily.days.length > 0 ? daily.days : enumerateDays(range.startMs, range.endMs);
  const rangeSummary = summarizeUsageRecords(rangeUsages);
  const rangeModels = aggregateModelUsage(rangeUsages, snapshot.quotas.monthly.cap);
  const summaryScope = "selected range";
  const history = rangeUsages.slice(0, 500);
  const dailyModels = days.map((day) => {
    const tokenModels = daily.tokensByModel[day] ?? {};
    const spendModels = daily.planSpendByModel[day] ?? {};
    return Object.keys(tokenModels).map((model) => ({
      model,
      tokens: tokenModels[model],
      planSpend: spendModels[model] ?? 0
    })).sort((a, b) => b.planSpend - a.planSpend);
  });
  return {
    range,
    quotas: snapshot.quotas,
    summary: snapshot.summary,
    rangeSummary,
    summaryScope,
    models: rangeModels,
    usages: history,
    detailError: snapshot.detailError,
    charts: {
      days,
      tokensByModel: days.map((day) => daily.tokensByModel[day] ?? {}),
      planSpendByModel: days.map((day) => daily.planSpendByModel[day] ?? {}),
      dailyModels
    },
    fetchedAt: snapshot.fetchedAt
  };
}
function getDashboardHtml(cspSource, chartScriptUri) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CommandCode GOAT Usage</title>
  <script src="${chartScriptUri}"></script>
  <style>
    :root {
      --bg: #0b0b0c;
      --panel: #141416;
      --panel-alt: #18181b;
      --border: #2a2a2e;
      --text: #e8e8ea;
      --muted: #9b9ba3;
      --accent: #d88918;
      --accent-soft: rgba(216, 137, 24, 0.85);
      --blue: #3b82f6;
      --green: #22c55e;
      --red: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 13px;
    }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 28px 0 12px; }
    h3 { font-size: 13px; margin: 0 0 8px; }
    .subtitle { color: var(--muted); margin-bottom: 20px; }
    .section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .quota-list { display: grid; gap: 12px; }
    .quota-card {
      background: var(--panel-alt);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
    }
    .quota-head, .quota-meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }
    .quota-head { margin-bottom: 8px; }
    .quota-meta { color: var(--muted); font-size: 11px; margin-top: 7px; }
    .bar-track { height: 7px; background: #27272a; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; min-width: 0; background: var(--accent); border-radius: 4px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }
    .summary-card {
      background: var(--panel-alt);
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 10px;
    }
    .summary-card strong { display: block; font-size: 15px; margin-top: 4px; }
    .muted { color: var(--muted); }
    .range-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 12px;
    }
    button, input[type="date"] {
      background: #1c1c1f;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 12px;
    }
    button.active { border-color: var(--accent); color: var(--accent); }
    button:hover { border-color: #666; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
    }
    .model-name { color: var(--text); word-break: break-word; }
    .status-completed { color: var(--green); }
    .status-failed { color: var(--red); }
    .charts { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .chart-wrap { height: 260px; position: relative; }
    .chart-caption { color: var(--muted); font-size: 11px; margin-top: 4px; }
    .day-detail {
      margin-top: 12px;
      padding: 12px;
      background: var(--panel-alt);
      border: 1px solid var(--border);
      border-radius: 8px;
      min-height: 48px;
    }
    .error { color: var(--red); padding: 12px; background: rgba(127, 29, 29, 0.2); border-radius: 6px; }
    .notice { color: #fbbf24; padding: 10px 12px; background: rgba(120, 53, 15, 0.2); border-radius: 6px; margin-bottom: 12px; }
    .loading { color: var(--muted); padding: 24px; }
    .custom-range { display: none; gap: 8px; align-items: center; }
    .custom-range.visible { display: flex; }
    .table-wrap { overflow-x: auto; }
    @media (max-width: 760px) {
      body { padding: 12px; }
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      th, td { padding: 7px 6px; }
    }
  </style>
</head>
<body>
  <h1>CommandCode GOAT Usage</h1>
  <div class="subtitle" id="subtitle">Loading usage data...</div>

  <div class="section">
    <div class="quota-list" id="quotaList"><div class="loading">Loading limits...</div></div>
    <div class="summary-grid" id="summaryGrid"></div>
  </div>

  <div id="detailNotice"></div>

  <h2>Usage by Model</h2>
  <div class="section table-wrap" id="modelTable"><div class="loading">Loading model usage...</div></div>

  <h2>Usage Analytics</h2>
  <div class="section">
    <div class="range-bar">
      <button data-range="1d">1d</button>
      <button data-range="7d" class="active">7d</button>
      <button data-range="30d">30d</button>
      <button data-range="custom">Custom</button>
      <div class="custom-range" id="customRange">
        <input type="date" id="fromDate" />
        <span>\u2013</span>
        <input type="date" id="toDate" />
        <button id="applyCustom">Apply</button>
      </div>
    </div>
    <div class="charts">
      <div class="chart-wrap">
        <canvas id="planChart"></canvas>
        <div class="chart-caption">Daily GOAT plan spend by model</div>
      </div>
      <div class="chart-wrap">
        <canvas id="tokenChart"></canvas>
        <div class="chart-caption">Daily tokens by model \u2014 per day, not cumulative</div>
      </div>
      <div id="chartError"></div>
      <div class="day-detail" id="dayDetail"><div class="muted">Hover a day column to see model totals</div></div>
    </div>
  </div>

  <h2>Usage History</h2>
  <div class="section table-wrap" id="historyTable"><div class="loading">Loading usage history...</div></div>

  <script>
    const vscode = acquireVsCodeApi();
    let planChart;
    let tokenChart;
    let chartPayload;

    function post(message) {
      vscode.postMessage(message);
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function formatTokens(value) {
      const number = Math.max(0, Math.round(Number(value) || 0));
      if (number >= 1000000000) return (number / 1000000000).toFixed(1) + 'B';
      if (number >= 1000000) return (number / 1000000).toFixed(number >= 10000000 ? 0 : 1) + 'M';
      if (number >= 1000) return (number / 1000).toFixed(number >= 100000 ? 0 : 1) + 'K';
      return String(number);
    }

    function formatUsd(value) {
      const number = Number(value) || 0;
      if (number === 0) return '$0.00';
      const decimals = Math.abs(number) < 0.01 ? 6 : 2;
      return '$' + number.toFixed(decimals).replace(/(\\.\\d*?[1-9])0+$/, '$1');
    }

    function timestampMs(value) {
      if (typeof value === 'number') return value < 10000000000 ? value * 1000 : value;
      const text = String(value ?? '').trim();
      if (/^\\d+$/.test(text)) {
        const number = Number(text);
        return number < 10000000000 ? number * 1000 : number;
      }
      return Date.parse(text);
    }

    function formatDate(value) {
      const date = new Date(timestampMs(value));
      return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
    }

    function formatReset(resetAt) {
      const timestamp = Number(resetAt);
      if (!Number.isFinite(timestamp) || timestamp <= 0) return 'Billing period';
      const remaining = timestamp - Date.now();
      if (remaining <= 0) return 'Resetting soon';
      const minutes = Math.ceil(remaining / 60000);
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      const mins = minutes % 60;
      const parts = [];
      if (days) parts.push(days + 'd');
      if (hours || days) parts.push(hours + 'h');
      if (!days && mins) parts.push(mins + 'm');
      return 'in ' + parts.join(' ');
    }

    function renderQuota(name, quota) {
      const percent = Math.max(0, Math.min(100, Number(quota.percent) || 0));
      return '<div class="quota-card">' +
        '<div class="quota-head"><strong>' + escapeHtml(name) + '</strong>' +
        '<span>' + formatUsd(quota.used) + ' / ' + formatUsd(quota.cap) + ' (' + Math.round(percent) + '%)</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + percent + '%"></div></div>' +
        '<div class="quota-meta"><span>Remaining ' + formatUsd(quota.remaining) + '</span>' +
        '<span>' + escapeHtml(formatReset(quota.resetAt)) + '</span></div>' +
        '</div>';
    }

    function renderQuotas(payload) {
      const quotas = payload.quotas;
      document.getElementById('quotaList').innerHTML =
        renderQuota('5-Hour Limit', quotas.fiveHour) +
        renderQuota('Weekly Limit', quotas.weekly) +
        renderQuota('Monthly Limit', quotas.monthly);
      const summary = payload.rangeSummary || payload.summary;
      const summaryScope = payload.summaryScope || 'selected range';
      document.getElementById('summaryGrid').innerHTML =
        '<div class="summary-card"><span class="muted">Plan spend \xB7 ' + summaryScope + '</span><strong>' + formatUsd(summary.totalMonthlyCredits) + '</strong></div>' +
        '<div class="summary-card"><span class="muted">Requests</span><strong>' + escapeHtml(summary.totalCount) + '</strong></div>' +
        '<div class="summary-card"><span class="muted">Tokens</span><strong>' + formatTokens(summary.totalTokens) + '</strong></div>' +
        '<div class="summary-card"><span class="muted">Success rate</span><strong>' + Math.round(Number(summary.successRate) || 0) + '%</strong></div>';
      document.getElementById('subtitle').textContent =
        'GOAT plan \xB7 ' + escapeHtml(summaryScope) +
        ' \xB7 Updated ' + formatDate(payload.fetchedAt);
    }

    function renderModels(models) {
      if (!models || !models.length) {
        document.getElementById('modelTable').innerHTML = '<div class="muted">No model usage returned for this account.</div>';
        return;
      }
      let html = '<table><thead><tr><th>Model</th><th>Requests</th><th>Tokens</th><th>API cost</th><th>Plan spend</th><th>Plan share</th></tr></thead><tbody>';
      for (const model of models) {
        html += '<tr><td class="model-name">' + escapeHtml(model.model) + '</td>' +
          '<td>' + escapeHtml(model.requests) + '</td>' +
          '<td>' + formatTokens(model.tokensTotal) + '</td>' +
          '<td>' + formatUsd(model.actualCost) + '</td>' +
          '<td>' + formatUsd(model.planSpend) + '</td>' +
          '<td>' + (Number(model.planPercent) || 0).toFixed(2) + '%</td></tr>';
      }
      html += '</tbody></table>';
      document.getElementById('modelTable').innerHTML = html;
    }

    function renderHistory(usages) {
      if (!usages || !usages.length) {
        document.getElementById('historyTable').innerHTML = '<div class="muted">No usage in the selected range.</div>';
        return;
      }
      let html = '<table><thead><tr><th>Date</th><th>Status</th><th>Model</th><th>Provider</th><th>Tokens</th><th>API cost</th><th>Plan spend</th></tr></thead><tbody>';
      for (const usage of usages) {
        const status = String(usage.status || 'unknown').toLowerCase();
        const statusClass = status === 'completed' ? 'status-completed' : status === 'failed' ? 'status-failed' : '';
        html += '<tr><td>' + escapeHtml(formatDate(usage.createdAt)) + '</td>' +
          '<td class="' + statusClass + '">' + escapeHtml(usage.status) + '</td>' +
          '<td class="model-name">' + escapeHtml(usage.model) + '</td>' +
          '<td>' + escapeHtml(usage.provider) + '</td>' +
          '<td>' + formatTokens(usage.tokensTotal) + '</td>' +
          '<td>' + formatUsd(usage.actualCost) + '</td>' +
          '<td>' + formatUsd(usage.planPoolDraw) + '</td></tr>';
      }
      html += '</tbody></table>';
      document.getElementById('historyTable').innerHTML = html;
    }

    function formatChartUsd(value) {
      return formatUsd(value);
    }

    function chartInteraction() {
      return { mode: 'index', intersect: false, axis: 'x' };
    }

    function dayIndexFromEvent(chart, event) {
      const native = event && event.native ? event.native : event;
      if (!native || !chart.scales || !chart.scales.x) return null;
      const rect = chart.canvas.getBoundingClientRect();
      const x = native.clientX - rect.left;
      const value = chart.scales.x.getValueForPixel(x);
      if (typeof value !== 'number' || Number.isNaN(value)) return null;
      const index = Math.round(value);
      if (!chartPayload || index < 0 || index >= chartPayload.charts.days.length) return null;
      return index;
    }

    function renderDayDetail(index) {
      const element = document.getElementById('dayDetail');
      if (!chartPayload || index === null || index === undefined || index < 0) {
        element.innerHTML = '<div class="muted">Hover a day column to see model totals</div>';
        return;
      }
      const models = chartPayload.charts.dailyModels[index] || [];
      const day = chartPayload.charts.days[index];
      if (!models.length) {
        element.innerHTML = '<h3>' + escapeHtml(day) + '</h3><div class="muted">No usage on this day</div>';
        return;
      }
      let html = '<h3>' + escapeHtml(day) + '</h3><table><thead><tr><th>Model</th><th>Tokens</th><th>Plan spend</th></tr></thead><tbody>';
      for (const model of models) {
        html += '<tr><td class="model-name">' + escapeHtml(model.model) + '</td>' +
          '<td>' + formatTokens(model.tokens) + '</td><td>' + formatUsd(model.planSpend) + '</td></tr>';
      }
      html += '</tbody></table>';
      element.innerHTML = html;
    }

    function onChartHover(event, _elements, chart) {
      const index = dayIndexFromEvent(chart, event);
      if (index !== null) renderDayDetail(index);
    }

    function buildPlanTooltip() {
      return {
        filter: function(item) { return item.parsed && item.parsed.y > 0; },
        callbacks: {
          label: function(item) { return item.dataset.label + ': ' + formatChartUsd(item.parsed.y); }
        }
      };
    }

    function buildTokenTooltip() {
      return {
        filter: function(item) { return item.parsed && item.parsed.y > 0; },
        callbacks: {
          label: function(item) { return item.dataset.label + ': ' + formatTokens(item.parsed.y); }
        }
      };
    }

    function renderCharts(payload) {
      chartPayload = payload;
      if (typeof Chart === 'undefined') {
        document.getElementById('chartError').innerHTML = '<div class="error">Chart library could not be loaded. Reinstall the extension or check the packaged media files.</div>';
        return;
      }
      document.getElementById('chartError').innerHTML = '';
      if (planChart) planChart.destroy();
      if (tokenChart) tokenChart.destroy();

      const days = payload.charts.days;
      const planByModel = payload.charts.planSpendByModel;
      const tokenByModel = payload.charts.tokensByModel;
      const allModels = Array.from(new Set(days.flatMap(function(_day, index) {
        return Object.keys(planByModel[index] || {}).concat(Object.keys(tokenByModel[index] || {}));
      })));
      if (allModels.length === 0) {
        document.getElementById('chartError').innerHTML =
          '<div class="notice">No usage records are available in the selected range.</div>';
        renderDayDetail(null);
        return;
      }
      const colors = ['#d88918', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

      const planDatasets = allModels.map(function(model, index) {
        return {
          label: model,
          data: days.map(function(_day, dayIndex) { return planByModel[dayIndex][model] || null; }),
          backgroundColor: colors[index % colors.length] + 'cc',
          stack: 'plan'
        };
      });
      const tokenDatasets = allModels.map(function(model, index) {
        return {
          label: model,
          data: days.map(function(_day, dayIndex) { return tokenByModel[dayIndex][model] || null; }),
          backgroundColor: colors[index % colors.length] + 'cc',
          stack: 'tokens'
        };
      });

      const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: chartInteraction(),
        onHover: onChartHover,
        plugins: { legend: { labels: { color: '#e8e8ea' }, position: 'bottom' } },
        scales: {
          x: { stacked: true, ticks: { color: '#9b9ba3', maxRotation: 45 }, grid: { color: '#2a2a2e' } },
          y: { stacked: true, beginAtZero: true, ticks: { color: '#9b9ba3' }, grid: { color: '#2a2a2e' } }
        }
      };

      planChart = new Chart(document.getElementById('planChart'), {
        type: 'bar',
        data: { labels: days, datasets: planDatasets },
        options: Object.assign({}, commonOptions, {
          plugins: Object.assign({}, commonOptions.plugins, { tooltip: buildPlanTooltip() }),
          scales: Object.assign({}, commonOptions.scales, {
            y: { stacked: true, beginAtZero: true, ticks: { color: '#9b9ba3', callback: function(value) { return '$' + value; } }, grid: { color: '#2a2a2e' } }
          })
        })
      });
      tokenChart = new Chart(document.getElementById('tokenChart'), {
        type: 'bar',
        data: { labels: days, datasets: tokenDatasets },
        options: Object.assign({}, commonOptions, {
          plugins: Object.assign({}, commonOptions.plugins, { tooltip: buildTokenTooltip() }),
          scales: Object.assign({}, commonOptions.scales, {
            y: { stacked: true, beginAtZero: true, ticks: { color: '#9b9ba3', callback: function(value) { return formatTokens(value); } }, grid: { color: '#2a2a2e' } }
          })
        })
      });
      planChart.canvas.onmouseleave = function() { renderDayDetail(null); };
      tokenChart.canvas.onmouseleave = function() { renderDayDetail(null); };
      renderDayDetail(null);
    }

    document.querySelectorAll('button[data-range]').forEach(function(button) {
      button.addEventListener('click', function() {
        const preset = button.dataset.range;
        document.getElementById('customRange').classList.toggle('visible', preset === 'custom');
        if (preset === 'custom') {
          document.getElementById('dayDetail').innerHTML = '<div class="muted">Select dates and click Apply to load a custom range.</div>';
          return;
        }
        document.querySelectorAll('button[data-range]').forEach(function(item) { item.classList.remove('active'); });
        button.classList.add('active');
        post({ type: 'setRange', preset: preset });
      });
    });

    document.getElementById('applyCustom').addEventListener('click', function() {
      const customStart = document.getElementById('fromDate').value;
      const customEnd = document.getElementById('toDate').value;
      if (customStart && customEnd) {
        document.querySelectorAll('button[data-range]').forEach(function(item) { item.classList.remove('active'); });
        document.querySelector('button[data-range="custom"]').classList.add('active');
        post({ type: 'setRange', preset: 'custom', customStart: customStart, customEnd: customEnd });
      }
    });

    window.addEventListener('message', function(event) {
      const message = event.data;
      if (message.type === 'error') {
        document.getElementById('detailNotice').innerHTML = '<div class="error">' + escapeHtml(message.message) + '</div>';
        document.getElementById('chartError').innerHTML = '';
        document.getElementById('quotaList').innerHTML = '<div class="error">Could not load quota data.</div>';
        document.getElementById('summaryGrid').innerHTML = '';
        document.getElementById('modelTable').innerHTML = '<div class="error">Could not load model usage.</div>';
        document.getElementById('historyTable').innerHTML = '<div class="error">Could not load usage history.</div>';
        if (planChart) { planChart.destroy(); planChart = null; }
        if (tokenChart) { tokenChart.destroy(); tokenChart = null; }
        renderDayDetail(null);
        return;
      }
      if (message.type !== 'data') return;
      const payload = message.payload;
      renderQuotas(payload);
      renderModels(payload.models);
      renderHistory(payload.usages);
      renderCharts(payload);
      const notice = document.getElementById('detailNotice');
      notice.innerHTML = payload.detailError ? '<div class="notice">' + escapeHtml(payload.detailError) + '</div>' : '';
    });

    post({ type: 'ready' });
  </script>
</body>
</html>`;
}

// src/log.ts
var vscode2 = __toESM(require("vscode"));
var output;
function log(message) {
  if (!output) {
    output = vscode2.window.createOutputChannel("CommandCode Usagebar");
  }
  output.appendLine(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${message}`);
}
function disposeLog() {
  output?.dispose();
  output = void 0;
}

// src/statusBar.ts
var vscode3 = __toESM(require("vscode"));
var OPEN_COMMAND = "commandCodeUsage.openDashboard";
function quotaLine(name, used, window5) {
  return `| ${name} | ${formatUsd(used)} / ${formatUsd(window5.cap)} | ${formatUsd(window5.remaining)} | ${formatResetAt(window5.resetAt)} |`;
}
function buildTooltip(quotas, hover, detailError) {
  const md = new vscode3.MarkdownString();
  md.appendMarkdown("### CommandCode GOAT Usage\n\n");
  md.appendMarkdown("| Limit | Used | Remaining | Reset |\n");
  md.appendMarkdown("| --- | --- | --- | --- |\n");
  md.appendMarkdown(quotaLine("5 hours", quotas.fiveHour.used, quotas.fiveHour) + "\n");
  md.appendMarkdown(quotaLine("Weekly", quotas.weekly.used, quotas.weekly) + "\n");
  md.appendMarkdown(quotaLine("Monthly", quotas.monthly.used, quotas.monthly) + "\n");
  md.appendMarkdown(
    `
**Today:** ${formatTokens(hover.todayTotalTokens)} tokens \xB7 ${formatUsd(hover.todayPlanSpend)} plan spend

`
  );
  if (detailError) {
    md.appendMarkdown(`_${escapeMarkdown(detailError)}_

`);
  }
  md.appendMarkdown("| Model | Tokens | Date (UTC) |\n");
  md.appendMarkdown("| --- | --- | --- |\n");
  if (hover.recentUsages.length === 0) {
    md.appendMarkdown("| \u2014 | \u2014 | No recent usage |\n");
  } else {
    for (const usage of hover.recentUsages) {
      md.appendMarkdown(
        `| ${escapeMarkdown(usage.model)} | ${formatTokens(usage.tokensTotal)} | ${formatUtcDateTime(usage.createdAt)} |
`
      );
    }
  }
  md.appendMarkdown("\n_Click to open the full dashboard_");
  return md;
}
function worstPercent(quotas) {
  return Math.max(
    quotas.fiveHour.percent,
    quotas.weekly.percent,
    quotas.monthly.percent
  );
}
function applyUsageColor(item, percent) {
  if (percent >= 100) {
    item.backgroundColor = new vscode3.ThemeColor("statusBarItem.errorBackground");
  } else if (percent >= 80) {
    item.backgroundColor = new vscode3.ThemeColor("statusBarItem.warningBackground");
  } else {
    item.backgroundColor = void 0;
  }
}
var StatusBarController = class {
  item;
  constructor() {
    this.item = vscode3.window.createStatusBarItem(vscode3.StatusBarAlignment.Right, 1e4);
    this.item.command = OPEN_COMMAND;
    this.item.show();
  }
  setLoading() {
    this.item.text = "$(sync~spin) CommandCode Usage";
    this.item.tooltip = "Loading CommandCode usage data...";
    this.item.backgroundColor = void 0;
    this.item.show();
  }
  setError(message) {
    this.item.text = "$(warning) CommandCode Usage";
    this.item.tooltip = message;
    this.item.backgroundColor = void 0;
    this.item.show();
  }
  setUnauthenticated() {
    this.item.text = "$(key) CommandCode Usage";
    this.item.tooltip = "Set COMMAND_CODE_API_KEY, run \u201CCommandCode Usagebar: Set API Key\u201D, or sign in with cmd login, then refresh.";
    this.item.backgroundColor = void 0;
    this.item.show();
  }
  update(quotas, hover, detailError) {
    const fiveHour = formatProgressBar(quotas.fiveHour.percent, 10);
    const weekly = formatProgressBar(quotas.weekly.percent, 10);
    const monthly = formatProgressBar(quotas.monthly.percent, 10);
    this.item.text = `5h ${Math.round(quotas.fiveHour.percent)}% ${fiveHour}   7d ${Math.round(quotas.weekly.percent)}% ${weekly}   Mo ${Math.round(quotas.monthly.percent)}% ${monthly}`;
    this.item.tooltip = buildTooltip(quotas, hover, detailError);
    applyUsageColor(this.item, worstPercent(quotas));
    this.item.show();
  }
  dispose() {
    this.item.dispose();
  }
};

// src/usageManager.ts
var vscode4 = __toESM(require("vscode"));

// src/auth.ts
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var API_KEY_SECRET = "commandCodeUsage.apiKey";
var SESSION_COOKIE_SECRET = "commandCodeUsage.sessionCookie";
var AUTH_FILE = path.join(".commandcode", "auth.json");
var API_KEY_ENV = "COMMAND_CODE_API_KEY";
var SESSION_COOKIE_ENV = "COMMAND_CODE_SESSION_COOKIE";
function normalized(value) {
  return typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}
function isCommandCodeRecord(record) {
  const identityKeys = ["provider", "providerId", "id", "name", "label", "type", "account"];
  return identityKeys.some((key) => normalized(record[key]).includes("commandcode"));
}
function credentialFromRecord(record) {
  const preferredKeys = ["key", "apiKey", "api_key", "apiToken", "api_token"];
  for (const key of preferredKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  const tokenKeys = ["token", "accessToken", "access_token", "access"];
  for (const key of tokenKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return void 0;
}
function findCredential(value, insideCommandCodeRecord = false) {
  if (insideCommandCodeRecord && typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCredential(item, insideCommandCodeRecord);
      if (found) {
        return found;
      }
    }
    return void 0;
  }
  if (!value || typeof value !== "object") {
    return void 0;
  }
  const record = value;
  const currentIsCommandCode = insideCommandCodeRecord || isCommandCodeRecord(record);
  if (currentIsCommandCode) {
    const credential = credentialFromRecord(record);
    if (credential) {
      return credential;
    }
  }
  for (const [key, child] of Object.entries(record)) {
    if (normalized(key).includes("commandcode")) {
      const found = findCredential(child, true);
      if (found) {
        return found;
      }
    }
  }
  if (currentIsCommandCode) {
    for (const child of Object.values(record)) {
      const found = findCredential(child, true);
      if (found) {
        return found;
      }
    }
  }
  return void 0;
}
function findApiKeyLike(value, propertyName = "") {
  if (typeof value === "string") {
    const candidate = value.trim();
    return /key|token|secret|credential/i.test(propertyName) && /^(user_|cmd_|cc_)/i.test(candidate) ? candidate : void 0;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findApiKeyLike(item, propertyName);
      if (found) {
        return found;
      }
    }
    return void 0;
  }
  if (!value || typeof value !== "object") {
    return void 0;
  }
  for (const [key, child] of Object.entries(value)) {
    const found = findApiKeyLike(child, key);
    if (found) {
      return found;
    }
  }
  return void 0;
}
function readAuthFile() {
  const authPath = path.join(os.homedir(), AUTH_FILE);
  try {
    const content = fs.readFileSync(authPath, "utf8");
    const parsed = JSON.parse(content);
    return findCredential(parsed) ?? findApiKeyLike(parsed);
  } catch {
    return void 0;
  }
}
function cleanApiKey(value) {
  return value.replace(/^Bearer\s+/i, "").trim();
}
function cleanSessionCookie(value) {
  let cookie = value.trim();
  cookie = cookie.replace(/^Cookie:\s*/i, "").trim();
  if (cookie.startsWith("'") && cookie.endsWith("'") || cookie.startsWith('"') && cookie.endsWith('"')) {
    cookie = cookie.slice(1, -1).trim();
  }
  return cookie;
}
async function resolveCredentials(context) {
  const secretApiKey = await context.secrets.get(API_KEY_SECRET);
  const secretSessionCookie = await context.secrets.get(SESSION_COOKIE_SECRET);
  const environmentApiKey = process.env[API_KEY_ENV]?.trim();
  const environmentSessionCookie = process.env[SESSION_COOKIE_ENV]?.trim();
  const authFileApiKey = readAuthFile();
  const apiKey = environmentApiKey || secretApiKey?.trim() || authFileApiKey;
  const sessionCookie = environmentSessionCookie || secretSessionCookie?.trim();
  if (!apiKey && !sessionCookie) {
    return void 0;
  }
  const sources = /* @__PURE__ */ new Set();
  if (environmentApiKey || environmentSessionCookie) {
    sources.add("environment");
  }
  if (secretApiKey || secretSessionCookie) {
    sources.add("secret");
  }
  if (authFileApiKey && !environmentApiKey && !secretApiKey) {
    sources.add("auth-file");
  }
  const uniqueSources = [...sources];
  return {
    apiKey: apiKey ? cleanApiKey(apiKey) : void 0,
    sessionCookie: sessionCookie ? cleanSessionCookie(sessionCookie) : void 0,
    source: uniqueSources.length === 1 ? uniqueSources[0] : "mixed"
  };
}
async function saveApiKey(context, value) {
  const apiKey = cleanApiKey(value);
  if (!apiKey) {
    throw new Error("API key cannot be empty");
  }
  await context.secrets.store(API_KEY_SECRET, apiKey);
}
async function saveSessionCookie(context, value) {
  const cookie = cleanSessionCookie(value);
  if (!cookie) {
    throw new Error("Session cookie cannot be empty");
  }
  await context.secrets.store(SESSION_COOKIE_SECRET, cookie);
}
async function clearApiKey(context) {
  await context.secrets.delete(API_KEY_SECRET);
}
async function clearSessionCookie(context) {
  await context.secrets.delete(SESSION_COOKIE_SECRET);
}

// src/api/client.ts
var EXTENSION_VERSION = true ? "0.1.7" : "0.1.3";
var COMMAND_CODE_API_ORIGIN = "https://api.commandcode.ai";
var CommandCodeApiError = class extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "CommandCodeApiError";
  }
  statusCode;
};
function authHeaders(auth) {
  const headers = {
    Accept: "application/json",
    "User-Agent": `commandcode-goat-usagebar/${EXTENSION_VERSION}`
  };
  if (auth.sessionCookie) {
    headers.Cookie = auth.sessionCookie;
  } else if (auth.apiKey) {
    headers.Authorization = `Bearer ${auth.apiKey}`;
  }
  return headers;
}
async function requestJson(path2, auth, timeoutMs = 1e4) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${COMMAND_CODE_API_ORIGIN}${path2}`, {
      method: "GET",
      headers: authHeaders(auth),
      signal: controller.signal
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new CommandCodeApiError("CommandCode authentication was rejected", response.status);
      }
      throw new CommandCodeApiError(`CommandCode API returned HTTP ${response.status}`, response.status);
    }
    try {
      return await response.json();
    } catch {
      throw new CommandCodeApiError("CommandCode API returned invalid JSON", response.status);
    }
  } catch (error) {
    if (error instanceof CommandCodeApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new CommandCodeApiError("CommandCode API request timed out");
    }
    throw new CommandCodeApiError("CommandCode API request failed");
  } finally {
    clearTimeout(timeout);
  }
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function rawRecords(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}
function normalizeUsageResponse(payload) {
  if (Array.isArray(payload)) {
    return { usages: rawRecords(payload) };
  }
  if (!isRecord(payload)) {
    return {};
  }
  const nested = isRecord(payload.data) ? payload.data : void 0;
  const usages = rawRecords(payload.usages).length > 0 ? rawRecords(payload.usages) : rawRecords(payload.items).length > 0 ? rawRecords(payload.items) : Array.isArray(payload.data) ? rawRecords(payload.data) : rawRecords(nested?.usages).length > 0 ? rawRecords(nested?.usages) : rawRecords(nested?.items);
  const nextCursor = typeof payload.nextCursor === "string" || payload.nextCursor === null ? payload.nextCursor : nested && (typeof nested.nextCursor === "string" || nested.nextCursor === null) ? nested.nextCursor : void 0;
  return {
    usages,
    nextCursor,
    limit: typeof payload.limit === "number" ? payload.limit : void 0,
    periodBasis: typeof payload.periodBasis === "string" ? payload.periodBasis : void 0,
    window: isRecord(payload.window) ? {
      days: typeof payload.window.days === "number" ? payload.window.days : void 0,
      entries: typeof payload.window.entries === "number" ? payload.window.entries : void 0
    } : void 0
  };
}
var CommandCodeApi = class {
  constructor(credentials) {
    this.credentials = credentials;
  }
  credentials;
  async getInternal(path2) {
    const attempts = [];
    if (this.credentials.sessionCookie) {
      attempts.push({ sessionCookie: this.credentials.sessionCookie });
    }
    if (this.credentials.apiKey) {
      attempts.push({ apiKey: this.credentials.apiKey });
    }
    if (attempts.length === 0) {
      throw new CommandCodeApiError("Detailed usage requires a CommandCode session cookie or API key");
    }
    let lastError;
    for (const auth of attempts) {
      try {
        return await requestJson(path2, auth);
      } catch (error) {
        if (!(error instanceof CommandCodeApiError)) {
          throw error;
        }
        lastError = error;
        const canRetry = (error.statusCode === 401 || error.statusCode === 403) && auth !== attempts.at(-1);
        if (!canRetry) {
          throw error;
        }
      }
    }
    throw lastError ?? new CommandCodeApiError("CommandCode API request failed");
  }
  async fetchCredits() {
    const failures = [];
    if (this.credentials.apiKey) {
      try {
        return await requestJson("/alpha/billing/credits", {
          apiKey: this.credentials.apiKey
        });
      } catch (error) {
        if (error instanceof CommandCodeApiError) {
          failures.push(error);
        }
      }
    }
    try {
      return await this.getInternal("/internal/billing/credits");
    } catch (error) {
      if (error instanceof CommandCodeApiError) {
        failures.push(error);
      }
    }
    const lastFailure = failures.at(-1);
    throw lastFailure ?? new CommandCodeApiError("No CommandCode credentials available");
  }
  async fetchSummary() {
    return this.getInternal("/internal/usage/summary");
  }
  async fetchUsages(limit = 100, cursor) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      params.set("cursor", cursor);
    }
    const payload = await this.getInternal(`/internal/usage?${params.toString()}`);
    return normalizeUsageResponse(payload);
  }
  async fetchAllUsages(limit = 100, maxPages = 20, stopBeforeMs) {
    const usages = [];
    const seenCursors = /* @__PURE__ */ new Set();
    const seenIds = /* @__PURE__ */ new Set();
    let cursor;
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
      if (stopBeforeMs !== void 0 && pageUsages.length > 0) {
        const pageTimes = pageUsages.map((usage) => {
          const value = usage.createdAt ?? usage.created_at;
          return typeof value === "string" || typeof value === "number" ? timestampMs(value) : Number.NaN;
        }).filter((value) => Number.isFinite(value));
        if (pageTimes.length === pageUsages.length && Math.max(...pageTimes) < stopBeforeMs) {
          break;
        }
      }
      const nextCursor = response.nextCursor ?? void 0;
      if (!nextCursor || seenCursors.has(nextCursor)) {
        break;
      }
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
    return usages;
  }
};

// src/usageManager.ts
var UsageManager = class {
  constructor(context) {
    this.context = context;
  }
  context;
  credentials;
  quotas;
  summary;
  usages = [];
  hoverData = {
    todayTotalTokens: 0,
    todayPlanSpend: 0,
    recentUsages: []
  };
  detailError;
  refreshTimer;
  listeners = /* @__PURE__ */ new Set();
  onUpdate(listener) {
    this.listeners.add(listener);
    return new vscode4.Disposable(() => this.listeners.delete(listener));
  }
  notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
  async initialize() {
    await this.refresh();
    this.startTimer();
  }
  startTimer() {
    const configuredSeconds = vscode4.workspace.getConfiguration("commandCodeUsage").get("refreshIntervalSeconds", 60);
    const seconds = Number.isFinite(configuredSeconds) ? Math.max(15, configuredSeconds) : 60;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.refreshTimer = setInterval(() => {
      void this.refresh().catch(() => void 0);
    }, seconds * 1e3);
  }
  historyLimit() {
    const configured = vscode4.workspace.getConfiguration("commandCodeUsage").get("historyLimit", 100);
    return Math.min(500, Math.max(10, Math.round(configured)));
  }
  dispose() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = void 0;
    }
  }
  getQuota() {
    return this.quotas;
  }
  getHoverData() {
    return this.hoverData;
  }
  getDetailError() {
    return this.detailError;
  }
  async setApiKey(value) {
    const apiKey = value.replace(/^Bearer\s+/i, "").trim();
    if (!apiKey) {
      throw new Error("API key cannot be empty");
    }
    const probe = new CommandCodeApi({
      apiKey,
      sessionCookie: this.credentials?.sessionCookie,
      source: "secret"
    });
    await probe.fetchCredits();
    await saveApiKey(this.context, apiKey);
    this.credentials = { ...this.credentials, apiKey, source: "secret" };
    await this.refresh();
  }
  async setSessionCookie(value) {
    const cookie = value.trim().replace(/^Cookie:\s*/i, "");
    if (!cookie) {
      throw new Error("Session cookie cannot be empty");
    }
    const probe = new CommandCodeApi({
      apiKey: this.credentials?.apiKey,
      sessionCookie: cookie,
      source: "secret"
    });
    await probe.fetchCredits();
    await saveSessionCookie(this.context, cookie);
    this.credentials = { ...this.credentials, sessionCookie: cookie, source: "secret" };
    await this.refresh();
  }
  async clearApiKey() {
    await clearApiKey(this.context);
    await this.refresh();
  }
  async clearSessionCookie() {
    await clearSessionCookie(this.context);
    await this.refresh();
  }
  clearData() {
    this.quotas = void 0;
    this.summary = void 0;
    this.usages = [];
    this.detailError = void 0;
    this.hoverData = {
      todayTotalTokens: 0,
      todayPlanSpend: 0,
      recentUsages: []
    };
  }
  async refresh() {
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
        this.detailError = "Could not refresh quota data; showing the last known values.";
        this.notify();
      } else {
        this.clearData();
        this.notify();
      }
      throw error;
    }
    const [summaryResult, usageResult] = await Promise.allSettled([
      api.fetchSummary(),
      api.fetchUsages(10)
    ]);
    const rawSummary = summaryResult.status === "fulfilled" ? summaryResult.value : void 0;
    const rawUsages = usageResult.status === "fulfilled" ? usageResult.value.usages ?? [] : [];
    const freshRecords = rawUsages.map(normalizeUsageRecord).sort(sortNewestFirst);
    const records = freshRecords.length > 0 || this.usages.length === 0 ? freshRecords : this.usages;
    const emptyUsageWarning = usageResult.status === "fulfilled" && freshRecords.length === 0 && this.usages.length > 0 ? "Usage endpoint returned no records; showing the last known history." : void 0;
    this.quotas = normalizeQuota(rawCredits, rawSummary);
    this.usages = records;
    this.summary = rawSummary ? normalizeSummary(rawSummary) : summarizeUsageRecords(records);
    this.detailError = this.buildDetailError(summaryResult, usageResult) ?? emptyUsageWarning;
    this.hoverData = buildHoverData(records);
    this.notify();
    if (this.detailError) {
      log(this.detailError);
    }
  }
  buildDetailError(summaryResult, usageResult) {
    const rejected = [summaryResult, usageResult].filter(
      (result) => result.status === "rejected"
    );
    if (rejected.length === 0) {
      return void 0;
    }
    const authRejected = rejected.some(
      (result) => result.reason instanceof CommandCodeApiError && (result.reason.statusCode === 401 || result.reason.statusCode === 403)
    );
    if (authRejected) {
      return "Quota is available, but detailed Studio usage needs a session cookie. Run \u201CCommandCode Usagebar: Set Studio Session Cookie\u201D.";
    }
    return "Some detailed CommandCode usage data could not be loaded.";
  }
  buildDateRange(preset, customStart, customEnd) {
    const now = Date.now();
    if (preset === "custom" && customStart && customEnd) {
      const startDate = /* @__PURE__ */ new Date(`${customStart}T00:00:00Z`);
      const endDate = /* @__PURE__ */ new Date(`${customEnd}T00:00:00Z`);
      const start = startOfUtcDay(startDate);
      const end = endOfUtcDay(endDate);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || end < start) {
        throw new Error("Custom range end must be on or after the start date.");
      }
      return { preset, startMs: start, endMs: end };
    }
    if (preset === "1d") {
      return { preset, startMs: startOfUtcDay(), endMs: now };
    }
    if (preset === "7d") {
      return { preset, startMs: now - 7 * 24 * 60 * 60 * 1e3, endMs: now };
    }
    return { preset, startMs: now - 30 * 24 * 60 * 60 * 1e3, endMs: now };
  }
  async loadDashboard(range) {
    if (!this.credentials) {
      this.credentials = await resolveCredentials(this.context);
    }
    if (!this.credentials) {
      throw new Error("No CommandCode credentials found");
    }
    const api = new CommandCodeApi(this.credentials);
    let rawCredits;
    let quotas;
    let quotaError;
    try {
      rawCredits = await api.fetchCredits();
      quotas = normalizeQuota(rawCredits);
    } catch (error) {
      if (!this.quotas) {
        throw error;
      }
      quotas = this.quotas;
      quotaError = "Could not refresh quota data; showing the last known values.";
    }
    const [summaryResult, usageResult] = await Promise.allSettled([
      api.fetchSummary(),
      api.fetchAllUsages(this.historyLimit(), 20, range.startMs)
    ]);
    const rawSummary = summaryResult.status === "fulfilled" ? summaryResult.value : void 0;
    const freshRecords = usageResult.status === "fulfilled" ? usageResult.value.map(normalizeUsageRecord).sort(sortNewestFirst) : [];
    const records = freshRecords.length > 0 || this.usages.length === 0 ? freshRecords : this.usages;
    const emptyUsageWarning = usageResult.status === "fulfilled" && freshRecords.length === 0 && this.usages.length > 0 ? "Usage endpoint returned no records; showing the last known history." : void 0;
    const normalizedSummary = rawSummary ? normalizeSummary(rawSummary) : this.summary ?? summarizeUsageRecords(records);
    if (rawCredits) {
      quotas = normalizeQuota(rawCredits, rawSummary);
    }
    const detailError = quotaError ?? this.buildDetailError(summaryResult, usageResult) ?? emptyUsageWarning;
    return {
      quotas,
      summary: normalizedSummary,
      models: aggregateModelUsage(records, quotas.monthly.cap),
      usages: records,
      fetchedAt: Date.now(),
      detailError
    };
  }
};
function sortNewestFirst(a, b) {
  return timestampMs(b.createdAt) - timestampMs(a.createdAt);
}
function buildHoverData(records) {
  const todayStart = startOfUtcDay();
  const todayEnd = endOfUtcDay();
  const today = records.filter((record) => {
    const timestamp = timestampMs(record.createdAt);
    return timestamp >= todayStart && timestamp <= todayEnd;
  });
  return {
    todayTotalTokens: today.reduce((sum, record) => sum + record.tokensTotal, 0),
    todayPlanSpend: today.reduce((sum, record) => sum + record.planPoolDraw, 0),
    recentUsages: records.slice(0, 5)
  };
}

// src/extension.ts
var manager;
var statusBar;
async function activate(context) {
  log("Extension activating...");
  manager = new UsageManager(context);
  const updateStatusBar = () => {
    if (!manager || !statusBar) {
      return;
    }
    const quotas = manager.getQuota();
    if (!quotas) {
      statusBar.setUnauthenticated();
      return;
    }
    statusBar.update(quotas, manager.getHoverData(), manager.getDetailError());
  };
  context.subscriptions.push(
    vscode5.commands.registerCommand("commandCodeUsage.openDashboard", () => {
      if (!manager) {
        void vscode5.window.showErrorMessage(
          "CommandCode Usagebar is still starting. Try again in a moment."
        );
        return;
      }
      DashboardPanel.show(context.extensionUri, manager);
    }),
    vscode5.commands.registerCommand("commandCodeUsage.refresh", async () => {
      if (!manager || !statusBar) {
        return;
      }
      statusBar.setLoading();
      try {
        await manager.refresh();
        updateStatusBar();
        vscode5.window.showInformationMessage("CommandCode usage refreshed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Refresh failed";
        statusBar.setError(message);
        void vscode5.window.showErrorMessage(`CommandCode Usagebar: ${message}`);
      }
    }),
    vscode5.commands.registerCommand("commandCodeUsage.setApiKey", async () => {
      if (!manager) {
        return;
      }
      const apiKey = await vscode5.window.showInputBox({
        prompt: "Paste your CommandCode API key",
        password: true,
        ignoreFocusOut: true,
        placeHolder: "user_..."
      });
      if (!apiKey) {
        return;
      }
      try {
        await manager.setApiKey(apiKey);
        updateStatusBar();
        void vscode5.window.showInformationMessage("CommandCode API key saved securely");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid API key";
        void vscode5.window.showErrorMessage(`CommandCode Usagebar: ${message}`);
      }
    }),
    vscode5.commands.registerCommand("commandCodeUsage.setSessionCookie", async () => {
      if (!manager) {
        return;
      }
      const cookie = await vscode5.window.showInputBox({
        prompt: "Paste the Cookie header value from commandcode.ai Studio",
        password: true,
        ignoreFocusOut: true,
        placeHolder: "session cookie value"
      });
      if (!cookie) {
        return;
      }
      try {
        await manager.setSessionCookie(cookie);
        updateStatusBar();
        void vscode5.window.showInformationMessage("Studio session cookie saved securely");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid session cookie";
        void vscode5.window.showErrorMessage(`CommandCode Usagebar: ${message}`);
      }
    }),
    vscode5.commands.registerCommand("commandCodeUsage.clearSessionCookie", async () => {
      if (!manager) {
        return;
      }
      await manager.clearSessionCookie();
      updateStatusBar();
      void vscode5.window.showInformationMessage("Saved Studio session cookie cleared");
    }),
    vscode5.commands.registerCommand("commandCodeUsage.clearApiKey", async () => {
      if (!manager) {
        return;
      }
      await manager.clearApiKey();
      updateStatusBar();
      void vscode5.window.showInformationMessage("Saved CommandCode API key cleared");
    })
  );
  statusBar = new StatusBarController();
  statusBar.setLoading();
  context.subscriptions.push(
    manager.onUpdate(updateStatusBar),
    vscode5.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("commandCodeUsage.refreshIntervalSeconds") || event.affectsConfiguration("commandCodeUsage.historyLimit")) {
        const currentManager = manager;
        if (currentManager) {
          currentManager.dispose();
          void currentManager.initialize().then(updateStatusBar);
        }
      }
    }),
    { dispose: () => manager?.dispose() },
    { dispose: () => statusBar?.dispose() }
  );
  try {
    await manager.initialize();
    updateStatusBar();
    log("Extension activated successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log(`Activation failed: ${message}`);
    statusBar.setError(message);
  }
}
function deactivate() {
  manager?.dispose();
  statusBar?.dispose();
  DashboardPanel.dispose();
  disposeLog();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
