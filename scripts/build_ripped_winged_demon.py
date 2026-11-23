"""
build_ripped_winged_demon.py — Ultra-Defined Muscular Winged Demon (The Archivist)
Preserves the user's EXACT approved winged demon design (head, horns, snout, fangs,
clawed arms, massive bat wings, digitigrade legs, and color palette) while sculpting
chiseled, anatomical muscle definition directly into its physique:
- Dual pectoral chest slabs with sternal cleft
- Chiseled 6-pack abdominal blocks with linea alba
- Serratus anterior rib cuts and V-cut obliques
- Muscular 3-headed deltoid shoulder caps
- Peaked bicep & horseshoe tricep bulges
- Muscular teardrop quadriceps and defined calf muscles
- Trapezius collar & dorsal erector spinae columns
- 100% watertight, seamless organic sculpt
- Baked devil crimson skin with muscle cavity ambient occlusion, yellow eyes, fangs, obsidian wings
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler, Matrix

BASE_DIR = r"c:\Users\ASUS HN116WS\OneDrive\Desktop\game"
MODELS_DIR = os.path.join(BASE_DIR, "public", "models")
ARTIFACT_DIR = r"C:\Users\ASUS HN116WS\.gemini\antigravity\brain\26402109-cda5-4c08-b712-b9e3aaf3595e"

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)

def build():
    reset_scene()
    print("Building Ripped Winged Demon Sculpt...")

    # =========================================================================
    # 1. THE EXACT APPROVED WINGED DEMON BASE SKELETON
    # =========================================================================
    me = bpy.data.meshes.new("DemonBaseSkeleton")
    bm = bmesh.new()
    vert_radii = []

    def add_v(pos, rad):
        v = bm.verts.new(Vector(pos))
        vert_radii.append((Vector(pos), rad))
        return v

    def add_e(v1, v2):
        return bm.edges.new([v1, v2])

    # Pelvis & Spine (stalking hunched posture)
    v_pelvis = add_v((0, -0.06, 1.05), 0.17)
    v_waist  = add_v((0,  0.00, 1.25), 0.12)
    v_mid    = add_v((0,  0.08, 1.48), 0.16)
    v_chest  = add_v((0,  0.16, 1.72), 0.20)
    v_hunch  = add_v((0, -0.04, 1.78), 0.13)
    v_neck1  = add_v((0,  0.26, 1.95), 0.11)
    v_neck2  = add_v((0,  0.34, 2.08), 0.10)
    v_head   = add_v((0,  0.42, 2.20), 0.15)

    add_e(v_pelvis, v_waist)
    add_e(v_waist, v_mid)
    add_e(v_mid, v_chest)
    add_e(v_chest, v_hunch)
    add_e(v_chest, v_neck1)
    add_e(v_neck1, v_neck2)
    add_e(v_neck2, v_head)

    # Spine Dorsal Spikes
    for s_z, s_y in [(1.45, -0.04), (1.60, 0.02), (1.75, -0.10), (1.90, 0.18)]:
        v_s_base = add_v((0, s_y, s_z), 0.07)
        v_s_tip  = add_v((0, s_y - 0.14, s_z + 0.06), 0.02)
        add_e(v_mid if s_z < 1.6 else v_chest, v_s_base)
        add_e(v_s_base, v_s_tip)

    # Demonic Skull & Gaping Snout
    v_snout_mid = add_v((0, 0.58, 2.18), 0.09)
    v_snout_tip = add_v((0, 0.70, 2.14), 0.05)
    add_e(v_head, v_snout_mid)
    add_e(v_snout_mid, v_snout_tip)

    # Upper Fangs
    for side in [-1, 1]:
        v_fang_root = add_v((side * 0.06, 0.62, 2.13), 0.032)
        v_fang_tip  = add_v((side * 0.05, 0.64, 2.01), 0.012)
        add_e(v_snout_mid, v_fang_root)
        add_e(v_fang_root, v_fang_tip)

    # Gaping Lower Mandible
    v_jaw_hinge = add_v((0, 0.44, 2.04), 0.07)
    v_jaw_mid   = add_v((0, 0.56, 1.98), 0.055)
    v_jaw_tip   = add_v((0, 0.68, 2.00), 0.035)
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

    # Arms
    for side in [-1, 1]:
        v_sh = add_v((side * 0.28, 0.14, 1.70), 0.12)
        v_el = add_v((side * 0.46, 0.16, 1.34), 0.08)
        v_wr = add_v((side * 0.42, 0.38, 1.02), 0.065)
        v_plm= add_v((side * 0.40, 0.48, 0.94), 0.055)
        add_e(v_chest, v_sh)
        add_e(v_sh, v_el)
        add_e(v_el, v_wr)
        add_e(v_wr, v_plm)

        for f_spread in [-0.045, 0.0, 0.045]:
            v_t1 = add_v((side * 0.40 + f_spread, 0.60, 0.86), 0.022)
            v_t2 = add_v((side * 0.40 + f_spread * 1.3, 0.68, 0.74), 0.012)
            add_e(v_plm, v_t1)
            add_e(v_t1, v_t2)

    # Digitigrade Predator Legs
    for side in [-1, 1]:
        v_hip  = add_v((side * 0.18, -0.06, 1.02), 0.12)
        v_knee = add_v((side * 0.24,  0.16, 0.68), 0.09)
        v_hock = add_v((side * 0.22, -0.12, 0.35), 0.075)
        v_foot = add_v((side * 0.20,  0.06, 0.08), 0.055)
        add_e(v_pelvis, v_hip)
        add_e(v_hip, v_knee)
        add_e(v_knee, v_hock)
        add_e(v_hock, v_foot)

        for t_off in [-0.04, 0.0, 0.04]:
            v_toe1 = add_v((side * 0.20 + t_off, 0.16, 0.03), 0.022)
            v_toe2 = add_v((side * 0.20 + t_off, 0.24, 0.01), 0.012)
            add_e(v_foot, v_toe1)
            add_e(v_toe1, v_toe2)

    # Bat Wing Spars
    wing_points = {}
    for side in [-1, 1]:
        v_wroot = add_v((side * 0.16, 0.02, 1.76), 0.085)
        v_welb  = add_v((side * 1.25, -0.06, 2.58), 0.065)
        v_wspur = add_v((side * 1.28, -0.16, 2.68), 0.02)
        v_wwr   = add_v((side * 2.05, 0.22, 2.32), 0.05)
        v_wthmb = add_v((side * 2.12, 0.32, 2.40), 0.02)

        add_e(v_chest, v_wroot)
        add_e(v_wroot, v_welb)
        add_e(v_welb, v_wspur)
        add_e(v_welb, v_wwr)
        add_e(v_wwr, v_wthmb)

        v_f1_m = add_v((side * 2.35, 0.18, 1.82), 0.030)
        v_f1_t = add_v((side * 2.52, 0.12, 1.35), 0.014)
        add_e(v_wwr, v_f1_m)
        add_e(v_f1_m, v_f1_t)

        v_f2_m = add_v((side * 2.18, 0.04, 1.25), 0.026)
        v_f2_t = add_v((side * 2.24, -0.04, 0.72), 0.012)
        add_e(v_wwr, v_f2_m)
        add_e(v_f2_m, v_f2_t)

        v_f3_m = add_v((side * 1.62, -0.10, 0.85), 0.024)
        v_f3_t = add_v((side * 1.66, -0.16, 0.42), 0.010)
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

    # Skin Modifier + Subsurf
    mod_skin = base_obj.modifiers.new("Skin", 'SKIN')
    skin_data = me.skin_vertices[0].data
    for i, v in enumerate(me.vertices):
        best_rad = 0.08
        min_d = 999.0
        for pos, rad in vert_radii:
            d = (v.co - pos).length
            if d < min_d:
                min_d = d
                best_rad = rad
        skin_data[i].radius = (best_rad, best_rad)

    mod_sub = base_obj.modifiers.new("Subsurf", 'SUBSURF')
    mod_sub.levels = 1

    bpy.ops.object.modifier_apply(modifier="Skin")
    bpy.ops.object.modifier_apply(modifier="Subsurf")

    # =========================================================================
    # 2. SCULPTED MUSCLE ANATOMY MASSES (CHEST, ABS, SHOULDERS, ARMS, LEGS)
    # =========================================================================
    muscle_parts = []

    def add_muscle(loc, scale, rot=(0,0,0)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=1.0, location=loc)
        m = bpy.context.active_object
        m.scale = scale
        m.rotation_euler = rot
        muscle_parts.append(m)
        return m

    # A. CHISELED PECTORAL CHEST PLATES
    for side in [-1, 1]:
        # Upper Pectoral Slab
        add_muscle((side * 0.10, 0.25, 1.76), (0.11, 0.08, 0.10), rot=(math.radians(20), math.radians(side * -10), math.radians(side * 8)))
        # Lower Pectoral Slab
        add_muscle((side * 0.09, 0.22, 1.64), (0.10, 0.07, 0.08), rot=(math.radians(15), math.radians(side * -8), 0))

    # B. CHISELED 6-PACK ABDOMINALS (RECTUS ABDOMINIS)
    abs_levels = [
        (1.52, 0.18, 0.055, 0.045, 0.05), # Upper abs
        (1.40, 0.13, 0.058, 0.045, 0.05), # Mid abs
        (1.28, 0.08, 0.052, 0.042, 0.05), # Lower abs / V-cut
    ]
    for z_pos, y_pos, rx, ry, rz in abs_levels:
        for side in [-1, 1]:
            add_muscle((side * 0.055, y_pos, z_pos), (rx, ry, rz), rot=(math.radians(16), 0, 0))

    # C. SERRATUS ANTERIOR & OBLIQUES (Flank ribs)
    for side in [-1, 1]:
        for sz, sy, sx in [(1.58, 0.13, 0.18), (1.46, 0.09, 0.16), (1.34, 0.05, 0.14)]:
            add_muscle((side * sx, sy, sz), (0.04, 0.04, 0.07), rot=(math.radians(25), math.radians(side * 35), 0))

    # D. DELTOID SHOULDER CAPS (3 heads)
    for side in [-1, 1]:
        add_muscle((side * 0.31, 0.14, 1.74), (0.10, 0.11, 0.11)) # Lateral head
        add_muscle((side * 0.29, 0.21, 1.72), (0.08, 0.08, 0.09)) # Anterior head
        add_muscle((side * 0.27, 0.06, 1.76), (0.08, 0.09, 0.09)) # Posterior head

        # Peaked Bicep & Tricep
        add_muscle((side * 0.38, 0.18, 1.50), (0.08, 0.09, 0.13), rot=(math.radians(18), math.radians(side * -15), 0)) # Bicep peak
        add_muscle((side * 0.36, 0.08, 1.50), (0.09, 0.09, 0.13), rot=(math.radians(12), math.radians(side * -12), 0)) # Tricep

        # Forearm Brachioradialis flexor mass
        add_muscle((side * 0.44, 0.24, 1.22), (0.075, 0.085, 0.12), rot=(math.radians(-20), math.radians(side * 12), 0))

    # E. MUSCULAR DIGITIGRADE LEGS (TEARDROP QUADS & CALVES)
    for side in [-1, 1]:
        # Gluteus / Upper hip
        add_muscle((side * 0.16, -0.08, 1.05), (0.10, 0.11, 0.10))
        # Vastus lateralis (outer quad sweep)
        add_muscle((side * 0.24, 0.05, 0.86), (0.095, 0.10, 0.15), rot=(math.radians(-22), math.radians(side * 12), 0))
        # Vastus medialis (teardrop quad above knee)
        add_muscle((side * 0.19, 0.14, 0.75), (0.08, 0.08, 0.10), rot=(math.radians(-15), 0, 0))
        # Gastrocnemius (muscular calf)
        add_muscle((side * 0.22, -0.06, 0.52), (0.085, 0.095, 0.14), rot=(math.radians(30), 0, 0))

    # F. BACK: LATISSIMUS DORSI & TRAPEZIUS
    for side in [-1, 1]:
        add_muscle((side * 0.18, -0.02, 1.56), (0.09, 0.10, 0.16), rot=(math.radians(-12), math.radians(side * -12), 0))
        add_muscle((side * 0.12, -0.03, 1.84), (0.09, 0.10, 0.12), rot=(math.radians(-18), 0, 0))
        # Erector spinae column
        add_muscle((side * 0.05, -0.05, 1.42), (0.035, 0.04, 0.18), rot=(math.radians(16), 0, 0))

    # =========================================================================
    # 3. LEATHERY WING MEMBRANES
    # =========================================================================
    membrane_objs = []
    for side, pts in wing_points.items():
        w_me = bpy.data.meshes.new(f"Membrane_{side}")
        w_bm = bmesh.new()

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

        scallop1 = (pts['f1_t'] + pts['f2_t']) * 0.5 + Vector((side * -0.15, 0.04, 0.12))
        scallop2 = (pts['f2_t'] + pts['f3_t']) * 0.5 + Vector((side * -0.14, 0.02, 0.14))
        scallop3 = (pts['f3_t'] + pts['waist']) * 0.5 + Vector((side * -0.12, 0.00, 0.18))

        v_sc1 = w_bm.verts.new(scallop1)
        v_sc2 = w_bm.verts.new(scallop2)
        v_sc3 = w_bm.verts.new(scallop3)

        w_bm.verts.ensure_lookup_table()
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

    # =========================================================================
    # 4. UNIFY SKELETON + MUSCLES + WINGS INTO ONE LIVING SCULPT
    # =========================================================================
    bpy.ops.object.select_all(action='DESELECT')
    base_obj.select_set(True)
    for m in muscle_parts + membrane_objs:
        m.select_set(True)
    bpy.context.view_layer.objects.active = base_obj
    bpy.ops.object.join()

    sculpt = bpy.context.active_object
    sculpt.name = "The_Winged_Horror"

    print("Executing fine Voxel Remesh to fuse body, muscles and wings into living skin...")
    # 0.016m voxel size gives seamless organic muscle flow and watertight manifold
    sculpt.data.remesh_voxel_size = 0.016
    sculpt.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()

    # Subtle smooth modifier so the skin flows naturally over muscle contours
    mod_sm = sculpt.modifiers.new("OrganicSkin", 'SMOOTH')
    mod_sm.factor = 0.42
    mod_sm.iterations = 2
    bpy.ops.object.modifier_apply(modifier="OrganicSkin")

    for poly in sculpt.data.polygons:
        poly.use_smooth = True

    final_verts = len(sculpt.data.vertices)
    print(f"Ripped Sculpt complete! Vertices: {final_verts}, Faces: {len(sculpt.data.polygons)}")

    # =========================================================================
    # 5. BAKE USER PALETTE & MUSCLE CREVICE AMBIENT OCCLUSION
    # =========================================================================
    print("Baking vertex colors...")
    color_layer = sculpt.data.color_attributes.new(
        name="Color",
        type='FLOAT_COLOR',
        domain='POINT'
    )
    sculpt.data.color_attributes.active_color = color_layer

    for i, vert in enumerate(sculpt.data.vertices):
        co = vert.co
        x, y, z = co.x, co.y, co.z
        absX = abs(x)

        # User's Devil Crimson Flesh
        base_r = 0.58
        base_g = 0.04
        base_b = 0.04

        # Wings: Dark Obsidian Charcoal Leather
        wing_r = 0.08
        wing_g = 0.05
        wing_b = 0.06

        if absX < 0.22:
            r, g, b = base_r, base_g, base_b
        elif absX < 0.48:
            t = (absX - 0.22) / 0.26
            t = t * t * (3.0 - 2.0 * t)
            r = base_r * (1.0 - t) + wing_r * t
            g = base_g * (1.0 - t) + wing_g * t
            b = base_b * (1.0 - t) + wing_b * t
        else:
            r, g, b = wing_r, wing_g, wing_b
            if z < 0.85 or absX > 2.1:
                r *= 0.55
                g *= 0.55
                b *= 0.55

        # Muscle Crevice Shading (Cavity Occlusion in Pecs, Abs, Linea Alba, Spine)
        if absX < 0.24 and z > 1.15 and z < 1.90:
            # Sternal cleft & Linea Alba
            if absX < 0.025:
                r *= 0.45
                g *= 0.45
                b *= 0.45
            # Abdominal transverse inscriptions
            for cut_z in [1.32, 1.45, 1.58, 1.70]:
                if abs(z - cut_z) < 0.024:
                    r *= 0.55
                    g *= 0.55
                    b *= 0.55

        # Spinal erector column shadow
        if y < -0.02 and absX < 0.035 and z > 1.2 and z < 1.9:
            r *= 0.40
            g *= 0.40
            b *= 0.40

        # Horns: Obsidian Black Gradient Tips
        if z > 2.25 and y < 0.35 and absX > 0.06:
            t_horn = min(1.0, (z - 2.25) / 0.42)
            r = base_r * (1.0 - t_horn) + 0.05 * t_horn
            g = base_g * (1.0 - t_horn) + 0.04 * t_horn
            b = base_b * (1.0 - t_horn) + 0.04 * t_horn

        # Sharp Demonic Yellow Eyes
        if z >= 2.14 and z <= 2.26 and y >= 0.44 and y <= 0.54 and absX >= 0.04 and absX <= 0.14:
            r = 1.0
            g = 0.88
            b = 0.04

        # Razor Fangs (Bone White)
        elif z >= 1.98 and z <= 2.12 and y >= 0.56 and absX >= 0.02 and absX <= 0.08:
            r = 0.95
            g = 0.92
            b = 0.88

        # Clawed Talons (Hands & Feet)
        elif (z < 0.08) or (y > 0.52 and z < 1.00 and absX > 0.32):
            r = 0.06
            g = 0.05
            b = 0.06

        color_layer.data[i].color = (max(0.0, min(1.0, r)), max(0.0, min(1.0, g)), max(0.0, min(1.0, b)), 1.0)

    # Material setup
    mat = bpy.data.materials.new("RippedHorrorMat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    bsdf.inputs['Roughness'].default_value = 0.50
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = 0.12

    attr = nodes.new(type="ShaderNodeAttribute")
    attr.attribute_name = "Color"

    links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    sculpt.data.materials.append(mat)

    # =========================================================================
    # 6. EXPORT ALL FORMATS
    # =========================================================================
    os.makedirs(MODELS_DIR, exist_ok=True)
    blend_path = os.path.join(MODELS_DIR, "the_archivist.blend")
    glb_path   = os.path.join(MODELS_DIR, "the_archivist.glb")
    blend_tpose = os.path.join(MODELS_DIR, "archivist_tpose.blend")
    glb_tpose   = os.path.join(MODELS_DIR, "archivist_tpose.glb")
    obj_path   = os.path.join(MODELS_DIR, "the_archivist.obj")
    obj_tpose  = os.path.join(MODELS_DIR, "archivist_tpose.obj")

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

    bpy.ops.wm.obj_export(filepath=obj_path, export_selected_objects=True, export_materials=True, export_colors=True)
    bpy.ops.wm.obj_export(filepath=obj_tpose, export_selected_objects=True, export_materials=True, export_colors=True)

    print("Exports complete!")

    # =========================================================================
    # 7. STUDIO PREVIEW RENDERS (Front 3/4 & Back 3/4)
    # =========================================================================
    scene = bpy.context.scene
    for o in list(scene.objects):
        if o.type in ['LIGHT', 'CAMERA']:
            bpy.data.objects.remove(o, do_unlink=True)

    key = bpy.data.lights.new('KeySun', 'SUN')
    key.energy = 4.5
    key_obj = bpy.data.objects.new('KeySun', key)
    key_obj.rotation_euler = (0.7, 0.3, -0.6)
    scene.collection.objects.link(key_obj)

    fill = bpy.data.lights.new('FillSun', 'SUN')
    fill.energy = 2.0
    fill_obj = bpy.data.objects.new('FillSun', fill)
    fill_obj.rotation_euler = (0.8, -0.4, 0.8)
    scene.collection.objects.link(fill_obj)

    rim = bpy.data.lights.new('RimSun', 'SUN')
    rim.energy = 3.5
    rim_obj = bpy.data.objects.new('RimSun', rim)
    rim_obj.rotation_euler = (0.5, 0.0, 3.14)
    scene.collection.objects.link(rim_obj)

    cam = bpy.data.cameras.new('StudioCam')
    cam.lens = 40
    cam_obj = bpy.data.objects.new('StudioCam', cam)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 960
    scene.render.resolution_y = 640

    # Front 3/4 Camera Render
    cam_obj.location = (-1.5, 4.2, 1.8)
    cam_obj.rotation_euler = (1.52, 0, 3.50)
    render_front = os.path.join(ARTIFACT_DIR, "ripped_demon_front_34.png")
    scene.render.filepath = render_front
    bpy.ops.render.render(write_still=True)
    print(f"Front 3/4 render saved to: {render_front}")

    # Back 3/4 Camera Render
    cam_obj.location = (-1.5, -4.2, 1.8)
    cam_obj.rotation_euler = (1.52, 0, -0.35)
    render_back = os.path.join(ARTIFACT_DIR, "ripped_demon_back_34.png")
    scene.render.filepath = render_back
    bpy.ops.render.render(write_still=True)
    print(f"Back 3/4 render saved to: {render_back}")

if __name__ == '__main__':
    build()
