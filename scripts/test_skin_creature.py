"""
test_skin_creature.py
Builds a continuous connected winged demon using Blender's Skin Modifier + Subdivision Surface.
"""
import bpy
import bmesh
import math
from mathutils import Vector

def test():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    # Create mesh & bmesh
    me = bpy.data.meshes.new("DemonBase")
    bm = bmesh.new()

    # Create connected skeleton tree
    # Pelvis
    v_pelvis = bm.verts.new(Vector((0, -0.05, 1.15)))
    v_spine1 = bm.verts.new(Vector((0, 0.00, 1.35)))
    v_spine2 = bm.verts.new(Vector((0, 0.08, 1.58)))
    v_chest = bm.verts.new(Vector((0, 0.16, 1.82)))
    v_neck = bm.verts.new(Vector((0, 0.28, 2.05)))
    v_head = bm.verts.new(Vector((0, 0.42, 2.22)))
    v_jaw = bm.verts.new(Vector((0, 0.58, 2.14)))
    v_snout = bm.verts.new(Vector((0, 0.60, 2.28)))

    bm.edges.new([v_pelvis, v_spine1])
    bm.edges.new([v_spine1, v_spine2])
    bm.edges.new([v_spine2, v_chest])
    bm.edges.new([v_chest, v_neck])
    bm.edges.new([v_neck, v_head])
    bm.edges.new([v_head, v_jaw])
    bm.edges.new([v_head, v_snout])

    # Horns
    for side in [-1, 1]:
        v_h1 = bm.verts.new(Vector((side * 0.12, 0.36, 2.38)))
        v_h2 = bm.verts.new(Vector((side * 0.22, 0.18, 2.55)))
        v_h3 = bm.verts.new(Vector((side * 0.28, -0.02, 2.68)))
        bm.edges.new([v_head, v_h1])
        bm.edges.new([v_h1, v_h2])
        bm.edges.new([v_h2, v_h3])

    # Arms
    for side in [-1, 1]:
        v_sh = bm.verts.new(Vector((side * 0.28, 0.14, 1.80)))
        v_el = bm.verts.new(Vector((side * 0.45, 0.22, 1.40)))
        v_wr = bm.verts.new(Vector((side * 0.42, 0.40, 1.05)))
        bm.edges.new([v_chest, v_sh])
        bm.edges.new([v_sh, v_el])
        bm.edges.new([v_el, v_wr])
        # Talons
        for f_idx, f_x in enumerate([-0.05, 0.0, 0.05]):
            v_t1 = bm.verts.new(Vector((side * 0.42 + f_x, 0.52, 0.92)))
            v_t2 = bm.verts.new(Vector((side * 0.42 + f_x, 0.58, 0.82)))
            bm.edges.new([v_wr, v_t1])
            bm.edges.new([v_t1, v_t2])

    # Legs (Digitigrade)
    for side in [-1, 1]:
        v_hip = bm.verts.new(Vector((side * 0.18, -0.06, 1.10)))
        v_knee = bm.verts.new(Vector((side * 0.24, 0.16, 0.75)))
        v_hock = bm.verts.new(Vector((side * 0.22, -0.12, 0.38)))
        v_foot = bm.verts.new(Vector((side * 0.20, 0.08, 0.08)))
        bm.edges.new([v_pelvis, v_hip])
        bm.edges.new([v_hip, v_knee])
        bm.edges.new([v_knee, v_hock])
        bm.edges.new([v_hock, v_foot])
        for t_off in [-0.04, 0.0, 0.04]:
            v_toe = bm.verts.new(Vector((side * 0.20 + t_off, 0.22, 0.02)))
            bm.edges.new([v_foot, v_toe])

    # Wing Spars
    for side in [-1, 1]:
        v_wroot = bm.verts.new(Vector((side * 0.16, 0.02, 1.84)))
        v_welb = bm.verts.new(Vector((side * 1.25, -0.05, 2.65)))
        v_wwr = bm.verts.new(Vector((side * 1.95, 0.20, 2.38)))
        bm.edges.new([v_chest, v_wroot])
        bm.edges.new([v_wroot, v_welb])
        bm.edges.new([v_welb, v_wwr])

        # Fingers
        v_f1 = bm.verts.new(Vector((side * 2.35, 0.15, 1.70)))
        v_f2 = bm.verts.new(Vector((side * 2.15, 0.00, 1.05)))
        v_f3 = bm.verts.new(Vector((side * 1.55, -0.15, 0.65)))
        bm.edges.new([v_wwr, v_f1])
        bm.edges.new([v_wwr, v_f2])
        bm.edges.new([v_welb, v_f3])

    bm.to_mesh(me)
    bm.free()

    obj = bpy.data.objects.new("DemonBase", me)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # Add Skin Modifier
    mod_skin = obj.modifiers.new("Skin", 'SKIN')

    # Adjust skin node radiuses
    skin_data = me.skin_vertices[0].data
    for i, v in enumerate(me.vertices):
        co = v.co
        z = co.z
        rad = 0.08
        if z > 2.1: # head
            rad = 0.16
        elif z > 2.35: # horns
            rad = 0.04
        elif z > 1.6 and abs(co.x) < 0.25: # chest
            rad = 0.22
        elif z > 1.2 and abs(co.x) < 0.2: # spine/waist
            rad = 0.14
        elif z > 1.0 and abs(co.x) < 0.25: # pelvis
            rad = 0.18
        elif abs(co.x) > 0.5: # wings/arms
            rad = 0.05
        skin_data[i].radius = (rad, rad)

    # Subsurf
    mod_sub = obj.modifiers.new("Subsurf", 'SUBSURF')
    mod_sub.levels = 2

    # Render preview
    scene = bpy.context.scene
    cam = bpy.data.cameras.new('RenderCam')
    cam.lens = 32
    cam_obj = bpy.data.objects.new('RenderCam', cam)
    scene.collection.objects.link(cam_obj)
    cam_obj.location = (2.8, -5.5, 2.2)
    cam_obj.rotation_euler = (1.35, 0, 0.45)
    scene.camera = cam_obj

    sun = bpy.data.lights.new('Sun', 'SUN')
    sun.energy = 4.0
    sun_obj = bpy.data.objects.new('Sun', sun)
    sun_obj.rotation_euler = (0.7, 0.4, 0.5)
    scene.collection.objects.link(sun_obj)

    fill = bpy.data.lights.new('Fill', 'SUN')
    fill.energy = 1.5
    fill_obj = bpy.data.objects.new('Fill', fill)
    fill_obj.rotation_euler = (1.2, -0.6, -1.0)
    scene.collection.objects.link(fill_obj)

    scene.render.filepath = r'C:\Users\ASUS HN116WS\OneDrive\Desktop\game\public\models\test_skin_render.png'
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    bpy.ops.render.render(write_still=True)
    print("Test render complete!")

if __name__ == '__main__':
    test()
