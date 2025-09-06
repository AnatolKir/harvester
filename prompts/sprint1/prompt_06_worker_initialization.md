# Python Worker Initialization

## Objective

Set up the Python worker with Playwright for TikTok scraping capabilities.

## Context

- Sprint: 1
- Dependencies: None (independent worker component)
- Related files: /worker/, requirements.txt, CLAUDE.md

## Task

Initialize Python worker environment:

- Set up Python project structure
- Install Playwright and dependencies
- Create base worker class
- Implement Supabase connection
- Add browser management utilities
- Create health check endpoint

No actual scraping logic yet - just infrastructure.

## Subagent to Use

Invoke the **Task** subagent with type "general-purpose" to:

- Create Python project structure in /worker/
- Set up requirements.txt with necessary packages
- Implement base worker class with Playwright
- Add Supabase client for data storage
- Create browser pool management
- Implement graceful shutdown handling

## Success Criteria

- [ ] Python environment properly configured
- [ ] Playwright browsers installed
- [ ] Worker can launch headless browser
- [ ] Supabase connection established
- [ ] Health check endpoint responding
- [ ] Proper error handling for browser crashes
- [ ] Memory management for long-running processes
- [ ] Clean code following PEP 8 standards

## Notes

Use Playwright instead of Selenium for better performance. Implement browser rotation to avoid detection. Consider using undetected-playwright for anti-bot measures. Prepare for deployment on Railway/Fly.io.
