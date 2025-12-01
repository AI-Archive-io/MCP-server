#!/bin/bash

set -e  # Exit on any error

# Check if git working directory is clean
if ! git diff --quiet || ! git diff --staged --quiet; then
    echo "❌ Error: Git working directory is not clean. Please commit or stash your changes first."
    exit 1
fi

# Get current version before bumping
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo "🚀 Starting publish process..."
echo "Current version: ${CURRENT_VERSION}"

# Bump version in main package (patch increment: x.x.y -> x.x.y+1)
echo "📦 Bumping main package version..."
npm version patch --no-git-tag-version

# Get the new version
VERSION=$(node -p "require('./package.json').version")
echo "New version: ${VERSION}"

# Sync version to VS Code extension package.json
echo "🔄 Syncing version to VS Code extension..."
cd vscode-extension
npm version "${VERSION}" --no-git-tag-version --allow-same-version
cd ..

# Commit both package.json files
echo "📝 Committing version changes..."
git add package.json package-lock.json vscode-extension/package.json vscode-extension/package-lock.json
git commit -m "v${VERSION}"

# Create and push tag
echo "🏷️ Creating tag v${VERSION}..."
git tag -a "v${VERSION}" -m "v${VERSION}"

# Push the version commit and tag
echo "📤 Pushing version commit and tag..."
git push origin main
git push origin "v${VERSION}"

# Create & publish release (this triggers the workflow)
echo "🏷️ Creating GitHub release..."
gh release create "v${VERSION}" --title "AI-Archive MCP Server v${VERSION}" --notes "Release v${VERSION}"

echo "✅ Publish complete! Version ${VERSION} has been released."