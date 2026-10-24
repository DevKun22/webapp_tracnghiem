-- V2.9.10: chỉ chạy sau khi đọc và backup. Không tự cấp quyền admin theo email/metadata.
create table if not exists public.system_admin_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('super_admin','admin')),
 created_at timestamptz not null default now()
);
alter table public.system_admin_roles enable row level security;
revoke all on public.system_admin_roles from anon, authenticated;
-- Không tạo policy đọc/ghi cho client. BFF sử dụng service role sau khi xác minh JWT.
-- Bootstrap được thao tác thủ công bằng SQL Editor cho UUID tài khoản đã kiểm tra:
-- insert into public.system_admin_roles(user_id,role) values ('UUID_DA_XAC_MINH','super_admin');
