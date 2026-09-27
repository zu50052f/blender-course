"""Render isolated Week 5 Blender teaching states (no user's open scene changed)."""
import bpy
from mathutils import Vector
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'site/assets/blender/plane'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'OBJECT'
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = 'BOTH'
scene.display.shading.background_type = 'VIEWPORT'
scene.display.shading.background_color = (0.78, 0.9, 1.0)
scene.render.film_transparent = False

bpy.ops.object.camera_add(location=(6.0, -7.4, 5.9))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 1.15)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 8.0
scene.camera = camera


def save(name):
    scene.render.filepath = str(OUT / name)
    bpy.ops.render.render(write_still=True)


def cube(name, location, scale, color):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.color = (*color, 1)
    return obj


def sphere(name, location, scale, color):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.color = (*color, 1)
    return obj

body = sphere('Самолёт · корпус', (0, 0, 1.25), (0.55, 1.95, 0.52), (1, .74, .22))
save('01-body.png')
wing = cube('Самолёт · одно крыло', (0, 0, 0), (1, 1, 1), (1, .36, .33))
save('02-wing-cube.png')
for vertex in wing.data.vertices:
    vertex.co.x = vertex.co.x * 1.25
    vertex.co.y = vertex.co.y * .38
    vertex.co.z = vertex.co.z * .07
wing.data.update()
save('03-wing-edit.png')
for vertex in wing.data.vertices:
    vertex.co.x += 1.42
    vertex.co.y += .06
    vertex.co.z += 1.28
wing.data.update()
save('04-one-wing.png')
mirror = wing.modifiers.new('Второе крыло · Mirror', 'MIRROR')
mirror.use_axis[0] = True
mirror.use_clip = True
save('05-mirror.png')
for vertex in wing.data.vertices:
    vertex.co.x = .17 + (vertex.co.x - .17) * 1.35
wing.data.update()
save('06-edit-pair.png')
fin = cube('Самолёт · хвост', (0, 1.30, 1.72), (.07, .38, .55), (.42, .75, 1))
save('07-tail-fin.png')
tailplane = cube('Самолёт · маленькие задние крылья', (0, 1.43, 1.42), (.75, .28, .055), (1, .36, .33))
save('07-tailplane.png')
# A low oval cockpit intersects the fuselage, so it reads as part of the plane.
# Its top is one face: the same Inset -> Extrude sequence a student can repeat.
bpy.ops.mesh.primitive_cylinder_add(vertices=20, location=(0, -.54, 1.76))
cockpit = bpy.context.object
cockpit.name = 'Самолёт · низкая овальная кабина'
cockpit.scale = (.39, .70, .12)
cockpit.color = (1, .60, .22, 1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
save('08-cockpit-base.png')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
for polygon in cockpit.data.polygons:
    polygon.select = polygon.normal.z > .9
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.inset(thickness=.085, depth=0)
bpy.ops.object.mode_set(mode='OBJECT')
save('09-oval-inset.png')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={'value': (0, 0, -.15)})
bpy.ops.object.mode_set(mode='OBJECT')
save('10-oval-open.png')
pilot_body = cube('Пилот · тело робота', (0, -.54, 1.82), (.13, .12, .11), (.93, .92, .73))
pilot_head = cube('Пилот · голова робота', (0, -.54, 1.98), (.15, .13, .12), (.93, .92, .73))
sphere('Пилот · левый глаз', (-.07, -.68, 2.0), (.022, .022, .022), (.10, .23, .45))
sphere('Пилот · правый глаз', (.07, -.68, 2.0), (.022, .022, .022), (.10, .23, .45))
save('11-oval-pilot.png')
camera.location = (6.0, -8.5, 5.5)
camera.rotation_euler = (Vector((0, 0, 1.1)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.ortho_scale = 8.6
save('12-plane-angle.png')
scene.render.resolution_x = 720
scene.render.resolution_y = 620
camera.data.ortho_scale = 7.5
scene.render.film_transparent = True
save('13-plane-hero.png')
print('Rendered 13 Week 5 Blender views')
