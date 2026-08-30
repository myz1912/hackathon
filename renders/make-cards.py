"""Caption cards for the LinkedIn cut. ffmpeg here lacks drawtext, so text is
rendered with Pillow and composited as RGBA overlays."""
from PIL import Image, ImageDraw, ImageFont
W, H = 1080, 1350
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
CARDS = [
    ("c1", ["We built an AI agent that can't", "ship without asking a human first"]),
    ("c2", ["9 hours. San Francisco."]),
    ("c3", ["It researches the live web", "and cites every source"]),
    ("c4", ["Then it stops."]),
    ("c5", ["Change the plan after approval", "and the write refuses"]),
    ("c6", ["Approval you can verify."]),
]
for name, lines in CARDS:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, 64 if len(lines) > 1 else 72)
    hs = [d.textbbox((0, 0), l, font=f)[3] for l in lines]
    gap, pad = 18, 44
    block = sum(hs) + gap * (len(lines) - 1)
    top = H - block - pad * 2 - 70
    d.rectangle([0, top - pad, W, H - 70 + pad], fill=(0, 0, 0, 150))
    y = top
    for l, hh in zip(lines, hs):
        w = d.textbbox((0, 0), l, font=f)[2]
        d.text(((W - w) // 2, y), l, font=f, fill=(255, 255, 255, 255))
        y += hh + gap
    img.save(f"/tmp/{name}.png")
print("rendered 6 caption cards")
