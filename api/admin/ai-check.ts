
import {
  authorize,
  loadAISettings,
  publicAISettings,
  checkAIConnection,
  checkPostOrigin,
  json,
  service,
  cookieToken,
  auditAdmin,
  type Request,
  type Response,
} from "../../server/admin-shared.js";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, {
      message: "Phương thức không được hỗ trợ.",
    });
  }

  if (!checkPostOrigin(req, res) || !(await authorize(req, res))) {
    return;
  }

  const cfg = await loadAISettings();

  if (!cfg.key) {
    return json(res, 200, {
      ...publicAISettings(cfg),
      connected: false,
      message: "Chưa có API key hợp lệ phía server.",
    });
  }

  const check = await checkAIConnection(cfg.key, cfg.model);

  if (cfg.source === "database") {
    await service()
      ?.from("admin_ai_settings")
      .update({
        last_connected: check.connected,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", 1);
  }

  await auditAdmin("AI_CONNECTION_CHECK", cookieToken(req), {
    code: check.code,
    connected: check.connected,
  });

  return json(res, 200, {
    ...publicAISettings(cfg),
    ...check,
  });
}
