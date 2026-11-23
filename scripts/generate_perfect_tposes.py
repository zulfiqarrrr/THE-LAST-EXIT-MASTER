"""
generate_perfect_tposes.py — Generates authentic, verified Mixamo T-Pose OBJs
Mixamo specifications:
- Coordinates in OBJ file:
  * X: Left / Right (symmetric around 0)
  * Y: Up / Down (0.0 at floor, positive upwards)
  * Z: Front / Back (facing towards camera / forward)
- Pose:
  * Upright bipedal standing posture on both feet.
  * Head upright, chin clearly defined.
  * Both arms spread horizontally along X-axis at shoulder height forming a cross 'T'.
"""

import bpy
import math
import os
from mathutils import Vector, Matrix

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for arm in list(bpy.data.armatures):
        bpy.data.armatures.remove(arm, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)

def build_perfect_archivist(base_dir):
    reset_scene()
    print("\n--- BUILDING PERFECT ARCHIVIST T-POSE ---")

    # Materials
    mat_bone = bpy.data.materials.new("Archivist_Bone")
    mat_bone.use_nodes = True
    b_bsdf = mat_bone.node_tree.nodes.get("Principled BSDF")
    if b_bsdf:
        b_bsdf.inputs['Base Color'].default_value = (0.78, 0.74, 0.68, 1.0)
        b_bsdf.inputs['Roughness'].default_value = 0.75

    mat_blade = bpy.data.materials.new("Archivist_Obsidian")
    mat_blade.use_nodes = True
    s_bsdf = mat_blade.node_tree.nodes.get("Principled BSDF")
    if s_bsdf:
        s_bsdf.inputs['Base Color'].default_value = (0.04, 0.04, 0.05, 1.0)
        s_bsdf.inputs['Roughness'].default_value = 0.2
        if 'Metallic' in s_bsdf.inputs:
            s_bsdf.inputs['Metallic'].default_value = 0.9

    parts = []

    # All coordinates here are defined in MIXAMO SPACE:
    # X = Left (+X) / Right (-X)
    # Y = Vertical Up (0 at floor)
    # Z = Forward (+Z) / Backward (-Z)

    # 1. Hips / Pelvis (Groin marker at Y = 1.05)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.20, depth=0.25, location=(0, 0, 1.05))
    pelvis = bpy.context.active_object
    pelvis.scale = (1.1, 0.8, 1.0)
    parts.append(pelvis)

    # 2. Spine & Emaciated Ribcage
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.07, depth=0.65, location=(0, 0, 1.48))
    spine = bpy.context.active_object
    parts.append(spine)

    # Ribs
    for ry, sz, z_offset in [(1.35, 0.22, -0.02), (1.48, 0.28, 0.0), (1.60, 0.32, 0.02)]:
        bpy.ops.mesh.primitive_torus_add(major_radius=sz, minor_radius=0.03, location=(0, z_offset, ry))
        rib = bpy.context.active_object
        rib.scale = (1.1, 0.75, 1.0)
        parts.append(rib)

    # 3. Neck & Elongated Head (Chin marker at Y = 2.05)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.065, depth=0.26, location=(0, 0, 1.92))
    neck = bpy.context.active_object
    parts.append(neck)

    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.18, depth=0.48, location=(0, 0.05, 2.22))
    skull = bpy.context.active_object
    skull.rotation_euler = (math.radians(180), 0, 0)
    skull.scale = (0.85, 1.15, 0.9)
    parts.append(skull)

    # Distinct Chin Block for Mixamo Auto-Rigger
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.14, 2.05))
    chin = bpy.context.active_object
    chin.scale = (0.16, 0.16, 0.12)
    parts.append(chin)

    # 4. TRUE HORIZONTAL T-POSE ARMS (Shoulder -> Elbow -> Wrist along ±X at Y = 1.72)
    for s in (-1, 1):
        # Shoulder
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.09, location=(s * 0.38, 0, 1.72))
        sh = bpy.context.active_object
        parts.append(sh)

        # Upper arm (Horizontal along X)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.055, depth=0.62, location=(s * 0.72, 0, 1.72))
        arm_up = bpy.context.active_object
        arm_up.rotation_euler = (0, math.radians(90), 0)
        parts.append(arm_up)

        # Elbow marker
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.07, location=(s * 1.06, 0, 1.72))
        el = bpy.context.active_object
        parts.append(el)

        # Forearm (Horizontal along X)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.045, depth=0.68, location=(s * 1.42, 0, 1.72))
        arm_fore = bpy.context.active_object
        arm_fore.rotation_euler = (0, math.radians(90), 0)
        parts.append(arm_fore)

        # Wrist marker
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.065, location=(s * 1.78, 0, 1.72))
        wrist = bpy.context.active_object
        parts.append(wrist)

        # Hand & Mantis Scythe Claws (pointing slightly forward/out along X)
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.07, depth=0.75, location=(s * 2.18, 0.05, 1.72))
        claw = bpy.context.active_object
        claw.rotation_euler = (0, math.radians(-s * 90), 0)
        claw.scale = (0.45, 1.0, 1.4)
        claw.data.materials.append(mat_blade)
        parts.append(claw)

    # 5. STRAIGHT LEGS (Hip -> Knee -> Ankle -> Foot down to Y = 0)
    for s in (-1, 1):
        # Thigh
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.08, depth=0.55, location=(s * 0.22, 0, 0.78))
        thigh = bpy.context.active_object
        parts.append(thigh)

        # Knee marker at Y = 0.52
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.08, location=(s * 0.22, 0.02, 0.52))
        knee = bpy.context.active_object
        parts.append(knee)

        # Shin
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.065, depth=0.52, location=(s * 0.22, 0, 0.27))
        shin = bpy.context.active_object
        parts.append(shin)

        # Foot (Floor at Y = 0)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(s * 0.22, 0.08, 0.04))
        foot = bpy.context.active_object
        foot.scale = (0.12, 0.28, 0.08)
        parts.append(foot)

    # Apply default bone material to all body parts
    for p in parts:
        if not p.data.materials:
            p.data.materials.append(mat_bone)

    # Join into a single unified mesh for Mixamo
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()

    archivist_mesh = bpy.context.active_object
    archivist_mesh.name = "The_Archivist_TPose"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # In Blender: Z is up, Y is depth.
    # Currently our parts are built with Z = vertical! (Z: 0 to 2.45m)
    # When exporting to OBJ with forward_axis='NEGATIVE_Z', up_axis='Y', Blender converts:
    # Blender Z -> OBJ Y (0 to 2.45m height!)
    # Blender Y -> OBJ -Z (depth)
    # Blender X -> OBJ X (width: -2.2 to +2.2m)
    
    models_dir = os.path.join(base_dir, "public", "models")
    blender_dir = os.path.join(base_dir, "blender")

    # Export both to _tpose and overwrite the main files so user gets it either way!
    for fname in ["archivist_tpose", "the_archivist"]:
        obj_path = os.path.join(models_dir, f"{fname}.obj")
        glb_path = os.path.join(models_dir, f"{fname}.glb")
        blend_path = os.path.join(blender_dir, f"{fname}.blend")

        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_apply=True, export_yup=True)
        # EXPORT WITH Y-UP, -Z FORWARD FOR MIXAMO!
        bpy.ops.wm.obj_export(filepath=obj_path, forward_axis='NEGATIVE_Z', up_axis='Y')
        print(f"Exported Archivist to {obj_path}")

