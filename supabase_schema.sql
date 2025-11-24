-- Create tickets table
create table if not exists public.tickets (
  id uuid default gen_random_uuid() primary key,
  number text not null,
  name text not null,
  cpf text,
  service text not null,
  priority text not null,
  status text not null default 'WAITING',
  created_at timestamptz default now(),
  called_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  attendant_name text,
  observations text,
  recall_count int default 0
);

-- Enable RLS on tickets
alter table public.tickets enable row level security;

-- Create policies for tickets (Allow all for now for simplicity)
create policy "Enable read access for all users" on public.tickets for select using (true);
create policy "Enable insert access for all users" on public.tickets for insert with check (true);
create policy "Enable update access for all users" on public.tickets for update using (true);

-- Create Realtime publication
drop publication if exists supabase_realtime;
create publication supabase_realtime for table public.tickets;
