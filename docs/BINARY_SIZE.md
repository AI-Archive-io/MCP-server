# Binary Size Optimization

## Overview

The standalone binaries built with `bun build --compile` are approximately **100-101 MB** in size. This document explains why, what has been attempted to reduce the size, and what alternatives exist.

## Why Are the Binaries So Large?

### Size Breakdown

- **Bun Runtime**: ~90-95 MB (90%)
- **Bundled Application Code**: ~0.6 MB (<1%)
- **Dependencies**: Bundled into the 0.6 MB
- **Overhead**: ~5-10 MB (10%)

The `bun build --compile` command creates a **standalone executable** by embedding:
1. The entire Bun JavaScript runtime (similar to embedding Node.js or Python)
2. Your bundled application code
3. All necessary dependencies

### Why Not Just Bundle the Code?

A standalone executable has significant advantages:
- ✅ **No runtime required** - works on machines without Bun or Node.js
- ✅ **Single file distribution** - easy to download and run
- ✅ **Consistent environment** - same runtime version everywhere
- ✅ **Better user experience** - simpler installation for non-developers

## What We've Tried

### 1. Removed Unused Dependencies ✅

Analysis with `depcheck` revealed unused dependencies:
- **Removed `zod`**: Was declared but unused (still installed as transitive dependency from `@modelcontextprotocol/sdk`)
- **Removed `@types/node`**: TypeScript types not needed for runtime

**Result**: Cleaner package.json, but no binary size reduction since zod is still needed by the MCP SDK

### 2. Build Optimizations ❌

We already use aggressive optimization flags:
```bash
bun build --compile --minify --production
```

These flags:
- `--minify`: Removes whitespace, shortens variable names
- `--production`: Optimizes for production (smaller bundle)
- Result: **Saves ~1.21 MB** on the bundle portion

### 3. Disable Autoload Features ❌

Tested disabling various runtime features:
```bash
--no-compile-autoload-dotenv
--no-compile-autoload-bunfig
--no-compile-autoload-tsconfig
--no-compile-autoload-package-json
```

**Result**: No meaningful size reduction (< 1 MB difference)

### 4. UPX Compression ❌

[UPX (Ultimate Packer for eXecutables)](https://upx.github.io/) can compress binaries significantly:
- UPX with `--best --lzma`: Compresses to **~26 MB** (75% reduction!)
- UPX with `-9`: Compresses to **~36 MB** (65% reduction)

**However**: UPX-compressed Bun executables **don't work**! The binary will show Bun's help message instead of running the bundled application. This is because Bun's self-extracting format conflicts with UPX's compression.

### 5. Tree-Shaking and External Dependencies ❌

Since all dependencies are needed and the bundle is already minified, there's minimal room for further reduction. The bundle itself is only 0.6 MB.

## Alternative Solutions

### Recommended: Use the NPM Package

If binary size is a concern, use the **NPM package** instead:

```bash
npm install -g ai-archive-mcp
```

**Benefits**:
- **Tiny download**: ~1 MB package size
- **Shared runtime**: Uses system's Node.js/Bun installation
- **Faster updates**: Download only code changes, not the runtime

**Requirements**:
- Node.js ≥18.0.0 or Bun ≥1.0.0 must be installed

### For Bundle-Only Deployment

If you have Bun available but want a smaller artifact:

```bash
# Build bundle without embedding runtime
bun build src/server-static.js --minify --production --outfile dist/bundle.js --target=bun

# Run with
bun dist/bundle.js
```

**Size**: ~0.6 MB (99% smaller!)

## Comparison Table

| Distribution Method | Size | Runtime Required | Best For |
|---|---|---|---|
| **Standalone Binary** | 101 MB | ❌ None | End users, Claude Desktop without Node.js |
| **NPM Package** | 1 MB | ✅ Node ≥18 | Developers, users with Node.js |
| **Bundle Only** | 0.6 MB | ✅ Bun ≥1.0 | Bun users, minimal size deployments |

## Future Possibilities

### Bun Improvements

The Bun team is actively working on reducing compilation size:
- Runtime modularization (only include used features)
- Better compression methods
- Shared runtime installations

Track progress: [Bun GitHub Issues](https://github.com/oven-sh/bun/issues)

### Alternative Runtimes

We could explore other bundlers for smaller binaries:
- **pkg** (Node.js): Similar size issues (~40-60 MB)
- **Deno compile**: Similar size issues (~90-120 MB)
- **esbuild + Node SEA**: Experimental, potentially smaller

However, all of these include the runtime, leading to similar sizes.

## Conclusion

**The 100MB binary size is unavoidable** when creating standalone executables with Bun. This is a trade-off:
- **Choose standalone binary**: For maximum compatibility and ease of use (no runtime needed)
- **Choose NPM package**: For minimal size when Node.js/Bun is available

For most use cases, the 100MB size is acceptable for a one-time download. Modern internet connections can download 100MB in seconds, and the convenience of a standalone executable outweighs the size cost.

## References

- [Bun Bundler Documentation](https://bun.sh/docs/bundler)
- [Bun Standalone Executables](https://bun.sh/docs/bundler/executables)
- [UPX Compression Tool](https://upx.github.io/)
