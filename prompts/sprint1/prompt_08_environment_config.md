# Environment Configuration

## Objective

Set up and document all environment variables for local development and production deployment.

## Context

- Sprint: 1
- Dependencies: prompt_03_nextjs_setup.md
- Related files: .env.local, .env.example, CLAUDE.md

## Task

Configure environment variables:

- Create .env.example with all required variables
- Set up .env.local for development
- Document each variable's purpose
- Add validation for required variables
- Create environment type definitions
- Set up different configs for dev/staging/prod

## Subagents to Use

1. Invoke the **env-manager** agent (.claude/agents/env-manager.md) to:
   - Create comprehensive .env.example file
   - Implement environment variable validation
   - Add TypeScript types for environment
   - Create utility functions for env access
   - Set up environment validation on startup

2. Then invoke the **security-auditor** agent (.claude/agents/security-auditor.md) to:
   - Verify no hardcoded secrets
   - Check for sensitive data exposure
   - Validate security best practices

## Success Criteria

- [ ] All environment variables documented
- [ ] .env.example includes all required vars
- [ ] TypeScript types for environment variables
- [ ] Validation prevents startup with missing vars
- [ ] Separate configs for different environments
- [ ] Sensitive variables properly marked
- [ ] Clear documentation for each variable
- [ ] No hardcoded secrets in codebase

## Notes

Include Supabase, Redis, Inngest, and worker URLs. Use zod for environment validation. Implement fail-fast on missing required variables. Consider using dotenv-vault for production secrets.
