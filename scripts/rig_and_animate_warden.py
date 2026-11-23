"""
rig_and_animate_warden.py — Builds a true bone skeleton and baked quadruped walk cycle
for The Warden using the user's painted model.
"""

import bpy
import math
import os
from mathutils import Vector, Euler, Matrix

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

    # Ensure mesh transforms are applied
    bpy.context.view_layer.objects.active = mesh_obj
    mesh_obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 1. Create Armature
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.active_object
    arm_obj.name = "Warden_Armature"
    arm_data = arm_obj.data
    arm_data.name = "Warden_Rig"

    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm_data.edit_bones
    for b in list(edit_bones):
        edit_bones.remove(b)

    # Coordinates based on mesh bounds:
    # X: -1.4 to +1.4
    # Y: -1.2 to +1.2 (Forward/Back in Blender default)
    # Z: -0.87 to +0.87 (Up/Down)

    # Root / Pelvis
    b_root = edit_bones.new('Root')
    b_root.head = (0, -0.4, 0.2)
    b_root.tail = (0, 0, 0.3)

    # Spine Mid & Chest
    b_spine = edit_bones.new('Spine')
    b_spine.head = (0, 0, 0.3)
    b_spine.tail = (0, 0.45, 0.45)
    b_spine.parent = b_root

    # Neck & Head
    b_neck = edit_bones.new('Neck')
    b_neck.head = (0, 0.45, 0.45)
    b_neck.tail = (0, 0.8, 0.4)
    b_neck.parent = b_spine

    b_head = edit_bones.new('Head')
    b_head.head = (0, 0.8, 0.4)
    b_head.tail = (0, 1.25, 0.25)
    b_head.parent = b_neck

    # Front Limbs (Left: +X, Right: -X)
    for s, side in [(1, 'L'), (-1, 'R')]:
        b_sh = edit_bones.new(f'Shoulder_{side}')
        b_sh.head = (s * 0.3, 0.35, 0.45)
        b_sh.tail = (s * 0.75, 0.4, 0.35)
        b_sh.parent = b_spine

        b_arm = edit_bones.new(f'Forearm_{side}')
        b_arm.head = (s * 0.75, 0.4, 0.35)
        b_arm.tail = (s * 0.95, 0.65, -0.2)
        b_arm.parent = b_sh

        b_paw = edit_bones.new(f'Paw_{side}')
        b_paw.head = (s * 0.95, 0.65, -0.2)
        b_paw.tail = (s * 1.1, 0.85, -0.8)
        b_paw.parent = b_arm

        # Hind Limbs
        b_hip = edit_bones.new(f'Hip_{side}')
        b_hip.head = (s * 0.25, -0.3, 0.2)
        b_hip.tail = (s * 0.55, -0.5, 0.05)
        b_hip.parent = b_root

        b_thigh = edit_bones.new(f'Thigh_{side}')
        b_thigh.head = (s * 0.55, -0.5, 0.05)
        b_thigh.tail = (s * 0.6, -0.75, -0.4)
        b_thigh.parent = b_hip

        b_foot = edit_bones.new(f'Foot_{side}')
        b_foot.head = (s * 0.6, -0.75, -0.4)
        b_foot.tail = (s * 0.65, -0.8, -0.8)
        b_foot.parent = b_thigh

    bpy.ops.object.mode_set(mode='OBJECT')

    # 2. Parent Mesh to Armature with Weights
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # 3. Create a Realistic 4-Legged Stalking Walk Cycle (40 Frames Loop)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 40

    anim_data = arm_obj.animation_data_create()
    walk_action = bpy.data.actions.new(name="Walk")
    anim_data.action = walk_action

    bpy.ops.object.mode_set(mode='POSE')
    pose_bones = arm_obj.pose.bones

    # Walk cycle keyframes at 0, 10, 20, 30, 40 (0 and 40 match for seamless loop)
    # Quadruped diagonal trot:
    # Beat 1 (frames 1-10): Left Front + Right Hind swing forward, Right Front + Left Hind push backward
    # Beat 2 (frames 11-20): Left Front plants, body surges forward
    # Beat 3 (frames 21-30): Right Front + Left Hind swing forward, Left Front + Right Hind push backward
    # Beat 4 (frames 31-40): Right Front plants, return to start
    
    for frame in range(1, 41):
        bpy.context.scene.frame_set(frame)
        t = (frame - 1) / 40.0 * 2.0 * math.pi

        # Spine sway and bob
        if 'Spine' in pose_bones:
            pb = pose_bones['Spine']
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (
                math.sin(t * 2) * 0.06,  # pitch bob
                math.cos(t) * 0.08,      # yaw sway
                math.sin(t) * 0.05       # roll into step
            )
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Head stabilization (looking forward)
        if 'Head' in pose_bones:
            pb = pose_bones['Head']
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (
                -math.sin(t * 2) * 0.04,
                -math.cos(t) * 0.05,
                math.sin(frame * 0.4) * 0.03 # subtle twitch
            )
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Left Forelimb (swinging at t, planting at t + pi)
        if 'Forearm_L' in pose_bones:
            pb = pose_bones['Forearm_L']
            pb.rotation_mode = 'XYZ'
            reach = math.sin(t) * 0.35
            lift = max(0.0, math.cos(t)) * 0.25
            pb.rotation_euler = (reach, 0, lift)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Right Forelimb (opposite phase: t + pi)
        if 'Forearm_R' in pose_bones:
            pb = pose_bones['Forearm_R']
            pb.rotation_mode = 'XYZ'
            reach = math.sin(t + math.pi) * 0.35
            lift = max(0.0, math.cos(t + math.pi)) * 0.25
            pb.rotation_euler = (reach, 0, -lift)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Left Hindlimb (follows opposite front: t + pi)
        if 'Thigh_L' in pose_bones:
            pb = pose_bones['Thigh_L']
            pb.rotation_mode = 'XYZ'
            reach = math.sin(t + math.pi) * 0.28
            lift = max(0.0, math.cos(t + math.pi)) * 0.18
            pb.rotation_euler = (reach, 0, lift)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Right Hindlimb (follows left front: t)
        if 'Thigh_R' in pose_bones:
            pb = pose_bones['Thigh_R']
            pb.rotation_mode = 'XYZ'
            reach = math.sin(t) * 0.28
            lift = max(0.0, math.cos(t)) * 0.18
            pb.rotation_euler = (reach, 0, -lift)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Save to blender project
    out_blend = os.path.join(base_dir, "blender", "the_warden_rigged.blend")
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print(f"[SUCCESS] Saved rigged & animated project to {out_blend}")

    # Export to GLB with animations!
    out_glb = os.path.join(base_dir, "public", "models", "the_warden_animated.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        export_animations=True,
        export_yup=True
    )
    print(f"[SUCCESS] Exported animated GLB to {out_glb}")

if __name__ == "__main__":
    main()
