"""生成 Capacitor 打包所需的图标与启动图。

设计沿用站点 favicon：紫色圆角方块 + 白色 V。
所有图形先按 4 倍尺寸绘制再 LANCZOS 缩小，避免 PIL 画线没有抗锯齿的问题。
"""

from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(OUT, exist_ok=True)

SS = 4  # 超采样倍数
PURPLE = (124, 92, 255)
DARK = (8, 11, 20)
DARK_2 = (16, 20, 38)


def rounded(size, radius, fill, bg=None):
    im = Image.new('RGBA', (size, size), bg if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=fill)
    return im


def draw_mark(size):
    """透明底，中间是紫色圆角块 + 白 V。块占画布 62%。"""
    S = size * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    pad = int(S * 0.19)
    box = rounded(S - 2 * pad, int((S - 2 * pad) * 0.29), PURPLE)
    im.paste(box, (pad, pad), box)

    d = ImageDraw.Draw(im)
    # V 的相对坐标（以方块边长为 1）
    L = S - 2 * pad
    ox, oy = pad, pad
    w = int(L * 0.155)          # 笔画宽度
    top = oy + int(L * 0.235)
    bot = oy + int(L * 0.775)
    xl = ox + int(L * 0.225)
    xr = ox + int(L * 0.775)
    mid = ox + L // 2
    d.line([(xl, top), (mid, bot), (xr, top)], fill=(255, 255, 255, 255), width=w)
    # 三点补圆头：两端收口 + 底部尖角，避免线条转角留下的凹口
    r = w // 2
    for x, y in ((xl, top), (mid, bot), (xr, top)):
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 255))
    return im.resize((size, size), Image.LANCZOS)


def radial(size, inner, outer):
    """深色径向渐变背景，中心略亮，避免大面积纯黑显得死板。"""
    small = Image.new('RGB', (64, 64))
    px = small.load()
    cx = cy = 32
    for y in range(64):
        for x in range(64):
            dist = min(1.0, ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / 46)
            px[x, y] = tuple(
                int(inner[i] + (outer[i] - inner[i]) * dist) for i in range(3)
            )
    return small.resize((size, size), Image.BICUBIC)


# 1) 主图标：渐变底 + 图形
icon = radial(1024, DARK_2, DARK).convert('RGBA')
icon.alpha_composite(draw_mark(1024))
icon.convert('RGB').save(os.path.join(OUT, 'icon.png'), quality=95)

# 2) Adaptive icon 的前景 / 背景（安卓分层图标）
fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
mark = draw_mark(1024)
# 前景安全区只有中间 66%，整体缩到 62% 再居中
small = mark.resize((int(1024 * 0.62), int(1024 * 0.62)), Image.LANCZOS)
fg.alpha_composite(small, ((1024 - small.width) // 2, (1024 - small.height) // 2))
fg.save(os.path.join(OUT, 'icon-foreground.png'))

bg = Image.new('RGBA', (1024, 1024), DARK + (255,))
bg.convert('RGB').save(os.path.join(OUT, 'icon-background.png'))

# 3) 启动图：2732 见方，中间放图形（保证各裁切比例下都可见）
for name, base_inner in (('splash.png', DARK_2), ('splash-dark.png', DARK_2)):
    splash = radial(2732, base_inner, DARK).convert('RGBA')
    m = draw_mark(720)
    splash.alpha_composite(m, ((2732 - 720) // 2, (2732 - 720) // 2 - 40))
    splash.convert('RGB').save(os.path.join(OUT, name), quality=95)

for f in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, f)
    with Image.open(p) as im:
        print(f'{f:26} {im.size[0]}x{im.size[1]}  {os.path.getsize(p) // 1024}KB')
