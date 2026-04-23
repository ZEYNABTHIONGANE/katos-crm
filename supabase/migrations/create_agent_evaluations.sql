-- create_agent_evaluations.sql
create table if not exists public.agent_evaluations (
    id uuid default gen_random_uuid() primary key,
    agent_name text not null, -- Matching the name used in visits/interactions/contacts
    manager_id uuid references public.profiles(id),
    evaluation_date date default current_date, -- Free date range start or specific assessment date
    evaluation_note text not null,
    created_at timestamp with time zone default now(),
    unique (agent_name, evaluation_date)
);

-- RLS
alter table public.agent_evaluations enable row level security;

-- Admin/Director/Superviseur can see all
create policy "Directors can see all evaluations"
on public.agent_evaluations for select
to authenticated
using (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dir_commercial', 'superviseur')
    )
);

-- Managers/RC can see evaluations they created or evaluations of their subordinates
create policy "Managers can see relevant evaluations"
on public.agent_evaluations for select
to authenticated
using (
    exists (
        select 1 from public.profiles p1
        join public.profiles p2 on (p2.id = auth.uid() and (p1.parent_id = p2.id or p1.id = p2.id))
        where p2.role in ('resp_commercial', 'manager')
    )
);

-- Insertion: Only managers and directors can evaluate
create policy "Hierarchy can insert evaluations"
on public.agent_evaluations for insert
to authenticated
with check (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dir_commercial', 'superviseur', 'resp_commercial', 'manager')
    )
);
