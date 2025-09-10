# Create BrightData Specialist Agent

## Objective

Create and validate the BrightData specialist agent to provide expert guidance on MCP integration and BrightData's service capabilities.

## Context

- Sprint: 6
- Dependencies: None (foundation task)
- Related files: `.claude/agents/brightdata.md`

## Task

The BrightData specialist agent should already exist. Validate it's properly configured and test its knowledge of:

1. MCP (Model Context Protocol) fundamentals
2. BrightData's service architecture and tool capabilities
3. HTTP gateway patterns for MCP integration
4. Best practices for production MCP deployments

### Validation Steps

1. Check if `.claude/agents/brightdata.md` exists and review its content
2. Test the agent's knowledge by asking about:
   - MCP protocol basics
   - BrightData's standard tools vs custom tools
   - HTTP gateway architecture patterns
   - Error handling strategies
3. If the agent needs improvements, enhance its knowledge base
4. Document the agent's capabilities and usage guidelines

## Agent to Use

Invoke the **@brightdata** agent to:

- Validate its own configuration and knowledge
- Provide guidance on MCP gateway architecture
- Review its expertise in BrightData integration patterns

## Success Criteria

- [ ] BrightData agent exists and is properly configured
- [ ] Agent demonstrates knowledge of MCP protocol
- [ ] Agent can provide guidance on HTTP gateway patterns
- [ ] Agent understands BrightData's service limitations
- [ ] Usage guidelines documented for team

## Notes

- This agent will be crucial for all subsequent Sprint 6 tasks
- Ensure the agent has context on our specific use case (TikTok domain harvesting)
- The agent should understand both technical and operational aspects
