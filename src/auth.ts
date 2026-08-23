import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { CommandCodeCredentials } from './types';

export const API_KEY_SECRET = 'commandCodeUsage.apiKey';
export const SESSION_COOKIE_SECRET = 'commandCodeUsage.sessionCookie';

const AUTH_FILE = path.join('.commandcode', 'auth.json');
const API_KEY_ENV = 'COMMAND_CODE_API_KEY';
const SESSION_COOKIE_ENV = 'COMMAND_CODE_SESSION_COOKIE';

type JsonRecord = Record<string, unknown>;

function normalized(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

function isCommandCodeRecord(record: JsonRecord): boolean {
  const identityKeys = ['provider', 'providerId', 'id', 'name', 'label', 'type', 'account'];
  return identityKeys.some((key) => normalized(record[key]).includes('commandcode'));
}

function credentialFromRecord(record: JsonRecord): string | undefined {
  const preferredKeys = ['key', 'apiKey', 'api_key', 'apiToken', 'api_token'];
  for (const key of preferredKeys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const tokenKeys = ['token', 'accessToken', 'access_token', 'access'];
  for (const key of tokenKeys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function findCredential(value: unknown, insideCommandCodeRecord = false): string | undefined {
  if (insideCommandCodeRecord && typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCredential(item, insideCommandCodeRecord);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as JsonRecord;
  const currentIsCommandCode = insideCommandCodeRecord || isCommandCodeRecord(record);
  if (currentIsCommandCode) {
    const credential = credentialFromRecord(record);
    if (credential) {
      return credential;
    }
  }

  for (const [key, child] of Object.entries(record)) {
    if (normalized(key).includes('commandcode')) {
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

  return undefined;
}

function findApiKeyLike(value: unknown, propertyName = ''): string | undefined {
  if (typeof value === 'string') {
    const candidate = value.trim();
    return /key|token|secret|credential/i.test(propertyName) &&
      /^(user_|cmd_|cc_)/i.test(candidate)
      ? candidate
      : undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findApiKeyLike(item, propertyName);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  for (const [key, child] of Object.entries(value as JsonRecord)) {
    const found = findApiKeyLike(child, key);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function readAuthFile(): string | undefined {
  const authPath = path.join(os.homedir(), AUTH_FILE);
  try {
    const content = fs.readFileSync(authPath, 'utf8');
    const parsed = JSON.parse(content);
    return findCredential(parsed) ?? findApiKeyLike(parsed);
  } catch {
    return undefined;
  }
}

function cleanApiKey(value: string): string {
  return value.replace(/^Bearer\s+/i, '').trim();
}

export function cleanSessionCookie(value: string): string {
  let cookie = value.trim();
  cookie = cookie.replace(/^Cookie:\s*/i, '').trim();
  if (
    (cookie.startsWith("'") && cookie.endsWith("'")) ||
    (cookie.startsWith('"') && cookie.endsWith('"'))
  ) {
    cookie = cookie.slice(1, -1).trim();
  }
  return cookie;
}

export async function resolveCredentials(
  context: vscode.ExtensionContext
): Promise<CommandCodeCredentials | undefined> {
  const secretApiKey = await context.secrets.get(API_KEY_SECRET);
  const secretSessionCookie = await context.secrets.get(SESSION_COOKIE_SECRET);
  const environmentApiKey = process.env[API_KEY_ENV]?.trim();
  const environmentSessionCookie = process.env[SESSION_COOKIE_ENV]?.trim();
  const authFileApiKey = readAuthFile();
  const apiKey = environmentApiKey || secretApiKey?.trim() || authFileApiKey;
  const sessionCookie = environmentSessionCookie || secretSessionCookie?.trim();

  if (!apiKey && !sessionCookie) {
    return undefined;
  }

  const sources = new Set<'environment' | 'secret' | 'auth-file'>();
  if (environmentApiKey || environmentSessionCookie) {
    sources.add('environment');
  }
  if (secretApiKey || secretSessionCookie) {
    sources.add('secret');
  }
  if (authFileApiKey && !environmentApiKey && !secretApiKey) {
    sources.add('auth-file');
  }
  const uniqueSources = [...sources];
  return {
    apiKey: apiKey ? cleanApiKey(apiKey) : undefined,
    sessionCookie: sessionCookie ? cleanSessionCookie(sessionCookie) : undefined,
    source:
      uniqueSources.length === 1
        ? uniqueSources[0]
        : 'mixed',
  };
}

export async function saveApiKey(context: vscode.ExtensionContext, value: string): Promise<void> {
  const apiKey = cleanApiKey(value);
  if (!apiKey) {
    throw new Error('API key cannot be empty');
  }
  await context.secrets.store(API_KEY_SECRET, apiKey);
}

export async function saveSessionCookie(
  context: vscode.ExtensionContext,
  value: string
): Promise<void> {
  const cookie = cleanSessionCookie(value);
  if (!cookie) {
    throw new Error('Session cookie cannot be empty');
  }
  await context.secrets.store(SESSION_COOKIE_SECRET, cookie);
}

export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(API_KEY_SECRET);
}

export async function clearSessionCookie(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(SESSION_COOKIE_SECRET);
}
