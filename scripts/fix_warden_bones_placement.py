import bpy
import math
import os
from mathutils import Vector

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    base_dir = r"C:\Users\ASUS HN116WS\OneDrive\Desktop\game"
    glb_path = os.path.join(base_dir, "public", "models", "the_warden.glb")

    bpy.ops.import_scene.gltf(filepath=glb_path)
    mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            mesh_obj = obj
            break

    if not mesh_obj:
        print("[ERROR] No mesh in the_warden.glb")
        return

    mesh_obj.name = "Warden_Mesh"
    mesh = mesh_obj.data

    # Apply all transforms so coordinates are 100% absolute
    bpy.context.view_layer.objects.active = mesh_obj
    mesh_obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 1. Create Armature centered INSIDE the monster
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.active_object
    arm_obj.name = "Warden_Armature"
    arm_data = arm_obj.data
    arm_data.name = "Warden_Rig"
    
    # Crucial: Show bones in front so they are visible inside the mesh!
    arm_obj.show_in_front = True

    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm_data.edit_bones
    for b in list(edit_bones):
        edit_bones.remove(b)

    # TRUE ANATOMICAL POSITIONS INSIDE THE FLESH:
    # Mesh: X in [-1.4, 1.4], Y in [-1.22, 1.22], Z in [0.0, 1.725]

    # Root / Pelvis (Center hind torso)
    b_root = edit_bones.new('Root')
    b_root.head = (0, -0.6, 0.85)
    b_root.tail = (0, -0.2, 1.05)

    # Spine Mid & Chest
    b_spine = edit_bones.new('Spine')
    b_spine.head = (0, -0.2, 1.05)
    b_spine.tail = (0, 0.45, 1.25)
    b_spine.parent = b_root

    # Neck
    b_neck = edit_bones.new('Neck')
    b_neck.head = (0, 0.45, 1.25)
    b_neck.tail = (0, 0.75, 1.15)
    b_neck.parent = b_spine

    # Head & Visceral Maw
    b_head = edit_bones.new('Head')
    b_head.head = (0, 0.75, 1.15)
    b_head.tail = (0, 1.15, 0.90)
    b_head.parent = b_neck

    # Front Limbs (Heavy Muscular Arms & Claws)
    for s, side in [(1, 'L'), (-1, 'R')]:
        b_sh = edit_bones.new(f'Shoulder_{side}')
        b_sh.head = (s * 0.35, 0.40, 1.25)
        b_sh.tail = (s * 0.85, 0.45, 1.15)
        b_sh.parent = b_spine

        b_arm = edit_bones.new(f'Forearm_{side}')
        b_arm.head = (s * 0.85, 0.45, 1.15)
        b_arm.tail = (s * 1.05, 0.65, 0.55)
        b_arm.parent = b_sh

        b_paw = edit_bones.new(f'Paw_{side}')
        b_paw.head = (s * 1.05, 0.65, 0.55)
        b_paw.tail = (s * 1.15, 0.85, 0.05)
        b_paw.parent = b_arm

        # Hind Limbs (Crouched predatory legs)
        b_hip = edit_bones.new(f'Hip_{side}')
        b_hip.head = (s * 0.30, -0.55, 0.85)
        b_hip.tail = (s * 0.55, -0.70, 0.70)
        b_hip.parent = b_root

        b_thigh = edit_bones.new(f'Thigh_{side}')
        b_thigh.head = (s * 0.55, -0.70, 0.70)
        b_thigh.tail = (s * 0.60, -0.90, 0.35)
        b_thigh.parent = b_hip

        b_foot = edit_bones.new(f'Foot_{side}')
        b_foot.head = (s * 0.60, -0.90, 0.35)
        b_foot.tail = (s * 0.60, -1.05, 0.05)
        b_foot.parent = b_thigh

    bpy.ops.object.mode_set(mode='OBJECT')

    # 2. Bind Mesh to Armature with Envelope Weights (Clean & Reliable!)
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')

    # Add Armature Modifier
    mod = mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = arm_obj

    # 3. Create Grounded Walk Cycle (40 Frames Seamless Loop)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 40

    anim_data = arm_obj.animation_data_create()
    walk_action = bpy.data.actions.new(name="Walk")
    anim_data.action = walk_action

    bpy.ops.object.mode_set(mode='POSE')
    pose_bones = arm_obj.pose.bones

    for frame in range(1, 41):
        bpy.context.scene.frame_set(frame)
        t = (frame - 1) / 40.0 * 2.0 * math.pi

        # Spine breathing & gait undulation
        if 'Spine' in pose_bones:
            pb = pose_bones['Spine']
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (
                math.sin(t * 2) * 0.04,   # vertical bob
                math.cos(t) * 0.06,       # side-to-side spinal sway
                math.sin(t) * 0.03        # torso roll
            )
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Head locked forward with predatory chin dip
        if 'Head' in pose_bones:
            pb = pose_bones['Head']
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (
                -math.sin(t * 2) * 0.03 + 0.05, # jaw forward
                -math.cos(t) * 0.04,
                0
            )
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Left Forearm: Stride forward, plant paw
        if 'Forearm_L' in pose_bones:
            pb = pose_bones['Forearm_L']
            pb.rotation_mode = 'XYZ'
            reach = math.sin(t) * 0.32
            lift = max(0.0, math.cos(t)) * 0.22
            pb.rotation_euler = (reach, 0, lift)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Right Forearm: Opposite stride phase (t + pi)
        if 'Forearm_R' in pose_bones:
            pb = pose_bones['Forearm_R']
            pb.rotation_mode = 'XYZ'
            reach = math.sin(t + math.pi) * 0.32
            lift = max(0.0, math.cos(t + math.pi)) * 0.22
            pb.rotation_euler = (reach, 0, -lift)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Left Hind Foot: Follows right front (t + pi)
        if 'Thigh_L' in pose_bones:
            pb = pose_bones['Thigh_L']
            pb.rotation_mode = 'XYZ'
            reach = math.sin(t + math.pi) * 0.25
            lift = max(0.0, math.cos(t + math.pi)) * 0.16
            pb.rotation_euler = (reach, 0, lift)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Right Hind Foot: Follows left front (t)
        if 'Thigh_R' in pose_bones:
            pb = pose_bones['Thigh_R']
            pb.rotation_mode = 'XYZ'
            reach = math.sin(t) * 0.25
            lift = max(0.0, math.cos(t)) * 0.16
            pb.rotation_euler = (reach, 0, -lift)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    # Set active object to Armature and mode to POSE so when user opens it, they are directly in Pose Mode!
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    mesh_obj.select_set(False)
    bpy.ops.object.mode_set(mode='POSE')

    # Save to blender file
    out_blend = os.path.join(base_dir, "blender", "the_warden_rigged.blend")
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print(f"[SUCCESS] Perfectly centered skeleton placed inside the Warden in {out_blend}")

if __name__ == "__main__":
    main()
