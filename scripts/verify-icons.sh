#!/bin/bash
# Icon verification script
# Checks that all required icon files exist before packaging

set -e

ICONS_DIR="assets/icons"
REQUIRED_ICONS=(
  "$ICONS_DIR/icon.icns"
  "$ICONS_DIR/icon.ico"
  "$ICONS_DIR/icon.png"
  "$ICONS_DIR/icon.svg"
)

echo "🔍 Verifying icon files..."

missing_icons=0
for icon in "${REQUIRED_ICONS[@]}"; do
  if [ -f "$icon" ]; then
    size=$(ls -lh "$icon" | awk '{print $5}')
    echo "  ✓ $icon ($size)"
  else
    echo "  ✗ $icon (missing)"
    missing_icons=$((missing_icons + 1))
  fi
done

if [ $missing_icons -gt 0 ]; then
  echo ""
  echo "❌ $missing_icons icon file(s) missing!"
  echo ""
  echo "To regenerate icons from SVG, run:"
  echo "  bun run regenerate-icons"
  exit 1
fi

echo ""
echo "✅ All icon files present"
exit 0
