-- Create outbound_links table to store extracted links per video
create table if not exists public.outbound_links (
  id bigserial primary key,
  video_id text not null,
  raw_url text not null,
  final_url text,
  raw_host text,
  final_host text,
  source text not null check (source in ('video','profile')),
  discovered_at timestamptz not null default now(),
  metadata jsonb
);

-- Optional FK to video table if exists
do $$ begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'video'
  ) then
    alter table public.outbound_links
    add constraint outbound_links_video_fk
    foreign key (video_id) references public.video (video_id)
    on delete cascade;
  end if;
end $$;

-- Unique constraint to suppress duplicates
create unique index if not exists outbound_links_video_raw_url_idx
  on public.outbound_links (video_id, raw_url);

comment on table public.outbound_links is 'Outbound links discovered from TikTok videos (and profiles)';

