# Next.js Application Setup

## Objective

Initialize the Next.js application with Tailwind CSS and shadcn/ui component library.

## Context

- Sprint: 1
- Dependencies: None (can run parallel with database setup)
- Related files: /web/, package.json, CLAUDE.md

## Task

Set up the Next.js application structure:

- Initialize Next.js 14+ with TypeScript and App Router
- Configure Tailwind CSS with custom theme
- Install and configure shadcn/ui components
- Set up ESLint and Prettier
- Create base layout and navigation structure
- Configure path aliases

## Subagent to Use

Invoke the **Task** subagent with type "general-purpose" to:

- Run Next.js initialization commands
- Configure Tailwind CSS with proper content paths
- Set up shadcn/ui with theme configuration
- Create base layout components
- Configure TypeScript paths in tsconfig.json
- Set up linting and formatting rules

## Success Criteria

- [ ] Next.js dev server runs with `make dev`
- [ ] Tailwind CSS styles applying correctly
- [ ] shadcn/ui components installable and working
- [ ] TypeScript compilation successful
- [ ] ESLint and Prettier configured
- [ ] Path aliases working (@/components, @/lib, etc.)
- [ ] Base layout renders without errors
- [ ] No console errors in development

## Notes

Use Next.js App Router (not Pages Router). Configure for deployment on Vercel. Set up proper TypeScript strict mode. Follow the repository structure defined in CLAUDE.md.
