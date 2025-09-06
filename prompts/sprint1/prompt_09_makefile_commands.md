# Makefile Commands Verification

## Objective

Verify and implement all Makefile commands for development workflow automation.

## Context

- Sprint: 1
- Dependencies: prompt_06_worker_initialization.md
- Related files: Makefile, CLAUDE.md

## Task

Implement and test all Makefile commands:

- make install - Install all dependencies
- make dev - Run Next.js dev server
- make worker - Run Python worker locally
- make db-push - Push schema to Supabase
- make db-seed - Seed fake data
- make lint - Run linters
- make test - Run tests
- make deploy-web - Deploy to Vercel
- make deploy-worker - Deploy worker
- make clean - Remove caches

## Subagent to Use

Invoke the **Task** subagent with type "general-purpose" to:

- Review and update existing Makefile
- Ensure all commands work correctly
- Add error handling to commands
- Create composite commands for common workflows
- Add help documentation to Makefile
- Test each command thoroughly

## Success Criteria

- [ ] All commands execute without errors
- [ ] make install sets up entire project
- [ ] make dev starts development server
- [ ] make worker runs Python worker
- [ ] Database commands connect to Supabase
- [ ] Lint and test commands configured
- [ ] Deploy commands have dry-run options
- [ ] make clean removes all artifacts
- [ ] Help text available with make help

## Notes

Use .PHONY targets appropriately. Add dependency chains between targets. Include OS-specific commands where needed. Consider adding make setup for first-time installation.
