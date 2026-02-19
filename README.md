# mcp-server-npm-plus

[![npm version](https://img.shields.io/npm/v/mcp-server-npm-plus.svg)](https://www.npmjs.com/package/mcp-server-npm-plus)
[![npm downloads](https://img.shields.io/npm/dm/mcp-server-npm-plus.svg)](https://www.npmjs.com/package/mcp-server-npm-plus)
[![CI](https://github.com/ofershap/mcp-server-npm-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/ofershap/mcp-server-npm-plus/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The ultimate npm companion for your AI assistant — search packages, check bundle sizes, scan vulnerabilities, compare downloads, and inspect dependency trees. Zero auth.

```bash
npx mcp-server-npm-plus
```

> Works with Claude Desktop, Cursor, VS Code Copilot, and any MCP client. Zero auth — uses public npm registry APIs.

![Demo](assets/demo.gif)

## Tools

| Tool                | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `search`            | Search npm packages by query                                |
| `package_info`      | Get detailed info: description, license, repo, dependencies |
| `downloads`         | Get download stats for a package                            |
| `compare_downloads` | Compare download counts across multiple packages            |
| `bundle_size`       | Get bundle size (minified + gzip) via Bundlephobia          |
| `vulnerabilities`   | Get vulnerability info and advisory links                   |
| `dependency_tree`   | Show direct dependencies as a tree                          |
| `download_trends`   | Daily breakdown with sparkline                              |

## Quick Start

### Cursor

1. Open Cursor Settings → MCP
2. Add to `mcpServers`:

```json
{
  "mcpServers": {
    "npm-plus": {
      "command": "npx",
      "args": ["mcp-server-npm-plus"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "npm-plus": {
      "command": "npx",
      "args": ["mcp-server-npm-plus"]
    }
  }
}
```

### VS Code (Copilot + MCP)

Use the MCP extension and configure the server with `npx mcp-server-npm-plus`.

## Example Prompts

- **Search npm for React state management libraries** — Use `search` with query "react state management"
- **What's the bundle size of lodash?** — Use `bundle_size` with name "lodash"
- **Compare downloads of zustand vs jotai vs valtio** — Use `compare_downloads` with packages `["zustand", "jotai", "valtio"]`
- **Check for vulnerabilities in express** — Use `vulnerabilities` with name "express"
- **Show me the dependency tree for next** — Use `dependency_tree` with name "next"
- **What are the download trends for typescript this month?** — Use `download_trends` with name "typescript"

## Development

```bash
npm install
npm run typecheck
npm run build
npm test
npm run lint
npm run format
```

## Author

Ofer Shapira

## License

MIT
