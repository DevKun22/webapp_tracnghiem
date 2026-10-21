import 'dotenv/config';
// Node script: dotenv nạp .env (không tự nạp .env.local như Vite).
import { z } from 'zod';
const schema = z.object({ VITE_SUPABASE_URL: z.string().url(), VITE_SUPABASE_ANON_KEY: z.string().min(1) });
const result = schema.safeParse(process.env);
if (!result.success) { console.error('Cấu hình chưa hợp lệ:', result.error.flatten().fieldErrors); process.exitCode = 1; }
else console.log('✓ Supabase URL và publishable key hợp lệ về định dạng (chưa kiểm tra kết nối).');
