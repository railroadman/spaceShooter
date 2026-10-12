"""One-off asset tool: cuts the big weapon art into one small Phaser texture atlas.

Input (assets/images/weapons):
  weapon_boxes.png    10 pickup boxes in one row
  weapons_sprites.png grid 10 columns x 8 rows with uneven cell sizes (rows = weapons, column 1 = shot,
                      columns 7-10 = impact frames)
Output (assets/images/weapons):
  weapons.png, weapons.json  atlas with frames `<weapon>_shot`, `<weapon>_hit_1..4`, `box_<name>`

Run from the repo root: python tools/build-weapon-atlas.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path('assets/images/weapons')

# row order of weapons_sprites.png, box order of weapon_boxes.png
WEAPONS = ['plasma', 'laser', 'lightning', 'rocket', 'acid', 'shotgun', 'railgun', 'flame']
BOXES = WEAPONS + ['health', 'shield']

# the cells of weapons_sprites.png are not equal: these are the dark separator lines found in the image
COLUMN_EDGES = [0, 126, 268, 416, 570, 716, 871, 1029, 1184, 1344, 1536]
ROW_EDGES = [0, 119, 239, 359, 481, 600, 720, 857, 1024]
CELL_INSET = 2  # px cut off every cell side to hide the separator line
SPRITE_SCALE = 0.5
CELL_W, CELL_H = 96, 84  # one projectile frame in the atlas, fits the biggest cell, content is centered

BOX_CENTERS_X = [125, 334, 540, 748, 964, 1177, 1393, 1610, 1827, 2043]  # the boxes touch each other, so cut around their centers
BOX_HALF_W = 105
BOX_CROP_Y = (225, 497)
BOX_SCALE = 0.3
BOX_W, BOX_H = 77, 82  # one box frame in the atlas

ALPHA_FLOOR = 10  # weaker alpha is the background glow of the sheet: it would tint squares under ADD blend
EDGE_FADE = 4  # px: art spilling over the left/right cell border is faded out instead of showing a hard cut


def scaled(image, size):
    """Resize with premultiplied alpha so the colored glow around transparent pixels does not bleed."""
    resized = image.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')
    data = np.array(resized)
    width = data.shape[1]
    ramp_x = np.clip(np.minimum(np.arange(width), np.arange(width)[::-1]) / EDGE_FADE, 0, 1)
    data[..., 3] = data[..., 3] * ramp_x[None, :]
    data[data[..., 3] < ALPHA_FLOOR] = 0
    return Image.fromarray(data)


def main():
    sprites = Image.open(SRC / 'weapons_sprites.png').convert('RGBA')
    boxes = Image.open(SRC / 'weapon_boxes.png').convert('RGBA')

    rows = len(ROW_EDGES) - 1
    atlas = Image.new('RGBA', (len(BOXES) * BOX_W, rows * CELL_H + BOX_H), (0, 0, 0, 0))
    frames = {}

    def put(name, image, x, y):
        atlas.paste(image, (x, y))
        frames[name] = {
            'frame': {'x': x, 'y': y, 'w': image.width, 'h': image.height},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': image.width, 'h': image.height},
            'sourceSize': {'w': image.width, 'h': image.height},
        }

    # column 1 = shot, columns 7-10 = impact frames
    wanted = [('shot', 0)] + [(f'hit_{i + 1}', 6 + i) for i in range(4)]
    for row, weapon in enumerate(WEAPONS):
        for slot, (suffix, column) in enumerate(wanted):
            cell = sprites.crop((
                COLUMN_EDGES[column] + CELL_INSET,
                ROW_EDGES[row] + CELL_INSET,
                COLUMN_EDGES[column + 1] - CELL_INSET,
                ROW_EDGES[row + 1] - CELL_INSET,
            ))
            small = scaled(cell, (round(cell.width * SPRITE_SCALE), round(cell.height * SPRITE_SCALE)))
            frame = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
            frame.paste(small, ((CELL_W - small.width) // 2, (CELL_H - small.height) // 2))
            put(f'{weapon}_{suffix}', frame, slot * CELL_W, row * CELL_H)

    for index, name in enumerate(BOXES):
        center = BOX_CENTERS_X[index]
        crop = boxes.crop((center - BOX_HALF_W, BOX_CROP_Y[0], center + BOX_HALF_W, BOX_CROP_Y[1]))
        size = (round(crop.width * BOX_SCALE), round(crop.height * BOX_SCALE))
        put(f'box_{name}', scaled(crop, size), index * BOX_W, rows * CELL_H)

    atlas.save(SRC / 'weapons.png', optimize=True)
    meta = {'image': 'weapons.png', 'format': 'RGBA8888', 'size': {'w': atlas.width, 'h': atlas.height}, 'scale': 1}
    (SRC / 'weapons.json').write_text(json.dumps({'frames': frames, 'meta': meta}, indent=2), encoding='utf-8')
    print(f'{len(frames)} frames, atlas {atlas.width}x{atlas.height}')


if __name__ == '__main__':
    main()
