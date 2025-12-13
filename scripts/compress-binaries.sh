#!/usr/bin/env bash

set -euo pipefail

# Script to compress binaries using UPX to reduce size
# 
# ⚠️  WARNING: UPX compression breaks Bun executables!
# Bun's self-extracting executable format is incompatible with UPX compression.
# When UPX-compressed, the binary will show Bun help instead of running the bundled code.
# 
# This script is kept for reference but should NOT be used for Bun binaries.
# Alternative approaches to reduce binary size:
# 1. Use NPM package distribution (only ~1MB)
# 2. Use non-compiled bundle (requires Bun/Node runtime)
# 3. Wait for Bun to improve compilation size

echo "⚠️  WARNING: UPX compression is incompatible with Bun executables"
echo "❌ Skipping compression - would break binary functionality"
echo ""
echo "The 100MB size is due to the embedded Bun runtime (~90MB)"
echo "For smaller deployment, use the NPM package instead"
exit 0

# Check if UPX is available
if ! command -v upx &> /dev/null; then
    echo "❌ UPX not found. Please install UPX:"
    echo "   - Linux: apt-get install upx-ucl or yum install upx"
    echo "   - macOS: brew install upx"
    echo "   - Windows: Download from https://upx.github.io/"
    exit 1
fi

# Function to compress a binary
compress_binary() {
    local binary_path="$1"
    
    if [ ! -f "$binary_path" ]; then
        echo "⚠️  Binary not found: $binary_path (skipping)"
        return
    fi
    
    local original_size=$(stat -f%z "$binary_path" 2>/dev/null || stat -c%s "$binary_path")
    echo "📦 Compressing: $binary_path ($(numfmt --to=iec-i --suffix=B $original_size 2>/dev/null || echo "$original_size bytes"))"
    
    # Use --best for maximum compression with LZMA
    # --lzma provides better compression than default
    upx --best --lzma "$binary_path" 2>&1 | grep -E "^(Packed|.*->)" || true
    
    local new_size=$(stat -f%z "$binary_path" 2>/dev/null || stat -c%s "$binary_path")
    local reduction=$(awk "BEGIN {printf \"%.1f\", (1 - $new_size / $original_size) * 100}")
    
    echo "✅ Compressed: $(numfmt --to=iec-i --suffix=B $new_size 2>/dev/null || echo "$new_size bytes") (${reduction}% reduction)"
    echo ""
}

# Compress all binaries in dist/
for binary in dist/ai-archive-mcp-*; do
    if [ -f "$binary" ]; then
        compress_binary "$binary"
    fi
done

echo "🎉 All binaries compressed!"
echo ""
echo "Final sizes:"
ls -lh dist/ai-archive-mcp-* 2>/dev/null || true
