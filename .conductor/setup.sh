#!/bin/bash
set -e

echo "🎯 Setting up Tapestry development environment..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun found: $(bun --version)"

# Install dependencies
echo "📦 Installing dependencies..."
if ! bun install; then
    echo "❌ Dependencies installation failed"
    exit 1
fi

echo "✅ Setup complete!"
echo ""
echo "🚀 Available commands:"
echo "   bun start          - Start development server"
echo "   bun test           - Run tests"
echo "   bun test:ui        - Run tests with UI"
echo "   bun test:coverage  - Run tests with coverage"
echo "   bun run lint       - Lint code"
echo "   bun package        - Package application"
echo "   bun make           - Create distributable installers"
echo "   bun publish        - Publish application"
