import { authorize, loadAISettings, publicAISettings, json, type Request, type Response } from '../../server/admin-shared.js';
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { message: 'Phương thức không được hỗ trợ.' }); }
  if (!await authorize(req, res)) return;
  const cfg = await loadAISettings();
  return json(res, 200, { ...publicAISettings(cfg), message: cfg.configured ? 'Đã cấu hình key. Hãy kiểm tra kết nối trước khi bật AI.' : 'AI chưa có cấu hình hợp lệ phía server.' });
}
