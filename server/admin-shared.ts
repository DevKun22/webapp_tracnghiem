import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv, createCipheriv, randomBytes } from 'node:crypto';

export type Request = IncomingMessage & { body?: unknown };
export type Response = ServerResponse;
const COOKIE_NAME = '__Host-dk_admin';

export function json(res: Response, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}
export function cookieToken(req: Request): string | undefined {
  const item = (req.headers.cookie?.split(';') ?? []).find(x => x.trim().startsWith(`${COOKIE_NAME}=`));
  const token = item?.trim().slice(COOKIE_NAME.length + 1);
  return token && /^[A-Za-z0-9_.-]{20,8192}$/.test(token) ? token : undefined;
}
export function service() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
/** Validates current account and DB role, without requiring MFA so the admin can enroll MFA safely. */
export async function authorizeToken(token: string, res: Response, requireMfa = true): Promise<boolean> {
  const admin = service();
  if (!admin) { json(res, 503, { code: 'ADMIN_CONFIGURATION_MISSING', message: 'Dịch vụ quản trị chưa được cấu hình.' }); return false; }
  try {
    const { data: claims, error: claimError } = await admin.auth.getClaims(token);
    if (claimError || !claims?.claims) { json(res, 401, { code: 'AUTH_REQUIRED', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }); return false; }
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user || user.is_anonymous || !user.email_confirmed_at || user.id !== claims.claims.sub) {
      json(res, 401, { code: 'AUTH_REQUIRED', message: 'Vui lòng đăng nhập bằng email đã xác minh.' }); return false;
    }
    const { data: role, error: roleError } = await admin.from('system_admin_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (roleError) { json(res, 503, { code: 'ADMIN_ROLE_TABLE_MISSING', message: 'Chưa thiết lập bảng quyền quản trị.' }); return false; }
    if (!role || !['super_admin', 'admin'].includes(role.role)) {
      json(res, 403, { code: 'ADMIN_ROLE_REQUIRED', message: 'Tài khoản không có quyền quản trị.' }); return false;
    }
    if (requireMfa && claims.claims.aal !== 'aal2') {
      json(res, 403, { code: 'MFA_REQUIRED', message: 'Vui lòng xác minh hai bước để tiếp tục.' }); return false;
    }
    return true;
  } catch {
    json(res, 503, { code: 'ADMIN_CHECK_FAILED', message: 'Không thể xác minh quyền quản trị.' }); return false;
  }
}
export async function authorize(req: Request, res: Response) {
  const token = cookieToken(req);
  if (!token) { json(res, 401, { code: 'ADMIN_SESSION_REQUIRED', message: 'Phiên quản trị chưa được thiết lập hoặc đã hết hạn.' }); return false; }
  return authorizeToken(token, res, true);
}
export function checkPostOrigin(req: Request, res: Response) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) { json(res, 403, { code: 'ORIGIN_REQUIRED', message: 'Thiếu thông tin nguồn yêu cầu.' }); return false; }
  try {
    const parsed = new URL(origin);
    const fp = req.headers['x-forwarded-proto'];
    const protocol = (Array.isArray(fp) ? fp[0] : fp || 'https').toLowerCase();
    const localhost = ['localhost:3000', '127.0.0.1:3000'].includes(host);
    const localDev = process.env.VERCEL_ENV !== 'production' && localhost && parsed.protocol === 'http:' && (protocol === 'http' || protocol === 'https');
    const secure = parsed.protocol === 'https:' && protocol === 'https';
    const fetchSite = req.headers['sec-fetch-site'];
    if (parsed.host !== host || (!localDev && !secure) || (fetchSite && !['same-origin', 'none'].includes(fetchSite))) {
      json(res, 403, { code: 'ORIGIN_INVALID', message: 'Nguồn yêu cầu không được phép.' }); return false;
    }
    return true;
  } catch {
    json(res, 403, { code: 'ORIGIN_INVALID', message: 'Nguồn yêu cầu không hợp lệ.' }); return false;
  }
}
export function setAdminCookie(res: Response, token: string, seconds: number) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Strict`);
}
export function clearAdminCookie(res: Response) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
}
export function adminEncryptionKey(): Buffer | null {
  const raw = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  if (!raw || !/^[A-Za-z0-9+/]{43}=$/.test(raw)) return null;
  const key = Buffer.from(raw, 'base64');
  return key.length === 32 ? key : null;
}
export function encryptSecret(secret: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${ciphertext.toString('base64')}`;
}
export function decryptSecret(value: string, key: Buffer): string {
  const parts = value.split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret');
  const [iv, tag, data] = parts.map(x => Buffer.from(x, 'base64'));
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted secret');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
export type AISettings = { provider: 'openai'; model: string; configured: boolean; enabled: boolean; lastCheckedAt: string | null; connected: boolean; source: 'database' | 'environment' | 'none'; key?: string };
export async function loadAISettings(): Promise<AISettings> {
  const fallback = process.env.AI_PROVIDER_API_KEY;
  const base: AISettings = { provider: 'openai', model: process.env.AI_PROVIDER_MODEL || 'gpt-4.1-mini', configured: Boolean(fallback), enabled: process.env.AI_TUTOR_ENABLED === 'true', lastCheckedAt: null, connected: false, source: fallback ? 'environment' : 'none', key: fallback };
  const client = service();
  if (!client) return base;
  const { data, error } = await client.from('admin_ai_settings').select('provider, model, encrypted_api_key, enabled, last_checked_at, last_connected').eq('id', 1).maybeSingle();
  // Migration might not yet be applied; status remains safe and does not reveal credentials.
  if (error || !data) return base;
  const encryptionKey = adminEncryptionKey();
  const encrypted = data.encrypted_api_key as string | null;
  let key: string | undefined;
  if (encrypted && encryptionKey) {
    try { key = decryptSecret(encrypted, encryptionKey); } catch { /* unavailable */ }
  }
  return { provider: 'openai', model: String(data.model), configured: Boolean(key), enabled: data.enabled === true, lastCheckedAt: data.last_checked_at as string | null, connected: data.last_connected === true, source: 'database', key };
}
export function publicAISettings(settings: AISettings) {
  const { key: _hidden, ...safe } = settings;
  return safe;
}
export async function checkAIConnection(key: string, model: string): Promise<{ connected: boolean; code: string; message: string }> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 12000);
  try {
    const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input: 'Trả lời OK.', max_output_tokens: 20 }), signal: abort.signal });
    if (r.ok) return { connected: true, code: 'CONNECTED', message: 'Kết nối và truy cập model thành công.' };
    if (r.status === 401 || r.status === 403) return { connected: false, code: 'INVALID_KEY', message: 'API key chưa được chấp nhận.' };
    if (r.status === 429) return { connected: false, code: 'QUOTA_EXCEEDED', message: 'Provider đang giới hạn yêu cầu hoặc hết hạn mức.' };
    if (r.status === 400 || r.status === 404) return { connected: false, code: 'MODEL_UNAVAILABLE', message: 'Model không khả dụng hoặc cấu hình không phù hợp.' };
    return { connected: false, code: 'PROVIDER_ERROR', message: 'Không thể kiểm tra AI tại thời điểm này.' };
  } catch { return { connected: false, code: 'NETWORK_ERROR', message: 'Kết nối AI thất bại hoặc quá thời gian phản hồi.' }; }
  finally { clearTimeout(timeout); }
}
export async function auditAdmin(action: string, token: string | undefined, detail: Record<string, unknown> = {}) {
  const client = service();
  if (!client) return;
  try {
    const { data: { user } } = token ? await client.auth.getUser(token) : { data: { user: null } };
    if (user) await client.from('admin_audit_logs').insert({ actor_id: user.id, action, detail });
  } catch { /* auditing failures should be logged through infrastructure; no secrets */ }
}
