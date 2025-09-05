#!/usr/bin/env node

/**
 * Example script showing how to use the MCP Context Bank Server
 * This demonstrates the three available tools:
 * 1. get_markdown_files
 * 2. get_file_content
 * 3. search_markdown_content
 */

const { spawn } = require("child_process");

// Example requests that can be sent to the server
const exampleRequests = [
  // List all markdown files
  {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "get_markdown_files",
      arguments: {
        repository_url: "git@github.com:ivanbaha/context-bank.git",
        branch: "main",
      },
    },
  },

  // Get content of a specific file
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "get_file_content",
      arguments: {
        repository_url: "git@github.com:ivanbaha/context-bank.git",
        file_path: "README.md",
        branch: "main",
      },
    },
  },

  // Search for content
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "search_markdown_content",
      arguments: {
        repository_url: "git@github.com:ivanbaha/context-bank.git",
        search_term: "context",
        branch: "main",
        case_sensitive: false,
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

console.log("Example requests:");
exampleRequests.forEach((request, index) => {
  console.log(`\n${index + 1}. ${request.params.name}:`);
  console.log(JSON.stringify(request, null, 2));
});

console.log("\nTo use this server with an MCP client:");
console.log("1. Install: npm install -g mcp-context-bank-server");
console.log("2. Configure your MCP client to use: mcp-context-bank-server");
console.log("3. The server will communicate via stdio using JSON-RPC protocol");

console.log("\nNote: Ensure you have access to the target Git repository");
console.log("(SSH keys configured for private repos, or use public HTTPS URLs)");
