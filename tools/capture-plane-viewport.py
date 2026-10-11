"""Capture Week 5 viewport states in a disposable Blender process.

Open a temporary factory .blend file with --python pointing to this script.
The temporary file avoids Blender's startup splash. Never run in a student's scene.
Screenshots use Blender's own window pixels; crops retain the viewport mode menu.
"""
import bpy
import json
import math
import shutil
import struct
import subprocess
import tempfile
import traceback
import zlib
from pathlib import Path
from mathutils import Euler, Vector
from bpy_extras.view3d_utils import location_3d_to_region_2d

OUT = Path(__file__).resolve().parents[1] / 'site/assets/blender/plane'
LOG = Path(tempfile.gettempdir()) / 'blender-course-viewport.log'
META = {}
CWEBP = shutil.which('cwebp') or '/opt/homebrew/bin/cwebp'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.use_preferences_save = False


def cube(name, location, scale, color):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name, obj.scale, obj.color = name, scale, (*color, 1)
    return obj


bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=(0, 0, 1.25))
body = bpy.context.object
body.name = 'Plane body'
body.scale, body.color = (.55, 1.95, .52), (1, .74, .22, 1)
wing = cube('Wing', (0, 0, 0), (1, 1, 1), (1, .36, .33))
cockpit = None
area = next(a for a in bpy.context.screen.areas if a.type == 'VIEW_3D')
space = area.spaces.active
region = next(r for r in area.regions if r.type == 'WINDOW')


def select(obj):
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def view(close=False):
    space.region_3d.view_distance = 3.2 if close else 8.0
    space.region_3d.view_location = Vector((0, -.54, 1.8) if close else (0, 0, .8))
    space.region_3d.view_rotation = Euler((math.radians(48 if close else 63), 0, math.radians(-34)), 'XYZ').to_quaternion()
    space.region_3d.view_perspective = 'ORTHO'
    space.shading.type = 'SOLID'
    space.shading.color_type = 'OBJECT'
    space.overlay.show_floor = True
    space.overlay.show_axis_x = space.overlay.show_axis_y = True
    space.overlay.show_cursor = False
    space.overlay.show_object_origins = True
    space.overlay.show_text = True
    area.tag_redraw()


def wing_cube():
    select(wing)
    view()


def wing_edit():
    select(wing)
    for v in wing.data.vertices:
        v.co.x *= 1.25
        v.co.y *= .38
        v.co.z *= .07
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')


def one_wing():
    with bpy.context.temp_override(area=area, region=region):
        bpy.ops.transform.translate(value=(1.42, .06, 1.28))
    bpy.ops.object.mode_set(mode='OBJECT')


def mirror():
    wing.modifiers.new('Mirror', 'MIRROR')


def edit_pair():
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    # Use the learner's S X around the default median pivot.
    with bpy.context.temp_override(area=area, region=region):
        bpy.ops.transform.resize(value=(1.35, 1, 1))


def cockpit_top():
    global cockpit
    select(wing)
    cube('Tail fin', (0, 1.30, 1.72), (.07, .38, .55), (.42, .75, 1))
    cube('Tailplane', (0, 1.43, 1.42), (.75, .28, .055), (1, .36, .33))
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, location=(0, -.54, 1.76))
    cockpit = bpy.context.object
    cockpit.name = 'Cockpit'
    # Keep Object Mode scaling, exactly as the lesson instructs.
    cockpit.scale, cockpit.color = (.39, .70, .12), (1, .60, .22, 1)
    bpy.context.tool_settings.mesh_select_mode = (False, False, True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for polygon in cockpit.data.polygons:
        polygon.select = polygon.normal.z > .9
    bpy.ops.object.mode_set(mode='EDIT')
    view(close=True)


def inset():
    bpy.ops.mesh.inset(thickness=.20, depth=0)


def extrude():
    bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={'value': (0, 0, -.08)})


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)


def capture(name):
    pixels = bpy.context.window.screenshot()
    height, width, channels = pixels.shape
    assert channels == 4
    raw = bytes(pixels)
    compressed = zlib.compress(b''.join(b'\x00' + raw[y * width * 4:(y + 1) * width * 4] for y in range(height - 1, -1, -1)), 5)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')
    temp = Path(tempfile.gettempdir()) / ('blender-course-' + name + '.png')
    temp.write_bytes(png)
    # Screen-area coordinates already use framebuffer pixels on Retina macOS;
    # Window.width/height can instead report logical points.
    screen_width = max(a.x + a.width for a in bpy.context.screen.areas)
    # Global header/status bars are not included in screen.areas. Use the
    # horizontal pixel scale for both axes and the full screenshot height.
    sx = sy = width / screen_width
    x, y = round(area.x * sx), round(height - (area.y + area.height) * sy)
    w, h = round(area.width * sx), round(area.height * sy)
    LOG.write_text(LOG.read_text() + f'window={width}x{height}; logical={bpy.context.window.width}x{bpy.context.window.height}; crop={x},{y},{w},{h}\n')
    # Encoder requires an even crop origin and a crop wholly inside the image.
    x, y = max(0, x // 2 * 2), max(0, y // 2 * 2)
    w, h = min(w, width - x), min(h, height - y)
    subprocess.run([CWEBP, '-quiet', '-q', '88', '-crop', str(x), str(y), str(w), str(h), str(temp), '-o', str(OUT / name)], check=True)
    META[name] = {'width': w, 'height': h}
    if name == '16-origin-viewport.webp':
        point = location_3d_to_region_2d(region, space.region_3d, wing.location)
        px = ((region.x + point.x) * sx - x) / w * 100
        py = (height - (region.y + point.y) * sy - y) / h * 100
        META[name]['target'] = [round(px - 1.2, 2), round(py - 1.8, 2), 2.4, 3.6]
    temp.unlink()
    LOG.write_text(LOG.read_text() + f'{name}: {w}x{h}\n')


states = [('14-cube-viewport.webp', wing_cube), ('15-edit-viewport.webp', wing_edit),
          ('16-origin-viewport.webp', one_wing), ('17-mirror-viewport.webp', mirror),
          ('18-edit-pair-viewport.webp', edit_pair), ('19-top-face-viewport.webp', cockpit_top),
          ('20-inset-viewport.webp', inset), ('21-extrude-viewport.webp', extrude)]
index, ready = 0, False
LOG.write_text('started\n')


def tick():
    global index, ready
    try:
        if index == len(states):
            catalog = OUT / 'screenshots.json'
            shots = json.loads(catalog.read_text())
            for shot in shots.values():
                if shot['file'] in META:
                    shot.update(META[shot['file']])
            catalog.write_text(json.dumps(shots, ensure_ascii=False, indent=2) + '\n')
            LOG.write_text(LOG.read_text() + 'done\n')
            bpy.ops.wm.quit_blender()
            return None
        name, action = states[index]
        if not ready:
            action()
            ready = True
            return 1.2
        capture(name)
        index += 1
        ready = False
        return .8
    except Exception:
        LOG.write_text(LOG.read_text() + traceback.format_exc())
        bpy.ops.wm.quit_blender()
        return None


bpy.app.timers.register(tick, first_interval=4)
