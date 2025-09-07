#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import simpleGit from "simple-git";
import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";

// Validation schemas
const GetMarkdownFilesSchema = z.object({
  repository_url: z
    .string()
    .optional()
    .describe("Git repository URL (if not provided, uses default from config)"),
  branch: z.string().optional().default("main"),
  path_filter: z
    .string()
    .optional()
    .describe("Optional path pattern to filter files (e.g., 'docs/', '*.md')"),
  access_token: z.string().optional().describe("Personal Access Token for private repositories"),
});

const GetFileContentSchema = z.object({
  repository_url: z
    .string()
    .optional()
    .describe("Git repository URL (if not provided, uses default from config)"),
  file_path: z.string().min(1, "File path cannot be empty"),
  branch: z.string().optional().default("main"),
  access_token: z.string().optional().describe("Personal Access Token for private repositories"),
});

const SearchMarkdownSchema = z.object({
  repository_url: z
    .string()
    .optional()
    .describe("Git repository URL (if not provided, uses default from config)"),
  search_term: z.string().min(1, "Search term cannot be empty"),
  branch: z.string().optional().default("main"),
  case_sensitive: z.boolean().optional().default(false),
  access_token: z.string().optional().describe("Personal Access Token for private repositories"),
});

class ContextBankServer {
  private server: Server;
  private tempDirs: Set<string> = new Set();
  private defaultRepository: string;
  private defaultAccessToken?: string;

