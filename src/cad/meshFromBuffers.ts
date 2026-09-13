/**
 * Convert transferable mesh buffers from the CAD worker into Three.js geometry.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Sphere,
  Vector3,
} from "three";
import type { MeshBuffers } from "./types";

export function bufferGeometryFromMesh(mesh: MeshBuffers): BufferGeometry {
  const geometry = new BufferGeometry();

  if (mesh.normals.length !== mesh.positions.length) {
    throw new Error(
      `Mesh ${mesh.shapeId}: normal buffer length ${mesh.normals.length} does not match position buffer length ${mesh.positions.length}`,
    );
  }

  // Plain BufferAttribute adopts the typed array as-is. The Float32BufferAttribute
  // / Uint32BufferAttribute subclasses re-wrap it (`new Float32Array(array)`),
  // which copied every buffer and threw away the zero-copy transfer the worker
  // just paid for.
  geometry.setAttribute("position", new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));

  if (mesh.positions.length === 0) {
    // computeBoundingSphere() on an empty attribute yields a NaN radius, which
    // makes frustum culling drop every object and spams the console.
    geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 0);
  } else {
    geometry.computeBoundingSphere();
  }

  return geometry;
}

export function meshFromBuffers(
  mesh: MeshBuffers,
  options?: { partId?: string; color?: string },
): Mesh {
  const geometry = bufferGeometryFromMesh(mesh);
  const material = new MeshStandardMaterial({
    color: new Color(options?.color ?? "#8b949e"),
    metalness: 0.25,
    roughness: 0.45,
    side: DoubleSide,
  });
  const threeMesh = new Mesh(geometry, material);
  const partId = options?.partId ?? mesh.shapeId;
  threeMesh.name = partId;
  threeMesh.userData.partId = partId;
  threeMesh.userData.fromOcct = true;
  return threeMesh;
}
