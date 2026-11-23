"""
build_proper_winged_demon.py — Hollywood-Quality Winged Horror Sculpt (The Archivist)
Uses Skin Modifier + Organic Wing Membranes + Voxel Remesh + Smooth to create a 100% seamless,
continuous, terrifying organic monster.
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

MODELS_DIR = r"C:\Users\ASUS HN116WS\OneDrive\Desktop\game\public\models"

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)

def build_winged_horror():
    reset_scene()
    print("Building Winged Horror Sculpt...")

    # --- 1. CONTINUOUS CONNECTED SKELETON BASE ---
    me = bpy.data.meshes.new("HorrorBaseMesh")
    bm = bmesh.new()

    vert_radii = [] # list of (Vector(pos), rad)

    def add_v(pos, rad):
        v = bm.verts.new(Vector(pos))
        vert_radii.append((Vector(pos), rad))
        return v

    def add_e(v1, v2):
        return bm.edges.new([v1, v2])

    # Pelvis & Spine (menacing hunched stalking posture)
    v_pelvis = add_v((0, -0.06, 1.05), 0.18)
    v_waist  = add_v((0,  0.00, 1.25), 0.12) # gaunt sunken waist
    v_mid    = add_v((0,  0.08, 1.48), 0.18)
    v_chest  = add_v((0,  0.16, 1.72), 0.22) # broad ribcage
    v_hunch  = add_v((0, -0.04, 1.78), 0.14) # prominent dorsal spine hunch
    v_neck1  = add_v((0,  0.26, 1.95), 0.12)
    v_neck2  = add_v((0,  0.34, 2.08), 0.11)
    v_head   = add_v((0,  0.42, 2.20), 0.16) # cranium

    add_e(v_pelvis, v_waist)
    add_e(v_waist, v_mid)
    add_e(v_mid, v_chest)
    add_e(v_chest, v_hunch)
    add_e(v_chest, v_neck1)
    add_e(v_neck1, v_neck2)
    add_e(v_neck2, v_head)

    # Spine Dorsal Spikes
    for s_z, s_y in [(1.45, -0.04), (1.60, 0.02), (1.75, -0.10), (1.90, 0.18)]:
        v_s_base = add_v((0, s_y, s_z), 0.08)
        v_s_tip  = add_v((0, s_y - 0.14, s_z + 0.06), 0.02)
        add_e(v_mid if s_z < 1.6 else v_chest, v_s_base)
        add_e(v_s_base, v_s_tip)

    # Ribcage Spurs (emaciated demonic ribs)
    for r_idx, (rz, ry, rx) in enumerate([(1.38, 0.04, 0.16), (1.52, 0.10, 0.20), (1.65, 0.14, 0.22)]):
        for side in [-1, 1]:
            v_rib_mid = add_v((side * rx, ry, rz), 0.06)
            v_rib_tip = add_v((side * (rx * 0.7), ry + 0.12, rz - 0.04), 0.04)
            add_e(v_mid if r_idx == 0 else v_chest, v_rib_mid)
            add_e(v_rib_mid, v_rib_tip)

    # Demonic Skull & Gaping Jaw
    v_snout_mid = add_v((0, 0.58, 2.18), 0.10)
    v_snout_tip = add_v((0, 0.70, 2.14), 0.06)
    add_e(v_head, v_snout_mid)
    add_e(v_snout_mid, v_snout_tip)

    # Upper Fangs
    for side in [-1, 1]:
        v_fang_root = add_v((side * 0.06, 0.62, 2.13), 0.035)
        v_fang_tip  = add_v((side * 0.05, 0.64, 2.01), 0.012)
        add_e(v_snout_mid, v_fang_root)
        add_e(v_fang_root, v_fang_tip)

    # Gaping Lower Mandible
    v_jaw_hinge = add_v((0, 0.44, 2.04), 0.08)
    v_jaw_mid   = add_v((0, 0.56, 1.98), 0.06)
    v_jaw_tip   = add_v((0, 0.68, 2.00), 0.04)
    add_e(v_head, v_jaw_hinge)
    add_e(v_jaw_hinge, v_jaw_mid)
    add_e(v_jaw_mid, v_jaw_tip)

    # Swept-Back Curved Horns
    for side in [-1, 1]:
        v_h1 = add_v((side * 0.12, 0.38, 2.32), 0.065)
        v_h2 = add_v((side * 0.24, 0.22, 2.48), 0.050)
        v_h3 = add_v((side * 0.34, 0.02, 2.60), 0.035)
        v_h4 = add_v((side * 0.38, -0.18, 2.68), 0.015)
        add_e(v_head, v_h1)
        add_e(v_h1, v_h2)
        add_e(v_h2, v_h3)
        add_e(v_h3, v_h4)

    # Clawed Long Arms
    for side in [-1, 1]:
        v_sh = add_v((side * 0.30, 0.14, 1.70), 0.13)
        v_el = add_v((side * 0.48, 0.16, 1.34), 0.09)
        v_wr = add_v((side * 0.42, 0.38, 1.02), 0.07)
        v_plm= add_v((side * 0.40, 0.48, 0.94), 0.06)
        add_e(v_chest, v_sh)
        add_e(v_sh, v_el)
        add_e(v_el, v_wr)
        add_e(v_wr, v_plm)

        # 3 Long Razor Talons
        for f_idx, f_spread in enumerate([-0.05, 0.0, 0.05]):
            v_t1 = add_v((side * 0.40 + f_spread, 0.60, 0.86), 0.025)
            v_t2 = add_v((side * 0.40 + f_spread * 1.3, 0.68, 0.74), 0.012)
            add_e(v_plm, v_t1)
            add_e(v_t1, v_t2)

    # Digitigrade Predator Legs
    for side in [-1, 1]:
        v_hip  = add_v((side * 0.18, -0.06, 1.02), 0.13)
        v_knee = add_v((side * 0.24,  0.16, 0.68), 0.10) # knee thrust forward
        v_hock = add_v((side * 0.22, -0.12, 0.35), 0.08) # hock joint angled back
        v_foot = add_v((side * 0.20,  0.06, 0.08), 0.06)
        add_e(v_pelvis, v_hip)
        add_e(v_hip, v_knee)
        add_e(v_knee, v_hock)
        add_e(v_hock, v_foot)

        # 3 Ground Talons
        for t_off in [-0.04, 0.0, 0.04]:
            v_toe1 = add_v((side * 0.20 + t_off, 0.16, 0.03), 0.025)
            v_toe2 = add_v((side * 0.20 + t_off, 0.24, 0.01), 0.012)
            add_e(v_foot, v_toe1)
            add_e(v_toe1, v_toe2)

    # Bat Wing Spars (Continuous bone chain rooted into upper back)
    wing_points = {}
    for side in [-1, 1]:
        v_wroot = add_v((side * 0.16, 0.02, 1.76), 0.09)
        v_welb  = add_v((side * 1.25, -0.06, 2.58), 0.07) # high arching wing elbow
        v_wspur = add_v((side * 1.28, -0.16, 2.68), 0.02) # elbow spike
        v_wwr   = add_v((side * 2.05, 0.22, 2.32), 0.055) # wing wrist
        v_wthmb = add_v((side * 2.12, 0.32, 2.40), 0.02) # carpal thumb claw

        add_e(v_chest, v_wroot)
        add_e(v_wroot, v_welb)
        add_e(v_welb, v_wspur)
        add_e(v_welb, v_wwr)
        add_e(v_wwr, v_wthmb)

        # 3 Long curved radiating wing fingers
        v_f1_m = add_v((side * 2.35, 0.18, 1.82), 0.032)
        v_f1_t = add_v((side * 2.52, 0.12, 1.35), 0.014) # finger 1 tip
        add_e(v_wwr, v_f1_m)
        add_e(v_f1_m, v_f1_t)

        v_f2_m = add_v((side * 2.18, 0.04, 1.25), 0.028)
        v_f2_t = add_v((side * 2.24, -0.04, 0.72), 0.012) # finger 2 tip
        add_e(v_wwr, v_f2_m)
        add_e(v_f2_m, v_f2_t)

        v_f3_m = add_v((side * 1.62, -0.10, 0.85), 0.025)
        v_f3_t = add_v((side * 1.66, -0.16, 0.42), 0.010) # finger 3 tip
        add_e(v_welb, v_f3_m)
        add_e(v_f3_m, v_f3_t)

        wing_points[side] = {
            'root': Vector((side * 0.16, 0.02, 1.76)),
            'elbow': Vector((side * 1.25, -0.06, 2.58)),
            'wrist': Vector((side * 2.05, 0.22, 2.32)),
            'f1_m': Vector((side * 2.35, 0.18, 1.82)),
            'f1_t': Vector((side * 2.52, 0.12, 1.35)),
            'f2_m': Vector((side * 2.18, 0.04, 1.25)),
            'f2_t': Vector((side * 2.24, -0.04, 0.72)),
            'f3_m': Vector((side * 1.62, -0.10, 0.85)),
            'f3_t': Vector((side * 1.66, -0.16, 0.42)),
            'waist': Vector((side * 0.16, -0.02, 1.25))
        }

    bm.to_mesh(me)
    bm.free()

    base_obj = bpy.data.objects.new("DemonBaseSkeleton", me)
    bpy.context.collection.objects.link(base_obj)
    bpy.context.view_layer.objects.active = base_obj
    base_obj.select_set(True)

    # Apply Skin Modifier
    mod_skin = base_obj.modifiers.new("Skin", 'SKIN')
    skin_data = me.skin_vertices[0].data

    # Map vertex radii to skin vertices
    for i, v in enumerate(me.vertices):
        best_rad = 0.08
        min_d = 999.0
        for pos, rad in vert_radii:
            d = (v.co - pos).length
            if d < min_d:
                min_d = d
                best_rad = rad
        skin_data[i].radius = (best_rad, best_rad)

    # Subsurf modifier
    mod_sub = base_obj.modifiers.new("Subsurf", 'SUBSURF')
    mod_sub.levels = 1

    # Apply modifiers to turn skeleton into mesh
    bpy.ops.object.modifier_apply(modifier="Skin")
    bpy.ops.object.modifier_apply(modifier="Subsurf")
    print("Base organic body mesh generated.")

    # --- 2. LEATHERY WING MEMBRANES ---
    membrane_objs = []
    for side, pts in wing_points.items():
        w_me = bpy.data.meshes.new(f"Membrane_{side}")
        w_bm = bmesh.new()

        # Create vertices for curved aerodynamic wing sails
        v_rt  = w_bm.verts.new(pts['root'])
        v_el  = w_bm.verts.new(pts['elbow'])
        v_wr  = w_bm.verts.new(pts['wrist'])
        v_f1m = w_bm.verts.new(pts['f1_m'])
        v_f1t = w_bm.verts.new(pts['f1_t'])
        v_f2m = w_bm.verts.new(pts['f2_m'])
        v_f2t = w_bm.verts.new(pts['f2_t'])
        v_f3m = w_bm.verts.new(pts['f3_m'])
        v_f3t = w_bm.verts.new(pts['f3_t'])
        v_wst = w_bm.verts.new(pts['waist'])

        # Curved scalloped membrane edge vertices
        scallop1 = (pts['f1_t'] + pts['f2_t']) * 0.5 + Vector((side * -0.15, 0.04, 0.12))
        scallop2 = (pts['f2_t'] + pts['f3_t']) * 0.5 + Vector((side * -0.14, 0.02, 0.14))
        scallop3 = (pts['f3_t'] + pts['waist']) * 0.5 + Vector((side * -0.12, 0.00, 0.18))

        v_sc1 = w_bm.verts.new(scallop1)
        v_sc2 = w_bm.verts.new(scallop2)
        v_sc3 = w_bm.verts.new(scallop3)

        w_bm.verts.ensure_lookup_table()

        # Create quad/tri sails
        w_bm.faces.new([v_rt, v_el, v_f3m, v_wst])
        w_bm.faces.new([v_el, v_wr, v_f1m, v_f2m])
        w_bm.faces.new([v_el, v_f2m, v_f3m])
        w_bm.faces.new([v_f1m, v_f1t, v_sc1, v_f2m])
        w_bm.faces.new([v_f2m, v_sc1, v_f2t])
        w_bm.faces.new([v_f2m, v_f2t, v_sc2, v_f3m])
        w_bm.faces.new([v_f3m, v_sc2, v_f3t])
        w_bm.faces.new([v_f3m, v_f3t, v_sc3, v_wst])

        w_bm.to_mesh(w_me)
        w_bm.free()

        w_obj = bpy.data.objects.new(f"Membrane_{side}", w_me)
        bpy.context.collection.objects.link(w_obj)

        # Modifiers: Subsurf + Solidify to give organic leathery sheet thickness
        mod_s = w_obj.modifiers.new("Subsurf", 'SUBSURF')
        mod_s.levels = 2
        mod_sol = w_obj.modifiers.new("Solidify", 'SOLIDIFY')
        mod_sol.thickness = 0.024
        mod_sol.offset = 0.0

        bpy.context.view_layer.objects.active = w_obj
        w_obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier="Subsurf")
        bpy.ops.object.modifier_apply(modifier="Solidify")
        membrane_objs.append(w_obj)

    print("Wing membranes generated.")

    # --- 3. UNIFY ALL PARTS INTO ONE SINGLE CONTINUOUS SCULPT ---
    bpy.ops.object.select_all(action='DESELECT')
    base_obj.select_set(True)
    for w in membrane_objs:
        w.select_set(True)
    bpy.context.view_layer.objects.active = base_obj

    bpy.ops.object.join()
    sculpt = bpy.context.active_object
    sculpt.name = "The_Winged_Horror"

    print("Applying Voxel Remesh to fuse body, wings, membranes, horns, and claws into one solid manifold...")
    sculpt.data.remesh_voxel_size = 0.016
    sculpt.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()

    # Apply Smooth modifier to give silky organic demon skin
    mod_smooth = sculpt.modifiers.new("OrganicSkin", 'SMOOTH')
    mod_smooth.factor = 0.55
    mod_smooth.iterations = 2
    bpy.ops.object.modifier_apply(modifier="OrganicSkin")

    # Set Smooth Shading
    for poly in sculpt.data.polygons:
        poly.use_smooth = True

    print(f"Sculpt complete! Vertices: {len(sculpt.data.vertices)}, Polygons: {len(sculpt.data.polygons)}")

    # --- 4. PRE-PAINT HORROR PALETTE ---
    print("Painting vertex colors...")
    color_layer = sculpt.data.color_attributes.new(
        name="Color",
        type='FLOAT_COLOR',
        domain='POINT'
    )
    sculpt.data.color_attributes.active_color = color_layer

    for i, vert in enumerate(sculpt.data.vertices):
        co = vert.co
        x, y, z = co.x, co.y, co.z
        dist_x = abs(x)

        # Base Body: Pale ashen decayed flesh
        flesh_r = 0.45
        flesh_g = 0.43
        flesh_b = 0.40

        # Wing Leather: Dark menacing crimson-charcoal leather (no diagonal stripes!)
        wing_r = 0.12
        wing_g = 0.04
        wing_b = 0.05

        # Smooth blend from body to wings
        if dist_x < 0.22:
            r, g, b = flesh_r, flesh_g, flesh_b
        elif dist_x < 0.45:
            t = (dist_x - 0.22) / 0.23
            # Smooth Hermite curve
            t = t * t * (3.0 - 2.0 * t)
            r = flesh_r * (1.0 - t) + wing_r * t
            g = flesh_g * (1.0 - t) + wing_g * t
            b = flesh_b * (1.0 - t) + wing_b * t
        else:
            r, g, b = wing_r, wing_g, wing_b
            # Outer edges and lower tips slightly darker
            if z < 0.9 or dist_x > 2.1:
                r *= 0.6
                g *= 0.6
                b *= 0.6

        # Horns: Aged bone sweeping into obsidian tips (z > 2.25, y < 0.35, abs(x) > 0.06)
        if z > 2.25 and y < 0.35 and abs(x) > 0.06:
            t_horn = min(1.0, (z - 2.25) / 0.45)
            r = 0.32 * (1.0 - t_horn * 0.75)
            g = 0.28 * (1.0 - t_horn * 0.75)
            b = 0.22 * (1.0 - t_horn * 0.75)

        # Demonic Glowing Eyes (Front of skull)
        elif z >= 2.14 and z <= 2.26 and y >= 0.44 and y <= 0.54 and abs(x) >= 0.04 and abs(x) <= 0.14:
            r = 1.0
            g = 0.04
            b = 0.01

        # Gaping Bloody Mouth & Fangs
        elif z >= 1.94 and z <= 2.14 and y >= 0.48 and abs(x) < 0.12:
            r = 0.88
            g = 0.03
            b = 0.02

        # Talons / Claws (Hands & Feet)
        elif (z < 0.08) or (y > 0.52 and z < 1.00 and abs(x) > 0.32):
            r = 0.08
            g = 0.07
            b = 0.08

        # Spine Crevices
        elif y < -0.02 and abs(x) < 0.14:
            r *= 0.65
            g *= 0.65
            b *= 0.65

        color_layer.data[i].color = (max(0.0, min(1.0, r)), max(0.0, min(1.0, g)), max(0.0, min(1.0, b)), 1.0)

    # Material setup
    mat = bpy.data.materials.new("HorrorMaterial")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    output.location = (400, 0)
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    bsdf.location = (100, 0)
    bsdf.inputs['Roughness'].default_value = 0.52
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = 0.1

    attr = nodes.new(type="ShaderNodeAttribute")
    attr.attribute_name = "Color"
    attr.location = (-200, 100)

    links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    sculpt.data.materials.append(mat)

    # --- 5. EXPORTS ---
    os.makedirs(MODELS_DIR, exist_ok=True)
    blend_path = os.path.join(MODELS_DIR, "the_archivist.blend")
    glb_path   = os.path.join(MODELS_DIR, "the_archivist.glb")
    obj_path   = os.path.join(MODELS_DIR, "the_archivist.obj")

    blend_tpose = os.path.join(MODELS_DIR, "archivist_tpose.blend")
    glb_tpose   = os.path.join(MODELS_DIR, "archivist_tpose.glb")
    obj_tpose   = os.path.join(MODELS_DIR, "archivist_tpose.obj")

    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.wm.save_as_mainfile(filepath=blend_tpose)

    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=True,
        export_all_vertex_colors=True,
        export_attributes=True,
        export_materials='EXPORT',
        export_apply=True
    )
    bpy.ops.export_scene.gltf(
        filepath=glb_tpose,
        export_format='GLB',
        use_selection=True,
        export_all_vertex_colors=True,
        export_attributes=True,
        export_materials='EXPORT',
        export_apply=True
    )

    bpy.ops.wm.obj_export(
        filepath=obj_path,
        export_selected_objects=True,
        export_materials=True,
        export_colors=True
    )
    bpy.ops.wm.obj_export(
        filepath=obj_tpose,
        export_selected_objects=True,
        export_materials=True,
        export_colors=True
    )

    print("All models exported successfully!")

    # --- 6. RENDER 3/4 FRONT PERSPECTIVE PREVIEW ---
    scene = bpy.context.scene
    cam = bpy.data.cameras.new('FrontCam')
    cam.lens = 38
    cam_obj = bpy.data.objects.new('FrontCam', cam)
    scene.collection.objects.link(cam_obj)
    # Front 3/4 view facing the demon's head, chest, claws, and front wing membrane
    cam_obj.location = (-1.8, 4.6, 1.8)
    cam_obj.rotation_euler = (1.52, 0, 3.52)
    scene.camera = cam_obj

    # Front Key Sun light
    sun = bpy.data.lights.new('KeySun', 'SUN')
    sun.energy = 4.0
    sun_obj = bpy.data.objects.new('KeySun', sun)
    sun_obj.rotation_euler = (0.8, -0.4, -2.8)
    scene.collection.objects.link(sun_obj)

    # Rim light from behind to edge-light the wings and horns
    rim = bpy.data.lights.new('RimLight', 'SUN')
    rim.energy = 2.2
    rim_obj = bpy.data.objects.new('RimLight', rim)
    rim_obj.rotation_euler = (0.9, 0.4, 0.6)
    scene.collection.objects.link(rim_obj)

    render_path = os.path.join(MODELS_DIR, "proper_winged_demon_preview.png")
    scene.render.filepath = render_path
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    bpy.ops.render.render(write_still=True)
    print(f"Rendered preview to: {render_path}")

if __name__ == '__main__':
    build_winged_horror()
