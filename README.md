# MCP Context Bank Server

A Model Context Protocol (MCP) server that provides AI agents with tools to fetch markdown context files from remote Git repositories. This server enables AI assistants like GitHub Copilot to access and search through documentation, notes, and other markdown content stored in Git repositories.

## Features

- **Repository Access**: Clone and access any public Git repository (supports both HTTPS and SSH URLs)
- **Markdown File Discovery**: Automatically find and list all markdown files in a repository
- **File Content Retrieval**: Get the content of specific markdown files
- **Content Search**: Search for specific terms within markdown files across the repository
- **Branch Support**: Work with any branch in the repository
- **Path Filtering**: Filter files by path patterns (e.g., only files in `docs/` directory)
- **Security**: Built-in protection against path traversal attacks
- **Cleanup**: Automatic cleanup of temporary cloned repositories

## Installation

### From NPM (Recommended)

```bash
npm install -g mcp-context-bank-server
```

### From Source

```bash
git clone <this-repository>
cd mcp-context-bank-server
yarn install
yarn build
```

## Usage

### Environment Configuration

The server supports configurable repositories and authentication through environment variables:

```bash
# Set required environment variables
export MCP_CONTEXT_BANK_REPOSITORY="https://github.com/your-org/your-context-repo.git"
export MCP_CONTEXT_BANK_REPOSITORY_PAT="ghp_your_github_personal_access_token"
```

If no default repository is configured, you must provide `repository_url` in each tool call.

### VS Code with GitHub Copilot

#### 1. Install the MCP Server

```bash
npm install -g mcp-context-bank-server
```

#### 2. Configure VS Code Settings

Add the MCP server to your VS Code settings. Open VS Code settings (JSON) and add:

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": {
        "context-bank": {
          "command": "mcp-context-bank-server",
          "env": {
            "MCP_CONTEXT_BANK_REPOSITORY": "https://github.com/your-org/your-docs.git",
            "MCP_CONTEXT_BANK_REPOSITORY_PAT": "ghp_your_token_here"
          }
        }
      }
    }
  }
}
```

#### 3. Using with Copilot Chat

Once configured, you can ask GitHub Copilot to use the context from your repository:

```
@workspace Can you help me understand the API documentation? Please check the context repository for the latest API specs.
```

Copilot will automatically use the MCP server to fetch relevant markdown files from your configured repository.

### VS Code with Amazon Q Developer

#### 1. Install the MCP Server

```bash
npm install -g mcp-context-bank-server
```

#### 2. Configure Amazon Q

Create or update your MCP configuration file (typically `~/.config/amazon-q/mcp-servers.json`):

```json
{
  "servers": {
    "context-bank": {
      "command": "mcp-context-bank-server",
      "env": {
        "MCP_CONTEXT_BANK_REPOSITORY": "https://github.com/your-org/your-context.git",
        "MCP_CONTEXT_BANK_REPOSITORY_PAT": "ghp_your_github_token"
      }
    }
  }
}
```

#### 3. Using with Amazon Q

Ask Amazon Q to access your context repository:

```
Can you search our documentation repository for information about deployment procedures?
```

### Claude Desktop Configuration

For Claude Desktop, add to your configuration file:

```json
{
  "mcpServers": {
    "context-bank": {
      "command": "mcp-context-bank-server",
      "env": {
        "MCP_CONTEXT_BANK_REPOSITORY": "git@github.com:your-org/context-bank.git",
        "MCP_CONTEXT_BANK_REPOSITORY_PAT": "your_token_if_needed"
      }
    }
  }
}
```

### Authentication for Private Repositories

#### GitHub Personal Access Token (PAT)

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope for private repositories
3. Set the token as an environment variable or pass it in tool calls:

**Option 1: Environment Variable (Recommended)**

```bash
export MCP_CONTEXT_BANK_REPOSITORY_PAT="ghp_your_token_here"
```

**Option 2: Per-request Token**

```json
{
  "name": "get_markdown_files",
  "arguments": {
    "repository_url": "https://github.com/your-org/private-repo.git",
  "access_token": "ghp_your_token_here" # (parameter name remains for API, but ENV is MCP_CONTEXT_BANK_REPOSITORY_PAT)
  }
}
```

#### SSH Keys

For SSH URLs (git@github.com:...), ensure your SSH keys are properly configured:

```bash
# Test SSH access
ssh -T git@github.com

# If needed, add your key to ssh-agent
ssh-add ~/.ssh/id_rsa
```

### Repository Configuration Examples

#### Public Repository

```json
{
  "repository_url": "https://github.com/microsoft/vscode.git",
  "branch": "main"
}
```

#### Private Repository with HTTPS + PAT

```json
{
  "repository_url": "https://github.com/your-org/private-docs.git",
  "access_token": "ghp_your_token", # (parameter name remains for API, but ENV is MCP_CONTEXT_BANK_REPOSITORY_PAT)
  "branch": "main"
}
```

#### Private Repository with SSH

```json
{
  "repository_url": "git@github.com:your-org/private-docs.git",
  "branch": "develop"
}
```

### As an MCP Server

The server communicates via stdio and provides three main tools:

1. **get_markdown_files** - List all markdown files in a repository
2. **get_file_content** - Get content of a specific file
3. **search_markdown_content** - Search for text within markdown files

### Development

```bash
# Install dependencies
yarn install

