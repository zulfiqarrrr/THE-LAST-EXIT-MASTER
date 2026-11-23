import bpy
import os
import math

def render_preview(obj_path, out_png, title=""):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.wm.obj_import(filepath=obj_path)
    except:
        bpy.ops.import_scene.obj(filepath=obj_path)

    # Add camera
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 50
    cam_obj = bpy.data.objects.new("CamObj", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    # Calculate center and size
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    min_x = min([min([v.co.x for v in m.data.vertices]) for m in meshes])
    max_x = max([max([v.co.x for v in m.data.vertices]) for m in meshes])
    min_y = min([min([v.co.y for v in m.data.vertices]) for m in meshes])
    max_y = max([max([v.co.y for v in m.data.vertices]) for m in meshes])
    min_z = min([min([v.co.z for v in m.data.vertices]) for m in meshes])
    max_z = max([max([v.co.z for v in m.data.vertices]) for m in meshes])

    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    cz = (min_z + max_z) / 2
    height = max_z - min_z
    width = max_x - min_x
    span = max(height, width, max_y - min_y)

    # Position camera in front facing +Y (or -Y)
    cam_obj.location = (cx, min_y - span * 2.2, cz)
    cam_obj.rotation_euler = (math.radians(90), 0, 0)

    # Lighting
    light_data = bpy.data.lights.new(name="Light", type='SUN')
    light_data.energy = 4.0
    light_obj = bpy.data.objects.new(name="LightObj", object_data=light_data)
    light_obj.location = (cx + 2, min_y - span * 2, cz + 3)
    light_obj.rotation_euler = (math.radians(45), math.radians(20), 0)
    bpy.context.scene.collection.objects.link(light_obj)

    # Fill
    fill_data = bpy.data.lights.new(name="Fill", type='SUN')
    fill_data.energy = 1.5
    fill_obj = bpy.data.objects.new(name="FillObj", object_data=fill_data)
    fill_obj.location = (cx - 2, min_y - span * 2, cz + 1)
    fill_obj.rotation_euler = (math.radians(60), math.radians(-30), 0)
    bpy.context.scene.collection.objects.link(fill_obj)

    bpy.context.scene.render.resolution_x = 600
    bpy.context.scene.render.resolution_y = 600
    bpy.context.scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {title} to {out_png}")

base = r"C:\Users\ASUS HN116WS\OneDrive\Desktop\game"
render_preview(os.path.join(base, "public/models/warden_tpose.obj"), os.path.join(base, "scripts/warden_tpose_preview.png"), "Warden TPose")
render_preview(os.path.join(base, "public/models/archivist_tpose.obj"), os.path.join(base, "scripts/archivist_tpose_preview.png"), "Archivist TPose")
