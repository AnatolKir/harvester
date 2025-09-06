# Authentication Configuration

## Objective

Configure Supabase Auth for email-only authentication in the Next.js application.

## Context

- Sprint: 1
- Dependencies: prompt_01_database_schema.md
- Related files: /web/app/, /web/lib/supabase/, CLAUDE.md

## Task

Implement email-only authentication using Supabase Auth:

- Set up Supabase client configuration
- Create authentication utilities and hooks
- Implement login/logout functionality
- Add session management
- Create protected route middleware

No social logins or phone authentication required for MVP.

## Subagent to Use

Invoke the **Task** subagent with type "general-purpose" to:

- Create Supabase client configuration in /web/lib/supabase/
- Implement authentication hooks using Next.js App Router patterns
- Set up middleware for protected routes
- Create login and signup components
- Add session persistence and refresh logic

## Success Criteria

- [ ] Supabase client properly configured
- [ ] Email login/signup working
- [ ] Session management implemented
- [ ] Protected routes return 401 for unauthenticated users
- [ ] Logout functionality working
- [ ] TypeScript types properly defined
- [ ] No authentication bypass vulnerabilities
- [ ] Clean code with no lint errors

## Notes

Follow Next.js 14+ App Router patterns. Use server components where possible. Implement proper error handling for authentication failures. Store authentication state in Supabase, not local storage.