  constructor() {
    // Require repository and access token env vars
    const repoEnv = process.env.MCP_CONTEXT_BANK_REPOSITORY;
    const tokenEnv = process.env.MCP_CONTEXT_BANK_REPOSITORY_PAT;
    if (!repoEnv) {
      throw new Error("MCP_CONTEXT_BANK_REPOSITORY environment variable is required.");
    }
    if (!tokenEnv) {
      throw new Error("MCP_CONTEXT_BANK_REPOSITORY_PAT environment variable is required.");
    }
    this.defaultRepository = repoEnv;
    this.defaultAccessToken = tokenEnv;

    this.server = new Server(
      {
        name: "context-bank-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();

    // Cleanup temp directories on exit
    process.on("exit", () => this.cleanup());
    process.on("SIGINT", () => this.cleanup());
    process.on("SIGTERM", () => this.cleanup());
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_markdown_files",
            description: "List all markdown files in a Git repository",
            inputSchema: {
              type: "object",
              properties: {
                repository_url: {
                  type: "string",
                  description: "Git repository URL (optional - uses default if not provided)",
                },
                branch: {
                  type: "string",
                  description: "Git branch to fetch from",
                  default: "main",
                },
                path_filter: {
                  type: "string",
                  description: "Optional path pattern to filter files (e.g., 'docs/', '*.md')",
                },
                access_token: {
                  type: "string",
                  description: "Personal Access Token for private repositories (optional)",
                },
              },
              required: [],
            },
          },
          {
            name: "get_file_content",
            description: "Get the content of a specific markdown file from a Git repository",
            inputSchema: {
              type: "object",
              properties: {
                repository_url: {
                  type: "string",
                  description: "Git repository URL (optional - uses default if not provided)",
                },
                file_path: {
                  type: "string",
                  description: "Path to the file within the repository",
                },
                branch: {
                  type: "string",
                  description: "Git branch to fetch from",
                  default: "main",
                },
                access_token: {
                  type: "string",
                  description: "Personal Access Token for private repositories (optional)",
                },
              },
              required: ["file_path"],
            },
          },
          {
            name: "search_markdown_content",
            description: "Search for specific content within markdown files in a Git repository",
            inputSchema: {
              type: "object",
              properties: {
                repository_url: {
                  type: "string",
                  description: "Git repository URL (optional - uses default if not provided)",
                },
                search_term: {
                  type: "string",
                  description: "Text to search for within markdown files",
                },
                branch: {
                  type: "string",
                  description: "Git branch to fetch from",
                  default: "main",
                },
                case_sensitive: {
                  type: "boolean",
                  description: "Whether the search should be case sensitive",
                  default: false,
                },
                access_token: {
                  type: "string",
                  description: "Personal Access Token for private repositories (optional)",
                },
              },
              required: ["search_term"],
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_markdown_files":
            return await this.getMarkdownFiles(args);
          case "get_file_content":
            return await this.getFileContent(args);
          case "search_markdown_content":
            return await this.searchMarkdownContent(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async cloneRepository(
    url: string,
    branch: string,
    accessToken?: string
  ): Promise<string> {
    const tempDir = path.join(
      os.tmpdir(),
      `context-bank-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    this.tempDirs.add(tempDir);

    const git = simpleGit();

    // If access token is provided and URL is HTTPS, inject the token
    let cloneUrl = url;
    if (accessToken && url.startsWith("https://")) {
      // Convert https://github.com/owner/repo.git to https://token@github.com/owner/repo.git
      cloneUrl = url.replace("https://", `https://${accessToken}@`);
    }

    await git.clone(cloneUrl, tempDir, ["--depth", "1", "--branch", branch]);

    return tempDir;
  }

  private resolveRepository(providedUrl?: string): string {
    const url = providedUrl || this.defaultRepository;
    if (!url) {
      throw new Error(
        "No repository URL provided and no default repository configured. Set MCP_CONTEXT_BANK_REPOSITORY environment variable or provide repository_url parameter."
      );
    }
    return url;
  }

  private resolveAccessToken(providedToken?: string): string | undefined {
    return providedToken || this.defaultAccessToken;
  }

  private async getMarkdownFiles(args: unknown) {
    const { repository_url, branch, path_filter, access_token } =
      GetMarkdownFilesSchema.parse(args);

    const repoUrl = this.resolveRepository(repository_url);
    const accessToken = this.resolveAccessToken(access_token);
    const repoDir = await this.cloneRepository(repoUrl, branch, accessToken);

    try {
      const markdownFiles = await this.findMarkdownFiles(repoDir, path_filter);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                repository: repoUrl,
                branch,
                files: markdownFiles,
                total_files: markdownFiles.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } finally {
      await this.cleanupTempDir(repoDir);
    }
  }

  private async getFileContent(args: unknown) {
    const { repository_url, file_path, branch, access_token } = GetFileContentSchema.parse(args);

    const repoUrl = this.resolveRepository(repository_url);
    const accessToken = this.resolveAccessToken(access_token);
    const repoDir = await this.cloneRepository(repoUrl, branch, accessToken);

    try {
      const fullPath = path.join(repoDir, file_path);

      // Security check: ensure the file is within the repo directory
      const resolvedPath = path.resolve(fullPath);
      const resolvedRepoDir = path.resolve(repoDir);
      if (!resolvedPath.startsWith(resolvedRepoDir)) {
        throw new Error("Invalid file path: Path traversal detected");
      }

      const content = await fs.readFile(fullPath, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                repository: repoUrl,
                branch,
                file_path,
                content,
                size: content.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        throw new Error(`File not found: ${file_path}`);
      }
      throw error;
    } finally {
      await this.cleanupTempDir(repoDir);
    }
  }

  private async searchMarkdownContent(args: unknown) {
    const { repository_url, search_term, branch, case_sensitive, access_token } =
      SearchMarkdownSchema.parse(args);

    const repoUrl = this.resolveRepository(repository_url);
    const accessToken = this.resolveAccessToken(access_token);

    // Only use GitHub API for github.com repos
    const githubMatch = repoUrl.match(/github.com[:/](.+?)\/(.+?)(\.git)?$/);
    if (githubMatch && accessToken) {
      const owner = githubMatch[1];
      const repo = githubMatch[2];
      const ext = "md";
      const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(
        search_term
      )}+repo:${owner}/${repo}+extension:${ext}`;
      const headers = {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      };
      const fetch = (await import("node-fetch")).default;
      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
      }
      const data: any = await response.json();
      // Format results
      const results = (data.items || []).map((item: any) => ({
        file_path: item.path,
        repository: repoUrl,
        url: item.html_url,
        // GitHub API does not return line numbers, only file paths
      }));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                repository: repoUrl,
                branch,
                search_term,
                case_sensitive,
                results,
                total_files_with_matches: results.length,
                total_matches: results.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
    // Fallback to local search for non-GitHub or missing token
    // ...existing code...
    const repoDir = await this.cloneRepository(repoUrl, branch, accessToken);
    try {
      const markdownFiles = await this.findMarkdownFiles(repoDir);
      const results = [];
      const searchRegex = new RegExp(
        search_term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        case_sensitive ? "g" : "gi"
      );
      for (const filePath of markdownFiles) {
        const fullPath = path.join(repoDir, filePath);
        const content = await fs.readFile(fullPath, "utf-8");
        const lines = content.split("\n");
        const matches = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (searchRegex.test(line)) {
            matches.push({
              line_number: i + 1,
              line_content: line.trim(),
            });
          }
        }
        if (matches.length > 0) {
          results.push({
            file_path: filePath,
            matches,
            total_matches: matches.length,
          });
        }
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                repository: repoUrl,
                branch,
                search_term,
                case_sensitive,
                results,
                total_files_with_matches: results.length,
                total_matches: results.reduce((sum, file) => sum + file.total_matches, 0),
              },
              null,
              2
            ),
          },
        ],
      };
    } finally {
      await this.cleanupTempDir(repoDir);
    }
  }

  private async findMarkdownFiles(repoDir: string, pathFilter?: string): Promise<string[]> {
    const files: string[] = [];

    const scanDirectory = async (dir: string, relativePath: string = ""): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue; // Skip hidden files/directories

        const entryPath = path.join(dir, entry.name);
        const relativeEntryPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await scanDirectory(entryPath, relativeEntryPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
          // Apply path filter if provided
          if (!pathFilter || this.matchesFilter(relativeEntryPath, pathFilter)) {
            files.push(relativeEntryPath);
          }
        }
      }
    };

    await scanDirectory(repoDir);
    return files.sort();
  }

  private matchesFilter(filePath: string, filter: string): boolean {
    // Simple glob-like matching
    if (filter.endsWith("/")) {
      // Directory filter
      return filePath.startsWith(filter) || filePath.includes(`/${filter}`);
    } else if (filter.includes("*")) {
      // Wildcard filter
      const regexPattern = filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
      return new RegExp(`^${regexPattern}$`).test(filePath);
    } else {
      // Exact match or substring
      return filePath.includes(filter);
    }
  }

  private async cleanupTempDir(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      this.tempDirs.delete(tempDir);
    } catch (error) {
      console.error(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  }

  private cleanup(): void {
    for (const tempDir of this.tempDirs) {
      try {
        require("fs").rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to cleanup temp directory ${tempDir}:`, error);
      }
    }
    this.tempDirs.clear();
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Context Bank MCP Server running on stdio");
  }
}

// Run the server
if (require.main === module) {
  const server = new ContextBankServer();
  server.run().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}

export default ContextBankServer;
