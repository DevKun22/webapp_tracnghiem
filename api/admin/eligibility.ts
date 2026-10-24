import { authorizeToken, json, type Request, type Response } from '../../server/admin-shared.js';
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { message: 'Phương thức không được hỗ trợ.' }); }
  const token = req.headers.authorization?.match(/^Bearer\s+([A-Za-z0-9_.-]+)$/i)?.[1];
  if (!token) return json(res, 401, { code: 'AUTH_REQUIRED', message: 'Vui lòng đăng nhập để tiếp tục.' });
  if (!await authorizeToken(token, res, false)) return;
  return json(res, 200, { eligible: true, message: 'Tài khoản có quyền quản trị. Hãy xác minh MFA để tiếp tục.' });
}
