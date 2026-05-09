#!/usr/bin/env python3
"""Resize 4096x4096 character sprites to 1024x1024 for web use."""
import pathlib
from PIL import Image

TARGET = 1024
SRC = pathlib.Path("/root/workspace/llm_game/frontend/public/images/characters/lize")

before_total = after_total = 0
for f in sorted(SRC.glob("*.png")):
    before = f.stat().st_size
    img = Image.open(f).convert("RGBA")
    if max(img.size) > TARGET:
        img = img.resize((TARGET, TARGET), Image.LANCZOS)
    img.save(f, optimize=True)
    after = f.stat().st_size
    before_total += before
    after_total += after
    print(f"  {f.name}: {before//1024}KB → {after//1024}KB")

print(f"\nTotal: {before_total//1024//1024}MB → {after_total//1024//1024}MB")
