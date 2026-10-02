"""Regenerate synthetic PNGs with Pillow and Liberation Sans Bold (no app code)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

font = ImageFont.truetype("/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf", 44)
colors = {"g": "#6aaa64", "y": "#c9b458", "x": "#787c7e"}
def fixture(name, rows):
    image = Image.new("RGB", (380, 30 + len(rows) * 70), "white")
    draw = ImageDraw.Draw(image)
    for r, (word, feedback) in enumerate(rows):
        for c, (letter, color) in enumerate(zip(word, feedback)):
            x, y = 20 + c * 70, 15 + r * 70
            draw.rectangle((x, y, x + 61, y + 61), fill=colors[color])
            draw.text((x + 31, y + 31), letter, font=font, anchor="mm", fill="white")
    image.save(Path(__file__).with_name(name))
fixture("guesses.png", [("CRANE", "xyxxy"), ("BEEFY", "ggxxg"), ("BERRY", "ggggg")])
fixture("duplicate-cap.png", [("RANTS", "yxxxx"), ("BEEFY", "ggxxg"), ("BERRY", "ggggg")])