# Run in development mode
yarn dev

# Build for production
yarn build

# Start built version
yarn start
```

## Tools Documentation

### get_markdown_files

Lists all markdown files in the specified Git repository.

**Parameters:**

- `repository_url` (optional): Git repository URL (uses default if not provided)
- `branch` (optional): Git branch to fetch from (default: "main")
- `path_filter` (optional): Path pattern to filter files (e.g., "docs/", "\*.md")
- `access_token` (optional): Personal Access Token for private repositories (if not provided, uses MCP_CONTEXT_BANK_REPOSITORY_PAT env)

**Example Response:**

```json
{
  "repository": "https://github.com/your-org/context-repo.git",
  "branch": "main",
  "files": ["README.md", "docs/api.md", "docs/guide.md"],
  "total_files": 3
}
```

### get_file_content

Retrieves the content of a specific markdown file from the repository.

**Parameters:**

- `repository_url` (optional): Git repository URL (uses default if not provided)
- `file_path` (required): Path to the file within the repository
- `branch` (optional): Git branch to fetch from (default: "main")
- `access_token` (optional): Personal Access Token for private repositories (if not provided, uses MCP_CONTEXT_BANK_REPOSITORY_PAT env)

**Example Response:**

```json
{
  "repository": "https://github.com/your-org/context-repo.git",
  "branch": "main",
  "file_path": "docs/api.md",
  "content": "# API Documentation\n\nThis is the API documentation...",
  "size": 1234
}
```

### search_markdown_content

Searches for specific content within markdown files in the repository.

**Parameters:**

- `repository_url` (optional): Git repository URL (uses default if not provided)
- `search_term` (required): Text to search for
- `branch` (optional): Git branch to fetch from (default: "main")
- `case_sensitive` (optional): Whether search should be case sensitive (default: false)
- `access_token` (optional): Personal Access Token for private repositories

**How it works:**

- For GitHub repositories with a valid access token, uses the GitHub Code Search API for remote search (no clone required).
- For other repositories, falls back to local search after cloning.

**Example Response (GitHub API):**

```json
{
  "repository": "https://github.com/your-org/context-repo.git",
  "branch": "main",
  "search_term": "API",
  "case_sensitive": false,
  "results": [
    {
      "file_path": "docs/api.md",
      "url": "https://github.com/your-org/context-repo/blob/main/docs/api.md"
    }
  ],
  "total_files_with_matches": 1,
  "total_matches": 1
}
```

**Example Response (local search):**

```json
{
  "repository": "https://github.com/your-org/context-repo.git",
  "branch": "main",
  "search_term": "API",
  "case_sensitive": false,
  "results": [
    {
      "file_path": "docs/api.md",
      "matches": [
        {
          "line_number": 1,
          "line_content": "# API Documentation"
        }
      ],
      "total_matches": 1
    }
  ],
  "total_files_with_matches": 1,
  "total_matches": 1
}
```

## Repository Requirements

The server can work with any Git repository that contains markdown files. The repository can be configured in multiple ways:

### Default Repository Configuration

Set a default repository using environment variables:

```bash
export MCP_CONTEXT_BANK_REPOSITORY="https://github.com/your-org/your-context-repo.git"
export MCP_ACCESS_TOKEN="ghp_your_token_if_private"
```

### Repository Access Methods

- **Public repositories**: Work with both HTTPS and SSH URLs without authentication
- **Private repositories with HTTPS**: Use Personal Access Token (PAT) authentication
- **Private repositories with SSH**: Use SSH key authentication
- **Per-request repositories**: Override default by providing `repository_url` in each tool call

### Supported Repository Types

- GitHub (public and private)
- GitLab (public and private)
- Bitbucket (public and private)
- Any Git repository accessible via HTTPS or SSH

### Branch Support

- **Default branch**: Uses "main" by default but can work with any branch
- **Branch specification**: Override default by providing `branch` parameter
- **Multiple branches**: Each tool call can target a different branch

## Authentication Methods

### Personal Access Token (PAT)

For private repositories, create a PAT with appropriate permissions:

1. **GitHub**: Settings → Developer settings → Personal access tokens → Generate new token

   - Required scopes: `repo` (for private repos) or `public_repo` (for public repos)

2. **GitLab**: User Settings → Access Tokens → Add a personal access token

   - Required scopes: `read_repository`

3. **Bitbucket**: Personal Bitbucket settings → App passwords → Create app password
   - Required permissions: `Repositories: Read`

### SSH Key Authentication

For SSH URLs, ensure proper SSH key setup:

```bash
# Test SSH access to GitHub
ssh -T git@github.com

# Add SSH key to agent if needed
ssh-add ~/.ssh/id_rsa
```

## Security Considerations

- **Path Traversal Protection**: The server prevents access to files outside the repository directory
- **Temporary Files**: All cloned repositories are stored in temporary directories and cleaned up automatically
- **Input Validation**: All inputs are validated using Zod schemas
- **Branch Isolation**: Each operation clones only the specific branch with depth 1 for efficiency

## Error Handling

The server provides detailed error messages for common issues:

- Invalid repository URLs
- Non-existent files or branches
- Network connectivity issues
- Permission problems

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please use the GitHub issue tracker.
