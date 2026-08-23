import * as vscode from 'vscode';
import { DashboardPanel } from './webview/dashboardPanel';
import { disposeLog, log } from './log';
import { StatusBarController } from './statusBar';
import { UsageManager } from './usageManager';

let manager: UsageManager | undefined;
let statusBar: StatusBarController | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  log('Extension activating...');
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
    vscode.commands.registerCommand('commandCodeUsage.openDashboard', () => {
      if (!manager) {
        void vscode.window.showErrorMessage(
          'CommandCode Usagebar is still starting. Try again in a moment.'
        );
        return;
      }
      DashboardPanel.show(context.extensionUri, manager);
    }),

    vscode.commands.registerCommand('commandCodeUsage.refresh', async () => {
      if (!manager || !statusBar) {
        return;
      }
      statusBar.setLoading();
      try {
        await manager.refresh();
        updateStatusBar();
        vscode.window.showInformationMessage('CommandCode usage refreshed');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Refresh failed';
        statusBar.setError(message);
        void vscode.window.showErrorMessage(`CommandCode Usagebar: ${message}`);
      }
    }),

    vscode.commands.registerCommand('commandCodeUsage.setApiKey', async () => {
      if (!manager) {
        return;
      }
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Paste your CommandCode API key',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'user_...',
      });
      if (!apiKey) {
        return;
      }
      try {
        await manager.setApiKey(apiKey);
        updateStatusBar();
        void vscode.window.showInformationMessage('CommandCode API key saved securely');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid API key';
        void vscode.window.showErrorMessage(`CommandCode Usagebar: ${message}`);
      }
    }),

    vscode.commands.registerCommand('commandCodeUsage.setSessionCookie', async () => {
      if (!manager) {
        return;
      }
      const cookie = await vscode.window.showInputBox({
        prompt: 'Paste the Cookie header value from commandcode.ai Studio',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'session cookie value',
      });
      if (!cookie) {
        return;
      }
      try {
        await manager.setSessionCookie(cookie);
        updateStatusBar();
        void vscode.window.showInformationMessage('Studio session cookie saved securely');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid session cookie';
        void vscode.window.showErrorMessage(`CommandCode Usagebar: ${message}`);
      }
    }),

    vscode.commands.registerCommand('commandCodeUsage.clearSessionCookie', async () => {
      if (!manager) {
        return;
      }
      await manager.clearSessionCookie();
      updateStatusBar();
      void vscode.window.showInformationMessage('Saved Studio session cookie cleared');
    }),

    vscode.commands.registerCommand('commandCodeUsage.clearApiKey', async () => {
      if (!manager) {
        return;
      }
      await manager.clearApiKey();
      updateStatusBar();
      void vscode.window.showInformationMessage('Saved CommandCode API key cleared');
    })
  );

  statusBar = new StatusBarController();
  statusBar.setLoading();
  context.subscriptions.push(
    manager.onUpdate(updateStatusBar),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('commandCodeUsage.refreshIntervalSeconds') ||
        event.affectsConfiguration('commandCodeUsage.historyLimit')
      ) {
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
    log('Extension activated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log(`Activation failed: ${message}`);
    statusBar.setError(message);
  }
}

export function deactivate(): void {
  manager?.dispose();
  statusBar?.dispose();
  DashboardPanel.dispose();
  disposeLog();
}
