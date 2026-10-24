# V2.9.13 — Kiểm tra kết nối Firebase AI Logic (bản ứng viên)

1. Đã điền `VITE_FIREBASE_*` và `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` ở `.env.local` hoặc Vercel Development; không gửi secret.
2. Cài `npm install` và chạy `npm run build` để kiểm tra TypeScript; cần mạng npm để tải gói `firebase`.
3. Chạy `npx vercel dev --listen 3000` (đã pull Development env nếu dùng Vercel).
4. Đăng nhập `/admin` bằng tài khoản có role và MFA. Dưới phần phiên Admin, tìm `Kiểm tra Firebase AI Logic`, chọn model khả dụng, nhấn `Kiểm tra kết nối Firebase & Gemini`.
5. Kết quả gồm Firebase SDK, App Check token, phản hồi Gemini thật. Chỉ khi cả ba ✓ mới có thể nói **Firebase AI Logic đã kết nối thành công tại trình duyệt này**.
6. Với `localhost:3000`, SDK bật Firebase App Check debug token khi đang chạy Vite DEV. Mở Chrome DevTools → Console lấy debug token, Firebase Console → App Check → Apps → menu ... → Manage debug tokens; đăng ký và thử lại. Không đăng debug token trên GitHub hoặc production.
7. Nếu model không khả dụng, kiểm tra model được phép bởi project tại Firebase AI Logic Settings / tài liệu Google và thử tên đúng trong ô model.
8. Sau khi kiểm tra thành công, Firebase AI Logic vẫn chưa được thay vào đường đi của `AI Tutor Gateway` người học; chưa đủ điều kiện bật tính năng public vì quota server không chặn được yêu cầu SDK browser trực tiếp.

Ghi chú: thông tin Firebase Web API key và site key là public config. Không đưa `SUPABASE_SERVICE_ROLE_KEY`, `AI_SETTINGS_ENCRYPTION_KEY`, Gemini/OpenAI secret key hay App Check debug token vào VITE_.
