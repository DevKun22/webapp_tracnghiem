/** Danh mục môn học mở rộng. Chỉ Python được phát hành trong phiên bản này. */
export type Subject = { id: string; slug: string; name: string; enabled: boolean };
export const SUBJECTS: readonly Subject[] = [
  { id: 'python', slug: 'python', name: 'Python', enabled: true },
  { id: 'javascript', slug: 'javascript', name: 'JavaScript', enabled: false },
  { id: 'java', slug: 'java', name: 'Java', enabled: false },
  { id: 'cpp', slug: 'cpp', name: 'C++', enabled: false },
  { id: 'sql', slug: 'sql', name: 'SQL', enabled: false },
];
