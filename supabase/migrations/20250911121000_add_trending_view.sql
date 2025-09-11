-- Trending hosts for last 24 hours based on outbound_links
create or replace view public.outbound_links_trending_24h as
select
  coalesce(final_host, raw_host) as host,
  count(*) as link_count
from public.outbound_links
where discovered_at > now() - interval '24 hours'
  and coalesce(final_host, raw_host) is not null
group by 1
order by link_count desc;

comment on view public.outbound_links_trending_24h is 'Top outbound link hosts over the last 24 hours';

