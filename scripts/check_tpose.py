import bpy

# Test warden_tpose
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath="public/models/warden_tpose.obj")
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
print("Warden T-pose objects:", len(objs))
if objs:
    w = objs[0]
    bbox = [w.matrix_world @ v.co for v in w.data.vertices]
    xs = [v.x for v in bbox]
    ys = [v.y for v in bbox]
    zs = [v.z for v in bbox]
    print(f"Warden bounds: X=[{min(xs):.2f}, {max(xs):.2f}], Y=[{min(ys):.2f}, {max(ys):.2f}], Z=[{min(zs):.2f}, {max(zs):.2f}]")

# Test archivist_tpose
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath="public/models/archivist_tpose.obj")
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
print("Archivist T-pose objects:", len(objs))
if objs:
    xs = []
    ys = []
    zs = []
    for o in objs:
        for v in o.data.vertices:
            p = o.matrix_world @ v.co
            xs.append(p.x); ys.append(p.y); zs.append(p.z)
    print(f"Archivist bounds: X=[{min(xs):.2f}, {max(xs):.2f}], Y=[{min(ys):.2f}, {max(ys):.2f}], Z=[{min(zs):.2f}, {max(zs):.2f}]")
