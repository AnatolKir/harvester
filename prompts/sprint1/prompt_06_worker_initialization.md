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

## Subagents to Use

1. Invoke the **worker-developer** agent (.claude/agents/worker-developer.md) to:
   - Create Python project structure in /worker/
   - Set up requirements.txt with necessary packages
   - Implement base worker class with Playwright
   - Add Supabase client for data storage
   - Create browser pool management
   - Implement graceful shutdown handling

2. Then invoke the **scraper-optimizer** agent (.claude/agents/scraper-optimizer.md) to:
   - Configure anti-detection measures
   - Set up browser rotation strategies
   - Optimize memory usage for long-running processes

3. Finally invoke the **health-checker** agent (.claude/agents/health-checker.md) to:
   - Create health check endpoint
   - Add monitoring and logging
   - Set up crash recovery mechanisms

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
