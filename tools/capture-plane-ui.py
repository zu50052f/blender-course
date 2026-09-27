"""Capture real Week 5 Blender UI states in a separate disposable Blender instance.

Launch a new Blender process with --factory-startup --python tools/capture-plane-ui.py.
This script never reads or modifies an existing user's Blender process.
"""
import bpy
import math
import struct
import zlib
import traceback
import subprocess
import tempfile
from pathlib import Path
from mathutils import Euler, Vector

OUT = Path(__file__).resolve().parents[1] / 'site/assets/blender/plane'
OUT.mkdir(parents=True, exist_ok=True)
LOG = Path(tempfile.gettempdir()) / 'blender-course-plane-ui.log'


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)


def save_window(name):
    pixels = bpy.context.window.screenshot()
    height, width, channels = pixels.shape
    assert channels == 4
    compressed = zlib.compressobj(5)
    pieces = []
    raw = bytes(pixels)
    stride = width * channels
    for y in range(height - 1, -1, -1):
        pieces.append(compressed.compress(b'\x00' + raw[y * stride:(y + 1) * stride]))
    pieces.append(compressed.flush())
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', b''.join(pieces))
    png += chunk(b'IEND', b'')
    (OUT / name).write_bytes(png)
    LOG.write_text(LOG.read_text() + f'captured {name} {width}x{height}\n')


bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=(0, 0, 1.25))
body = bpy.context.object
body.name = 'Самолёт · корпус'
body.scale = (.55, 1.95, .52)
body.color = (1, .74, .22, 1)
bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
wing = bpy.context.object
wing.name = 'Самолёт · одно крыло'
wing.color = (1, .36, .33, 1)
for vertex in wing.data.vertices:
    vertex.co.x = vertex.co.x * 1.25 + 1.42
    vertex.co.y = vertex.co.y * .38 + .06
    vertex.co.z = vertex.co.z * .07 + 1.28
wing.data.update()


def select_wing():
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    wing.select_set(True)
    bpy.context.view_layer.objects.active = wing
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            space.region_3d.view_distance = 9.3
            space.region_3d.view_location = Vector((0, 0, 1.2))
            space.region_3d.view_rotation = Euler((math.radians(63), 0, math.radians(-34)), 'XYZ').to_quaternion()
            space.shading.type = 'SOLID'
            space.shading.color_type = 'OBJECT'
        elif area.type == 'PROPERTIES':
            area.spaces.active.context = 'MODIFIER'


def before():
    select_wing()


def add_mirror():
    mod = wing.modifiers.new('Второе крыло · Mirror', 'MIRROR')
    mod.use_axis[0] = True
    mod.use_clip = True
    select_wing()


states = [
    ('11-before-mirror-ui.png', before),
    ('12-mirror-ui.png', add_mirror),
]
index = 0
ready = False
LOG.write_text('started\n')


def tick():
    global index, ready
    try:
        if index >= len(states):
            # The startup splash can cover the model, but never these right-panel pixels.
            for source, target in [
                ('11-before-mirror-ui.png', '12-add-modifier-panel.webp'),
                ('12-mirror-ui.png', '13-mirror-panel.webp'),
            ]:
                subprocess.run(['cwebp', '-quiet', '-q', '82', '-crop', '2440', '340', '552', '740', str(OUT / source), '-o', str(OUT / target)], check=True)
                (OUT / source).unlink()
            LOG.write_text(LOG.read_text() + 'done\n')
            bpy.ops.wm.quit_blender()
            return None
        name, action = states[index]
        if not ready:
            action()
            ready = True
            return 1.2
        save_window(name)
        index += 1
        ready = False
        return 0.8
    except Exception:
        LOG.write_text(LOG.read_text() + traceback.format_exc())
        bpy.ops.wm.quit_blender()
        return None


bpy.app.timers.register(tick, first_interval=3.0)
