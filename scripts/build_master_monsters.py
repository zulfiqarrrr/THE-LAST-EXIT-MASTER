"""
build_master_monsters.py — High-Fidelity Sculpted Meshes for The Archivist & The Crawler
Executes in headless Blender 5.3 to generate unified, watertight, organic horror models
with pre-initialized Color Attributes and PBR materials, ready for instant painting and sculpting.
"""

import bpy
import math
import os

BLENDER_EXE = r"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe"
BASE_DIR = r"c:\Users\ASUS HN116WS\OneDrive\Desktop\game"
MODELS_DIR = os.path.join(BASE_DIR, "public", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)

def create_pbr_material(name, roughness=0.6, metallic=0.1):
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

# ==============================================================================
# 1. THE ARCHIVIST (2.6m tall 4-armed skeletal horror)
# ==============================================================================
def generate_archivist():
    reset_scene()
    print("[1/2] Generating High-Detail Sculpted Archivist...")

    parts = []

    # Pelvis
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.25, depth=0.35, location=(0, 0, 1.35))
    pelvis = bpy.context.active_object
    pelvis.scale = (1.1, 0.85, 1.0)
    parts.append(pelvis)

    # Spine (curved elongated vertebrae)
    for i in range(10):
        t = i / 9.0
        z = 1.48 + i * 0.11
        y = math.sin(t * math.pi) * 0.08
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.09, location=(0, y, z))
        sp = bpy.context.active_object
        sp.scale = (1.1, 1.4, 0.8)
        parts.append(sp)

    # Ribcage (emaciated rib arches)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=16, radius=0.45, location=(0, 0.05, 2.05))
    chest = bpy.context.active_object
    chest.scale = (0.75, 0.65, 1.15)
    parts.append(chest)

    for r in range(5):
        rz = 1.75 + r * 0.10
        width = 0.32 + math.sin(r / 4.0 * math.pi) * 0.12
        for s in (-1, 1):
            bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.035, depth=width * 2, location=(s * width * 0.5, 0.08, rz))
            rib = bpy.context.active_object
            rib.rotation_euler = (0, s * math.radians(45), s * math.radians(15))
            parts.append(rib)

    # Neck
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.08, depth=0.42, location=(0, 0.04, 2.50))
    neck = bpy.context.active_object
    neck.rotation_euler = (math.radians(-10), 0, 0)
    parts.append(neck)

    # Skull: elongated sunken cranial horror
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=16, radius=0.28, location=(0, 0.10, 2.78))
    skull = bpy.context.active_object
    skull.scale = (0.75, 1.25, 1.0)
    parts.append(skull)

    # Deep Hollow Eye Sockets
    for s in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.085, location=(s * 0.11, 0.28, 2.78))
        socket = bpy.context.active_object
        socket.scale = (0.9, 0.6, 1.2)
        parts.append(socket)

    # Jaw & Fangs
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.18, depth=0.45, location=(0, 0.22, 2.52))
    jaw = bpy.context.active_object
    jaw.rotation_euler = (math.radians(155), 0, 0)
    jaw.scale = (0.7, 0.9, 0.8)
    parts.append(jaw)

    # 4 ARMS:
    # 2 Upper Mantis Scythe Arms (T-Pose spread along X with menacing forward scythe hook)
    for s in (-1, 1):
        # Shoulder
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=10, radius=0.14, location=(s * 0.44, 0, 2.22))
        parts.append(bpy.context.active_object)

        # Upper Arm
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.075, depth=0.75, location=(s * 0.85, 0, 2.22))
        uarm = bpy.context.active_object
        uarm.rotation_euler = (0, math.radians(90), 0)
        parts.append(uarm)

        # Elbow
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.085, location=(s * 1.25, 0, 2.22))
        parts.append(bpy.context.active_object)

        # Forearm
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.06, depth=0.85, location=(s * 1.70, 0, 2.22))
        farm = bpy.context.active_object
        farm.rotation_euler = (0, math.radians(90), 0)
        parts.append(farm)

        # Wrist
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.07, location=(s * 2.15, 0, 2.22))
        parts.append(bpy.context.active_object)

        # Mantis Scythe Blade: lethal curved sickle blade
        for b in range(6):
            bt = b / 5.0
            bx = s * (2.20 + bt * 0.70)
            by = math.sin(bt * math.pi) * 0.25
            bz = 2.22 - bt * 0.45
            bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.07 * (1.0 - bt * 0.7), depth=0.25, location=(bx, by, bz))
            parts.append(bpy.context.active_object)

    # 2 Secondary Folded Thoracic Claws
    for s in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.045, depth=0.45, location=(s * 0.24, 0.22, 1.85))
        carm = bpy.context.active_object
        carm.rotation_euler = (math.radians(35), s * math.radians(-25), 0)
        parts.append(carm)

        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.04, depth=0.28, location=(s * 0.16, 0.38, 1.72))
        claw = bpy.context.active_object
        claw.rotation_euler = (math.radians(-45), 0, 0)
        parts.append(claw)

    # Bipedal Legs (standing tall on floor at z=0)
    for s in (-1, 1):
        # Hip
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.12, location=(s * 0.24, 0, 1.25))
        parts.append(bpy.context.active_object)

        # Thigh
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.09, depth=0.68, location=(s * 0.24, -0.04, 0.92))
        thigh = bpy.context.active_object
        thigh.rotation_euler = (math.radians(-8), 0, 0)
        parts.append(thigh)

        # Knee
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.09, location=(s * 0.24, -0.08, 0.58))
        parts.append(bpy.context.active_object)

        # Shin
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.07, depth=0.58, location=(s * 0.24, 0.02, 0.29))
        shin = bpy.context.active_object
        shin.rotation_euler = (math.radians(12), 0, 0)
        parts.append(shin)

        # Talon foot
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.14, depth=0.42, location=(s * 0.24, 0.15, 0.05))
        foot = bpy.context.active_object
        foot.rotation_euler = (math.radians(85), 0, 0)
        foot.scale = (0.8, 1.4, 0.4)
        parts.append(foot)

    # JOIN ALL INTO ONE UNIFIED MESH
    bpy.context.view_layer.objects.active = parts[0]
    for p in parts:
        p.select_set(True)
    bpy.ops.object.join()
    archivist = bpy.context.active_object
    archivist.name = "The_Archivist"

    # FUSE SEAMS WITH VOXEL REMESH (Produces high-detail seamless organic manifold)
    print("  Applying seamless Voxel Remesh...")
    archivist.data.remesh_voxel_size = 0.022
    archivist.data.remesh_mode = 'VOXEL'
    bpy.ops.object.voxel_remesh()

    # Smooth shading
    for poly in archivist.data.polygons:
        poly.use_smooth = True

    # Pre-paint Color Attribute with Horror Palette!
    print("  Pre-painting Color Attribute...")
    color_layer = create_color_attribute(archivist)
    mat = create_pbr_material("Archivist_PBR", roughness=0.72, metallic=0.15)
    archivist.data.materials.clear()
    archivist.data.materials.append(mat)

    # Paint vertex colors procedurally:
    mesh = archivist.data
    pos = [v.co for v in mesh.vertices]
    for i, v in enumerate(mesh.vertices):
        x, y, z = v.co
        # Default: Desiccated mummy bone/parchment
        r, g, b = 0.42, 0.39, 0.35

        # Scythe blades: Dark obsidian metal
        dist_from_shoulder = math.hypot(abs(x) - 1.25, z - 2.22)
        if abs(x) > 1.8:
            blade_factor = min(1.0, (abs(x) - 1.8) / 0.8)
            r = (1.0 - blade_factor) * r + blade_factor * 0.06
            g = (1.0 - blade_factor) * g + blade_factor * 0.06
            b = (1.0 - blade_factor) * b + blade_factor * 0.08
            # Bloody edge on scythe tips
            if abs(x) > 2.4:
                r, g, b = 0.85, 0.04, 0.06

        # Eye Sockets: Glowing Burning Amber Embers!
        if z > 2.65 and z < 2.9 and y > 0.18 and abs(x) < 0.22:
            socket_dist = math.hypot(abs(x) - 0.11, z - 2.78)
            if socket_dist < 0.09:
                r, g, b = 1.0, 0.45, 0.02 # Vivid blazing amber

        # Spinal shadows
        if abs(x) < 0.10 and y < 0.0:
            r *= 0.55
            g *= 0.55
            b *= 0.55

        color_layer.data[i].color = (r, g, b, 1.0)

    print(f"  [Archivist Complete] Vertices: {len(mesh.vertices)}, Polygons: {len(mesh.polygons)}")

    # Export all formats:
    blend_path = os.path.join(MODELS_DIR, "the_archivist.blend")
    glb_path = os.path.join(MODELS_DIR, "the_archivist.glb")
    tpose_blend = os.path.join(MODELS_DIR, "archivist_tpose.blend")
    tpose_glb = os.path.join(MODELS_DIR, "archivist_tpose.glb")
    tpose_obj = os.path.join(MODELS_DIR, "archivist_tpose.obj")

    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.wm.save_as_mainfile(filepath=tpose_blend)
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_all_vertex_colors=True, export_attributes=True)
    bpy.ops.export_scene.gltf(filepath=tpose_glb, export_format='GLB', export_all_vertex_colors=True, export_attributes=True)
    bpy.ops.wm.obj_export(filepath=tpose_obj, export_colors=True)
    print("  [SUCCESS] Exported Archivist in .blend, .glb, and .obj formats!")


