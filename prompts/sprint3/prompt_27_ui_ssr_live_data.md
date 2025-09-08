# Prompt 27: UI SSR – Replace Mocks with Live Data

## Role
You are a Next.js SSR specialist focused on data correctness.

## Objective
Replace mocked stats and domain lists with SSR data from Supabase views.

## Task
- Convert dashboard `/` and `/domains` to Server Components where possible.
- Use `createServerComponentClient` to fetch from `v_domains_overview`, `v_domains_new_today`, and `v_pipeline_stats`.
- Preserve UX: loading UI, error states, pagination/sorting.

## Success Criteria
- [ ] No mock data remains.
- [ ] Pages render on server with correct types and zero client secrets.
- [ ] Basic e2e click-through works (pagination, sort, search).

## Notes
Keep components under 100 LOC where reasonable; split into atoms/molecules.
