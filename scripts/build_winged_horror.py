"""
build_winged_horror.py — The Winged Horror (Sublevel 1 Phantom)
Creates a completely unique, terrifying winged horror monster:
- Slender emaciated torso with elongated demonic horned skull
- Two long sinister clawed arms
- Two powerful digitigrade legs
- TWO MASSIVE BAT/GARGOYLE WINGS: arched main spar, radiating bone struts, and solid leathery membrane
- EVERYTHING CONNECTED AND FUSED into ONE seamless, continuous, watertight sculpt!
- Pre-painted Color Attribute: Leathery veined wings, bone body, glowing crimson/amber eyes.
"""

import bpy
import bmesh
import math
import os

BLENDER_EXE = r"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe"
BASE_DIR = r"c:\Users\ASUS HN116WS\OneDrive\Desktop\game"
MODELS_DIR = os.path.join(BASE_DIR, "public", "models")

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)

def create_pbr_material(name, roughness=0.6, metallic=0.15):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    output.location = (400, 0)
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    bsdf.location = (100, 0)
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = metallic

    attr = nodes.new(type="ShaderNodeAttribute")
    attr.attribute_name = "Color"
    attr.location = (-200, 100)

    links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return mat

def create_color_attribute(obj):
    color_layer = obj.data.color_attributes.new(
        name="Color",
        type='FLOAT_COLOR',
        domain='POINT'
    )
    obj.data.color_attributes.active_color = color_layer
    return color_layer

