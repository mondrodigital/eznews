-- Create the news_cache table
create table if not exists news_cache (
  key text primary key,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS (Row Level Security) policies
alter table news_cache enable row level security;

-- Allow anonymous access for read/write since this is just a cache
create policy "Allow anonymous read access"
  on news_cache for select
  to anon
  using (true);

create policy "Allow anonymous write access"
  on news_cache for insert
  to anon
  with check (true);

create policy "Allow anonymous delete access"
  on news_cache for delete
  to anon
  using (true); 