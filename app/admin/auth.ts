import 'server-only';

import { env } from 'cloudflare:workers';
import { requireChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';

export class AdminAccessError extends Error {
  constructor(public readonly email: string) {
    super('Bu hesap yönetici izin listesinde değil.');
    this.name = 'AdminAccessError';
  }
}

function configuredEmails(): Set<string> {
  const workerEnv = env as unknown as Record<string, unknown>;
  const raw =
    (typeof workerEnv.ADMIN_EMAILS === 'string' ? workerEnv.ADMIN_EMAILS : '') ||
    process.env.ADMIN_EMAILS ||
    '';

  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLocaleLowerCase('tr-TR'))
      .filter(Boolean),
  );
}

export async function requireAdmin(returnTo = '/admin'): Promise<ChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  const normalizedEmail = user.email.trim().toLocaleLowerCase('tr-TR');
  const isLocalPreview =
    process.env.NODE_ENV !== 'production' && normalizedEmail === 'seedy@sites.test';

  if (!isLocalPreview && !configuredEmails().has(normalizedEmail)) {
    throw new AdminAccessError(user.email);
  }

  return user;
}

