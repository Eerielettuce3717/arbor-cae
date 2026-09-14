import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";

const PLANE_SIZE = 6;

/** Onshape-style datum colors (Y-up viewport: Front +Z, Top +Y, Right +X). */
export const DATUM_COLORS = {
  x: 0xef4444,
  y: 0x22c55e,
  z: 0x3b82f6,
  front: 0x3b82f6,
  top: 0x22c55e,
  right: 0xef4444,
} as const;

function axisLine(from: Vector3, to: Vector3, color: number): Line {
  const geo = new BufferGeometry().setFromPoints([from, to]);
  const mat = new LineBasicMaterial({ color, depthTest: false });
  const line = new Line(geo, mat);
  line.renderOrder = 3;
  return line;
}

function planeMesh(
  name: string,
  color: number,
  rotate: (m: Mesh) => void,
): Mesh {
  const hw = PLANE_SIZE / 2;
  const geo = new BufferGeometry();
  const verts = new Float32Array([
    -hw, -hw, 0, hw, -hw, 0, hw, hw, 0, -hw, -hw, 0, hw, hw, 0, -hw, hw, 0,
  ]);
  geo.setAttribute("position", new Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  const mat = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.18,
    side: DoubleSide,
    depthWrite: false,
  });
  const mesh = new Mesh(geo, mat);
  mesh.name = name;
  mesh.renderOrder = 1;
  const edge = new LineLoop(
    new BufferGeometry().setFromPoints([
      new Vector3(-hw, -hw, 0),
      new Vector3(hw, -hw, 0),
      new Vector3(hw, hw, 0),
      new Vector3(-hw, hw, 0),
    ]),
    new LineBasicMaterial({ color, transparent: true, opacity: 0.55 }),
  );
  edge.renderOrder = 2;
  mesh.add(edge);
  rotate(mesh);
  return mesh;
}

/**
 * Origin triad + Front / Top / Right planes, visible by default.
 */
export function createDatumGroup(): Group {
  const root = new Group();
  root.name = "datums";

  const axisLen = PLANE_SIZE * 0.55;
  root.add(axisLine(new Vector3(0, 0, 0), new Vector3(axisLen, 0, 0), DATUM_COLORS.x));
  root.add(axisLine(new Vector3(0, 0, 0), new Vector3(0, axisLen, 0), DATUM_COLORS.y));
  root.add(axisLine(new Vector3(0, 0, 0), new Vector3(0, 0, axisLen), DATUM_COLORS.z));

  const front = planeMesh("plane-front", DATUM_COLORS.front, () => {
    // XY, facing +Z — identity orientation
  });
  const top = planeMesh("plane-top", DATUM_COLORS.top, (m) => {
    m.rotation.x = -Math.PI / 2;
  });
  const right = planeMesh("plane-right", DATUM_COLORS.right, (m) => {
    m.rotation.y = Math.PI / 2;
  });
  root.add(front, top, right);
  return root;
}
