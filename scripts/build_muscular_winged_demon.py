"""
build_muscular_winged_demon.py — Ultra-Detailed Muscular Winged Horror (The Archivist)
Builds an intensely muscular, anatomically defined demon physique with:
- Dual heavy pectoral plates with deep sternal cleavage
- Chiseled 6-pack abdominal blocks with linea alba
- Serratus anterior rib fingers and V-cut obliques
- 3-headed massive deltoid shoulder caps
- Bulging peaked biceps, horseshoe triceps, and vascular forearm flexors
- Muscular trapezius collar and broad latissimus dorsi V-taper
- Dual erector spinae columns along the dorsal spine
- Heavy teardrop quadriceps, powerful hamstrings, and carved digitigrade calves
- Heavy demonic brow ridges, zygomatic cheekbones, masseter jaw muscles, fangs, horns
- Massive continuous bat wings with leathery membranes
- Baked vertex color palette honoring user's devil crimson paint, yellow eyes, white fangs, and obsidian wings, with baked muscle crevice ambient occlusion!
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler, Matrix

MODELS_DIR = r"C:\Users\ASUS HN116WS\OneDrive\Desktop\game\public\models"

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)

def build_muscular_demon():
    reset_scene()
    print("Building Ultra-Detailed Muscular Winged Demon...")

    parts = []

    def add_mesh_part(mesh_type, loc, scale, rot=(0,0,0), **kwargs):
        if mesh_type == 'sphere':
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=1.0, location=loc)
        elif mesh_type == 'cylinder':
            bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=1.0, depth=2.0, location=loc)
        elif mesh_type == 'cone':
            bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=1.0, radius2=kwargs.get('radius2', 0.0), depth=2.0, location=loc)
        elif mesh_type == 'cube':
            bpy.ops.mesh.primitive_cube_add(size=2.0, location=loc)

        obj = bpy.context.active_object
        obj.scale = scale
        obj.rotation_euler = rot
        parts.append(obj)
        return obj

    # =========================================================================
    # 1. CORE TORSO & PELVIS
    # =========================================================================
    # Pelvis / Hips (gluteal & hip muscle mass)
    add_mesh_part('sphere', (0, -0.06, 1.08), (0.24, 0.18, 0.20))
    for side in [-1, 1]:
        # Gluteus medius / hip curve
        add_mesh_part('sphere', (side * 0.16, -0.10, 1.08), (0.12, 0.14, 0.14))

    # Core Spine Column & Abdominal Core
    add_mesh_part('cylinder', (0, 0.02, 1.30), (0.16, 0.14, 0.22), rot=(math.radians(14), 0, 0))
    add_mesh_part('sphere',   (0, 0.08, 1.58), (0.22, 0.18, 0.22), rot=(math.radians(18), 0, 0))

    # Broad Muscular Ribcage
    add_mesh_part('sphere',   (0, 0.14, 1.80), (0.28, 0.22, 0.26), rot=(math.radians(22), 0, 0))

    # =========================================================================
    # 2. DEFINED MUSCULAR CHEST (PECTORALIS MAJOR)
    # =========================================================================
    for side in [-1, 1]:
        # Upper & Lower Pectoral Slab
        add_mesh_part('sphere', (side * 0.13, 0.26, 1.84), (0.15, 0.11, 0.14), rot=(math.radians(25), math.radians(side * -12), math.radians(side * 8)))
        add_mesh_part('sphere', (side * 0.12, 0.22, 1.70), (0.14, 0.10, 0.12), rot=(math.radians(18), math.radians(side * -10), 0))

    # =========================================================================
    # 3. CHISELED 6-PACK ABDOMINALS (RECTUS ABDOMINIS)
    # =========================================================================
    abs_coords = [
        (1.56, 0.20, 0.07, 0.055, 0.06), # Upper abs
        (1.42, 0.15, 0.075, 0.055, 0.06), # Mid abs
        (1.28, 0.10, 0.07, 0.050, 0.06), # Lower abs / V-cut
    ]
    for z_pos, y_pos, rx, ry, rz in abs_coords:
        for side in [-1, 1]:
            add_mesh_part('sphere', (side * 0.065, y_pos, z_pos), (rx, ry, rz), rot=(math.radians(16), 0, 0))

    # =========================================================================
    # 4. SERRATUS ANTERIOR & EXTERNAL OBLIQUES (Flank Muscles)
    # =========================================================================
    for side in [-1, 1]:
        for r_idx, (sz, sy, sx) in enumerate([(1.64, 0.16, 0.24), (1.52, 0.12, 0.22), (1.40, 0.08, 0.20), (1.28, 0.04, 0.18)]):
            # Interlocking muscle fingers
            add_mesh_part('cylinder', (side * sx, sy, sz), (0.045, 0.045, 0.10), rot=(math.radians(35), math.radians(side * 40), 0))

    # =========================================================================
    # 5. BACK: LATISSIMUS DORSI, TRAPEZIUS & ERECTOR SPINAE
    # =========================================================================
    for side in [-1, 1]:
        # Latissimus Dorsi (wide V-taper wings under armpits)
        add_mesh_part('sphere', (side * 0.24, -0.02, 1.62), (0.12, 0.14, 0.22), rot=(math.radians(-15), math.radians(side * -15), 0))
        # Trapezius (heavy neck collar & upper back muscle)
        add_mesh_part('sphere', (side * 0.16, -0.04, 1.95), (0.13, 0.14, 0.16), rot=(math.radians(-20), 0, 0))
        # Erector Spinae (spinal columns)
        add_mesh_part('cylinder', (side * 0.07, -0.06, 1.45), (0.045, 0.05, 0.25), rot=(math.radians(18), 0, 0))

    # Prominent Dorsal Spine Spikes
    for sz, sy in [(1.35, -0.08), (1.52, -0.04), (1.70, -0.02), (1.88, 0.02), (2.05, 0.10)]:
        add_mesh_part('cone', (0, sy - 0.10, sz), (0.035, 0.04, 0.12), rot=(math.radians(-75), 0, 0))

    # =========================================================================
    # 6. SHOULDERS (DELTOIDS: 3 HEADS) & POWERFUL CLAWED ARMS
    # =========================================================================
    for side in [-1, 1]:
        # Clavicle bone ridge
        add_mesh_part('cylinder', (side * 0.18, 0.18, 1.96), (0.035, 0.035, 0.14), rot=(0, math.radians(side * 80), 0))

        # Massive 3-Headed Deltoid Cap
        add_mesh_part('sphere', (side * 0.36, 0.14, 1.84), (0.15, 0.16, 0.16)) # Central deltoid
        add_mesh_part('sphere', (side * 0.34, 0.22, 1.82), (0.11, 0.12, 0.14)) # Anterior (front) deltoid
        add_mesh_part('sphere', (side * 0.32, 0.04, 1.86), (0.11, 0.13, 0.14)) # Posterior (rear) deltoid

        # Bulging Peaked Bicep & Horseshoe Tricep
        add_mesh_part('sphere', (side * 0.44, 0.20, 1.55), (0.11, 0.12, 0.18), rot=(math.radians(22), math.radians(side * -18), 0)) # Bicep peak
        add_mesh_part('sphere', (side * 0.42, 0.05, 1.55), (0.12, 0.13, 0.18), rot=(math.radians(15), math.radians(side * -15), 0)) # Tricep lateral head
        add_mesh_part('sphere', (side * 0.36, 0.02, 1.62), (0.10, 0.11, 0.15), rot=(math.radians(15), 0, 0)) # Tricep long head

        # Elbow Joint Bone
        add_mesh_part('sphere', (side * 0.50, 0.18, 1.34), (0.08, 0.09, 0.08))

        # Forearm Musculature (Brachioradialis & Flexors)
        add_mesh_part('sphere',   (side * 0.46, 0.28, 1.20), (0.10, 0.11, 0.16), rot=(math.radians(-25), math.radians(side * 15), 0))
        add_mesh_part('cylinder', (side * 0.42, 0.38, 1.04), (0.065, 0.065, 0.14), rot=(math.radians(-32), math.radians(side * 10), 0))

        # Wrist & Palm
        add_mesh_part('sphere', (side * 0.40, 0.48, 0.94), (0.07, 0.08, 0.05), rot=(math.radians(-30), 0, 0))

        # 3 Wicked Hooked Claws / Talons
        for f_idx, f_spread in enumerate([-0.045, 0.0, 0.045]):
            cx = side * 0.40 + f_spread
            add_mesh_part('cone', (cx, 0.58, 0.86), (0.022, 0.022, 0.09), rot=(math.radians(-45), math.radians(side * (f_spread * 70)), 0))
            add_mesh_part('cone', (cx + f_spread * 0.3, 0.65, 0.74), (0.015, 0.015, 0.08), rot=(math.radians(-70), 0, 0))

    # =========================================================================
    # 7. MUSCULAR DIGITIGRADE LEGS (TEARDROP QUADS & CALVES)
    # =========================================================================
    for side in [-1, 1]:
        # Hip Socket & Upper Thigh
        add_mesh_part('sphere', (side * 0.20, -0.06, 1.02), (0.14, 0.15, 0.14))

        # Massive Quadriceps: Vastus Lateralis (outer sweep) & Rectus Femoris (center peak)
        add_mesh_part('sphere', (side * 0.26, 0.04, 0.85), (0.13, 0.14, 0.22), rot=(math.radians(-25), math.radians(side * -12), 0)) # Rectus femoris
        add_mesh_part('sphere', (side * 0.30, -0.02, 0.86), (0.12, 0.13, 0.20), rot=(math.radians(-25), math.radians(side * 15), 0)) # Vastus lateralis
        add_mesh_part('sphere', (side * 0.22, 0.12, 0.74), (0.11, 0.11, 0.14), rot=(math.radians(-15), 0, 0)) # Vastus medialis (teardrop)

        # Knee Joint Bone Cap
        add_mesh_part('sphere', (side * 0.24, 0.16, 0.68), (0.09, 0.09, 0.09))

        # Muscular Calf (Gastrocnemius heads)
        add_mesh_part('sphere',   (side * 0.24, -0.06, 0.52), (0.11, 0.12, 0.18), rot=(math.radians(35), 0, 0))
        add_mesh_part('cylinder', (side * 0.22, -0.10, 0.34), (0.07, 0.07, 0.16), rot=(math.radians(45), 0, 0)) # Achilles tendon stem

        # Hock Joint
        add_mesh_part('sphere', (side * 0.21, -0.16, 0.22), (0.07, 0.07, 0.07))

        # Digitigrade Lower Foot Stem
        add_mesh_part('cylinder', (side * 0.20, -0.06, 0.12), (0.055, 0.055, 0.14), rot=(math.radians(-40), 0, 0))

        # Ground Foot & Talons
        add_mesh_part('sphere', (side * 0.20, 0.06, 0.05), (0.08, 0.10, 0.04))
        for t_off in [-0.035, 0.0, 0.035]:
            add_mesh_part('cone', (side * 0.20 + t_off, 0.18, 0.02), (0.022, 0.022, 0.07), rot=(math.radians(-15), 0, 0))

    # =========================================================================
    # 8. DEMONIC SKULL, JAWS, HORNS & NECK
    # =========================================================================
    # Muscular Neck Columns
    add_mesh_part('cylinder', (0, 0.24, 1.98), (0.12, 0.13, 0.22), rot=(math.radians(30), 0, 0))
    for side in [-1, 1]:
        # Sternocleidomastoid neck muscles
        add_mesh_part('cylinder', (side * 0.08, 0.22, 2.02), (0.04, 0.045, 0.18), rot=(math.radians(35), math.radians(side * -15), 0))

    # Cranium & Temporal Hollows
    add_mesh_part('sphere', (0, 0.38, 2.22), (0.17, 0.22, 0.16), rot=(math.radians(18), 0, 0))

    # Heavy Snarling Brow Ridges & Zygomatic Cheekbones
    for side in [-1, 1]:
        add_mesh_part('cylinder', (side * 0.08, 0.50, 2.26), (0.035, 0.04, 0.09), rot=(0, math.radians(side * 35), math.radians(side * 20))) # Brow
        add_mesh_part('sphere',   (side * 0.12, 0.44, 2.16), (0.045, 0.06, 0.045)) # Cheekbone
        add_mesh_part('sphere',   (side * 0.11, 0.40, 2.06), (0.06, 0.07, 0.06)) # Masseter jaw muscle

    # Elongated Upper Snout
    add_mesh_part('cylinder', (0, 0.58, 2.20), (0.09, 0.10, 0.16), rot=(math.radians(12), 0, 0))

    # Razor Fangs
    for side in [-1, 1]:
        add_mesh_part('cone', (side * 0.06, 0.62, 2.10), (0.022, 0.022, 0.07), rot=(math.radians(10), 0, 0))
        add_mesh_part('cone', (side * 0.03, 0.66, 2.12), (0.016, 0.016, 0.05), rot=(math.radians(10), 0, 0))

    # Gaping Lower Mandible
    add_mesh_part('cylinder', (0, 0.52, 2.00), (0.07, 0.08, 0.14), rot=(math.radians(-18), 0, 0))
    add_mesh_part('cone',     (0, 0.66, 2.02), (0.05, 0.05, 0.08), rot=(math.radians(10), 0, 0))

    # Swept-Back Curved Demon Horns
    for side in [-1, 1]:
        add_mesh_part('cylinder', (side * 0.12, 0.36, 2.36), (0.055, 0.055, 0.15), rot=(math.radians(-35), math.radians(side * 25), 0))
        add_mesh_part('cylinder', (side * 0.22, 0.20, 2.52), (0.045, 0.045, 0.18), rot=(math.radians(-55), math.radians(side * 30), 0))
        add_mesh_part('cone',     (side * 0.32, -0.02, 2.66), (0.035, 0.035, 0.20), rot=(math.radians(-70), math.radians(side * 25), 0))

    # =========================================================================
    # 9. MASSIVE CURVED BAT WINGS (MAIN SPAR, STRUTS & SCALLOPED MEMBRANES)
    # =========================================================================
    wing_objs = []
    wing_pts = {}

    for side in [-1, 1]:
        # Wing Arm Bone Spars
        w_root = Vector((side * 0.18, 0.02, 1.82))
        w_elb  = Vector((side * 1.25, -0.06, 2.58))
        w_wr   = Vector((side * 2.05, 0.22, 2.32))

        # Finger Tips
        f1_t = Vector((side * 2.52, 0.12, 1.35))
        f2_t = Vector((side * 2.24, -0.04, 0.72))
        f3_t = Vector((side * 1.66, -0.16, 0.42))
        w_wst = Vector((side * 0.18, -0.02, 1.25))

        def add_bone_strut(p1, p2, r1, r2):
            vec = p2 - p1
            mid = (p1 + p2) * 0.5
            rot = Vector((0,0,1)).rotation_difference(vec).to_euler()
            bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=(r1+r2)*0.5, depth=vec.length, location=mid)
            st = bpy.context.active_object
            st.rotation_euler = rot
            wing_objs.append(st)

        # Main wing arm bones
        add_bone_strut(w_root, w_elb, 0.07, 0.055)
        add_bone_strut(w_elb, w_wr, 0.055, 0.045)

        # Elbow hook & wrist thumb claw
        add_mesh_part('cone', w_elb + Vector((0, -0.14, 0.10)), (0.03, 0.03, 0.16), rot=(math.radians(-65), math.radians(side * 25), 0))
        add_mesh_part('cone', w_wr + Vector((0, 0.10, 0.05)), (0.025, 0.025, 0.12), rot=(math.radians(45), math.radians(side * -20), 0))

        # Radiating finger struts
        add_bone_strut(w_wr, f1_t, 0.035, 0.015)
        add_bone_strut(w_wr, f2_t, 0.030, 0.014)
        add_bone_strut(w_elb, f3_t, 0.032, 0.014)

        wing_pts[side] = {
            'root': w_root, 'elbow': w_elb, 'wrist': w_wr,
            'f1_t': f1_t, 'f2_t': f2_t, 'f3_t': f3_t, 'waist': w_wst
        }

    # Build Wing Leathery Membrane Sheets
    for side, pts in wing_pts.items():
        w_me = bpy.data.meshes.new(f"Membrane_{side}")
        w_bm = bmesh.new()

        v_rt  = w_bm.verts.new(pts['root'])
        v_el  = w_bm.verts.new(pts['elbow'])
        v_wr  = w_bm.verts.new(pts['wrist'])
        v_f1t = w_bm.verts.new(pts['f1_t'])
        v_f2t = w_bm.verts.new(pts['f2_t'])
        v_f3t = w_bm.verts.new(pts['f3_t'])
        v_wst = w_bm.verts.new(pts['waist'])

        # Scallop edge vertices
        sc1 = (pts['f1_t'] + pts['f2_t']) * 0.5 + Vector((side * -0.16, 0.04, 0.12))
        sc2 = (pts['f2_t'] + pts['f3_t']) * 0.5 + Vector((side * -0.15, 0.02, 0.14))
        sc3 = (pts['f3_t'] + pts['waist']) * 0.5 + Vector((side * -0.12, 0.00, 0.18))

        v_sc1 = w_bm.verts.new(sc1)
        v_sc2 = w_bm.verts.new(sc2)
        v_sc3 = w_bm.verts.new(sc3)

        # Mid sail vertices for aerodynamic curvature
        v_m1 = w_bm.verts.new((pts['elbow'] + pts['wrist'] + pts['f1_t']) / 3.0 + Vector((0, 0.08, 0)))
        v_m2 = w_bm.verts.new((pts['elbow'] + pts['f2_t'] + pts['f3_t']) / 3.0 + Vector((0, 0.06, 0)))

        w_bm.verts.ensure_lookup_table()

        w_bm.faces.new([v_rt, v_el, v_m2, v_wst])
        w_bm.faces.new([v_el, v_wr, v_m1])
        w_bm.faces.new([v_m1, v_wr, v_f1t])
        w_bm.faces.new([v_m1, v_f1t, v_sc1, v_f2t])
        w_bm.faces.new([v_el, v_m1, v_f2t, v_m2])
        w_bm.faces.new([v_m2, v_f2t, v_sc2, v_f3t])
        w_bm.faces.new([v_m2, v_f3t, v_sc3, v_wst])

        w_bm.to_mesh(w_me)
        w_bm.free()

        w_obj = bpy.data.objects.new(f"Membrane_{side}", w_me)
        bpy.context.collection.objects.link(w_obj)

        mod_sub = w_obj.modifiers.new("Subsurf", 'SUBSURF')
        mod_sub.levels = 2
        mod_sol = w_obj.modifiers.new("Solidify", 'SOLIDIFY')
        mod_sol.thickness = 0.025
        mod_sol.offset = 0

        bpy.context.view_layer.objects.active = w_obj
        w_obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier="Subsurf")
        bpy.ops.object.modifier_apply(modifier="Solidify")
        wing_objs.append(w_obj)

    print(f"All {len(parts) + len(wing_objs)} anatomical masses constructed.")

    # =========================================================================
    # 10. FUSE INTO ONE CONTINUOUS SOLID SCULPT AT HIGH VOXEL RESOLUTION
    # =========================================================================
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts + wing_objs:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()

    demon = bpy.context.active_object
    demon.name = "The_Winged_Horror"

    print("Executing fine Voxel Remesh to fuse all muscular striations & wings...")
    # 0.026m voxel size gives ~130,000 vertices - exact match to The Warden (137k vertices)
    demon.data.remesh_voxel_size = 0.026
    demon.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()

    # Subtle smooth modifier to give organic flesh flow over muscle bundles
    mod_sm = demon.modifiers.new("MuscleFlow", 'SMOOTH')
    mod_sm.factor = 0.42
    mod_sm.iterations = 2
    bpy.ops.object.modifier_apply(modifier="MuscleFlow")

    for poly in demon.data.polygons:
        poly.use_smooth = True

    vert_count = len(demon.data.vertices)
    print(f"Sculpt complete! Vertices: {vert_count}, Faces: {len(demon.data.polygons)}")

    # =========================================================================
    # 11. BAKE USER PALETTE & MUSCLE CREVICE AMBIENT OCCLUSION
    # =========================================================================
    print("Baking vertex colors with muscle shading...")
    color_layer = demon.data.color_attributes.new(
        name="Color",
        type='FLOAT_COLOR',
        domain='POINT'
    )
    demon.data.color_attributes.active_color = color_layer

    for i, vert in enumerate(demon.data.vertices):
        co = vert.co
        x, y, z = co.x, co.y, co.z
        norm = vert.normal
        absX = abs(x)

        # User's Devil Crimson Flesh
        base_r = 0.58
        base_g = 0.04
        base_b = 0.04

        # Wings: Dark obsidian charcoal leather
        wing_r = 0.08
        wing_g = 0.05
        wing_b = 0.06

        # Blend body crimson into dark wing leather
        if absX < 0.28:
            r, g, b = base_r, base_g, base_b
        elif absX < 0.65:
            t = (absX - 0.28) / 0.37
            t = t * t * (3.0 - 2.0 * t)
            r = base_r * (1.0 - t) + wing_r * t
            g = base_g * (1.0 - t) + wing_g * t
            b = base_b * (1.0 - t) + wing_b * t
        else:
            r, g, b = wing_r, wing_g, wing_b
            if z < 0.9 or absX > 2.1: # wingtips black gradient
                r *= 0.5
                g *= 0.5
                b *= 0.5

        # Muscle Crevice Shading (Cavity occlusion based on curvature & clefts)
        # Sternal groove, abdominal clefts, spinal furrow:
        if absX < 0.28 and z > 1.1 and z < 1.9:
            # Centerline linea alba / sternum cleft
            if absX < 0.025:
                r *= 0.45
                g *= 0.45
                b *= 0.45
            # Abdominal horizontal intersections
            for cut_z in [1.35, 1.49, 1.63, 1.76]:
                if abs(z - cut_z) < 0.025:
                    r *= 0.55
                    g *= 0.55
                    b *= 0.55

        # Spinal furrow & erector spinae shadow
        if y < 0.02 and absX < 0.035 and z > 1.2 and z < 2.0:
            r *= 0.40
            g *= 0.40
            b *= 0.40

        # Horns: Obsidian black tips
        if z > 2.25 and y < 0.36 and absX > 0.06:
            t_horn = min(1.0, (z - 2.25) / 0.45)
            r = base_r * (1.0 - t_horn) + 0.05 * t_horn
            g = base_g * (1.0 - t_horn) + 0.04 * t_horn
            b = base_b * (1.0 - t_horn) + 0.04 * t_horn

        # Piercing Demonic Yellow Eyes
        if z >= 2.16 and z <= 2.28 and y >= 0.45 and y <= 0.55 and absX >= 0.04 and absX <= 0.12:
            # User's sharp yellow eye paint!
            r = 1.0
            g = 0.88
            b = 0.04

        # Sharp White Fangs
        elif z >= 2.04 and z <= 2.14 and y >= 0.58 and absX >= 0.02 and absX <= 0.08:
            r = 0.95
            g = 0.92
            b = 0.88

        # Clawed Talons (Hands & Feet)
        elif (z < 0.06) or (y > 0.54 and z < 0.95 and absX > 0.34):
            r = 0.05
            g = 0.04
            b = 0.05

        color_layer.data[i].color = (max(0.0, min(1.0, r)), max(0.0, min(1.0, g)), max(0.0, min(1.0, b)), 1.0)

    # Material
    mat = bpy.data.materials.new("MuscularHorrorMat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    bsdf.inputs['Roughness'].default_value = 0.45
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = 0.15

    attr = nodes.new(type="ShaderNodeAttribute")
    attr.attribute_name = "Color"

    links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    demon.data.materials.append(mat)

    # =========================================================================
    # 12. EXPORT ASSETS & RENDER 3/4 PREVIEW
    # =========================================================================
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

    bpy.ops.wm.obj_export(filepath=obj_path, export_selected_objects=True, export_materials=True, export_colors=True)
    bpy.ops.wm.obj_export(filepath=obj_tpose, export_selected_objects=True, export_materials=True, export_colors=True)

    print("All exports complete!")

    # Front 3/4 Camera Render
    scene = bpy.context.scene
    cam = bpy.data.cameras.new('FrontCam')
    cam.lens = 38
    cam_obj = bpy.data.objects.new('FrontCam', cam)
    scene.collection.objects.link(cam_obj)
    cam_obj.location = (-1.8, 4.5, 1.7)
    cam_obj.rotation_euler = (1.52, 0, 3.52)
    scene.camera = cam_obj

    sun = bpy.data.lights.new('KeySun', 'SUN')
    sun.energy = 4.2
    sun_obj = bpy.data.objects.new('KeySun', sun)
    sun_obj.rotation_euler = (0.8, -0.4, -2.8)
    scene.collection.objects.link(sun_obj)

    rim = bpy.data.lights.new('RimLight', 'SUN')
    rim.energy = 2.5
    rim_obj = bpy.data.objects.new('RimLight', rim)
    rim_obj.rotation_euler = (0.9, 0.4, 0.6)
    scene.collection.objects.link(rim_obj)

    render_path = os.path.join(MODELS_DIR, "muscular_demon_preview.png")
    scene.render.filepath = render_path
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    bpy.ops.render.render(write_still=True)
    print(f"Rendered muscular preview to: {render_path}")

if __name__ == '__main__':
    build_muscular_demon()
