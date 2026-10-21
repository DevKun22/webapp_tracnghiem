import { env } from './env';

// Mặc định không mở chức năng khi thiếu cấu hình (fail-closed).
export const features = {
  hwPractice: env?.VITE_FEATURE_HW_PRACTICE ?? false,
  hwRandom: env?.VITE_FEATURE_HW_RANDOM ?? false,
  hwFlag: env?.VITE_FEATURE_HW_FLAG ?? false,
  hwNotes: env?.VITE_FEATURE_HW_NOTES ?? false,
  hwProgress: env?.VITE_FEATURE_HW_PROGRESS ?? false,
  slideLearning: env?.VITE_FEATURE_SLIDE_LEARNING ?? false,
  exam: env?.VITE_FEATURE_EXAM ?? false,
  examHistory: env?.VITE_FEATURE_EXAM_HISTORY ?? false,
  anonymousLogin: env?.VITE_FEATURE_ANONYMOUS_LOGIN ?? false,
  emailLogin: env?.VITE_FEATURE_EMAIL_LOGIN ?? false,
  aiGenerator: env?.VITE_FEATURE_AI_GENERATOR ?? false,
  documentUpload: env?.VITE_FEATURE_DOCUMENT_UPLOAD ?? false,
  essayPractice: env?.VITE_FEATURE_ESSAY_PRACTICE ?? false,
} as const;
