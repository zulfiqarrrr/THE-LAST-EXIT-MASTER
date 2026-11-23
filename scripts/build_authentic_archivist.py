"""
build_authentic_archivist.py — The Authentic Menacing 4-Armed Mantis Archivist
Builds The Archivist in its true signature hunting stance:
- Towering 2.6m predatory skeletal apparition
- Hunched forward stalk posture with elongated curved spine and exposed vertebrae
- Emaciated sculpted ribcage with individual bone ribs
- 2 Massive overhead Mantis Scythe Arms: raised high over the head, poised to strike with long curved sickle blades
- 2 Secondary Thoracic Grasping Claws folded menacingly across the chest
- Sculpted skull with deep hollow eye sockets, gaping jaw, and sharp needle fangs
- Digitigrade bipedal legs with backward hocks and 3 hooked ground talons per foot
- Unified into ONE continuous, seamless, organic sculpted manifold (no floating parts, no T-pose!)
- Pre-configured Color Attribute and PBR material, ready to paint!
"""

import bpy
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

def create_pbr_material(name, roughness=0.65, metallic=0.2):
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

def build_authentic_archivist():
    reset_scene()
    print("Building Authentic Menacing Archivist (Predatory Mantis Stance)...")

    parts = []

    # 1. Pelvis / Hips (Hunched at Z = 1.35)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.26, depth=0.38, location=(0, -0.05, 1.35))
    pelvis = bpy.context.active_object
    pelvis.scale = (1.1, 0.9, 1.0)
    pelvis.rotation_euler = (math.radians(15), 0, 0)
    parts.append(pelvis)

    # 2. Hunched Forward Spine (Elongated S-curve with protruding dorsal vertebrae)
    for i in range(12):
        t = i / 11.0
        # Spine curves forward towards +Y as it rises
        sy = -0.05 + math.sin(t * math.pi * 0.8) * 0.22 + t * 0.15
        sz = 1.48 + t * 0.95
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.085, location=(0, sy, sz))
        vert = bpy.context.active_object
        vert.scale = (1.15, 1.35, 0.75)
        parts.append(vert)

        # Protruding dorsal spinal spike
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.035, depth=0.22, location=(0, sy - 0.10, sz + 0.02))
        spike = bpy.context.active_object
        spike.rotation_euler = (math.radians(-65), 0, 0)
        parts.append(spike)

    # 3. Emaciated Ribcage (Sunken chest, visible rib arches)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=16, radius=0.42, location=(0, 0.14, 2.05))
    chest = bpy.context.active_object
    chest.scale = (0.72, 0.85, 1.25)
    chest.rotation_euler = (math.radians(18), 0, 0)
    parts.append(chest)

    # Individual sculpted rib arches wrapping from spine to sternum
    for r in range(6):
        rt = r / 5.0
        rz = 1.70 + rt * 0.45
        ry = 0.05 + rt * 0.18
        width = 0.28 + math.sin(rt * math.pi) * 0.16
        for s in (-1, 1):
            bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.032, depth=width * 2.2, location=(s * width * 0.52, ry, rz))
            rib = bpy.context.active_object
            rib.rotation_euler = (math.radians(15), s * math.radians(52), s * math.radians(20))
            parts.append(rib)

    # 4. Long Predatory Neck (Angled forward into the hunt)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.075, depth=0.48, location=(0, 0.28, 2.52))
    neck = bpy.context.active_object
    neck.rotation_euler = (math.radians(35), 0, 0)
    parts.append(neck)

    # 5. Menacing Cranial Skull (Elongated jaw, deep hollow eye voids)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=16, radius=0.26, location=(0, 0.45, 2.70))
    skull = bpy.context.active_object
    skull.scale = (0.75, 1.35, 0.95)
    skull.rotation_euler = (math.radians(25), 0, 0)
    parts.append(skull)

    # Deep orbital eye sockets (harboring embers)
    for s in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.08, location=(s * 0.11, 0.62, 2.72))
        eye = bpy.context.active_object
        eye.scale = (0.85, 0.55, 1.25)
        parts.append(eye)

    # Gaping Jaw with predatory bone teeth
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.17, depth=0.48, location=(0, 0.52, 2.44))
    jaw = bpy.context.active_object
    jaw.rotation_euler = (math.radians(140), 0, 0)
    jaw.scale = (0.7, 1.1, 0.8)
    parts.append(jaw)

    # Sharp needle fangs
    for a in range(8):
        at = a / 7.0
        ax = (at - 0.5) * 0.24
        ay = 0.56 + math.sin(at * math.pi) * 0.12
        az = 2.48 - math.cos(at * math.pi) * 0.06
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.018, depth=0.10, location=(ax, ay, az))
        tooth = bpy.context.active_object
        tooth.rotation_euler = (math.radians(180), 0, 0)
        parts.append(tooth)

    # ==========================================================================
    # 6. TWO MASSIVE OVERHEAD MANTIS SCYTHE ARMS (POISE OVERHEAD IN STRIKE POSE!)
    # Raised high above the shoulders, elbows up, long razor sickle scythes hooked forward!
    # ==========================================================================
    for s in (-1, 1):
        # Shoulder clavicle joint
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=10, radius=0.13, location=(s * 0.38, 0.16, 2.25))
        parts.append(bpy.context.active_object)

        # Upper Arm: Reaches UP and OUTWARDS (poised high like a praying mantis)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.075, depth=0.72, location=(s * 0.58, 0.22, 2.55))
        uarm = bpy.context.active_object
        uarm.rotation_euler = (math.radians(-15), s * math.radians(-35), s * math.radians(45))
        parts.append(uarm)

        # High Elbow Joint (peaks high above head at Z = 2.85!)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.09, location=(s * 0.78, 0.28, 2.85))
        parts.append(bpy.context.active_object)

        # Forearm: Snaps DOWN and FORWARD towards the victim
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.065, depth=0.82, location=(s * 0.72, 0.58, 2.45))
        farm = bpy.context.active_object
        farm.rotation_euler = (math.radians(65), s * math.radians(15), s * math.radians(-20))
        parts.append(farm)

        # Wrist Joint
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.075, location=(s * 0.65, 0.88, 2.05))
        parts.append(bpy.context.active_object)

        # Lethal Curved Mantis Sickle Scythe Blade (curves down into execution hook)
        for b in range(7):
            bt = b / 6.0
            bx = s * (0.64 - bt * 0.18)
            by = 0.90 + math.sin(bt * 1.8) * 0.45
            bz = 2.02 - bt * 0.75 - math.sin(bt * math.pi) * 0.15
            radius_blade = 0.075 * (1.0 - bt * 0.75)
            bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=radius_blade, depth=0.22, location=(bx, by, bz))
            b_mesh = bpy.context.active_object
            b_mesh.rotation_euler = (math.radians(75), s * math.radians(-20), 0)
            parts.append(b_mesh)

    # ==========================================================================
    # 7. TWO SECONDARY THORACIC GRASPING CLAWS (FOLDED MENACINGLY OVER CHEST)
    # ==========================================================================
    for s in (-1, 1):
        # Thoracic shoulder
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.07, location=(s * 0.24, 0.25, 1.88))
        parts.append(bpy.context.active_object)

        # Mid-arm reaching forward-inwards
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.045, depth=0.42, location=(s * 0.26, 0.42, 1.82))
        marm = bpy.context.active_object
        marm.rotation_euler = (math.radians(35), s * math.radians(-25), 0)
        parts.append(marm)

        # Sharp grasping claw hook
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.038, depth=0.28, location=(s * 0.18, 0.58, 1.70))
        claw = bpy.context.active_object
        claw.rotation_euler = (math.radians(85), s * math.radians(25), 0)
        parts.append(claw)

    # ==========================================================================
    # 8. PREDATORY DIGITIGRADE BIPEDAL LEGS (CROUCHED STALKING STANCE)
    # Thigh angled forward, Hock bent backward, long talons gripping floor at Z=0
    # ==========================================================================
    for s in (-1, 1):
        # Hip Socket
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.12, location=(s * 0.24, -0.05, 1.25))
        parts.append(bpy.context.active_object)

        # Upper Thigh: Angled forward
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.09, depth=0.68, location=(s * 0.26, 0.08, 0.95))
        thigh = bpy.context.active_object
        thigh.rotation_euler = (math.radians(-28), s * math.radians(8), 0)
        parts.append(thigh)

        # High Knee Joint (Z = 0.65)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.095, location=(s * 0.26, 0.22, 0.65))
        parts.append(bpy.context.active_object)

        # Digitigrade Hock (Angled backward towards heel)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.075, depth=0.62, location=(s * 0.26, 0.08, 0.35))
        hock = bpy.context.active_object
        hock.rotation_euler = (math.radians(32), s * math.radians(-5), 0)
        parts.append(hock)

        # Ankle Joint
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.075, location=(s * 0.26, -0.06, 0.12))
        parts.append(bpy.context.active_object)

        # 3 Hooked Raptor Ground Talons (Spreading forward onto the floor at Z=0)
        for t in (-1, 0, 1):
            tx = s * 0.26 + t * 0.07
            ty = 0.08 + (1.0 - abs(t) * 0.3) * 0.14
            bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.04, depth=0.35, location=(tx, ty, 0.05))
            talon = bpy.context.active_object
            talon.rotation_euler = (math.radians(82), 0, t * math.radians(14))
            parts.append(talon)

    # JOIN ALL PARTS INTO ONE SINGLE UNIFIED MESH!
    bpy.context.view_layer.objects.active = parts[0]
    for p in parts:
        p.select_set(True)
    bpy.ops.object.join()
    archivist = bpy.context.active_object
    archivist.name = "The_Archivist"

    # FUSE SEAMS WITH VOXEL REMESH (Produces seamless organic sculpted horror body)
    print("  Applying seamless Voxel Remesh...")
    archivist.data.remesh_voxel_size = 0.024
    archivist.data.remesh_mode = 'VOXEL'
    bpy.ops.object.voxel_remesh()

    # Smooth shading
    for poly in archivist.data.polygons:
        poly.use_smooth = True

    # Pre-paint Color Attribute with Horror Palette!
    print("  Pre-painting Color Attribute...")
    color_layer = create_color_attribute(archivist)
    mat = create_pbr_material("Archivist_PBR", roughness=0.68, metallic=0.18)
    archivist.data.materials.clear()
    archivist.data.materials.append(mat)

    # Paint vertex colors procedurally:
    mesh = archivist.data
    for i, v in enumerate(mesh.vertices):
        x, y, z = v.co
        # Base: Desiccated mummy parchment / yellowed bone
        r, g, b = 0.44, 0.40, 0.35

        # Ribs & Spine highlights (bone ivory)
        if abs(x) < 0.25 and z > 1.4 and z < 2.3:
            r, g, b = 0.52, 0.48, 0.42

        # Massive Mantis Scythe Blades: Obsidian black metal
        if z > 1.8 and abs(x) > 0.45 and y > 0.4:
            blade_factor = min(1.0, (y - 0.4) / 0.5)
            r = (1.0 - blade_factor) * r + blade_factor * 0.05
            g = (1.0 - blade_factor) * g + blade_factor * 0.05
            b = (1.0 - blade_factor) * b + blade_factor * 0.07
            # Bloody razor edge on scythe tips
            if y > 0.85:
                r, g, b = 0.90, 0.03, 0.05

        # Eye Sockets: Blazing Amber Ember Coals!
        if z > 2.60 and z < 2.85 and y > 0.48 and abs(x) < 0.22:
            socket_dist = math.hypot(abs(x) - 0.11, z - 2.72)
            if socket_dist < 0.09:
                r, g, b = 1.0, 0.42, 0.02 # Radiant amber fire

        # Hollow cavity shadows
        if y < 0.0 and abs(x) < 0.15:
            r *= 0.5
            g *= 0.5
            b *= 0.5

        color_layer.data[i].color = (r, g, b, 1.0)

    print(f"  [Archivist Complete] Vertices: {len(mesh.vertices)}, Polygons: {len(mesh.polygons)}")

    # Export both the_archivist and archivist_tpose (both now get this awesome sculpted monster!)
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
    print("  [SUCCESS] All Archivist formats exported successfully!")

if __name__ == "__main__":
    build_authentic_archivist()
