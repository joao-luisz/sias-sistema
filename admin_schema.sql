-- Create services table
create table if not exists public.services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.services enable row level security;

-- Allow read access to everyone
create policy "Public services are viewable by everyone" 
on services for select 
using (true);

-- Allow insert/delete only to authenticated users (ideally admins, but for MVP authenticated is fine)
create policy "Authenticated users can manage services" 
on services for all 
using (auth.role() = 'authenticated');

-- Insert default services
insert into services (name) values 
('Primeira vez'), 
('Inclusão'), 
('Alteração'), 
('Atualização')
on conflict do nothing;
