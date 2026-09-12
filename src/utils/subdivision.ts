/**
 * Catmull-Clark subdivision for quad (and general polygon) control cages.
 * Used by the Form Workspace sculpt preview.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Indexed polygon mesh. Faces are ordered rings of vertex indices (quads preferred). */
export interface QuadMesh {
  vertices: Vec3[];
  /** Each face is a list of vertex indices (typically 4 for a control cage). */
  faces: number[][];
}

export interface TriangleBuffers {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  triangleCount: number;
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function cloneVec3(v: Vec3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scaleVec3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function averageVec3(points: Vec3[]): Vec3 {
  if (points.length === 0) return vec3(0, 0, 0);
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
    z += p.z;
  }
  const inv = 1 / points.length;
  return { x: x * inv, y: y * inv, z: z * inv };
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/** Axis-aligned unit-ish box control cage centered at origin. */
export function createBoxCage(size = 20): QuadMesh {
  const h = size * 0.5;
  const vertices: Vec3[] = [
    vec3(-h, -h, -h), // 0
    vec3(h, -h, -h), // 1
    vec3(h, h, -h), // 2
    vec3(-h, h, -h), // 3
    vec3(-h, -h, h), // 4
    vec3(h, -h, h), // 5
    vec3(h, h, h), // 6
    vec3(-h, h, h), // 7
  ];
  // Outward-facing winding (CCW when viewed from outside).
  const faces: number[][] = [
    [0, 1, 2, 3], // back  (-Z)
    [5, 4, 7, 6], // front (+Z)
    [4, 0, 3, 7], // left  (-X)
    [1, 5, 6, 2], // right (+X)
    [3, 2, 6, 7], // top   (+Y)
    [4, 5, 1, 0], // bottom(-Y)
  ];
  return { vertices, faces };
}

export function cloneQuadMesh(mesh: QuadMesh): QuadMesh {
  return {
    vertices: mesh.vertices.map(cloneVec3),
    faces: mesh.faces.map((f) => [...f]),
  };
}

export function flattenVertices(vertices: Vec3[]): number[] {
  const out: number[] = [];
  for (const v of vertices) out.push(v.x, v.y, v.z);
  return out;
}

export function unflattenVertices(flat: number[]): Vec3[] {
  const verts: Vec3[] = [];
  for (let i = 0; i + 2 < flat.length; i += 3) {
    verts.push(vec3(flat[i], flat[i + 1], flat[i + 2]));
  }
  return verts;
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

interface EdgeRecord {
  a: number;
  b: number;
  faces: number[];
}

/**
 * One Catmull-Clark refinement step.
 * Supports n-gons; closed manifold meshes produce all-quad output after one step.
 */
export function catmullClarkOnce(mesh: QuadMesh): QuadMesh {
  const { vertices, faces } = mesh;
  const nFaces = faces.length;

  // Face points: average of face vertices.
  const facePoints: Vec3[] = faces.map((face) =>
    averageVec3(face.map((i) => vertices[i])),
  );

  // Build unique edges with adjacent faces.
  const edgeMap = new Map<string, EdgeRecord>();
  for (let fi = 0; fi < nFaces; fi++) {
    const face = faces[fi];
    const n = face.length;
    for (let i = 0; i < n; i++) {
      const a = face[i];
      const b = face[(i + 1) % n];
      const key = edgeKey(a, b);
      let rec = edgeMap.get(key);
      if (!rec) {
        rec = { a: Math.min(a, b), b: Math.max(a, b), faces: [] };
        edgeMap.set(key, rec);
      }
      rec.faces.push(fi);
    }
  }

  const edges = [...edgeMap.values()];
  const edgeIndex = new Map<string, number>();
  edges.forEach((e, i) => edgeIndex.set(edgeKey(e.a, e.b), i));

  // Edge points.
  const edgePoints: Vec3[] = edges.map((e) => {
    if (e.faces.length === 2) {
      return averageVec3([
        vertices[e.a],
        vertices[e.b],
        facePoints[e.faces[0]],
        facePoints[e.faces[1]],
      ]);
    }
    // Boundary: midpoint of endpoints.
    return averageVec3([vertices[e.a], vertices[e.b]]);
  });

  // Vertex adjacency: incident faces and edges.
  const vertFaces: number[][] = vertices.map(() => []);
  const vertEdges: number[][] = vertices.map(() => []);
  for (let fi = 0; fi < nFaces; fi++) {
    for (const vi of faces[fi]) vertFaces[vi].push(fi);
  }
  for (let ei = 0; ei < edges.length; ei++) {
    const e = edges[ei];
    vertEdges[e.a].push(ei);
    vertEdges[e.b].push(ei);
  }

  // Updated original vertices.
  const newVertexPoints: Vec3[] = vertices.map((v, vi) => {
    const n = vertEdges[vi].length;
    if (n === 0) return cloneVec3(v);

    const incidentFacePts = vertFaces[vi].map((fi) => facePoints[fi]);
    const F = averageVec3(incidentFacePts);

    // R = average of midpoints of edges incident to v.
    const midpoints = vertEdges[vi].map((ei) => {
      const e = edges[ei];
      return averageVec3([vertices[e.a], vertices[e.b]]);
    });
    const R = averageVec3(midpoints);

    // Boundary vertices: (3/4)*V + (1/8)*neighbors — simplified Catmull-Clark boundary.
    const isBoundary = vertEdges[vi].some((ei) => edges[ei].faces.length < 2);
    if (isBoundary) {
      const boundaryNeighbors: Vec3[] = [];
      for (const ei of vertEdges[vi]) {
        const e = edges[ei];
        if (e.faces.length < 2) {
          boundaryNeighbors.push(vertices[e.a === vi ? e.b : e.a]);
        }
      }
      if (boundaryNeighbors.length >= 2) {
        return {
          x: (6 * v.x + boundaryNeighbors[0].x + boundaryNeighbors[1].x) / 8,
          y: (6 * v.y + boundaryNeighbors[0].y + boundaryNeighbors[1].y) / 8,
          z: (6 * v.z + boundaryNeighbors[0].z + boundaryNeighbors[1].z) / 8,
        };
      }
    }

    // Interior: V' = (F + 2R + (n-3)V) / n
    return {
      x: (F.x + 2 * R.x + (n - 3) * v.x) / n,
      y: (F.y + 2 * R.y + (n - 3) * v.y) / n,
      z: (F.z + 2 * R.z + (n - 3) * v.z) / n,
    };
  });

  // Layout new vertex buffer: [updated verts | face points | edge points]
  const vCount = vertices.length;
  const fBase = vCount;
  const eBase = fBase + nFaces;
  const newVertices: Vec3[] = [
    ...newVertexPoints,
    ...facePoints,
    ...edgePoints,
  ];

  const newFaces: number[][] = [];
  for (let fi = 0; fi < nFaces; fi++) {
    const face = faces[fi];
    const n = face.length;
    const facePt = fBase + fi;
    for (let i = 0; i < n; i++) {
      const curr = face[i];
      const next = face[(i + 1) % n];
      const prev = face[(i - 1 + n) % n];
      const eNext = eBase + (edgeIndex.get(edgeKey(curr, next)) as number);
      const ePrev = eBase + (edgeIndex.get(edgeKey(prev, curr)) as number);
      newFaces.push([curr, eNext, facePt, ePrev]);
    }
  }

  return { vertices: newVertices, faces: newFaces };
}

/** Apply Catmull-Clark `levels` times (clamped). */
export function subdivideCatmullClark(mesh: QuadMesh, levels: number): QuadMesh {
  const n = Math.max(0, Math.min(5, Math.floor(levels)));
  let result = cloneQuadMesh(mesh);
  for (let i = 0; i < n; i++) {
    result = catmullClarkOnce(result);
  }
  return result;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/** Fan-triangulate polygons and compute smooth-ish vertex normals. */
export function quadMeshToTriangleBuffers(mesh: QuadMesh): TriangleBuffers {
  const positions = new Float32Array(mesh.vertices.length * 3);
  for (let i = 0; i < mesh.vertices.length; i++) {
    const v = mesh.vertices[i];
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }

  const indexList: number[] = [];
  for (const face of mesh.faces) {
    if (face.length < 3) continue;
    for (let i = 1; i < face.length - 1; i++) {
      indexList.push(face[0], face[i], face[i + 1]);
    }
  }
  const indices = Uint32Array.from(indexList);

  const normals = new Float32Array(positions.length);
  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t];
    const i1 = indices[t + 1];
    const i2 = indices[t + 2];
    const ax = positions[i0 * 3];
    const ay = positions[i0 * 3 + 1];
    const az = positions[i0 * 3 + 2];
    const bx = positions[i1 * 3];
    const by = positions[i1 * 3 + 1];
    const bz = positions[i1 * 3 + 2];
    const cx = positions[i2 * 3];
    const cy = positions[i2 * 3 + 1];
    const cz = positions[i2 * 3 + 2];
    const n = normalize(
      cross(
        { x: bx - ax, y: by - ay, z: bz - az },
        { x: cx - ax, y: cy - ay, z: cz - az },
      ),
    );
    for (const idx of [i0, i1, i2]) {
      normals[idx * 3] += n.x;
      normals[idx * 3 + 1] += n.y;
      normals[idx * 3 + 2] += n.z;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const n = normalize({
      x: normals[i],
      y: normals[i + 1],
      z: normals[i + 2],
    });
    normals[i] = n.x;
    normals[i + 1] = n.y;
    normals[i + 2] = n.z;
  }

  return {
    positions,
    normals,
    indices,
    vertexCount: mesh.vertices.length,
    triangleCount: indices.length / 3,
  };
}
