/** Rigid 3D frames and Onshape-style mate snapping (column-major 4×4). */

export type Vec3 = [number, number, number];

export type Mat4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Right-handed orthonormal frame (mate connector). Z is the primary axis. */
export interface Frame {
  origin: Vec3;
  xAxis: Vec3;
  yAxis: Vec3;
  zAxis: Vec3;
}

export const EPS = 1e-9;

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return [x, y, z];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  if (len < EPS) return [0, 0, 1];
  return [a[0] / len, a[1] / len, a[2] / len];
}

export function identityMat4(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function translationMat4(t: Vec3): Mat4 {
  const m = identityMat4();
  m[12] = t[0];
  m[13] = t[1];
  m[14] = t[2];
  return m;
}

export function rotationXMat4(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}

export function rotationZMat4(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function mulMat4(a: Mat4, b: Mat4): Mat4 {
  const r = identityMat4();
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      r[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }
  return r;
}

/** Invert a rigid (orthonormal rotation + translation) transform. */
export function invertRigid(m: Mat4): Mat4 {
  const tx = m[12];
  const ty = m[13];
  const tz = m[14];
  return [
    m[0],
    m[4],
    m[8],
    0,
    m[1],
    m[5],
    m[9],
    0,
    m[2],
    m[6],
    m[10],
    0,
    -(m[0] * tx + m[1] * ty + m[2] * tz),
    -(m[4] * tx + m[5] * ty + m[6] * tz),
    -(m[8] * tx + m[9] * ty + m[10] * tz),
    1,
  ];
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

export function transformDir(m: Mat4, d: Vec3): Vec3 {
  return [
    m[0] * d[0] + m[4] * d[1] + m[8] * d[2],
    m[1] * d[0] + m[5] * d[1] + m[9] * d[2],
    m[2] * d[0] + m[6] * d[1] + m[10] * d[2],
  ];
}

export function frameToMat4(frame: Frame): Mat4 {
  const { xAxis: x, yAxis: y, zAxis: z, origin: o } = frame;
  return [
    x[0],
    x[1],
    x[2],
    0,
    y[0],
    y[1],
    y[2],
    0,
    z[0],
    z[1],
    z[2],
    0,
    o[0],
    o[1],
    o[2],
    1,
  ];
}

export function mat4ToFrame(m: Mat4): Frame {
  return {
    xAxis: normalize([m[0], m[1], m[2]]),
    yAxis: normalize([m[4], m[5], m[6]]),
    zAxis: normalize([m[8], m[9], m[10]]),
    origin: [m[12], m[13], m[14]],
  };
}

/**
 * Build a right-handed orthonormal frame from origin, primary (Z) axis,
 * and a secondary (X) hint that is Gram–Schmidt orthogonalized against Z.
 */
export function makeFrame(origin: Vec3, zAxis: Vec3, xHint: Vec3): Frame {
  const z = normalize(zAxis);
  let x = sub(xHint, scale(z, dot(xHint, z)));
  if (length(x) < 1e-8) {
    const alt: Vec3 = Math.abs(z[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    x = sub(alt, scale(z, dot(alt, z)));
  }
  x = normalize(x);
  const y = normalize(cross(z, x));
  // Re-orthogonalize X in case the hint was poorly aligned: x = y × z.
  x = normalize(cross(y, z));
  return { origin: [origin[0], origin[1], origin[2]], xAxis: x, yAxis: y, zAxis: z };
}

export interface MateSolveOptions {
  /** Rotate 180° about X so primary (Z) axes anti-align. */
  flipPrimary?: boolean;
  /** Rotate 180° about Z so secondary (X) axes anti-align. */
  flipSecondary?: boolean;
  /** Revolute angle in radians about the primary axis. */
  angle?: number;
}

/**
 * Alignment that maps the moved connector onto the fixed connector:
 * `T_moved * C_moved = T_fixed * C_fixed * F * Rz(θ)`
 * ⇒ `T_moved = T_fixed * C_fixed * F * Rz(θ) * inv(C_moved)`
 */
export function mateAlignment(options: MateSolveOptions = {}): Mat4 {
  let f = identityMat4();
  if (options.flipPrimary) f = mulMat4(f, rotationXMat4(Math.PI));
  if (options.flipSecondary) f = mulMat4(f, rotationZMat4(Math.PI));
  const angle = options.angle ?? 0;
  if (Math.abs(angle) > EPS) f = mulMat4(f, rotationZMat4(angle));
  return f;
}

export function composeWorld(instanceWorld: Mat4, connectorLocal: Mat4): Mat4 {
  return mulMat4(instanceWorld, connectorLocal);
}

/**
 * Fastened mate: coincident origins and fully aligned frames (6 DOF locked).
 * Returns the world transform of the moved instance.
 */
export function solveFastened(
  fixedWorld: Mat4,
  fixedConnectorLocal: Mat4,
  movedConnectorLocal: Mat4,
  options: Omit<MateSolveOptions, "angle"> = {},
): Mat4 {
  const align = mateAlignment({ ...options, angle: 0 });
  return mulMat4(
    mulMat4(mulMat4(fixedWorld, fixedConnectorLocal), align),
    invertRigid(movedConnectorLocal),
  );
}

/**
 * Revolute mate: coincident origins, aligned primary (Z) axes.
 * Rotation about Z remains a free DOF parameterized by `angle` radians.
 */
export function solveRevolute(
  fixedWorld: Mat4,
  fixedConnectorLocal: Mat4,
  movedConnectorLocal: Mat4,
  angleRadians: number,
  options: Omit<MateSolveOptions, "angle"> = {},
): Mat4 {
  const align = mateAlignment({ ...options, angle: angleRadians });
  return mulMat4(
    mulMat4(mulMat4(fixedWorld, fixedConnectorLocal), align),
    invertRigid(movedConnectorLocal),
  );
}

export type SolvedMateKind = "fastened" | "revolute";

export function solveMateWorld(
  kind: SolvedMateKind,
  fixedWorld: Mat4,
  fixedConnectorLocal: Mat4,
  movedConnectorLocal: Mat4,
  options: MateSolveOptions = {},
): Mat4 {
  if (kind === "revolute") {
    return solveRevolute(
      fixedWorld,
      fixedConnectorLocal,
      movedConnectorLocal,
      options.angle ?? 0,
      options,
    );
  }
  return solveFastened(
    fixedWorld,
    fixedConnectorLocal,
    movedConnectorLocal,
    options,
  );
}

export interface MateResidual {
  originDistance: number;
  primaryDot: number;
  secondaryDot: number;
  fastened: boolean;
  revolute: boolean;
}

/** Compare two connector frames in world space after a solve. */
export function measureMateResidual(a: Frame, b: Frame): MateResidual {
  const originDistance = length(sub(a.origin, b.origin));
  const primaryDot = dot(a.zAxis, b.zAxis);
  const secondaryDot = dot(a.xAxis, b.xAxis);
  const revolute = originDistance < 1e-6 && Math.abs(Math.abs(primaryDot) - 1) < 1e-6;
  const fastened = revolute && Math.abs(Math.abs(secondaryDot) - 1) < 1e-6;
  return { originDistance, primaryDot, secondaryDot, fastened, revolute };
}

export function cloneMat4(m: Mat4): Mat4 {
  return [...m] as Mat4;
}

export function mat4Equals(a: Mat4, b: Mat4, tol = 1e-6): boolean {
  for (let i = 0; i < 16; i++) {
    if (Math.abs(a[i] - b[i]) > tol) return false;
  }
  return true;
}
