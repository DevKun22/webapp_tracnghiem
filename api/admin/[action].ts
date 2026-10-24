/**
 * Single Vercel Hobby entrypoint for AI admin actions.
 * This file is the ONLY Vercel Function for the seven admin AI routes.
 * Each handler retains its own HTTP method, origin, RBAC and MFA checks.
 * Never route to dynamic filesystem paths or execute arbitrary action names.
 */
import type { Request, Response } from '../../server/admin-shared.js';
import { json } from '../../server/admin-shared.js';
import aiCheck from '../../server/admin-handlers/ai-check.js';
import aiConfig from '../../server/admin-handlers/ai-config.js';
import aiControl from '../../server/admin-handlers/ai-control.js';
import aiProviders from '../../server/admin-handlers/ai-providers.js';
import aiQuotas from '../../server/admin-handlers/ai-quotas.js';
import aiStatus from '../../server/admin-handlers/ai-status.js';
import aiUsers from '../../server/admin-handlers/ai-users.js';

const handlers: Record<string, (req: Request, res: Response) => Promise<unknown>> = {
  'ai-check': aiCheck,
  'ai-config': aiConfig,
  'ai-control': aiControl,
  'ai-providers': aiProviders,
  'ai-quotas': aiQuotas,
  'ai-status': aiStatus,
  'ai-users': aiUsers,
};

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  let pathname: string;
  try {
    pathname = new URL(req.url || '/', 'https://internal.invalid').pathname;
  } catch {
    return json(res, 400, { code: 'INVALID_PATH', message: 'Đường dẫn không hợp lệ.' });
  }
  const match = /^\/api\/admin\/(ai-[a-z-]+)\/?$/.exec(pathname);
  const selected = match?.[1] ? handlers[match[1]] : undefined;
  if (!selected) return json(res, 404, { code: 'NOT_FOUND', message: 'Chức năng không tồn tại.' });
  // Delegate to the original handler: no authorization shortcut here.
  return selected(req, res);
}
