import {useState} from 'react';
import {toast} from 'sonner';
import {supabase} from '../../lib/supabase';
import {authErrorMessage} from './auth-errors';
import {PasswordField} from './PasswordField';
export function ResetPasswordDialog({onClose}:{onClose:()=>void}){
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false);
 const save=async()=>{if(!supabase||busy)return;if(password.length<8){toast.error('Mật khẩu phải có ít nhất 8 ký tự.');return}if(password!==confirm){toast.error('Hai mật khẩu chưa khớp.');return}setBusy(true);try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;toast.success('Đã cập nhật mật khẩu. Bạn có thể tiếp tục học.');onClose()}catch(e){(import.meta.env.DEV ? console.error : () => {}) ('auth password reset',e);toast.error(authErrorMessage(e))}finally{setBusy(false)}};
 return <div className="modal-backdrop"><div className="modal account-security-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-password-title"><h2 id="reset-password-title">Đặt lại mật khẩu</h2><p>Tạo mật khẩu mới để bảo vệ tài khoản.</p><PasswordField id="reset-password" label="Mật khẩu mới" value={password} onChange={setPassword} autoComplete="new-password" disabled={busy}/><PasswordField id="reset-confirm" label="Nhập lại mật khẩu" value={confirm} onChange={setConfirm} autoComplete="new-password" disabled={busy}/><button className="btn btn-primary full" onClick={()=>void save()} disabled={busy||!password||!confirm}>{busy?'Đang cập nhật...':'Lưu mật khẩu mới'}</button><button className="btn btn-outline full" onClick={onClose} disabled={busy}>Đóng</button></div></div>
}
