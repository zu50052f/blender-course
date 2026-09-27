"""Capture a separate Week 3 demo scene with Blender's own screenshot operator.

Run in Blender's Python Console, then switch that area back to the 3D View.
The existing scene is kept intact; all example objects live in a new scene.
"""

import bpy
import math
from pathlib import Path
from mathutils import Euler, Vector

OUT = Path(__file__).resolve().parents[1] / "site/assets/blender/town"
OUT.mkdir(parents=True, exist_ok=True)

original_scene = bpy.context.window.scene
scene = bpy.data.scenes.new("Tiny Town lesson demo")
bpy.context.window.scene = scene

def cube(name, loc, scale):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return obj

def cone(name, loc, radius=1.15, depth=1.3):
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=radius, radius2=0, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler.z = math.pi / 4
    return obj

def select(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

def viewport():
    for area in bpy.context.screen.areas:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.region_3d.view_distance = 13
            space.region_3d.view_location = Vector((1.1, 0, 1.3))
            space.region_3d.view_rotation = Euler((math.radians(67), 0, math.radians(-30)), "XYZ").to_quaternion()
            space.shading.type = "SOLID"
            space.overlay.show_floor = True
            break

states = []
def step(filename, fn):
    states.append((filename, fn))

body1 = roof1 = body2 = roof2 = window1 = window2 = door = body3 = roof3 = None

def first_body():
    global body1
    body1 = cube("Дом 1 · стены", (-2, 0, 1), (0.9, 0.8, 1))
    select(body1)
step("01-walls.png", first_body)

def first_roof():
    global roof1
    roof1 = cone("Дом 1 · крыша", (-2, 0, 2.55))
    select(roof1)
step("02-roof.png", first_roof)

def copy_body():
    global body2
    body2 = body1.copy()
    body2.data = body1.data.copy()
    scene.collection.objects.link(body2)
    body2.name = "Дом 2 · стены (копия)"
    body2.location.x = 0.8
    select(body2)
step("03-copy-walls.png", copy_body)

def copy_roof():
    global roof2
    roof2 = roof1.copy()
    roof2.data = roof1.data.copy()
    scene.collection.objects.link(roof2)
    roof2.name = "Дом 2 · крыша (копия)"
    roof2.location.x = 0.8
    select(roof2)
step("04-copy-roof.png", copy_roof)

def tall_house():
    body2.scale.z = 1.35
    body2.location.z = 1.35
    roof2.location.z = 3.25
    select(body2)
step("05-tall-house.png", tall_house)

def first_window():
    global window1
    window1 = cube("Дом 1 · окошко", (-2.35, -0.83, 1.25), (0.25, 0.07, 0.28))
    select(window1)
step("06-window.png", first_window)

def copy_window():
    global window2
    window2 = window1.copy()
    window2.data = window1.data.copy()
    scene.collection.objects.link(window2)
    window2.name = "Дом 1 · второе окошко"
    window2.location.x = -1.65
    select(window2)
step("07-copy-window.png", copy_window)

def add_door():
    global door
    door = cube("Дом 1 · дверь", (-2, -0.87, 0.5), (0.3, 0.06, 0.5))
    select(door)
step("08-door.png", add_door)

def third_house():
    global body3, roof3
    body3 = body1.copy()
    body3.data = body1.data.copy()
    scene.collection.objects.link(body3)
    body3.name = "Дом 3 · стены"
    body3.location.x = 3.6
    body3.scale = (0.7, 0.65, 0.75)
    body3.location.z = 0.75
    roof3 = roof1.copy()
    roof3.data = roof1.data.copy()
    scene.collection.objects.link(roof3)
    roof3.name = "Дом 3 · крыша"
    roof3.location = (3.6, 0, 1.95)
    roof3.scale = (0.8, 0.8, 0.8)
    select(body3)
step("09-three-houses.png", third_house)

index = 0
awaiting_capture = False
def capture_next():
    global index, awaiting_capture
    if index >= len(states):
        return None
    name, fn = states[index]
    if not awaiting_capture:
        fn()
        viewport()
        awaiting_capture = True
        return 0.6
    bpy.ops.screen.screenshot(filepath=str(OUT / name))
    index += 1
    awaiting_capture = False
    return 0.8

bpy.app.timers.register(capture_next, first_interval=3.0)
