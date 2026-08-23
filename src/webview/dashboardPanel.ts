import * as vscode from 'vscode';
import {
  aggregateModelUsage,
  buildDailyUsage,
  summarizeUsageRecords,
} from '../api/commandcode';
import {
  endOfUtcDay,
  startOfUtcDay,
  timestampMs,
} from '../format';
import { DashboardSnapshot, DateRange, DateRangePreset } from '../types';
import { UsageManager } from '../usageManager';

export class DashboardPanel {
  public static current: DashboardPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly updateSubscription: vscode.Disposable;
  private webviewReady = false;
  private currentRange: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
  } = { preset: '7d' };

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly manager: UsageManager
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getDashboardHtml();
    this.updateSubscription = this.manager.onUpdate(() => {
      if (this.webviewReady) {
        void this.pushData();
      }
    });

    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'ready') {
        this.webviewReady = true;
        await this.pushData();
        return;
      }
      if (message.type === 'refresh') {
        await this.pushData();
        return;
      }
      if (message.type === 'setRange') {
        this.currentRange = {
          preset: message.preset as DateRangePreset,
          customStart: message.customStart,
          customEnd: message.customEnd,
        };
        await this.pushData();
      }
    });

    this.panel.onDidDispose(() => {
      this.updateSubscription.dispose();
      DashboardPanel.current = undefined;
    });
  }

  static show(extensionUri: vscode.Uri, manager: UsageManager): void {
    if (DashboardPanel.current) {
      DashboardPanel.current.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'commandCodeUsageDashboard',
      'CommandCode GOAT Usage',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );
    DashboardPanel.current = new DashboardPanel(panel, extensionUri, manager);
  }

  static dispose(): void {
    DashboardPanel.current?.panel.dispose();
    DashboardPanel.current = undefined;
  }

  private async pushData(): Promise<void> {
    try {
      const range = this.manager.buildDateRange(
        this.currentRange.preset,
        this.currentRange.customStart,
        this.currentRange.customEnd
      );
      const snapshot = await this.manager.loadDashboard(range);
      await this.panel.webview.postMessage({
        type: 'data',
        payload: serializeSnapshot(snapshot, range),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load dashboard';
      await this.panel.webview.postMessage({ type: 'error', message });
    }
  }

  private getDashboardHtml(): string {
    const chartScriptUri = this.panel.webview
      .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'chart.umd.min.js'))
      .toString();
    return getDashboardHtml(this.panel.webview.cspSource, chartScriptUri);
  }
}

function enumerateDays(startMs: number, endMs: number): string[] {
  const days: string[] = [];
  const first = startOfUtcDay(new Date(startMs));
  const last = startOfUtcDay(new Date(endMs));
  for (let cursor = first; cursor <= last; cursor += 24 * 60 * 60 * 1000) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return days;
}

function serializeSnapshot(snapshot: DashboardSnapshot, range: DateRange) {
  const rangeUsages = snapshot.usages
    .filter((usage) => {
      const createdAt = timestampMs(usage.createdAt);
      return Number.isFinite(createdAt) && createdAt >= range.startMs && createdAt <= range.endMs;
    });
  const daily = buildDailyUsage(rangeUsages, range.startMs, range.endMs);
  const days = daily.days.length > 0 ? daily.days : enumerateDays(range.startMs, range.endMs);
  const rangeSummary = summarizeUsageRecords(rangeUsages);
  const rangeModels = aggregateModelUsage(rangeUsages, snapshot.quotas.monthly.cap);
  const summaryScope = 'selected range';
  const history = rangeUsages.slice(0, 500);

  const dailyModels = days.map((day) => {
    const tokenModels = daily.tokensByModel[day] ?? {};
    const spendModels = daily.planSpendByModel[day] ?? {};
    return Object.keys(tokenModels)
      .map((model) => ({
        model,
        tokens: tokenModels[model],
        planSpend: spendModels[model] ?? 0,
      }))
      .sort((a, b) => b.planSpend - a.planSpend);
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
      dailyModels,
    },
    fetchedAt: snapshot.fetchedAt,
  };
}

function getDashboardHtml(cspSource: string, chartScriptUri: string): string {
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
        <span>–</span>
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
        <div class="chart-caption">Daily tokens by model — per day, not cumulative</div>
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
        '<div class="summary-card"><span class="muted">Plan spend · ' + summaryScope + '</span><strong>' + formatUsd(summary.totalMonthlyCredits) + '</strong></div>' +
        '<div class="summary-card"><span class="muted">Requests</span><strong>' + escapeHtml(summary.totalCount) + '</strong></div>' +
        '<div class="summary-card"><span class="muted">Tokens</span><strong>' + formatTokens(summary.totalTokens) + '</strong></div>' +
        '<div class="summary-card"><span class="muted">Success rate</span><strong>' + Math.round(Number(summary.successRate) || 0) + '%</strong></div>';
      document.getElementById('subtitle').textContent =
        'GOAT plan · ' + escapeHtml(summaryScope) +
        ' · Updated ' + formatDate(payload.fetchedAt);
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
