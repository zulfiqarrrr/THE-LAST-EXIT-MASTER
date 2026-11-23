import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
base_dir = r"C:\Users\ASUS HN116WS\OneDrive\Desktop\game"
source_glb = os.path.join(base_dir, "public", "models", "warden.glb")

bpy.ops.import_scene.gltf(filepath=source_glb)
mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        mesh_obj = obj
        break

if mesh_obj:
    mesh_obj.name = "The_Warden_Quadruped_Beast"
    # Center on ground
    min_z = min([v.co.z for v in mesh_obj.data.vertices])
    mesh_obj.location.z = -min_z
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    out_blend = os.path.join(base_dir, "blender", "the_warden_quadruped.blend")
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print(f"[SUCCESS] Saved quadruped beast project to {out_blend}")
