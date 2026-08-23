import * as vscode from 'vscode';

let output: vscode.OutputChannel | undefined;

export function log(message: string): void {
  if (!output) {
    output = vscode.window.createOutputChannel('CommandCode Usagebar');
  }
  output.appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function disposeLog(): void {
  output?.dispose();
  output = undefined;
}
