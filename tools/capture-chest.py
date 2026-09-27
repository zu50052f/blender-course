"""Capture Week 4 teaching states in a separate Blender scene.

Run from Blender's Python Console, then return the area to the 3D View.
The scene that was open before this script is restored after the captures.
"""

import bpy
import math
from pathlib import Path
from mathutils import Euler, Vector

OUT = Path(__file__).resolve().parents[1] / "site/assets/blender/chest"
OUT.mkdir(parents=True, exist_ok=True)
original_scene = bpy.context.window.scene
scene = bpy.data.scenes.new("Treasure chest lesson demo")
bpy.context.window.scene = scene


def select(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def cube(name, location, scale):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return obj


def viewport():
    for area in bpy.context.screen.areas:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.region_3d.view_distance = 9.2
            space.region_3d.view_location = Vector((0, 0, 1.2))
            space.region_3d.view_rotation = Euler(
                (math.radians(63), 0, math.radians(-34)), "XYZ"
            ).to_quaternion()
            space.shading.type = "SOLID"
            space.overlay.show_floor = True
            break


states = []


def step(filename, fn):
    states.append((filename, fn))


body = lid = clasp = treasure = None


def make_body():
    global body
    body = cube("Сундук · корпус", (0, 0, 0.9), (1.55, 1.05, 0.9))
    select(body)


step("01-body.png", make_body)


def enter_edit():
    select(body)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.context.tool_settings.mesh_select_mode = (False, False, True)


step("02-edit-mode.png", enter_edit)


def select_top():
    bpy.ops.object.mode_set(mode="OBJECT")
    for polygon in body.data.polygons:
        polygon.select = polygon.normal.z > 0.9
    bpy.ops.object.mode_set(mode="EDIT")


step("03-top-face.png", select_top)


def inset_top():
    bpy.ops.mesh.inset(thickness=0.22, depth=0)


step("04-inset.png", inset_top)


def push_inside():
    bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value": (0, 0, -1.15)})


step("05-extrude.png", push_inside)


def inspect_hollow():
    bpy.ops.object.mode_set(mode="OBJECT")
    select(body)


step("06-hollow.png", inspect_hollow)


def make_lid():
    global lid
    lid = cube("Сундук · крышка", (0, 0, 2.02), (1.68, 1.18, 0.16))
    select(lid)


step("07-lid.png", make_lid)


def make_clasp():
    global clasp
    clasp = cube("Сундук · смешной замок", (0, -1.1, 1.55), (0.25, 0.08, 0.27))
    select(clasp)


step("08-clasp.png", make_clasp)


def open_lid():
    lid.location.z += 1.0
    select(lid)


step("09-open.png", open_lid)


def add_treasure():
    global treasure
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.3, location=(0, 0.38, 1.34))
    treasure = bpy.context.object
    treasure.name = "Сундук · сокровище"
    select(treasure)


step("10-treasure.png", add_treasure)


index = 0
awaiting_capture = False


def capture_next():
    global index, awaiting_capture
    if index >= len(states):
        if bpy.context.object and bpy.context.object.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        bpy.context.window.scene = original_scene
        return None
    name, fn = states[index]
    if not awaiting_capture:
        fn()
        viewport()
        awaiting_capture = True
        return 0.7
    bpy.ops.screen.screenshot(filepath=str(OUT / name))
    index += 1
    awaiting_capture = False
    return 0.9


bpy.app.timers.register(capture_next, first_interval=3.0)
