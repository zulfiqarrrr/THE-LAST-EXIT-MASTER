import struct, json, numpy as np

with open('public/models/the_crawler.glb', 'rb') as f:
    f.seek(12)
    j_len, _ = struct.unpack('<II', f.read(8))
    gltf = json.loads(f.read(j_len).decode('utf-8'))
    b_len, _ = struct.unpack('<II', f.read(8))
    bin_data = f.read(b_len)

print('Meshes in the_crawler.glb:', len(gltf.get('meshes', [])))
for m in gltf.get('meshes', []):
    print('Mesh name:', m.get('name'))
    for p in m.get('primitives', []):
        print('  Attributes:', list(p.get('attributes', {}).keys()))
        for attr, acc_idx in p.get('attributes', {}).items():
            acc = gltf['accessors'][acc_idx]
            print('   ', attr, 'count:', acc['count'], 'type:', acc['type'], 'compType:', acc['componentType'])

p = gltf['meshes'][0]['primitives'][0]
for attr, acc_idx in p['attributes'].items():
    if 'COLOR' in attr:
        acc = gltf['accessors'][acc_idx]
        bv = gltf['bufferViews'][acc['bufferView']]
        offset = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
        count = acc['count']
        c_type = acc['componentType']
        dtype = np.uint8 if c_type == 5121 else np.uint16 if c_type == 5123 else np.float32
        divisor = 255.0 if c_type == 5121 else 65535.0 if c_type == 5123 else 1.0
        n_comp = 4 if acc['type'] == 'VEC4' else 3
        cols = np.frombuffer(bin_data[offset:offset + count * n_comp * dtype().itemsize], dtype=dtype).reshape((count, n_comp)) / divisor
        print('Color data for', attr, ':')
        print('  Mean RGB:', cols[:, :3].mean(axis=0))
        print('  Min RGB:', cols[:, :3].min(axis=0))
        print('  Max RGB:', cols[:, :3].max(axis=0))
        green_mask = (cols[:, 1] > 0.4) & (cols[:, 1] > cols[:, 0] * 1.5)
        print('  High green vertices count:', int(np.sum(green_mask)))
        red_mask = (cols[:, 0] > 0.4) & (cols[:, 0] > cols[:, 1] * 1.5)
        print('  High red vertices count:', int(np.sum(red_mask)))
