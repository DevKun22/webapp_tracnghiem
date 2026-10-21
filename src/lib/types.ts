export type Topic={id:string;title:string;description:string;question_count:number};
export type AnswerOption={id:string;label:string;body:string};
export type Question={id:string;topic_id:string;body:string;code:string|null;difficulty:string;position:number;options:AnswerOption[];chosen_option_id:string|null;flagged:boolean};
export type Attempt={id:string;status:'in_progress'|'submitted';mode:'exam'|'practice';started_at:string;expires_at:string;submitted_at:string|null;duration_minutes:number;question_count:number;questions:Question[];score:number|null;correct_count:number|null;wrong_count:number|null;unanswered_count:number|null};
export type ReviewItem={id:string;position:number;topic_id:string;body:string;code:string|null;options:AnswerOption[];chosen_option_id:string|null;correct_option_id:string;explanation:string;is_correct:boolean};
export type Review={attempt_id:string;score:number;correct_count:number;wrong_count:number;unanswered_count:number;question_count:number;submitted_at:string;items:ReviewItem[]};
export type HistoryItem={id:string;status:string;started_at:string;submitted_at:string|null;question_count:number;duration_minutes:number;score:number|null;correct_count:number|null};
