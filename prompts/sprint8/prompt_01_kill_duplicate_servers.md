# Kill Duplicate Dev Servers

## Objective

Clean up multiple running npm dev processes and establish a single, clean development environment.

## Context

- Sprint: 8
- Dependencies: None (first task)
- Related files: `/web/package.json`, multiple terminal processes

## Task

Multiple npm dev servers are running simultaneously, causing port conflicts and resource contention. Integration testing revealed 7+ active npm processes competing for resources.

### Current Issues

- Multiple processes on different ports (3000, 3334, etc.)
- Resource contention affecting performance
- Unclear which server is the "active" one
- Background processes consuming system resources

### Required Actions

1. **Process Audit**
   - List all running npm/node processes
   - Identify port assignments and PIDs
   - Document current resource usage

2. **Clean Termination**
   - Kill all npm dev processes gracefully
   - Clear any zombie processes
   - Reset port assignments

3. **Single Server Startup**
   - Start one clean npm dev server on port 3333
   - Verify no conflicts or warnings
   - Confirm proper routing and functionality

4. **Process Documentation**
   - Document the cleanup process
   - Create script to prevent future conflicts
   - Add monitoring to detect multiple servers

## Subagent to Use

Invoke the **debugger** to:

- Analyze running processes and identify conflicts
- Kill processes safely without corrupting state
- Verify clean startup of single dev server
- Create process management documentation

## Success Criteria

- [ ] All duplicate npm processes terminated
- [ ] Single npm dev server running on port 3333
- [ ] No port conflicts or resource warnings
- [ ] Web interface loads properly at localhost:3333
- [ ] No background npm processes consuming resources
- [ ] Process cleanup script created for future use
- [ ] Changes documented in commit message

## Implementation Steps

1. **Audit Current State**
   ```bash
   ps aux | grep npm
   lsof -i :3333
   lsof -i :3334
   htop # Check resource usage
   ```

2. **Clean Termination**
   ```bash
   killall node
   killall npm
   # Verify no zombie processes remain
   ```

3. **Fresh Start**
   ```bash
   cd /web
   PORT=3333 npm run dev
   # Verify single process running on port 3333
   ```

4. **Validation**
   - Check localhost:3333 loads properly
   - Verify no console errors
   - Confirm API endpoints respond

## Notes

- Use SIGTERM before SIGKILL to allow graceful shutdown
- Check for any unsaved work in running processes
- Verify database connections aren't disrupted
- Document any unusual process behaviors discovered

## Handoff Notes

After completion:
- Single clean dev server running
- Process management best practices documented
- Ready for schema fixes in prompt_02