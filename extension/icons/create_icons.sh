#!/bin/bash
# Simple icon creation using ImageMagick (if available)

if command -v convert &> /dev/null; then
    echo "Creating icons with ImageMagick..."
    convert -size 128x128 xc:none -fill "#667eea" -draw "circle 64,64 64,10" \
            -fill white -draw "rectangle 40,35 88,93" \
            -fill none -stroke white -strokewidth 3 -draw "line 64,35 64,93" \
            icon128.png
    convert icon128.png -resize 48x48 icon48.png
    convert icon128.png -resize 16x16 icon16.png
    echo "✅ Icons created successfully!"
else
    echo "⚠️  ImageMagick not found. Please create icons manually."
    echo "Creating placeholder files..."
    touch icon16.png icon48.png icon128.png
fi
