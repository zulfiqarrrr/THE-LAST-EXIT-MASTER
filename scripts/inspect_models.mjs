import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

function inspectGlb(path) {
  const glbData = fs.readFileSync(path);
  const arrayBuffer = glbData.buffer.slice(glbData.byteOffset, glbData.byteOffset + glbData.byteLength);
  new GLTFLoader().parse(arrayBuffer, '', (gltf) => {
    console.log('=== GLB:', path, '===');
    let meshes = [];
    gltf.scene.traverse((c) => {
      if (c.isMesh) meshes.push(c);
    });
    console.log('Total meshes:', meshes.length);
    meshes.slice(0, 10).forEach((m, idx) => {
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      console.log('Mesh', idx, m.name, 'verts:', m.geometry.attributes.position.count, 'materials:', m.material?.name || m.material?.type);
    });
    if (meshes.length > 10) console.log('... and', meshes.length - 10, 'more meshes');
  });
}

function inspectObj(path) {
  const text = fs.readFileSync(path, 'utf8');
  const obj = new OBJLoader().parse(text);
  console.log('=== OBJ:', path, '===');
  let meshes = [];
  obj.traverse((c) => {
    if (c.isMesh) meshes.push(c);
  });
  console.log('Total meshes:', meshes.length);
  meshes.slice(0, 10).forEach((m, idx) => {
    m.geometry.computeBoundingBox();
    console.log('Mesh', idx, m.name, 'verts:', m.geometry.attributes.position.count);
  });
}

inspectGlb('public/models/the_archivist.glb');
inspectGlb('public/models/the_crawler.glb');
inspectObj('public/models/archivist_tpose.obj');
