"""
build_sculpted_muscular_demon.py — Sculpted Muscular Winged Demon (The Archivist)
Transforms the muscular anatomy benchmark into a proud, fully defined winged horror:
- Hyper-sculpted muscular torso (chiseled pecs, 6-pack abs, deltoids, biceps, back)
- Curved demon horns, razor fangs, menacing brow
- Massive curved bat wings seamlessly fused into the scapular back muscles
- Pruned and watertight solid manifold mesh (~135k vertices matching The Warden)
- Baked devil crimson skin with muscle cavity occlusion, sharp yellow eyes, obsidian wings
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler, Matrix

BASE_DIR = r"c:\Users\ASUS HN116WS\OneDrive\Desktop\game"
MODELS_DIR = os.path.join(BASE_DIR, "public", "models")
SOURCE_BLEND = os.path.join(MODELS_DIR, "warden_tpose.blend")
ARTIFACT_DIR = r"C:\Users\ASUS HN116WS\.gemini\antigravity\brain\26402109-cda5-4c08-b712-b9e3aaf3595e"

def build():
    print("Loading base muscular anatomy...")
    bpy.ops.wm.open_mainfile(filepath=SOURCE_BLEND)
    
    # Identify mesh object
    body = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            body = obj
            break
            
    if not body:
        raise RuntimeError("No mesh object in warden_tpose.blend")

    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    body.name = "Muscular_Body"
    
    # 1. Clean up surface quills/sticks on body by smoothing
    mod_sm = body.modifiers.new("PreClean", 'SMOOTH')
    mod_sm.factor = 0.5
    mod_sm.iterations = 3
    bpy.ops.object.modifier_apply(modifier="PreClean")
    
    # 2. Symmetrize and straighten legs into upright stable demon stance
    mesh = body.data
    # In warden_tpose, right leg (X < -0.1) was bent/raised compared to left leg.
    # Let's inspect vertices for legs (Z < 0.75, abs(X) < 0.5):
    # Left leg is at X > 0.1, right leg at X < -0.1.
    # Mirror the grounded left leg onto the right leg for perfect symmetry and stability:
    v_left = [v for v in mesh.vertices if v.co.x > 0.08 and v.co.z < 0.95 and v.co.y < 0.2]
    # Symmetrize lower body by mirroring X
    # Blender has a symmetrize operator in edit mode!
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    # Symmetrize from +X to -X
    bpy.ops.mesh.symmetrize(direction='POSITIVE_X')
    bpy.ops.object.mode_set(mode='OBJECT')
    print("Symmetrized lower body stance.")

    # 3. Add Demon Skull Features (Swept Horns, Razor Fangs, Brow Ridges)
    demon_parts = []
    
    # Head center in warden_tpose is at (0, 0.02, 1.95)
    head_center = Vector((0, 0.02, 1.95))
    
    # Swept-Back Curved Demon Horns
    for side in [-1, 1]:
        # Horn Base
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.065, depth=0.22, location=(side * 0.14, -0.05, 2.14))
        h1 = bpy.context.active_object
        h1.rotation_euler = (math.radians(-35), math.radians(side * 28), 0)
        demon_parts.append(h1)
        
        # Horn Mid
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.05, depth=0.25, location=(side * 0.24, -0.22, 2.32))
        h2 = bpy.context.active_object
        h2.rotation_euler = (math.radians(-55), math.radians(side * 32), 0)
        demon_parts.append(h2)
        
        # Horn Sharp Tip
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.038, depth=0.28, location=(side * 0.35, -0.42, 2.48))
        h3 = bpy.context.active_object
        h3.rotation_euler = (math.radians(-70), math.radians(side * 25), 0)
        demon_parts.append(h3)
        
        # Brow Ridge
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.035, depth=0.14, location=(side * 0.10, 0.20, 2.05))
        brow = bpy.context.active_object
        brow.rotation_euler = (0, math.radians(side * 35), math.radians(side * 15))
        demon_parts.append(brow)

        # Wicked Razor Fangs
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.022, depth=0.09, location=(side * 0.08, 0.26, 1.86))
        f1 = bpy.context.active_object
        f1.rotation_euler = (math.radians(15), 0, 0)
        demon_parts.append(f1)
        
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.016, depth=0.07, location=(side * 0.04, 0.28, 1.88))
        f2 = bpy.context.active_object
        f2.rotation_euler = (math.radians(15), 0, 0)
        demon_parts.append(f2)

    # 4. Add Massive Curved Bat Wings
    wing_objs = []
    wing_pts = {}
    for side in [-1, 1]:
        # Scapular wing attachment on upper muscular back
        w_root = Vector((side * 0.22, -0.12, 1.68))
        w_elb  = Vector((side * 1.35, -0.20, 2.42))
        w_wr   = Vector((side * 2.15, 0.08, 2.18))

        f1_t = Vector((side * 2.60, 0.00, 1.25))
        f2_t = Vector((side * 2.28, -0.15, 0.65))
        f3_t = Vector((side * 1.68, -0.25, 0.35))
        w_wst = Vector((side * 0.20, -0.15, 1.15))

        def add_bone_strut(p1, p2, r1, r2):
            vec = p2 - p1
            mid = (p1 + p2) * 0.5
            rot = Vector((0,0,1)).rotation_difference(vec).to_euler()
            bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=(r1+r2)*0.5, depth=vec.length, location=mid)
            st = bpy.context.active_object
            st.rotation_euler = rot
            wing_objs.append(st)

        add_bone_strut(w_root, w_elb, 0.075, 0.055)
        add_bone_strut(w_elb, w_wr, 0.055, 0.042)
        add_bone_strut(w_wr, f1_t, 0.035, 0.016)
        add_bone_strut(w_wr, f2_t, 0.030, 0.014)
        add_bone_strut(w_elb, f3_t, 0.032, 0.014)

        # Hook on wing elbow & thumb claw on wrist
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.035, depth=0.18, location=w_elb + Vector((0, -0.12, 0.08)))
        hook = bpy.context.active_object
        hook.rotation_euler = (math.radians(-65), math.radians(side * 25), 0)
        wing_objs.append(hook)

        wing_pts[side] = {
            'root': w_root, 'elbow': w_elb, 'wrist': w_wr,
            'f1_t': f1_t, 'f2_t': f2_t, 'f3_t': f3_t, 'waist': w_wst
        }

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

        sc1 = (pts['f1_t'] + pts['f2_t']) * 0.5 + Vector((side * -0.16, 0.03, 0.12))
        sc2 = (pts['f2_t'] + pts['f3_t']) * 0.5 + Vector((side * -0.15, 0.02, 0.14))
        sc3 = (pts['f3_t'] + pts['waist']) * 0.5 + Vector((side * -0.12, 0.00, 0.18))

        v_sc1 = w_bm.verts.new(sc1)
        v_sc2 = w_bm.verts.new(sc2)
        v_sc3 = w_bm.verts.new(sc3)

        v_m1 = w_bm.verts.new((pts['elbow'] + pts['wrist'] + pts['f1_t']) / 3.0 + Vector((0, 0.06, 0)))
        v_m2 = w_bm.verts.new((pts['elbow'] + pts['f2_t'] + pts['f3_t']) / 3.0 + Vector((0, 0.05, 0)))

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
        mod_sol.thickness = 0.026
        mod_sol.offset = 0

        bpy.context.view_layer.objects.active = w_obj
        w_obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier="Subsurf")
        bpy.ops.object.modifier_apply(modifier="Solidify")
        wing_objs.append(w_obj)

    print("All anatomical components ready. Fusing into one continuous sculpt...")

    # 5. Join all parts into body
    bpy.ops.object.select_all(action='DESELECT')
    for p in demon_parts + wing_objs + [body]:
        p.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()

    demon = bpy.context.active_object
    demon.name = "The_Archivist_Muscular"

    # 6. Fine Voxel Remesh at 0.0135m to produce ~135k-145k vertices (exact Warden benchmark)
    demon.data.remesh_voxel_size = 0.0135
    demon.data.remesh_voxel_adaptivity = 0.0
    bpy.ops.object.voxel_remesh()

    # 7. Subtle Smooth to blend the wing roots & horn roots smoothly into the skull and scapulae
    mod_sm2 = demon.modifiers.new("MuscleBlend", 'SMOOTH')
    mod_sm2.factor = 0.35
    mod_sm2.iterations = 2
    bpy.ops.object.modifier_apply(modifier="MuscleBlend")

    # 8. Clean up any loose tiny islands
    bm = bmesh.new()
    bm.from_mesh(demon.data)
    visited = set()
    for v in list(bm.verts):
        if v not in visited:
            island = []
            stack = [v]
            visited.add(v)
            while stack:
                cur = stack.pop()
                island.append(cur)
                for e in cur.link_edges:
                    other = e.other_vert(cur)
                    if other not in visited:
                        visited.add(other)
                        stack.append(other)
            if len(island) < 1500:
                for iv in island:
                    bm.verts.remove(iv)
    bm.to_mesh(demon.data)
    bm.free()

    for poly in demon.data.polygons:
        poly.use_smooth = True

    final_verts = len(demon.data.vertices)
    print(f"Fused Sculpt Complete! Final Vertices: {final_verts}, Faces: {len(demon.data.polygons)}")

    # 9. Bake User's Color Palette with Anatomical Muscle Cavity Occlusion
    print("Baking vertex colors...")
    color_layer = demon.data.color_attributes.new(
        name="Color",
        type='FLOAT_COLOR',
        domain='POINT'
    )
    demon.data.color_attributes.active_color = color_layer

    for i, vert in enumerate(demon.data.vertices):
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
            if z < 0.85 or absX > 2.2:
                r *= 0.5
                g *= 0.5
                b *= 0.5

        # Muscle Crevice Shading (Cavity Occlusion in Pecs, Abs, Linea Alba, Back Furrow)
        if absX < 0.32 and z > 1.0 and z < 1.95:
            # Sternal cleft & Linea Alba
            if absX < 0.03:
                r *= 0.42
                g *= 0.42
                b *= 0.42
            # Abdominal transverse inscriptions
            for cut_z in [1.25, 1.42, 1.58, 1.74]:
                if abs(z - cut_z) < 0.028:
                    r *= 0.52
                    g *= 0.52
                    b *= 0.52

        # Spinal erector column shadow
        if y < -0.05 and absX < 0.04 and z > 1.1 and z < 1.9:
            r *= 0.38
            g *= 0.38
            b *= 0.38

        # Horns: Obsidian Black Gradient
        if z > 2.15 and y < 0.0 and absX > 0.08:
            t_horn = min(1.0, (z - 2.15) / 0.35)
            r = base_r * (1.0 - t_horn) + 0.04 * t_horn
            g = base_g * (1.0 - t_horn) + 0.03 * t_horn
            b = base_b * (1.0 - t_horn) + 0.04 * t_horn

        # Piercing Yellow Eyes (User's painted sharp yellow eyes)
        if z >= 1.98 and z <= 2.10 and y >= 0.14 and y <= 0.24 and absX >= 0.06 and absX <= 0.15:
            r = 1.0
            g = 0.88
            b = 0.04

        # Razor Fangs (Bone White)
        elif z >= 1.80 and z <= 1.94 and y >= 0.22 and absX >= 0.02 and absX <= 0.10:
            r = 0.95
            g = 0.92
            b = 0.88

        # Obsidian Claws (Hands & Feet)
        elif (z < 0.08) or (y > 0.45 and z < 1.1 and absX > 0.35):
            r = 0.05
            g = 0.04
            b = 0.05

        color_layer.data[i].color = (max(0.0, min(1.0, r)), max(0.0, min(1.0, g)), max(0.0, min(1.0, b)), 1.0)

    # 10. PBR Material Setup
    mat = bpy.data.materials.new("Archivist_Muscular_PBR")
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

    demon.data.materials.clear()
    demon.data.materials.append(mat)

    # 11. Save and Export
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

    # 12. Studio Renders: Front 3/4 & Back 3/4
    scene = bpy.context.scene
    for o in list(scene.objects):
        if o.type in ['LIGHT', 'CAMERA']:
            bpy.data.objects.remove(o, do_unlink=True)

    key = bpy.data.lights.new('KeySun', 'SUN')
    key.energy = 5.0
    key_obj = bpy.data.objects.new('KeySun', key)
    key_obj.rotation_euler = (0.7, 0.3, -0.6)
    scene.collection.objects.link(key_obj)

    fill = bpy.data.lights.new('FillSun', 'SUN')
    fill.energy = 2.2
    fill_obj = bpy.data.objects.new('FillSun', fill)
    fill_obj.rotation_euler = (0.8, -0.4, 0.8)
    scene.collection.objects.link(fill_obj)

    rim = bpy.data.lights.new('RimSun', 'SUN')
    rim.energy = 3.5
    rim_obj = bpy.data.objects.new('RimSun', rim)
    rim_obj.rotation_euler = (0.5, 0.0, 3.14)
    scene.collection.objects.link(rim_obj)

    cam = bpy.data.cameras.new('StudioCam')
    cam.lens = 42
    cam_obj = bpy.data.objects.new('StudioCam', cam)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 960
    scene.render.resolution_y = 640

    # Front 3/4 Render
    cam_obj.location = (1.2, -3.8, 1.45)
    cam_obj.rotation_euler = (1.52, 0, 0.3)
    render_front = os.path.join(ARTIFACT_DIR, "muscular_archivist_front_34.png")
    scene.render.filepath = render_front
    bpy.ops.render.render(write_still=True)
    print(f"Front 3/4 render saved to: {render_front}")

    # Back 3/4 Render
    cam_obj.location = (1.5, 3.8, 1.55)
    cam_obj.rotation_euler = (1.52, 0, 2.8)
    render_back = os.path.join(ARTIFACT_DIR, "muscular_archivist_back_34.png")
    scene.render.filepath = render_back
    bpy.ops.render.render(write_still=True)
    print(f"Back 3/4 render saved to: {render_back}")

if __name__ == '__main__':
    build()
