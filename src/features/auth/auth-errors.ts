/** Chỉ trả thông báo tiếng Việt cho UI; không hiển thị lỗi kỹ thuật từ dịch vụ. */
export function authErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const message = raw.toLowerCase();
  if (/missing email or phone|email is required|email not provided/.test(message)) return 'Vui lòng nhập địa chỉ email.';
  if (/invalid login credentials|invalid credentials/.test(message)) return 'Email hoặc mật khẩu chưa chính xác.';
  if (/email not confirmed/.test(message)) return 'Bạn cần xác minh email trước khi đăng nhập.';
  if (/already registered|already exists|email address is already/.test(message)) return 'Email này đã được sử dụng. Vui lòng đăng nhập tài khoản đã có.';
  if (/password should be at least|password is too short|weak password/.test(message)) return 'Mật khẩu chưa đáp ứng yêu cầu bảo mật. Hãy chọn mật khẩu mạnh hơn.';
  if (/invalid email|unable to validate email/.test(message)) return 'Địa chỉ email chưa đúng định dạng.';
  if (/rate limit|too many requests|security purposes/.test(message)) return 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.';
  if (/anonymous sign.ins are disabled|anonymous signins are disabled/.test(message)) return 'Chế độ khách chưa được bật. Vui lòng sử dụng tài khoản email.';
  if (/network|fetch|offline|timeout|failed to fetch/.test(message)) return 'Không thể kết nối đến hệ thống. Vui lòng kiểm tra mạng và thử lại.';
  if (/same password/.test(message)) return 'Mật khẩu mới cần khác mật khẩu hiện tại.';
  return 'Đã xảy ra sự cố khi xử lý tài khoản. Vui lòng thử lại.';
}
export const isEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
