# Agent Instructions

## Development Environment
This project uses [devenv](https://devenv.sh/) for reproducible development environments with Nix.

## Commands
- `devenv shell` - Enter the development shell (also runs `npm install`)
- `devenv test` - Run tests (currently runs git version check)
- `npm install` - Download dependencies
- `npm run check` - Typecheck all TypeScript files and check formatting
- `npm run fmt` - Format all TypeScript files with Prettier
- `npm run build` - Compile all TypeScript files to JavaScript in `dist/`
- `make` - Format, check and build in one go
- `hello` - Custom script that greets from the development environment

### Application Commands
- `npx tsx chat.ts` - Simple chat interface with Claude
- `npx tsx read.ts` - Chat with file reading capabilities
- `npx tsx list_files.ts` - Chat with file listing and reading capabilities
- `npx tsx bash_tool.ts` - Chat with file operations and bash command execution
- `npx tsx edit_tool.ts` - Chat with full file operations (read, list, edit, bash)
- `npx tsx code_search_tool.ts` - Chat with file operations, bash and code search (ripgrep)

### Verbose Logging
All TypeScript applications support a `--verbose` flag for detailed execution logging:
- `npx tsx chat.ts --verbose` - Enable verbose logging for debugging
- `npx tsx read.ts --verbose` - See detailed tool execution and API calls
- `npx tsx edit_tool.ts --verbose` - Debug file operations and tool usage

## Architecture
- **Environment**: Nix-based development environment using devenv
- **Shell**: Includes Git, Node.js, TypeScript, ripgrep, and custom greeting script
- **Structure**: Chat application with terminal interface to Claude via Anthropic API

## Code Style Guidelines
- Follow Nix conventions for devenv.nix configuration
- Format TypeScript with Prettier (`npm run fmt`)
- Use standard Git workflows
- Development environment configuration should be reproducible

## Troubleshooting

### Verbose Logging
When debugging issues with the chat applications, use the `--verbose` flag to get detailed execution logs:

```bash
npx tsx edit_tool.ts --verbose
```

**What verbose logging shows:**
- API calls to Claude (model, timing, success/failure)
- Tool execution details (which tools are called, input parameters, results)
- File operations (reading, writing, listing files with sizes/counts)
- Bash command execution (commands run, output, errors)
- Conversation flow (message processing, content blocks)
- Error details

**Log output locations:**
- **Verbose mode**: Detailed logs go to stderr with timestamps
- **Normal mode**: Only essential output goes to stdout

**Common troubleshooting scenarios:**
- **API failures**: Check verbose logs for authentication errors or rate limits
- **Tool failures**: See exactly which tool failed and why (file not found, permission errors)
- **Unexpected responses**: View full conversation flow and Claude's reasoning
- **Performance issues**: See API call timing and response sizes

### Environment Issues
- Ensure `ANTHROPIC_API_KEY` environment variable is set
- Run `devenv shell` to ensure proper development environment
- Use `npm install` to ensure dependencies are installed

## Notes
- Requires ANTHROPIC_API_KEY environment variable to be set
- Chat application provides a simple terminal interface to Claude
- Use ctrl-c to quit the chat session
