export type TutorAnswer={suggestedAnswer:string|null;summary:string;explanation:string;optionAnalysis:Record<string,string>;caveat:string};
const safeText=(x:unknown,max=4000)=>typeof x==='string'?x.trim().slice(0,max):'';
const cleanMarkdown=(s:string)=>s.replace(/\r/g,'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*([^*\n]+)\*/g,'$1').replace(/`([^`]+)`/g,'$1').replace(/^#{1,5}\s+/gm,'').trim();
export function normalizeTutorAnswer(raw:string):TutorAnswer{
 const text=raw.trim();const candidate=text.startsWith('```')?text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''):text;
 try{
  const value:unknown=JSON.parse(candidate);
  if(value&&typeof value==='object'&&!Array.isArray(value)){
   const obj=value as Record<string,unknown>,options:Record<string,string>={};
   const analysis=obj.optionAnalysis;
   if(analysis&&typeof analysis==='object'&&!Array.isArray(analysis))for(const letter of ['A','B','C','D']){const s=safeText((analysis as Record<string,unknown>)[letter],700);if(s)options[letter]=s;}
   const suggestion=safeText(obj.suggestedAnswer,32).toUpperCase();
   const summary=cleanMarkdown(safeText(obj.summary));const explanation=cleanMarkdown(safeText(obj.explanation));
   if(summary||explanation)return{suggestedAnswer:/^[ABCD]$/.test(suggestion)?suggestion:null,summary,explanation,optionAnalysis:options,caveat:cleanMarkdown(safeText(obj.caveat,900))};
  }
 }catch{/* Provider may return natural-language prose. Render safely. */}
 return{suggestedAnswer:null,summary:'',explanation:cleanMarkdown(text),optionAnalysis:{},caveat:''};
}
