import { z } from 'zod';

// Vite tự đọc .env/.env.local; dotenv chỉ dùng cho Node scripts, không nạp trong browser.
// Không dùng z.coerce.boolean(): chuỗi "false" sẽ bị ép thành true.
const switchSchema = (defaultValue: 'true' | 'false' = 'false') => z.enum(['true', 'false']).default(defaultValue).transform(value => value === 'true');
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('URL Supabase không hợp lệ'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Thiếu publishable key'),
  VITE_FEATURE_HW_PRACTICE: switchSchema('true'),
  VITE_FEATURE_HW_RANDOM: switchSchema('true'),
  VITE_FEATURE_HW_FLAG: switchSchema('true'),
  VITE_FEATURE_HW_NOTES: switchSchema('true'),
  VITE_FEATURE_HW_PROGRESS: switchSchema('true'),
  VITE_FEATURE_SLIDE_LEARNING: switchSchema('true'),
  VITE_FEATURE_EXAM: switchSchema('true'),
  VITE_FEATURE_EXAM_HISTORY: switchSchema('true'),
  VITE_FEATURE_ANONYMOUS_LOGIN: switchSchema('true'),
  VITE_FEATURE_EMAIL_LOGIN: switchSchema('true'),
  VITE_FEATURE_AI_GENERATOR: switchSchema(),
  VITE_FEATURE_DOCUMENT_UPLOAD: switchSchema(),
  VITE_FEATURE_ESSAY_PRACTICE: switchSchema(),
});

// Trả lỗi rõ ràng trước khi thao tác với Supabase.
const raw = { ...import.meta.env };
const parsed = envSchema.safeParse(raw);
export const envError = parsed.success ? '' : parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
// Cho phép render màn hình hướng dẫn cấu hình ngay cả khi .env chưa được điền.
export const env = parsed.success ? parsed.data : null;

export type FeatureName = 'hwPractice' | 'hwRandom' | 'hwFlag' | 'hwNotes' | 'hwProgress' | 'slideLearning' | 'exam' | 'examHistory' | 'anonymousLogin' | 'emailLogin' | 'aiGenerator' | 'documentUpload' | 'essayPractice';
