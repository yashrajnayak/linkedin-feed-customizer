#!/usr/bin/env python3
"""
Generate LinkedIn Feed Customizer extension icons
This script creates icons in 4 different sizes with a LinkedIn-themed design
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    """Create an icon of specified size"""
    # LinkedIn blue color
    linkedin_blue = '#0a66c2'
    dark_blue = '#004182'
    white = '#ffffff'
    
    # Create image with gradient-like background
    img = Image.new('RGBA', (size, size), linkedin_blue)
    draw = ImageDraw.Draw(img)
    
    # Draw a darker bottom half for depth
    gradient_height = size // 2
    for y in range(gradient_height, size):
        # Blend from linkedin_blue to dark_blue
        ratio = (y - gradient_height) / gradient_height
        r = int(10 + (0 - 10) * ratio)
        g = int(102 + (65 - 102) * ratio)
        b = int(194 + (130 - 194) * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    
    # Draw eye icon (representing "hide/filter")
    if size >= 32:
        # Eye circle
        margin = size // 6
        eye_y = size // 2
        eye_radius = size // 5
        
        # Draw eye white
        draw.ellipse(
            [(margin, eye_y - eye_radius), 
             (margin + eye_radius * 2, eye_y + eye_radius)],
            fill=white,
            outline=white
        )
        
        # Draw pupil
        pupil_radius = eye_radius // 3
        draw.ellipse(
            [(margin + eye_radius - pupil_radius, eye_y - pupil_radius),
             (margin + eye_radius + pupil_radius, eye_y + pupil_radius)],
            fill=dark_blue,
            outline=dark_blue
        )
        
        # Draw slash line (filter symbol)
        line_start_x = margin + eye_radius * 2 + size // 12
        line_start_y = size // 4
        line_end_x = size - margin
        line_end_y = size - size // 4
        
        draw.line(
            [(line_start_x, line_start_y), (line_end_x, line_end_y)],
            fill=white,
            width=max(2, size // 16)
        )
    else:
        # For small icon (16x16), just use a simple design
        # Draw a small circle
        margin = size // 4
        draw.ellipse(
            [(margin, margin), (size - margin, size - margin)],
            fill=white,
            outline=white
        )
    
    return img

def main():
    """Generate all required icons"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')
    
    # Create icons directory if it doesn't exist
    os.makedirs(icons_dir, exist_ok=True)
    
    sizes = [16, 32, 48, 128]
    
    print("Generating LinkedIn Feed Customizer icons...")
    print(f"Icons directory: {icons_dir}")
    print()
    
    for size in sizes:
        filename = f'icon-{size}.png'
        filepath = os.path.join(icons_dir, filename)
        
        try:
            img = create_icon(size)
            img.save(filepath, 'PNG')
            print(f"✓ Created {filename} ({size}x{size}px)")
        except Exception as e:
            print(f"✗ Failed to create {filename}: {e}")
    
    print()
    print("All icons created successfully!")
    print("You can now load the extension in Chrome")

if __name__ == '__main__':
    main()
