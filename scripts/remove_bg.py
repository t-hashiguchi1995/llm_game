#!/usr/bin/env python3
"""Remove white background from character sprite PNGs using flood-fill from edges."""
import sys
from pathlib import Path
from PIL import Image


def remove_white_bg(input_path: Path, output_path: Path, threshold: int = 240) -> None:
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()

    # Flood-fill from all 4 edges to mark background pixels
    visited = [[False] * h for _ in range(w)]
    stack = []

    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    def is_white(r, g, b, a):
        return a > 200 and r >= threshold and g >= threshold and b >= threshold

    while stack:
        x, y = stack.pop()
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        if visited[x][y]:
            continue
        visited[x][y] = True
        r, g, b, a = pixels[x, y]
        if not is_white(r, g, b, a):
            continue
        pixels[x, y] = (r, g, b, 0)
        stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    img.save(output_path)


def main():
    src_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        "/root/workspace/llm_game/frontend/public/images/characters/lize"
    )
    count = 0
    for png in sorted(src_dir.glob("*.png")):
        remove_white_bg(png, png)
        print(f"  ✓ {png.name}")
        count += 1
    print(f"\n{count} files processed.")


if __name__ == "__main__":
    main()
