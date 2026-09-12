/**
 * Convert transferable mesh buffers from the CAD worker into Three.js geometry.
 */

import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Uint32BufferAttribute,
} from "three";
import type { MeshBuffers } from "./types";

export function bufferGeometryFromMesh(mesh: MeshBuffers): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(mesh.positions, 3),
  );
  geometry.setAttribute("normal", new Float32BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new Uint32BufferAttribute(mesh.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function meshFromBuffers(
  mesh: MeshBuffers,
  options?: { partId?: string; color?: string },
): Mesh {
  const geometry = bufferGeometryFromMesh(mesh);
  const material = new MeshStandardMaterial({
    color: new Color(options?.color ?? "#5b8def"),
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
