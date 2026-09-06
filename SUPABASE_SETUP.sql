-- قاعدة مزامنة برنامج أهالي المسيب
create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

revoke all on public.app_state from anon;
grant select, insert, update, delete on public.app_state to authenticated;

create policy "user_select_own_state"
on public.app_state for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_insert_own_state"
on public.app_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_update_own_state"
on public.app_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user_delete_own_state"
on public.app_state for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_app_state_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated_at on public.app_state;
create trigger trg_app_state_updated_at
before update on public.app_state
for each row execute function public.set_app_state_updated_at();
