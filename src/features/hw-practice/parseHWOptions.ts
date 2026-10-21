export type ParsedHW = {stem:string;options:{id:string;text:string}[]} | null;
/** Conservative text parser. If source order or labels are unclear, keep original text instead. */
export function parseHWOptions(body:string):ParsedHW {
  const matches=[...body.matchAll(/(?:^|\s)([ABCD])\s*[.．)]\s*/gm)];
  if(matches.length!==4||matches.map(m=>m[1]).join('')!=='ABCD')return null;
  const start=matches[0].index??0;
  const stem=body.slice(0,start).trim();
  if(!stem)return null;
  const options=matches.map((m,i)=>({id:m[1],text:body.slice((m.index??0)+m[0].length,i+1<matches.length?matches[i+1].index:body.length).trim()}));
  if(options.some(o=>!o.text))return null;
  return {stem,options};
}
