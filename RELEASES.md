# Creating Releases for AI-Archive MCP Server

## Prerequisites

1. **Bun** installed for building binaries
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **GitHub CLI** installed for creating releases
   ```bash
   # macOS
   brew install gh
   
   # Linux
   sudo apt install gh  # or appropriate package manager
   
   # Windows
   winget install GitHub.cli
   ```

3. Authenticate with GitHub CLI:
   ```bash
   gh auth login
   ```

## Creating a New Release

### Option 1: Automated Release Script (Recommended)

```bash
cd mcp-server
npm run release
```

This script will:
1. Read the version from `package.json`
2. Build all binaries (Linux, macOS, Windows)
3. Create a GitHub release with the binaries
4. Generate release notes automatically

### Option 2: Manual Release

1. **Update version in package.json:**
   ```bash
   cd mcp-server
   npm version patch  # or minor, or major
   ```

2. **Build binaries:**
   ```bash
   npm run build:all
   ```

3. **Create release via GitHub CLI:**
   ```bash
   gh release create v0.1.8 \
     --title "AI-Archive MCP Server v0.1.8" \
     --notes "Release notes here..." \
     dist/ai-archive-mcp-linux-x64 \
     dist/ai-archive-mcp-macos-arm64 \
     dist/ai-archive-mcp-win-x64.exe
   ```

### Option 3: GitHub Actions (Automatic)

The workflow `.github/workflows/build-mcp-binaries.yml` automatically:
- Builds binaries when code changes in `mcp-server/`
- Uploads binaries as artifacts
- Attaches binaries to releases when you create one

To trigger a release:
```bash
# Create and push a tag
git tag v0.1.8
git push origin v0.1.8

# Or create release via GitHub UI
# The workflow will build and attach binaries automatically
```

## Release Checklist

- [ ] Update version in `mcp-server/package.json`
- [ ] Update CHANGELOG or release notes
- [ ] Test all binaries locally
- [ ] Commit and push changes
- [ ] Create release (automated or manual)
- [ ] Verify binaries are attached to release
- [ ] Test download links work
- [ ] Update documentation if needed

## Binary Sizes

Typical sizes:
- Linux: ~102 MB
- macOS: ~59 MB
- Windows: ~116 MB

These are standalone binaries with Bun runtime embedded.

## Accessing Releases from Private Repos

Even though the repo is private, releases can be accessed by:

1. **Authenticated users** with repo access via direct URLs
2. **GitHub CLI** with authentication
3. **Personal access tokens** in download URLs

Example authenticated download:
```bash
wget --header="Authorization: token YOUR_GITHUB_TOKEN" \
  https://github.com/Tomer-Barak/AI-arxiv/releases/download/v0.1.8/ai-archive-mcp-linux-x64
```

## Troubleshooting

**Build fails:**
- Ensure Bun is installed: `bun --version`
- Check Node.js dependencies: `npm install`
- Try building individually: `npm run build:linux`

**Release creation fails:**
- Authenticate GitHub CLI: `gh auth login`
- Check repository permissions
- Verify tag doesn't already exist

**Binary doesn't run:**
- Make executable: `chmod +x ai-archive-mcp-linux-x64`
- Check platform compatibility
- Verify environment variables (API_BASE_URL, API_KEY)