# ==============================================================================
# 2. THE CRAWLER (4.5m 10-segmented armored serpent predator)
# ==============================================================================
def generate_crawler():
    reset_scene()
    print("[2/2] Generating High-Detail Sculpted Crawler...")

    parts = []

    # Head Shovel Carapace (Front at +Y, Spans from Y=0 to Y=0.8)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=16, radius=0.45, location=(0, 0.45, 0.32))
    head = bpy.context.active_object
    head.scale = (1.25, 1.5, 0.65)
    parts.append(head)

    # Shovel Brow Ridge
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.72, 0.35))
    brow = bpy.context.active_object
    brow.scale = (0.65, 0.28, 0.12)
    parts.append(brow)

    # Dual Articulated Mandibles (Left and Right curved sickle jaws)
    for s in (-1, 1):
        for m in range(5):
            mt = m / 4.0
            mx = s * (0.28 + math.sin(mt * 1.4) * 0.18)
            my = 0.55 + mt * 0.45
            mz = 0.22 - mt * 0.08
            bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.08 * (1.0 - mt * 0.6), depth=0.18, location=(mx, my, mz))
            parts.append(bpy.context.active_object)

        # Serrated Inner Teeth
        for t in range(4):
            tx = s * (0.22 - t * 0.03)
            ty = 0.65 + t * 0.08
            tz = 0.20
            bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.025, depth=0.09, location=(tx, ty, tz))
            parts.append(bpy.context.active_object)

    # 10 Overlapping Armored Body Segments (Extending backwards along -Y from Y=0 to Y=-4.0)
    for seg in range(10):
        st = seg / 9.0
        y = -seg * 0.42
        z = 0.28 - st * 0.08
        width = (1.0 - st * 0.65) * 0.42
        height = (1.0 - st * 0.65) * 0.32

        # Armored Carapace Plate (Dorsal shell)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=width, location=(0, y, z))
        plate = bpy.context.active_object
        plate.scale = (1.1, 1.45, 0.75)
        parts.append(plate)

        # Spine Dorsal Spike
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.06 * (1.0 - st * 0.6), depth=0.22 * (1.0 - st * 0.5), location=(0, y - 0.06, z + height * 0.85))
        spike = bpy.context.active_object
        spike.rotation_euler = (math.radians(-35), 0, 0)
        parts.append(spike)

        # Lateral Crawling Scutes (Left & Right ground grippers)
        for s in (-1, 1):
            bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.045 * (1.0 - st * 0.5), depth=0.26 * (1.0 - st * 0.5), location=(s * (width + 0.12), y, z - 0.08))
            scute = bpy.context.active_object
            scute.rotation_euler = (0, s * math.radians(-70), 0)
            parts.append(scute)

    # JOIN ALL INTO ONE UNIFIED MESH
    bpy.context.view_layer.objects.active = parts[0]
    for p in parts:
        p.select_set(True)
    bpy.ops.object.join()
    crawler = bpy.context.active_object
    crawler.name = "The_Crawler"

    # FUSE SEAMS WITH VOXEL REMESH
    print("  Applying seamless Voxel Remesh...")
    crawler.data.remesh_voxel_size = 0.026
    crawler.data.remesh_mode = 'VOXEL'
    bpy.ops.object.voxel_remesh()

    # Smooth shading
    for poly in crawler.data.polygons:
        poly.use_smooth = True

    # Pre-paint Color Attribute with Emerald Carapace Palette!
    print("  Pre-painting Color Attribute...")
    color_layer = create_color_attribute(crawler)
    mat = create_pbr_material("Crawler_PBR", roughness=0.45, metallic=0.35)
    crawler.data.materials.clear()
    crawler.data.materials.append(mat)

    # Paint vertex colors procedurally:
    mesh = crawler.data
    for i, v in enumerate(mesh.vertices):
        x, y, z = v.co
        # Base: Dark obsidian green-black chitin armor
        r, g, b = 0.08, 0.13, 0.09

        # Underbelly: Paler necrotic fleshy olive
        if z < 0.18:
            belly = min(1.0, (0.18 - z) / 0.15)
            r = (1.0 - belly) * r + belly * 0.22
            g = (1.0 - belly) * g + belly * 0.26
            b = (1.0 - belly) * b + belly * 0.18

        # Mandibles / Fangs: Ivory-bone tips
        if y > 0.8:
            r, g, b = 0.75, 0.78, 0.68

        # Bioluminescent Emerald Veins running down the dorsal ridge & side scutes:
        # Spine line: abs(x) < 0.04 along the back (z > 0.35)
        if abs(x) < 0.05 and z > 0.28:
            r, g, b = 0.12, 1.0, 0.45 # Blazing toxic emerald bioluminescence

        color_layer.data[i].color = (r, g, b, 1.0)

    print(f"  [Crawler Complete] Vertices: {len(mesh.vertices)}, Polygons: {len(mesh.polygons)}")

    # Export all formats:
    blend_path = os.path.join(MODELS_DIR, "the_crawler.blend")
    glb_path = os.path.join(MODELS_DIR, "the_crawler.glb")
    obj_path = os.path.join(MODELS_DIR, "the_crawler.obj")

    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_all_vertex_colors=True, export_attributes=True)
    bpy.ops.wm.obj_export(filepath=obj_path, export_colors=True)
    print("  [SUCCESS] Exported Crawler in .blend, .glb, and .obj formats!")

if __name__ == "__main__":
    generate_archivist()
    generate_crawler()
    print("\nALL MONSTERS COMPLETE!")
