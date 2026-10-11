"""Capture Week 6 in a separate disposable Blender 5.2 process.

Open a temporary factory .blend with --factory-startup --no-window-focus
--python tools/capture-colour-guides.py. Do not run inside a student's scene.
Viewport/panel images contain real Blender pixels; the hero is a Cycles render.
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

OUT = Path(__file__).resolve().parents[1] / 'site/assets/blender/colour'
OUT.mkdir(parents=True, exist_ok=True)
LOG = Path(tempfile.gettempdir()) / 'blender-course-colour.log'
CWEBP = shutil.which('cwebp') or '/opt/homebrew/bin/cwebp'
bpy.context.preferences.use_preferences_save = False
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
META = {}


def material(name, rgb, roughness=.45):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*rgb, 1)
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def cube(name, location, scale):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name, obj.scale = name, scale
    return obj


body = cube('Body', (0, 0, 1.5), (.65, .38, .65))
head = cube('Head', (0, 0, 2.55), (.50, .40, .40))
arm = cube('Arm', (-.88, 0, 1.55), (.20, .31, .48))
other_arm = cube('Other arm', (.88, 0, 1.55), (.20, .31, .48))
left_leg = cube('Left leg', (-.35, 0, .45), (.23, .29, .40))
right_leg = cube('Right leg', (.35, 0, .45), (.23, .29, .40))
dark = material('Eyes', (.018, .025, .06))
for x in (-.20, .20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=.085, location=(x, -.42, 2.61))
    bpy.context.object.data.materials.append(dark)

area = next(a for a in bpy.context.screen.areas if a.type == 'VIEW_3D')
props = next(a for a in bpy.context.screen.areas if a.type == 'PROPERTIES')
space = area.spaces.active
space.region_3d.view_distance = 6.6
space.region_3d.view_location = Vector((0, 0, 1.5))
space.region_3d.view_rotation = Euler((math.radians(77), 0, math.radians(-18)), 'XYZ').to_quaternion()
space.region_3d.view_perspective = 'ORTHO'
space.shading.type = 'SOLID'
space.overlay.show_cursor = False
props.spaces.active.context = 'MATERIAL'
sun = sky = berry = None


def select(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    area.tag_redraw()
    props.tag_redraw()


def new_panel():
    select(body)


def base_colour():
    global sun
    sun = material('SUN', (1, .58, .045))
    body.data.materials.append(sun)


def preview():
    space.shading.type = 'MATERIAL'


def share():
    arm.data.materials.append(sun)
    select(arm)


def change_shared():
    select(body)
    sun.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (1, .19, .085, 1)


def palette():
    global sky, berry
    sun.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (1, .58, .045, 1)
    sky = material('SKY', (.10, .60, .83))
    berry = material('BERRY', (.43, .13, .66))
    head.data.materials.append(sky)
    other_arm.data.materials.append(sun)
    for leg in (left_leg, right_leg):
        leg.data.materials.append(berry)
    select(head)


def independent():
    arm.data.materials[0] = sun.copy()
    arm.active_material.name = 'PEACH'
    arm.active_material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (1, .28, .18, 1)
    select(arm)


def shiny():
    # Return the arm to SUN so the final sample uses exactly three materials.
    arm.data.materials[0] = sun
    select(head)
    sky.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .08


def matte():
    sky.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .85


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)


def capture(name, surface):
    pixels = bpy.context.window.screenshot()
    height, width, channels = pixels.shape
    assert channels == 4
    raw = bytes(pixels)
    rows = b''.join(b'\x00' + raw[y * width * 4:(y + 1) * width * 4] for y in range(height - 1, -1, -1))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 5)) + chunk(b'IEND', b'')
    temp = Path(tempfile.gettempdir()) / ('blender-course-' + name + '.png')
    temp.write_bytes(png)
    factor = width / max(a.x + a.width for a in bpy.context.screen.areas)
    target = props if surface == 'panel' else area
    x = max(0, round(target.x * factor) // 2 * 2)
    y = max(0, round(height - (target.y + target.height) * factor) // 2 * 2)
    w, h = min(round(target.width * factor), width - x), min(round(target.height * factor), height - y)
    subprocess.run([CWEBP, '-quiet', '-q', '88', '-crop', str(x), str(y), str(w), str(h), str(temp), '-o', str(OUT / name)], check=True)
    META[name] = {'width': w, 'height': h}
    temp.unlink()
    LOG.write_text(LOG.read_text() + f'captured {name} {w}x{h}\n')


def render_hero():
    sky.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .4
    bpy.ops.object.camera_add(location=(5, -9, 5.4))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 0, 1.5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type, camera.data.ortho_scale = 'ORTHO', 4.6
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.render.resolution_x, scene.render.resolution_y = 720, 620
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = True
    scene.world.color = (.35, .35, .35)
    for location, energy, size in [((3, -4, 6), 650, 4), ((-4, -2, 3), 400, 3), ((2, 4, 5), 700, 3)]:
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.object
        light.data.energy, light.data.shape, light.data.size = energy, 'DISK', size
        light.rotation_euler = (Vector((0, 0, 1.5)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    temporary = Path(tempfile.gettempdir()) / 'blender-course-colour-hero.png'
    scene.render.filepath = str(temporary)
    bpy.ops.render.render(write_still=True)
    subprocess.run([CWEBP, '-quiet', '-q', '88', str(temporary), '-o', str(OUT / '14-colour-hero.webp')], check=True)
    temporary.unlink()


states = [
    ('01-new-panel.webp', new_panel, 'panel'),
    ('02-base-colour-panel.webp', base_colour, 'panel'),
    ('03-material-preview.webp', preview, 'viewport'),
    ('04-shared-panel.webp', share, 'panel'),
    ('05-shared-parts.webp', lambda: None, 'viewport'),
    ('06-shared-change.webp', change_shared, 'viewport'),
    ('07-palette-panel.webp', palette, 'panel'),
    ('08-three-colours.webp', lambda: None, 'viewport'),
    ('09-independent-panel.webp', independent, 'panel'),
    ('10-independent-part.webp', lambda: None, 'viewport'),
    ('11-shiny-panel.webp', shiny, 'panel'),
    ('12-shiny.webp', lambda: None, 'viewport'),
    ('13-matte.webp', matte, 'viewport'),
]
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
            render_hero()
            LOG.write_text(LOG.read_text() + 'done\n')
            bpy.ops.wm.quit_blender()
            return None
        name, action, surface = states[index]
        if not ready:
            action()
            ready = True
            return 8.0 if name == '03-material-preview.webp' else 1.6
        capture(name, surface)
        index += 1
        ready = False
        return .8
    except Exception:
        LOG.write_text(LOG.read_text() + traceback.format_exc())
        bpy.ops.wm.quit_blender()
        return None


bpy.app.timers.register(tick, first_interval=4)
