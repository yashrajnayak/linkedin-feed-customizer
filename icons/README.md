# Extension Icons

This directory should contain the extension icons in PNG format:

- `icon-16.png` - 16x16 pixels (for toolbar dropdown menu)
- `icon-32.png` - 32x32 pixels (for Chrome menu)
- `icon-48.png` - 48x48 pixels (for extension management page)
- `icon-128.png` - 128x128 pixels (for Chrome Web Store)

## Creating Icons

### Option 1: Using Figma (Recommended)
1. Go to [Figma.com](https://figma.com)
2. Create a new file
3. Design your icon (suggest: LinkedIn blue with a filter/eye icon)
4. Export as PNG at each size

### Option 2: Using Canva
1. Go to [Canva.com](https://canva.com)
2. Create custom size designs: 128x128, 48x48, 32x32, 16x16
3. Download as PNG

### Option 3: Using GIMP
1. Install [GIMP](https://www.gimp.org/)
2. Create a 128x128 image
3. Design your icon
4. Scale down and export for each size

### Icon Design Suggestions
- Use LinkedIn's blue color: `#0a66c2`
- Incorporate filtering/hiding concept (eye with slash, filter icon)
- Keep it simple and recognizable at small sizes
- Ensure good contrast for visibility

## Icon Specifications

| Size | Usage | Notes |
|------|-------|-------|
| 128x128 | Store listing | High quality, main icon |
| 48x48 | Extension management page | Used on chrome://extensions/ |
| 32x32 | Chrome menu | Context menu display |
| 16x16 | Toolbar | May be too small for detail |

## Placeholder
Until you create the actual icons, you can:
1. Use simple colored squares
2. Find free icons on [Noun Project](https://thenounproject.com)
3. Use Material Design icons
4. Create simple SVG icons and convert to PNG

## Example: Quick SVG Icon

Create a simple SVG and convert to PNG:
```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#0a66c2" rx="16"/>
  <text x="64" y="75" font-size="60" font-weight="bold" 
        fill="white" text-anchor="middle">L</text>
</svg>
```

## Converting SVG to PNG
- Use [CloudConvert](https://cloudconvert.com)
- Use [Convertio](https://convertio.co)
- Use command line: `convert icon.svg icon.png`

## Notes
- All icons must be PNG format (as specified in manifest.json)
- Transparent backgrounds recommended
- Ensure proper aspect ratio (1:1 square)
- Test icon display in multiple Chrome themes