def build_winged_horror():
    reset_scene()
    print("Building Winged Horror Monster...")

    parts = []

    # 1. Torso (Seamless tapered body from pelvis to shoulders)
    # Hips / Pelvis
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.28, location=(0, 0, 1.35))
    pelvis = bpy.context.active_object
    pelvis.scale = (1.0, 0.75, 1.1)
    parts.append(pelvis)

    # Abdomen / Midriff
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.22, depth=0.45, location=(0, 0.02, 1.62))
    abdomen = bpy.context.active_object
    abdomen.scale = (1.0, 0.8, 1.0)
    parts.append(abdomen)

    # Chest / Ribcage
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=16, radius=0.36, location=(0, 0.05, 1.95))
    chest = bpy.context.active_object
    chest.scale = (1.1, 0.8, 1.15)
    parts.append(chest)

    # Neck
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.10, depth=0.35, location=(0, 0.08, 2.30))
    neck = bpy.context.active_object
    neck.rotation_euler = (math.radians(12), 0, 0)
    parts.append(neck)

    # 2. Demonic Horned Skull
    # Cranium
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=16, radius=0.22, location=(0, 0.16, 2.55))
    head = bpy.context.active_object
    head.scale = (0.85, 1.25, 0.95)
    parts.append(head)

    # Snout / Jaw
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.14, depth=0.35, location=(0, 0.32, 2.45))
    jaw = bpy.context.active_object
    jaw.rotation_euler = (math.radians(85), 0, 0)
    parts.append(jaw)

    # Two Swept-back Horns
    for s in (-1, 1):
        for h in range(4):
            ht = h / 3.0
            hx = s * (0.12 + ht * 0.14)
            hy = 0.08 - ht * 0.22
            hz = 2.68 + ht * 0.22
            bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.04 * (1.0 - ht * 0.6), depth=0.15, location=(hx, hy, hz))
            horn = bpy.context.active_object
            horn.rotation_euler = (math.radians(-45), s * math.radians(-25), 0)
            parts.append(horn)

    # 3. Two Clawed Arms (Hanging down menacingly with long talons)
    for s in (-1, 1):
        # Shoulder
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.12, location=(s * 0.42, 0.04, 2.05))
        parts.append(bpy.context.active_object)

        # Upper Arm (Slanting down and slightly forward)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.07, depth=0.65, location=(s * 0.52, 0.06, 1.75))
        uarm = bpy.context.active_object
        uarm.rotation_euler = (math.radians(10), s * math.radians(-12), s * math.radians(-15))
        parts.append(uarm)

        # Elbow
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.075, location=(s * 0.58, 0.08, 1.45))
        parts.append(bpy.context.active_object)

        # Forearm
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.055, depth=0.65, location=(s * 0.62, 0.14, 1.15))
        farm = bpy.context.active_object
        farm.rotation_euler = (math.radians(15), s * math.radians(-8), s * math.radians(-8))
        parts.append(farm)

        # Wrist & Hand with 3 long curved claws
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.065, location=(s * 0.65, 0.20, 0.82))
        parts.append(bpy.context.active_object)

        for c in range(3):
            cx = s * (0.62 + c * 0.035)
            cy = 0.24 + c * 0.04
            cz = 0.68 - c * 0.02
            bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.025, depth=0.32, location=(cx, cy, cz))
            claw = bpy.context.active_object
            claw.rotation_euler = (math.radians(25), s * math.radians(10), 0)
            parts.append(claw)

    # 4. Powerful Digitigrade Legs (Planted firmly on floor at Z=0)
    for s in (-1, 1):
        # Hip
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.12, location=(s * 0.22, -0.02, 1.25))
        parts.append(bpy.context.active_object)

        # Thigh (Angled forward)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.09, depth=0.65, location=(s * 0.24, 0.10, 0.96))
        thigh = bpy.context.active_object
        thigh.rotation_euler = (math.radians(-25), 0, 0)
        parts.append(thigh)

        # Knee
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.09, location=(s * 0.24, 0.22, 0.68))
        parts.append(bpy.context.active_object)

        # Hock (Angled back)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.075, depth=0.62, location=(s * 0.24, 0.08, 0.38))
        hock = bpy.context.active_object
        hock.rotation_euler = (math.radians(30), 0, 0)
        parts.append(hock)

        # Foot & Claws on ground at Z=0
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.12, depth=0.38, location=(s * 0.24, 0.12, 0.05))
        foot = bpy.context.active_object
        foot.rotation_euler = (math.radians(85), 0, 0)
        foot.scale = (0.9, 1.4, 0.4)
        parts.append(foot)

    # ==========================================================================
    # 5. TWO MASSIVE CONNECTED DEMONIC BAT WINGS!
    # A continuous wing arm extending from upper back, arching outward and upward,
    # with radiating bone fingers and a SOLID CONNECTING LEATHERY MESH MEMBRANE!
    # ==========================================================================
    for s in (-1, 1):
        # Wing Scapula Root (Attached directly to upper spine/shoulder blade)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.14, location=(s * 0.20, -0.15, 2.05))
        parts.append(bpy.context.active_object)

        # Main Wing Bone (Humerus): shoots UP and OUTWARDS to peak at Z = 2.75, X = 1.35!
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.08, depth=1.1, location=(s * 0.72, -0.18, 2.45))
        w_main = bpy.context.active_object
        w_main.rotation_euler = (math.radians(-10), s * math.radians(-52), s * math.radians(25))
        parts.append(w_main)

        # Wing Elbow / Peak Knuckle (Highest point of wing)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.11, location=(s * 1.25, -0.22, 2.82))
        parts.append(bpy.context.active_object)

        # Wing Thumb Hook (Sharp claw at the elbow joint)
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.04, depth=0.22, location=(s * 1.28, -0.15, 2.92))
        w_thumb = bpy.context.active_object
        w_thumb.rotation_euler = (math.radians(-45), s * math.radians(25), 0)
        parts.append(w_thumb)

        # 3 Radiating Wing Struts (Bone fingers arching outward and downward):
        # Finger 1 (Outer upper tip)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.045, depth=1.45, location=(s * 1.95, -0.24, 2.45))
        f1 = bpy.context.active_object
        f1.rotation_euler = (math.radians(-5), s * math.radians(45), s * math.radians(10))
        parts.append(f1)

        # Finger 2 (Mid wing strut)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.04, depth=1.35, location=(s * 1.70, -0.22, 1.85))
        f2 = bpy.context.active_object
        f2.rotation_euler = (math.radians(-5), s * math.radians(72), 0)
        parts.append(f2)

        # Finger 3 (Inner lower strut)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.035, depth=1.15, location=(s * 1.15, -0.20, 1.45))
        f3 = bpy.context.active_object
        f3.rotation_euler = (math.radians(-5), s * math.radians(95), 0)
        parts.append(f3)

        # SOLID WING MEMBRANE (A curved slab spanning between the struts, body, and tips)
        # Membrane 1 (Upper outer wing sail)
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.65, depth=0.04, location=(s * 1.60, -0.22, 2.30))
        m1 = bpy.context.active_object
        m1.scale = (1.4, 0.4, 1.1)
        m1.rotation_euler = (math.radians(90), s * math.radians(-25), 0)
        parts.append(m1)

        # Membrane 2 (Lower wing sail connecting to the flank)
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.55, depth=0.04, location=(s * 0.95, -0.18, 1.75))
        m2 = bpy.context.active_object
        m2.scale = (1.2, 0.4, 1.1)
        m2.rotation_euler = (math.radians(90), s * math.radians(-15), 0)
        parts.append(m2)

    # ==========================================================================
    # JOIN ALL INTO ONE SINGLE UNIFIED MESH AND FUSE SEAMS WITH VOXEL REMESH!
    # ==========================================================================
    bpy.context.view_layer.objects.active = parts[0]
    for p in parts:
        p.select_set(True)
    bpy.ops.object.join()
    creature = bpy.context.active_object
    creature.name = "The_Winged_Horror"

    print("  Applying seamless Voxel Remesh to fuse wings, body, and limbs...")
    creature.data.remesh_voxel_size = 0.024
    creature.data.remesh_mode = 'VOXEL'
    bpy.ops.object.voxel_remesh()

    for poly in creature.data.polygons:
        poly.use_smooth = True

    # Pre-paint Color Attribute with Horror Palette!
    print("  Pre-painting Color Attribute...")
    color_layer = create_color_attribute(creature)
    mat = create_pbr_material("Winged_Horror_PBR", roughness=0.62, metallic=0.15)
    creature.data.materials.clear()
    creature.data.materials.append(mat)

    # Paint vertex colors:
    mesh = creature.data
    for i, v in enumerate(mesh.vertices):
        x, y, z = v.co
        # Base: Desiccated pale bone / ash corpse skin
        r, g, b = 0.38, 0.35, 0.32

        # Massive Wing Membranes: Dark veined leathery burgundy-charcoal
        if abs(x) > 0.45 and z > 1.2:
            wing_dist = (abs(x) - 0.45) / 1.8
            r = 0.22 - wing_dist * 0.10
            g = 0.06 - wing_dist * 0.02
            b = 0.08 - wing_dist * 0.03
            # Wing bone ribs are darker
            if z > 2.6:
                r, g, b = 0.12, 0.10, 0.10

        # Horns: Obsidian black
        if z > 2.65 and abs(x) < 0.4 and y < 0.15:
            r, g, b = 0.06, 0.05, 0.06

        # Eye Sockets & Mouth: Menacing glowing crimson red!
        if z > 2.45 and z < 2.62 and y > 0.25 and abs(x) < 0.15:
            r, g, b = 0.95, 0.04, 0.06 # Vivid glowing red

        # Claws & Talons: Obsidian dark
        if z < 0.15 or (z < 0.85 and abs(x) > 0.55):
            r, g, b = 0.08, 0.07, 0.08

        color_layer.data[i].color = (r, g, b, 1.0)

    print(f"  [Winged Horror Complete] Vertices: {len(mesh.vertices)}, Polygons: {len(mesh.polygons)}")

    # Export to both the_archivist and archivist_tpose files:
    blend_path = os.path.join(MODELS_DIR, "the_archivist.blend")
    glb_path = os.path.join(MODELS_DIR, "the_archivist.glb")
    tpose_blend = os.path.join(MODELS_DIR, "archivist_tpose.blend")
    tpose_glb = os.path.join(MODELS_DIR, "archivist_tpose.glb")
    tpose_obj = os.path.join(MODELS_DIR, "archivist_tpose.obj")
    obj_path = os.path.join(MODELS_DIR, "the_archivist.obj")

    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.wm.save_as_mainfile(filepath=tpose_blend)
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_all_vertex_colors=True, export_attributes=True)
    bpy.ops.export_scene.gltf(filepath=tpose_glb, export_format='GLB', export_all_vertex_colors=True, export_attributes=True)
    bpy.ops.wm.obj_export(filepath=tpose_obj, export_colors=True)
    bpy.ops.wm.obj_export(filepath=obj_path, export_colors=True)
    print("  [SUCCESS] All Winged Horror files exported successfully!")

if __name__ == "__main__":
    build_winged_horror()
