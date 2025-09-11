## Prompt 06 — Observability

Metrics to track
- `discovery.urls_returned`
- `enrichment.links_found`
- `enrichment.links_saved`
- `http.429_count`, `http.captcha_count`

Daily trending SQL
```sql
select raw_host,
       count(distinct video_id) as videos_24h,
       count(*) as mentions_24h
from outbound_links
where discovered_at > now() - interval '24 hours'
group by raw_host
order by videos_24h desc, mentions_24h desc
limit 200;
```

