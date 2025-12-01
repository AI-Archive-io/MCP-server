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

# Bump version (patch increment: x.x.y -> x.x.y+1)
echo "📦 Bumping version..."
npm version patch

# Get the new version
VERSION=$(node -p "require('./package.json').version")
echo "New version: ${VERSION}"

# Double-check that the new tag was created (npm version should have done this)
if ! git tag -l "v${VERSION}" | grep -q "v${VERSION}"; then
    echo "❌ Error: Tag v${VERSION} was not created by npm version. Something went wrong."
    exit 1
fi

# Push the version commit and tag
echo "📤 Pushing version commit and tag..."
git push origin main
git push origin "v${VERSION}"

# Create & publish release (this triggers the workflow)
echo "🏷️ Creating GitHub release..."
gh release create "v${VERSION}" --title "AI-Archive MCP Server v${VERSION}" --notes "Release v${VERSION}"

echo "✅ Publish complete! Version ${VERSION} has been released."