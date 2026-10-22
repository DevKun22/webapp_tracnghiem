import {supabase} from '../../lib/supabase';

/** A single anonymous sign-in in flight prevents duplicated users on quick clicks. */
let guestPromise: ReturnType<NonNullable<typeof supabase>['auth']['signInAnonymously']> | null = null;
export async function ensureGuestSession(){
 if(!supabase) throw new Error('Chưa cấu hình Supabase');
 const {data:{session}}=await supabase.auth.getSession();
 if(session) return session;
 if(!guestPromise)guestPromise=supabase.auth.signInAnonymously();
 try{const {data,error}=await guestPromise;if(error)throw error;return data.session}finally{guestPromise=null}
}
export async function signInWithEmail(email:string,password:string){
 if(!supabase)throw new Error('Chưa cấu hình Supabase');
 const {error}=await supabase.auth.signInWithPassword({email,password});
 if(error)throw error;
}
export async function registerWithEmail(email:string,password:string){
 if(!supabase)throw new Error('Chưa cấu hình Supabase');
 const {data,error}=await supabase.auth.signUp({email,password});
 if(error)throw error;
 return data;
}
