#!/usr/bin/env python3
"""
Generate crisp, high-resolution multi-size reverse Vercel favicons.
Geometry: Crisp white circle with an obsidian-black downward equilateral triangle (▼)
centered at its geometric centroid.
"""

from PIL import Image, ImageDraw
import os

def render_logo(size: int) -> Image.Image:
    # Use 4x supersampling for ultra-crisp anti-aliasing
    scale = 4
    canvas_size = size * scale
    
    # Transparent RGBA image
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # White circle with 2% margin
    margin = canvas_size * 0.02
    draw.ellipse(
        [margin, margin, canvas_size - margin, canvas_size - margin],
        fill=(255, 255, 255, 255)
    )
    
    # Centroid at center (cx, cy)
    cx, cy = canvas_size / 2.0, canvas_size / 2.0
    
    # Height of equilateral triangle (48% of diameter)
    h = canvas_size * 0.48
    s = (2.0 / (3.0 ** 0.5)) * h
    
    # Inverted triangle pointing down:
    # Centroid is at 1/3 from top base, 2/3 from bottom apex
    top_y = cy - (h / 3.0)
    bottom_y = cy + (2.0 * h / 3.0)
    left_x = cx - (s / 2.0)
    right_x = cx + (s / 2.0)
    
    triangle = [
        (left_x, top_y),
        (right_x, top_y),
        (cx, bottom_y)
    ]
    
    # Obsidian black fill
    draw.polygon(triangle, fill=(8, 8, 10, 255))
    
    # Downsample using high-quality Lanczos resampling
    return img.resize((size, size), Image.Resampling.LANCZOS)

def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_dir = os.path.join(repo_root, "src", "app")
    public_dir = os.path.join(repo_root, "public")
    
    os.makedirs(app_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)
    
    # 1. Multi-resolution ICO (16x16, 32x32, 48x48)
    icon_16 = render_logo(16)
    icon_32 = render_logo(32)
    icon_48 = render_logo(48)
    
    app_ico = os.path.join(app_dir, "favicon.ico")
    pub_ico = os.path.join(public_dir, "favicon.ico")
    
    icon_32.save(
        app_ico,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[icon_16, icon_48]
    )
    icon_32.save(
        pub_ico,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[icon_16, icon_48]
    )
    print(f"Generated multi-resolution ICO: {app_ico} and {pub_ico}")
    
    # 2. Apple Touch Icon (180x180)
    apple_icon = render_logo(180)
    apple_path = os.path.join(app_dir, "apple-icon.png")
    pub_apple_path = os.path.join(public_dir, "apple-touch-icon.png")
    apple_icon.save(apple_path, format="PNG")
    apple_icon.save(pub_apple_path, format="PNG")
    print(f"Generated Apple Touch Icon: {apple_path} and {pub_apple_path}")
    
    # 3. High-res Web App Icon (512x512)
    icon_512 = render_logo(512)
    icon_512_app = os.path.join(app_dir, "icon.png")
    icon_512_pub = os.path.join(public_dir, "icon.png")
    icon_512.save(icon_512_app, format="PNG")
    icon_512.save(icon_512_pub, format="PNG")
    print(f"Generated 512x512 icon: {icon_512_app} and {icon_512_pub}")

if __name__ == "__main__":
    main()
