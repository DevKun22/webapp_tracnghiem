import { authorize, checkPostOrigin, json, service, adminEncryptionKey, encryptSecret, loadAISettings, publicAISettings, checkAIConnection, cookieToken, auditAdmin, type Request, type Response } from '../../server/admin-shared.js';
function bodyObject(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { message: 'Phương thức không được hỗ trợ.' }); }
  if (!checkPostOrigin(req, res) || !await authorize(req, res)) return;
  // Vercel may parse JSON automatically; never log request body.
  let raw: unknown = req.body;
  if (!raw) {
    let input = '';
    for await (const chunk of req) { input += String(chunk); if (input.length > 10000) return json(res, 413, { message: 'Dữ liệu vượt giới hạn.' }); }
    try { raw = JSON.parse(input); } catch { return json(res, 400, { message: 'Dữ liệu cấu hình không hợp lệ.' }); }
  }
  const body = bodyObject(raw);
  if (!body || body.provider !== 'openai' || typeof body.model !== 'string' || !/^[a-zA-Z0-9._-]{3,100}$/.test(body.model) || typeof body.enabled !== 'boolean' || (body.apiKey !== undefined && (typeof body.apiKey !== 'string' || body.apiKey.length > 4096))) {
    return json(res, 400, { message: 'Cấu hình AI không hợp lệ.' });
  }
  const client = service(); const cipherKey = adminEncryptionKey();
  if (!client || !cipherKey) return json(res, 503, { code: 'AI_SECRET_STORAGE_UNAVAILABLE', message: 'Chưa cấu hình kho mã hóa AI phía server.' });
  const current = await loadAISettings();
  const key = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : current.key;
  if (!key && body.enabled) return json(res, 400, { message: 'Cần cấu hình API key trước khi bật AI.' });
  // Enabled requires actual successful model call, never a stale status flag.
  const test = key ? await checkAIConnection(key, body.model) : { connected: false, code: 'NOT_CONFIGURED', message: 'Chưa cấu hình key.' };
  if (body.enabled && !test.connected) return json(res, 422, { code: test.code, message: `Không thể bật AI: ${test.message}` });
  const encrypted = key ? encryptSecret(key, cipherKey) : null;
  const { error } = await client.from('admin_ai_settings').upsert({ id: 1, provider: 'openai', model: body.model, encrypted_api_key: encrypted, enabled: body.enabled, last_checked_at: key ? new Date().toISOString() : null, last_connected: test.connected }, { onConflict: 'id' });
  if (error) return json(res, 503, { message: 'Không thể lưu cấu hình. Hãy kiểm tra migration và quyền server.' });
  await auditAdmin('AI_CONFIG_UPDATED', cookieToken(req), { provider: 'openai', model: body.model, enabled: body.enabled, connectionCode: test.code, keyChanged: typeof body.apiKey === 'string' && Boolean(body.apiKey.trim()) });
  const updated = await loadAISettings();
  return json(res, 200, { ...publicAISettings(updated), connected: test.connected, message: body.enabled ? 'Đã lưu cấu hình và kiểm tra kết nối thành công.' : `Đã lưu cấu hình. ${test.message}` });
}