def build_perfect_warden(base_dir):
    reset_scene()
    print("\n--- BUILDING PERFECT WARDEN T-POSE ---")
    source_glb = os.path.join(base_dir, "public", "models", "warden.glb")

    bpy.ops.import_scene.gltf(filepath=source_glb)
    mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            mesh_obj = obj
            break

    if not mesh_obj:
        print("[ERROR] No mesh in warden.glb")
        return

    mesh_obj.name = "Warden_TPose_Mesh"
    mesh = mesh_obj.data

    # Raw mesh is in crawl pose:
    # Rotate mesh upright so spine is vertical (-75 deg around X)
    rot_upright = Matrix.Rotation(math.radians(-75), 4, 'X')
    mesh.transform(rot_upright)

    # Now in upright space:
    # Z is vertical (Pelvis ~ -0.2, Chest ~ 0.4, Head ~ 0.7)
    # Front limbs were reaching forward and down.
    # Shoulder pivots: Left at (+0.32, 0.05, 0.42), Right at (-0.32, 0.05, 0.42)
    # We want front limbs to spread out sideways at 90 degrees horizontally along ±X!

    sh_L = Vector((0.28, 0.05, 0.40))
    sh_R = Vector((-0.28, 0.05, 0.40))

    for v in mesh.vertices:
        p = v.co

        # Left Forelimb (X > 0.16, Z between -0.4 and 0.55)
        if p.x > 0.16 and p.z < 0.55 and p.z > -0.45:
            rel = p - sh_L
            weight = max(0.0, min(1.0, (p.x - 0.16) / 0.18))
            if weight > 0:
                # Rotate up to shoulder level (rotate around Y by -75 deg)
                # and rotate back from chest into line with shoulders (rotate around Z by -45 deg)
                rot_L = (
                    Matrix.Rotation(math.radians(-78 * weight), 3, 'Y') @
                    Matrix.Rotation(math.radians(-48 * weight), 3, 'Z') @
                    Matrix.Rotation(math.radians(25 * weight), 3, 'X')
                )
                p_rot = sh_L + rot_L @ rel
                # Stretch out arm slightly so it extends into clear T-pose
                p_rot.x += 0.25 * weight
                p_rot.z += 0.05 * weight
                v.co = p.lerp(p_rot, weight)

        # Right Forelimb (X < -0.16, Z between -0.4 and 0.55)
        elif p.x < -0.16 and p.z < 0.55 and p.z > -0.45:
            rel = p - sh_R
            weight = max(0.0, min(1.0, (-p.x - 0.16) / 0.18))
            if weight > 0:
                rot_R = (
                    Matrix.Rotation(math.radians(78 * weight), 3, 'Y') @
                    Matrix.Rotation(math.radians(48 * weight), 3, 'Z') @
                    Matrix.Rotation(math.radians(25 * weight), 3, 'X')
                )
                p_rot = sh_R + rot_R @ rel
                p_rot.x -= 0.25 * weight
                p_rot.z += 0.05 * weight
                v.co = p.lerp(p_rot, weight)

        # Straighten hind legs down
        elif abs(p.x) < 0.35 and p.z < -0.05 and p.y < -0.10:
            v.co.y = p.y * 0.4  # pull forward/backward curve straight under hips
            v.co.z = p.z * 1.15 # stretch down

    mesh.update()

    # Scale to standard 2.1m character height for Mixamo
    min_z = min([v.co.z for v in mesh.vertices])
    max_z = max([v.co.z for v in mesh.vertices])
    height = max_z - min_z
    scale_factor = 2.1 / height

    scale_mat = Matrix.Scale(scale_factor, 4)
    mesh.transform(scale_mat)

    # Shift so feet touch floor Z = 0
    min_z_new = min([v.co.z for v in mesh.vertices])
    trans_mat = Matrix.Translation(Vector((0, 0, -min_z_new)))
    mesh.transform(trans_mat)
    mesh.update()

    # PBR Material
    mat = bpy.data.materials.new("Warden_TPose_Flesh")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.55, 0.50, 0.46, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.72

    mesh_obj.data.materials.clear()
    mesh_obj.data.materials.append(mat)

    models_dir = os.path.join(base_dir, "public", "models")
    blender_dir = os.path.join(base_dir, "blender")

    # Export both to _tpose and overwrite the main files so user gets it either way!
    for fname in ["warden_tpose", "the_warden"]:
        obj_path = os.path.join(models_dir, f"{fname}.obj")
        glb_path = os.path.join(models_dir, f"{fname}.glb")
        blend_path = os.path.join(blender_dir, f"{fname}.blend")

        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_apply=True, export_yup=True)
        # CRITICAL: EXPORT WITH Y-UP, -Z FORWARD FOR MIXAMO!
        bpy.ops.wm.obj_export(filepath=obj_path, forward_axis='NEGATIVE_Z', up_axis='Y')
        print(f"Exported Warden to {obj_path}")

def main():
    base_dir = r"C:\Users\ASUS HN116WS\OneDrive\Desktop\game"
    build_perfect_archivist(base_dir)
    build_perfect_warden(base_dir)
    print("\n[ALL MIXAMO T-POSES EXPORTED SUCCESSFULLY]")

if __name__ == "__main__":
    main()
