/** Dữ liệu tham khảo độc lập; KHÔNG tự ý dùng để chấm điểm. */
import referenceData from '../../../data/hw-reference/hw-answer-notes.json';
import approvedData from '../../../data/hw-reference/approved-links.json';
import type {ApprovedAnswerLink,HWAnswerNote} from '../../../data/hw-reference/hw-types';
export function getReferenceImportSummary(){return referenceData.manifest;}
export function getUnreviewedNotes(){return (referenceData.notes as HWAnswerNote[]).filter(note=>note.status!=='linked_and_approved');}
export function getApprovedLink(questionId:string):ApprovedAnswerLink|undefined {return (approvedData.links as ApprovedAnswerLink[]).find(link=>link.questionId===questionId);}
