#!/bin/bash
set -e

echo "🚀 Starting Tapestry workspace setup..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Error: bun is not installed."
    echo "Please install bun first: https://bun.sh"
    exit 1
fi

echo "✓ bun is installed ($(bun --version))"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Verify critical files exist
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    exit 1
fi

if [ ! -d "src" ]; then
    echo "❌ Error: src directory not found"
    exit 1
fi

echo "✓ Dependencies installed successfully"
echo "✓ Workspace setup complete!"
echo ""
echo "You can now run 'bun start' to launch the development server."
