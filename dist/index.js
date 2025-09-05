#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const zod_1 = require("zod");
const simple_git_1 = __importDefault(require("simple-git"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// Validation schemas
const GetMarkdownFilesSchema = zod_1.z.object({
    repository_url: zod_1.z.string().optional().describe("Git repository URL (if not provided, uses default from config)"),
    branch: zod_1.z.string().optional().default("main"),
    path_filter: zod_1.z
        .string()
        .optional()
        .describe("Optional path pattern to filter files (e.g., 'docs/', '*.md')"),
    access_token: zod_1.z.string().optional().describe("Personal Access Token for private repositories"),
});
const GetFileContentSchema = zod_1.z.object({
    repository_url: zod_1.z.string().optional().describe("Git repository URL (if not provided, uses default from config)"),
    file_path: zod_1.z.string().min(1, "File path cannot be empty"),
    branch: zod_1.z.string().optional().default("main"),
    access_token: zod_1.z.string().optional().describe("Personal Access Token for private repositories"),
});
const SearchMarkdownSchema = zod_1.z.object({
    repository_url: zod_1.z.string().optional().describe("Git repository URL (if not provided, uses default from config)"),
    search_term: zod_1.z.string().min(1, "Search term cannot be empty"),
    branch: zod_1.z.string().optional().default("main"),
    case_sensitive: zod_1.z.boolean().optional().default(false),
    access_token: zod_1.z.string().optional().describe("Personal Access Token for private repositories"),
});
class ContextBankServer {
    constructor() {
        this.tempDirs = new Set();
        // Get default repository and access token from environment variables
        this.defaultRepository = process.env.MCP_DEFAULT_REPOSITORY || "git@github.com:ivanbaha/context-bank.git";
        this.defaultAccessToken = process.env.MCP_ACCESS_TOKEN;
        this.server = new index_js_1.Server({
            name: "context-bank-server",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
        // Cleanup temp directories on exit
        process.on("exit", () => this.cleanup());
        process.on("SIGINT", () => this.cleanup());
        process.on("SIGTERM", () => this.cleanup());
    }
    setupHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
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
                ],
            };
        });
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
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
            }
            catch (error) {
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
    async cloneRepository(url, branch, accessToken) {
        const tempDir = path.join(os.tmpdir(), `context-bank-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        this.tempDirs.add(tempDir);
        const git = (0, simple_git_1.default)();
        // If access token is provided and URL is HTTPS, inject the token
        let cloneUrl = url;
        if (accessToken && url.startsWith('https://')) {
            // Convert https://github.com/owner/repo.git to https://token@github.com/owner/repo.git
            cloneUrl = url.replace('https://', `https://${accessToken}@`);
        }
        await git.clone(cloneUrl, tempDir, ["--depth", "1", "--branch", branch]);
        return tempDir;
    }
    resolveRepository(providedUrl) {
        const url = providedUrl || this.defaultRepository;
        if (!url) {
            throw new Error("No repository URL provided and no default repository configured. Set MCP_DEFAULT_REPOSITORY environment variable or provide repository_url parameter.");
        }
        return url;
    }
    resolveAccessToken(providedToken) {
        return providedToken || this.defaultAccessToken;
    }
    async getMarkdownFiles(args) {
        const { repository_url, branch, path_filter, access_token } = GetMarkdownFilesSchema.parse(args);
        const repoUrl = this.resolveRepository(repository_url);
        const accessToken = this.resolveAccessToken(access_token);
        const repoDir = await this.cloneRepository(repoUrl, branch, accessToken);
        try {
            const markdownFiles = await this.findMarkdownFiles(repoDir, path_filter);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            repository: repoUrl,
                            branch,
                            files: markdownFiles,
                            total_files: markdownFiles.length,
                        }, null, 2),
                    },
                ],
            };
        }
        finally {
            await this.cleanupTempDir(repoDir);
        }
    }
    async getFileContent(args) {
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
            const content = await fs_1.promises.readFile(fullPath, "utf-8");
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            repository: repoUrl,
                            branch,
                            file_path,
                            content,
                            size: content.length,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            if (error instanceof Error && error.message.includes("ENOENT")) {
                throw new Error(`File not found: ${file_path}`);
            }
            throw error;
        }
        finally {
            await this.cleanupTempDir(repoDir);
        }
    }
    async searchMarkdownContent(args) {
        const { repository_url, search_term, branch, case_sensitive, access_token } = SearchMarkdownSchema.parse(args);
        const repoUrl = this.resolveRepository(repository_url);
        const accessToken = this.resolveAccessToken(access_token);
        const repoDir = await this.cloneRepository(repoUrl, branch, accessToken);
        try {
            const markdownFiles = await this.findMarkdownFiles(repoDir);
            const results = [];
            for (const filePath of markdownFiles) {
                const fullPath = path.join(repoDir, filePath);
                const content = await fs_1.promises.readFile(fullPath, "utf-8");
                const searchRegex = new RegExp(search_term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), case_sensitive ? "g" : "gi");
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
                        text: JSON.stringify({
                            repository: repoUrl,
                            branch,
                            search_term,
                            case_sensitive,
                            results,
                            total_files_with_matches: results.length,
                            total_matches: results.reduce((sum, file) => sum + file.total_matches, 0),
                        }, null, 2),
                    },
                ],
            };
        }
        finally {
            await this.cleanupTempDir(repoDir);
        }
    }
    async findMarkdownFiles(repoDir, pathFilter) {
        const files = [];
        const scanDirectory = async (dir, relativePath = "") => {
            const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith("."))
                    continue; // Skip hidden files/directories
                const entryPath = path.join(dir, entry.name);
                const relativeEntryPath = path.join(relativePath, entry.name);
                if (entry.isDirectory()) {
                    await scanDirectory(entryPath, relativeEntryPath);
                }
                else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
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
    matchesFilter(filePath, filter) {
        // Simple glob-like matching
        if (filter.endsWith("/")) {
            // Directory filter
            return filePath.startsWith(filter) || filePath.includes(`/${filter}`);
        }
        else if (filter.includes("*")) {
            // Wildcard filter
            const regexPattern = filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
            return new RegExp(`^${regexPattern}$`).test(filePath);
        }
        else {
            // Exact match or substring
            return filePath.includes(filter);
        }
    }
    async cleanupTempDir(tempDir) {
        try {
            await fs_1.promises.rm(tempDir, { recursive: true, force: true });
            this.tempDirs.delete(tempDir);
        }
        catch (error) {
            console.error(`Failed to cleanup temp directory ${tempDir}:`, error);
        }
    }
    cleanup() {
        for (const tempDir of this.tempDirs) {
            try {
                require("fs").rmSync(tempDir, { recursive: true, force: true });
            }
            catch (error) {
                console.error(`Failed to cleanup temp directory ${tempDir}:`, error);
            }
        }
        this.tempDirs.clear();
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
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
exports.default = ContextBankServer;
//# sourceMappingURL=index.js.map