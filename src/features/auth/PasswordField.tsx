import {useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
export function PasswordField({id,label,value,onChange,autoComplete='current-password',placeholder,disabled}:{id:string;label:string;value:string;onChange:(value:string)=>void;autoComplete?:string;placeholder?:string;disabled?:boolean}){
 const [visible,setVisible]=useState(false);
 return <div className="auth-form-row"><label htmlFor={id}>{label}</label><div className="password-wrap"><input id={id} type={visible?'text':'password'} value={value} onChange={e=>onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} disabled={disabled} minLength={autoComplete==='new-password'?8:undefined}/><button type="button" className="password-toggle" aria-label={visible?'Ẩn mật khẩu':'Hiện mật khẩu'} title={visible?'Ẩn mật khẩu':'Hiện mật khẩu'} aria-pressed={visible} onClick={()=>setVisible(s=>!s)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
}
