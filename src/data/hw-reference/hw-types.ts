/** Data contract cho lớp ghi chú đáp án nhập từ tài liệu tham khảo.
 * Không dùng lớp này để trực tiếp ghi đè đáp án chuẩn của bài luyện.
 */
export type QuestionKind =
  | 'multiple_choice'
  | 'fill_blank'
  | 'open_response'
  | 'missing_question';

export type NoteReviewStatus =
  | 'needs_source_alignment'
  | 'needs_manual_review'
  | 'linked_and_approved';

export type HWAnswerNote = {
  id: string; // sourceId:topic:section:questionNo
  sourceId: string;
  topicKey: string;
  suggestedDocumentId: string; // Gợi ý chủ đề, KHÔNG phải liên kết đã xác nhận
  sourceSection: string; // Phân biệt Tuple/Set/Dictionary trùng số câu
  sourceQuestionNumber: number;
  kind: QuestionKind;
  answerRaw: string | null; // giữ nguyên ký hiệu nguồn: D/A, F, H, code...
  answerChoices: string[];
  explanation: string | null;
  status: NoteReviewStatus;
  flags: string[];
  linkedQuestionId: string | null; // null cho đến khi đối chiếu đề gốc
};

export type ApprovedAnswerLink = {
  noteId: string;
  questionId: string; // ID ổn định trong hwCatalog.json
  approvedAnswerIds: string[];
  approvedExplanation: string | null;
  reviewer: string;
  reviewedAt: string;
  verificationMethod: 'pdf_manual' | 'code_execution' | 'expert_review';
};

export function isSafeToGrade(
  note: HWAnswerNote,
  approvedLink?: ApprovedAnswerLink,
): boolean {
  return Boolean(
    approvedLink &&
    note.status === 'linked_and_approved' &&
    note.linkedQuestionId === approvedLink.questionId &&
    approvedLink.noteId === note.id &&
    note.kind === 'multiple_choice' &&
    approvedLink.approvedAnswerIds.length === 1 &&
    ['A', 'B', 'C', 'D'].includes(approvedLink.approvedAnswerIds[0] ?? ''),
  );
}
