-- Create the news_cache table
create table if not exists news_cache (
  key text primary key,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable RLS temporarily
alter table news_cache disable row level security;

-- Create index for faster key lookups
create index if not exists news_cache_key_idx on news_cache (key);

-- Create index for timestamp-based queries
create index if not exists news_cache_created_at_idx on news_cache (created_at); 