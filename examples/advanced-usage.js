#!/usr/bin/env node

/**
 * Example script showing how to use the MCP Context Bank Server
 * This demonstrates the three available tools with various configuration options:
 * 1. get_markdown_files
 * 2. get_file_content
 * 3. search_markdown_content
 */

const { spawn } = require("child_process");

// Example requests that can be sent to the server
const exampleRequests = [
  // Using default repository (set via MCP_DEFAULT_REPOSITORY)
  {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "get_markdown_files",
      arguments: {
        branch: "main",
        path_filter: "docs/",
      },
    },
  },

  // Using specific public repository
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "get_markdown_files",
      arguments: {
        repository_url: "https://github.com/microsoft/vscode.git",
        branch: "main",
        path_filter: "*.md",
      },
    },
  },

  // Using private repository with access token
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_file_content",
      arguments: {
        repository_url: "https://github.com/your-org/private-docs.git",
        file_path: "README.md",
        branch: "main",
        access_token: "ghp_your_github_token_here",
      },
    },
  },

  // Search for content using SSH repository
  {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "search_markdown_content",
      arguments: {
        repository_url: "git@github.com:your-org/context-bank.git",
        search_term: "API documentation",
        branch: "main",
        case_sensitive: false,
      },
    },
  },

  // Using default repository with environment token
  {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "search_markdown_content",
      arguments: {
        search_term: "deployment guide",
        branch: "develop",
        case_sensitive: true,
      },
    },
  },
];

console.log("MCP Context Bank Server - Example Usage");
console.log("=======================================\n");

console.log("Available tools:");
console.log("1. get_markdown_files - List all markdown files in a repository");
console.log("2. get_file_content - Get content of a specific file");
console.log("3. search_markdown_content - Search for text within markdown files\n");

console.log("Configuration Options:");
console.log("• Default repository: Set MCP_DEFAULT_REPOSITORY environment variable");
console.log("• Access token: Set MCP_ACCESS_TOKEN environment variable");
console.log("• Per-request: Provide repository_url and access_token in arguments\n");

console.log("Example requests:");
exampleRequests.forEach((request, index) => {
  console.log(`\n${index + 1}. ${request.params.name} (${getConfigType(request)}):`);
  console.log(JSON.stringify(request, null, 2));
});

console.log("\n=== VS Code with GitHub Copilot Configuration ===");
console.log("Add to your VS Code settings.json:");
console.log(`{
  "github.copilot.advanced": {
    "mcp": {
      "servers": {
        "context-bank": {
          "command": "mcp-context-bank-server",
          "env": {
            "MCP_DEFAULT_REPOSITORY": "https://github.com/your-org/docs.git",
            "MCP_ACCESS_TOKEN": "ghp_your_token_here"
          }
        }
      }
    }
  }
}`);

console.log("\n=== Amazon Q Developer Configuration ===");
console.log("Create ~/.config/amazon-q/mcp-servers.json:");
console.log(`{
  "servers": {
    "context-bank": {
      "command": "mcp-context-bank-server",
      "env": {
        "MCP_DEFAULT_REPOSITORY": "https://github.com/your-org/context.git",
        "MCP_ACCESS_TOKEN": "ghp_your_github_token"
      }
    }
  }
}`);

console.log("\nTo use this server:");
console.log("1. Install: npm install -g mcp-context-bank-server");
console.log("2. Configure your AI assistant (VS Code Copilot, Amazon Q, Claude)");
console.log("3. Set environment variables or provide repository details per request");

console.log("\nAuthentication methods:");
console.log("• Public repos: No authentication needed");
console.log("• Private repos with HTTPS: Use Personal Access Token (PAT)");
console.log("• Private repos with SSH: Use SSH key authentication");

function getConfigType(request) {
  const args = request.params.arguments;
  if (!args.repository_url) return "using default repository";
  if (args.access_token) return "private repo with PAT";
  if (args.repository_url.startsWith("git@")) return "SSH authentication";
  return "public repository";
}
