VERSION=$(node -p "require('./package.json').version")
git tag -a "v${VERSION}" -m "v${VERSION}"
git push origin "v${VERSION}"
# create & publish release (this triggers the workflow)
gh release create "v${VERSION}" --title "AI-Archive MCP Server v${VERSION}" --notes "Release v${VERSION}"