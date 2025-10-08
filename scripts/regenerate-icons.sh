#!/bin/bash
# Icon regeneration script
# Regenerates all icon files from the source SVG using rsvg-convert

set -e

ICONS_DIR="assets/icons"
SVG_SOURCE="$ICONS_DIR/icon.svg"

# Check if rsvg-convert is installed
if ! command -v rsvg-convert &> /dev/null; then
  echo "❌ rsvg-convert not found!"
  echo ""
  echo "Install it with:"
  echo "  macOS:  brew install librsvg"
  echo "  Linux:  sudo apt-get install librsvg2-bin"
  exit 1
fi

# Check if source SVG exists
if [ ! -f "$SVG_SOURCE" ]; then
  echo "❌ Source SVG not found: $SVG_SOURCE"
  exit 1
fi

echo "🎨 Regenerating icons from $SVG_SOURCE..."
echo ""

# Generate PNG files at all required sizes
sizes=(1024 512 256 128 64 48 32 16)
for size in "${sizes[@]}"; do
  output="$ICONS_DIR/icon_${size}.png"
  echo "  Generating ${size}x${size}px → $output"
  rsvg-convert -w "$size" -h "$size" "$SVG_SOURCE" -o "$output"
done

echo ""
echo "📦 Creating macOS .icns file..."

# Create iconset directory structure
iconset="$ICONS_DIR/icon.iconset"
mkdir -p "$iconset"

# Copy PNGs with proper naming for iconset
cp "$ICONS_DIR/icon_16.png" "$iconset/icon_16x16.png"
cp "$ICONS_DIR/icon_32.png" "$iconset/icon_16x16@2x.png"
cp "$ICONS_DIR/icon_32.png" "$iconset/icon_32x32.png"
cp "$ICONS_DIR/icon_64.png" "$iconset/icon_32x32@2x.png"
cp "$ICONS_DIR/icon_128.png" "$iconset/icon_128x128.png"
cp "$ICONS_DIR/icon_256.png" "$iconset/icon_128x128@2x.png"
cp "$ICONS_DIR/icon_256.png" "$iconset/icon_256x256.png"
cp "$ICONS_DIR/icon_512.png" "$iconset/icon_256x256@2x.png"
cp "$ICONS_DIR/icon_512.png" "$iconset/icon_512x512.png"
cp "$ICONS_DIR/icon_1024.png" "$iconset/icon_512x512@2x.png"

# Generate .icns file using iconutil (macOS only)
if command -v iconutil &> /dev/null; then
  iconutil -c icns "$iconset" -o "$ICONS_DIR/icon.icns"
  echo "  ✓ Created icon.icns"
else
  echo "  ⚠ iconutil not found (macOS only) - skipping .icns generation"
fi

# Clean up iconset directory
rm -rf "$iconset"

echo ""
echo "🪟 Creating Windows .ico file..."

# Check if ImageMagick is installed
if command -v magick &> /dev/null; then
  magick "$ICONS_DIR/icon_256.png" \
         "$ICONS_DIR/icon_128.png" \
         "$ICONS_DIR/icon_64.png" \
         "$ICONS_DIR/icon_48.png" \
         "$ICONS_DIR/icon_32.png" \
         "$ICONS_DIR/icon_16.png" \
         "$ICONS_DIR/icon.ico"
  echo "  ✓ Created icon.ico"
else
  echo "  ⚠ ImageMagick not found - skipping .ico generation"
  echo "    Install with: brew install imagemagick"
fi

echo ""
echo "🐧 Creating Linux icon.png..."
cp "$ICONS_DIR/icon_512.png" "$ICONS_DIR/icon.png"
echo "  ✓ Created icon.png (512x512)"

echo ""
echo "✅ Icon regeneration complete!"
echo ""
echo "Generated files:"
ls -lh "$ICONS_DIR"/*.{icns,ico,png,svg} 2>/dev/null || ls -lh "$ICONS_DIR"/icon.*
