export const clock=(seconds:number)=>`${Math.floor(Math.max(0,seconds)/60).toString().padStart(2,'0')}:${(Math.max(0,seconds)%60).toString().padStart(2,'0')}`;
export const remainingSeconds=(expiresAt:string,now=Date.now())=>Math.max(0,Math.ceil((new Date(expiresAt).getTime()-now)/1000));
export const scoreLabel=(n:number)=>Number(n).toFixed(2).replace(/\.00$/,'');
export const getErrorMessage=(error:unknown)=>error instanceof Error?error.message:String(error);
