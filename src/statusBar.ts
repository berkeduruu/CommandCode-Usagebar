import * as vscode from 'vscode';
import {
  escapeMarkdown,
  formatProgressBar,
  formatResetAt,
  formatTokens,
  formatUsd,
  formatUtcDateTime,
} from './format';
import { HoverData, QuotaSnapshot, UsageWindow } from './types';

const OPEN_COMMAND = 'commandCodeUsage.openDashboard';

function quotaLine(
  name: string,
  used: number,
  window: UsageWindow | QuotaSnapshot['monthly']
): string {
  return `| ${name} | ${formatUsd(used)} / ${formatUsd(window.cap)} | ${formatUsd(window.remaining)} | ${formatResetAt(window.resetAt)} |`;
}

function buildTooltip(
  quotas: QuotaSnapshot,
  hover: HoverData,
  detailError?: string
): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown('### CommandCode GOAT Usage\n\n');
  md.appendMarkdown('| Limit | Used | Remaining | Reset |\n');
  md.appendMarkdown('| --- | --- | --- | --- |\n');
  md.appendMarkdown(quotaLine('5 hours', quotas.fiveHour.used, quotas.fiveHour) + '\n');
  md.appendMarkdown(quotaLine('Weekly', quotas.weekly.used, quotas.weekly) + '\n');
  md.appendMarkdown(quotaLine('Monthly', quotas.monthly.used, quotas.monthly) + '\n');
  md.appendMarkdown(
    `\n**Today:** ${formatTokens(hover.todayTotalTokens)} tokens · ${formatUsd(hover.todayPlanSpend)} plan spend\n\n`
  );

  if (detailError) {
    md.appendMarkdown(`_${escapeMarkdown(detailError)}_\n\n`);
  }

  md.appendMarkdown('| Model | Tokens | Date (UTC) |\n');
  md.appendMarkdown('| --- | --- | --- |\n');
  if (hover.recentUsages.length === 0) {
    md.appendMarkdown('| — | — | No recent usage |\n');
  } else {
    for (const usage of hover.recentUsages) {
      md.appendMarkdown(
        `| ${escapeMarkdown(usage.model)} | ${formatTokens(usage.tokensTotal)} | ${formatUtcDateTime(usage.createdAt)} |\n`
      );
    }
  }
  md.appendMarkdown('\n_Click to open the full dashboard_');
  return md;
}

function worstPercent(quotas: QuotaSnapshot): number {
  return Math.max(
    quotas.fiveHour.percent,
    quotas.weekly.percent,
    quotas.monthly.percent
  );
}

function applyUsageColor(item: vscode.StatusBarItem, percent: number): void {
  if (percent >= 100) {
    item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  } else if (percent >= 80) {
    item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    item.backgroundColor = undefined;
  }
}

export class StatusBarController {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    this.item.command = OPEN_COMMAND;
    this.item.show();
  }

  setLoading(): void {
    this.item.text = '$(sync~spin) CommandCode Usage';
    this.item.tooltip = 'Loading CommandCode usage data...';
    this.item.backgroundColor = undefined;
    this.item.show();
  }

  setError(message: string): void {
    this.item.text = '$(warning) CommandCode Usage';
    this.item.tooltip = message;
    this.item.backgroundColor = undefined;
    this.item.show();
  }

  setUnauthenticated(): void {
    this.item.text = '$(key) CommandCode Usage';
    this.item.tooltip =
      'Set COMMAND_CODE_API_KEY, run “CommandCode Usagebar: Set API Key”, or sign in with cmd login, then refresh.';
    this.item.backgroundColor = undefined;
    this.item.show();
  }

  update(quotas: QuotaSnapshot, hover: HoverData, detailError?: string): void {
    const fiveHour = formatProgressBar(quotas.fiveHour.percent, 10);
    const weekly = formatProgressBar(quotas.weekly.percent, 10);
    const monthly = formatProgressBar(quotas.monthly.percent, 10);
    this.item.text =
      `5h ${Math.round(quotas.fiveHour.percent)}% ${fiveHour}   ` +
      `7d ${Math.round(quotas.weekly.percent)}% ${weekly}   ` +
      `Mo ${Math.round(quotas.monthly.percent)}% ${monthly}`;
    this.item.tooltip = buildTooltip(quotas, hover, detailError);
    applyUsageColor(this.item, worstPercent(quotas));
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
