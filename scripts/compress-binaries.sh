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

