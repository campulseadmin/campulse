from PIL import Image, ImageFilter
import numpy as np, os

SRC = "C:/Users/theab/Downloads/WhatsApp Image 2026-07-12 at 10.06.06 AM.jpeg"
img = Image.open(SRC).convert("RGB")
a = np.asarray(img).astype(np.float32)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b

# 1) Recolor the dark-grey "CAMP" -> app --fg white (#e7e9ea)
neutral = (np.abs(b - r) < 35) & (np.abs(g - r) < 35)
bright = lum > 200
blueish = (b - r) > 25
grey = (lum > 35) & (lum < 160) & neutral & (~bright) & (~blueish)
op = np.array(img).astype(np.uint8)
op[grey] = [231, 233, 234]
op_img = Image.fromarray(op)

# 2) Alpha from the RECOLORED image: content = bright OR blueish.
#    Everything left dark is background (incl. the central radial gradient) -> transparent.
opn = np.asarray(op_img).astype(np.float32)
or_, og, ob = opn[:, :, 0], opn[:, :, 1], opn[:, :, 2]
olum = 0.299 * or_ + 0.587 * og + 0.114 * ob
content = (olum > 50) | ((ob - or_) > 25) & (ob > 40)
alpha = (content * 255).astype(np.uint8)

# 3) Soft edges: blur the alpha mask.
alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(1.2))
alpha = np.asarray(alpha_img).astype(np.float32) / 255.0

# 4) Compose RGBA.
rgba = np.dstack([np.asarray(op_img), (alpha * 255).astype(np.uint8)])
rgba_img = Image.fromarray(rgba, "RGBA")

os.makedirs("public/brand", exist_ok=True)
rgba_img.save("public/brand/campulse-logo.png")

# Favicon: centered wordmark on transparent 64x64.
logo = Image.open("public/brand/campulse-logo.png").convert("RGBA")
scale = 60 / max(logo.size)
nw, nh = int(logo.size[0] * scale), int(logo.size[1] * scale)
res = logo.resize((nw, nh), Image.LANCZOS)
canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
canvas.paste(res, ((64 - nw) // 2, (64 - nh) // 2))
canvas.save("app/favicon.ico", sizes=[(64, 64)])

# Verify
px = np.asarray(rgba_img)
print("logo size", rgba_img.size)
# center background pixel should now be transparent
cy, cx = px.shape[0] // 2, int(px.shape[1] * 0.5)
print("center-bg alpha (want 0):", int(px[cy, cx, 3]))
print("corner alpha (want 0):", int(px[5, 5, 3]), int(px[5, px.shape[1] - 5, 3]))
wy, wx = np.where((px[:, :, 0] > 220) & (px[:, :, 3] > 200))
if len(wx):
    print("white alpha (255):", int(px[wy[0], wx[0], 3]), "rgb", px[wy[0], wx[0], :3].tolist())
print("transparent%%:", round((alpha < 0.5).mean() * 100, 1), "opaque%%:", round((alpha >= 0.5).mean() * 100, 1))

# Square icon (for apple-touch / metadata): centered wordmark on transparent 256x256.
S = 256
scale = 232 / max(logo.size)
iw, ih = int(logo.size[0] * scale), int(logo.size[1] * scale)
ires = logo.resize((iw, ih), Image.LANCZOS)
sq = Image.new("RGBA", (S, S), (0, 0, 0, 0))
sq.paste(ires, ((S - iw) // 2, (S - ih) // 2), ires)
sq.save("public/brand/campulse-icon.png")

# Black preview
blk = np.zeros((*px.shape[:2], 3), dtype=np.uint8)
pa = px[:, :, 3] / 255.0
for c in range(3):
    blk[:, :, c] = (px[:, :, c] * pa + blk[:, :, c] * (1 - pa)).astype(np.uint8)
Image.fromarray(blk).save("/tmp/logo_preview_black.png")
print("preview + icon written")
print("icon bytes:", os.path.getsize("public/brand/campulse-icon.png"))
