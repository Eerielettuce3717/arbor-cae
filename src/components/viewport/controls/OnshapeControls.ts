import {
  MathUtils,
  OrthographicCamera,
  PerspectiveCamera,
  Spherical,
  Vector2,
  Vector3,
  type Camera,
} from "three";

export type ActiveCamera = PerspectiveCamera | OrthographicCamera;

type DragMode = "orbit" | "pan" | null;

/**
 * Onshape-style viewport navigation:
 * - Right-drag: orbit about target
 * - Middle-drag: pan
 * - Wheel: zoom toward the 3D point under the cursor
 * - Touch: one-finger pan, two-finger pinch-zoom (+ orbit via two-finger rotate)
 */
export class OnshapeControls {
  readonly target = new Vector3(0, 0, 0);

  enabled = true;
  orbitSpeed = 1;
  panSpeed = 1;
  zoomSpeed = 1;
  minDistance = 0.05;
  maxDistance = 5000;
  minZoom = 0.05;
  maxZoom = 500;

  private camera: ActiveCamera;
  private domElement: HTMLElement;
  private spherical = new Spherical();
  private dragMode: DragMode = null;
  private pointerId: number | null = null;
  private lastPointer = new Vector2();
  private touches = new Map<number, Vector2>();
  private pinchStartDist = 0;
  private pinchStartRadius = 0;
  private pinchStartZoom = 1;
  private twoFingerMid = new Vector2();
  private twoFingerAngle = 0;
  private rotatingWithTwoFingers = false;

  private readonly offset = new Vector3();
  private readonly panOffset = new Vector3();
  private readonly eye = new Vector3();
  private readonly right = new Vector3();
  private readonly up = new Vector3();
  private readonly ndc = new Vector2();
  private readonly before = new Vector3();
  private readonly after = new Vector3();
  private readonly scratch = new Vector3();
  private readonly pinchMid = new Vector2();

  private onContextMenu = (e: Event) => e.preventDefault();

  constructor(camera: ActiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.bind();
    this.syncSphericalFromCamera();
  }

  setCamera(camera: ActiveCamera) {
    this.camera = camera;
    this.syncSphericalFromCamera();
  }

  getCamera(): ActiveCamera {
    return this.camera;
  }

  dispose() {
    const el = this.domElement;
    el.removeEventListener("contextmenu", this.onContextMenu);
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointermove", this.onPointerMove);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointercancel", this.onPointerUp);
    el.removeEventListener("wheel", this.onWheel);
  }

  /** Recompute spherical coords from camera ↔ target. */
  syncSphericalFromCamera() {
    this.offset.copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(this.offset);
  }

  /** Apply spherical + target to the active camera. */
  update() {
    this.offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);

    if (this.isOrtho(this.camera)) {
      this.camera.updateProjectionMatrix();
    }
  }

  fitToSphere(center: Vector3, radius: number, padding = 1.35) {
    this.target.copy(center);
    const dist = Math.max(radius * padding, this.minDistance);
    this.spherical.radius = dist;
    if (this.isOrtho(this.camera)) {
      const aspect = this.camera.right / Math.max(this.camera.top, 1e-6);
      const half = radius * padding;
      this.camera.top = half;
      this.camera.bottom = -half;
      this.camera.left = -half * aspect;
      this.camera.right = half * aspect;
      this.camera.zoom = 1;
      this.camera.updateProjectionMatrix();
    }
    this.update();
  }

  /**
   * Aim camera along `-normal`, with `up` as world-up preference.
   * Used by "Orient Normal to Sketch Plane".
   */
  orientToPlane(origin: Vector3, normal: Vector3, upHint: Vector3) {
    const n = normal.clone().normalize();
    const up = upHint.clone().normalize();
    if (Math.abs(n.dot(up)) > 0.99) {
      up.set(0, 1, 0);
      if (Math.abs(n.dot(up)) > 0.99) up.set(1, 0, 0);
    }
    this.target.copy(origin);
    const radius = Math.max(this.spherical.radius, 2);
    this.camera.position.copy(origin).addScaledVector(n, radius);
    this.camera.up.copy(up);
    this.camera.lookAt(this.target);
    this.syncSphericalFromCamera();
    this.update();
  }

  private bind() {
    const el = this.domElement;
    el.style.touchAction = "none";
    el.addEventListener("contextmenu", this.onContextMenu);
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerUp);
    el.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.enabled) return;

    if (event.pointerType === "touch") {
      this.touches.set(
        event.pointerId,
        new Vector2(event.clientX, event.clientY),
      );
      this.domElement.setPointerCapture(event.pointerId);
      if (this.touches.size === 2) {
        this.beginPinch();
      } else if (this.touches.size === 1) {
        this.dragMode = "pan";
        this.pointerId = event.pointerId;
        this.lastPointer.set(event.clientX, event.clientY);
      }
      return;
    }

    // Onshape: RMB orbit, MMB pan (ignore LMB — reserved for select).
    if (event.button === 2) {
      this.dragMode = "orbit";
    } else if (event.button === 1) {
      this.dragMode = "pan";
      event.preventDefault();
    } else {
      return;
    }

    this.pointerId = event.pointerId;
    this.lastPointer.set(event.clientX, event.clientY);
    this.domElement.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.enabled) return;

    if (event.pointerType === "touch") {
      if (!this.touches.has(event.pointerId)) return;
      this.touches.set(
        event.pointerId,
        new Vector2(event.clientX, event.clientY),
      );
      if (this.touches.size >= 2) {
        this.updatePinch();
      } else if (this.dragMode === "pan" && this.pointerId === event.pointerId) {
        this.applyPan(event.clientX, event.clientY);
      }
      return;
    }

    if (this.pointerId !== event.pointerId || !this.dragMode) return;

    if (this.dragMode === "orbit") {
      this.applyOrbit(event.clientX, event.clientY);
    } else if (this.dragMode === "pan") {
      this.applyPan(event.clientX, event.clientY);
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      this.touches.delete(event.pointerId);
      try {
        this.domElement.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      if (this.touches.size < 2) {
        this.rotatingWithTwoFingers = false;
        this.pinchStartDist = 0;
      }
      if (this.touches.size === 1) {
        const remaining = this.touches.entries().next().value;
        if (remaining) {
          this.dragMode = "pan";
          this.pointerId = remaining[0];
          this.lastPointer.copy(remaining[1]);
        }
      } else if (this.touches.size === 0) {
        this.dragMode = null;
        this.pointerId = null;
      }
      return;
    }

    if (this.pointerId === event.pointerId) {
      try {
        this.domElement.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      this.dragMode = null;
      this.pointerId = null;
    }
  };

  private onWheel = (event: WheelEvent) => {
    if (!this.enabled) return;
    event.preventDefault();

    const rect = this.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.zoomToCursor(x, y, event.deltaY);
  };

  private applyOrbit(clientX: number, clientY: number) {
    const dx = clientX - this.lastPointer.x;
    const dy = clientY - this.lastPointer.y;
    this.lastPointer.set(clientX, clientY);

    const el = this.domElement;
    const rotX = (2 * Math.PI * dx) / el.clientHeight;
    const rotY = (2 * Math.PI * dy) / el.clientHeight;

    this.spherical.theta -= rotX * this.orbitSpeed;
    this.spherical.phi -= rotY * this.orbitSpeed;
    this.spherical.phi = MathUtils.clamp(
      this.spherical.phi,
      0.01,
      Math.PI - 0.01,
    );
    this.update();
  }

  private applyPan(clientX: number, clientY: number) {
    const dx = clientX - this.lastPointer.x;
    const dy = clientY - this.lastPointer.y;
    this.lastPointer.set(clientX, clientY);

    const el = this.domElement;
    this.eye.copy(this.camera.position).sub(this.target);
    const distance = this.eye.length();

    this.right.setFromMatrixColumn(this.camera.matrix, 0);
    this.up.setFromMatrixColumn(this.camera.matrix, 1);

    let panX: number;
    let panY: number;

    if (this.isOrtho(this.camera)) {
      const cam = this.camera;
      const halfH = (cam.top - cam.bottom) / (2 * cam.zoom);
      const halfW = (cam.right - cam.left) / (2 * cam.zoom);
      panX = (-2 * dx * halfW) / el.clientWidth;
      panY = (2 * dy * halfH) / el.clientHeight;
    } else {
      const cam = this.camera as PerspectiveCamera;
      const fov = cam.fov * MathUtils.DEG2RAD;
      const targetDistance =
        distance * Math.tan(fov * 0.5) * 2;
      panX = (-dx * targetDistance * this.panSpeed) / el.clientHeight;
      panY = (dy * targetDistance * this.panSpeed) / el.clientHeight;
    }

    this.panOffset.copy(this.right).multiplyScalar(panX);
    this.panOffset.addScaledVector(this.up, panY);
    this.camera.position.add(this.panOffset);
    this.target.add(this.panOffset);
    this.update();
  }

  /**
   * Zoom so the world point under the cursor stays under the cursor
   * (Onshape / CAD "zoom to mouse" behavior).
   */
  private zoomToCursor(localX: number, localY: number, deltaY: number) {
    const el = this.domElement;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w <= 0 || h <= 0) return;

    this.ndc.set((localX / w) * 2 - 1, -(localY / h) * 2 + 1);

    // Intersection of cursor ray with the plane through target, facing camera.
    this.unprojectOnTargetPlane(this.ndc, this.before);

    const zoomFactor = Math.exp(-deltaY * 0.001 * this.zoomSpeed);

    if (this.isOrtho(this.camera)) {
      const cam = this.camera;
      cam.zoom = MathUtils.clamp(
        cam.zoom * zoomFactor,
        this.minZoom,
        this.maxZoom,
      );
      cam.updateProjectionMatrix();
    } else {
      this.spherical.radius = MathUtils.clamp(
        this.spherical.radius / zoomFactor,
        this.minDistance,
        this.maxDistance,
      );
      this.offset.setFromSpherical(this.spherical);
      this.camera.position.copy(this.target).add(this.offset);
      this.camera.lookAt(this.target);
      this.camera.updateMatrixWorld(true);
    }

    this.unprojectOnTargetPlane(this.ndc, this.after);
    this.scratch.copy(this.before).sub(this.after);
    this.camera.position.add(this.scratch);
    this.target.add(this.scratch);

    if (!this.isOrtho(this.camera)) {
      this.syncSphericalFromCamera();
    }
    this.update();
  }

  private unprojectOnTargetPlane(ndc: Vector2, out: Vector3) {
    this.eye.copy(this.camera.position).sub(this.target).normalize();
    // Plane: eye · (X - target) = 0
    out.set(ndc.x, ndc.y, 0.5).unproject(this.camera);
    const dir = out.sub(this.camera.position).normalize();
    const denom = this.eye.dot(dir);
    if (Math.abs(denom) < 1e-8) {
      out.copy(this.target);
      return;
    }
    const t = this.eye.dot(
      this.scratch.copy(this.target).sub(this.camera.position),
    ) / denom;
    out.copy(this.camera.position).addScaledVector(dir, t);
  }

  private beginPinch() {
    const pts = [...this.touches.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    this.pinchStartDist = a.distanceTo(b);
    this.pinchStartRadius = this.spherical.radius;
    this.pinchStartZoom = this.isOrtho(this.camera) ? this.camera.zoom : 1;
    this.twoFingerMid.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    this.twoFingerAngle = Math.atan2(b.y - a.y, b.x - a.x);
    this.rotatingWithTwoFingers = true;
    this.lastPointer.copy(this.twoFingerMid);
  }

  private updatePinch() {
    const pts = [...this.touches.values()];
    if (pts.length < 2 || this.pinchStartDist <= 0) return;
    const [a, b] = pts;
    const dist = a.distanceTo(b);
    this.pinchMid.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);

    // Pan with midpoint delta
    this.lastPointer.set(this.twoFingerMid.x, this.twoFingerMid.y);
    this.applyPan(this.pinchMid.x, this.pinchMid.y);
    this.twoFingerMid.copy(this.pinchMid);

    // Pinch zoom toward midpoint
    const scale = dist / this.pinchStartDist;
    const rect = this.domElement.getBoundingClientRect();
    const localX = this.pinchMid.x - rect.left;
    const localY = this.pinchMid.y - rect.top;

    if (this.isOrtho(this.camera)) {
      this.ndc.set(
        (localX / this.domElement.clientWidth) * 2 - 1,
        -(localY / this.domElement.clientHeight) * 2 + 1,
      );
      this.unprojectOnTargetPlane(this.ndc, this.before);
      this.camera.zoom = MathUtils.clamp(
        this.pinchStartZoom * scale,
        this.minZoom,
        this.maxZoom,
      );
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld(true);
      this.unprojectOnTargetPlane(this.ndc, this.after);
      this.scratch.copy(this.before).sub(this.after);
      this.camera.position.add(this.scratch);
      this.target.add(this.scratch);
      this.update();
    } else {
      const newRadius = MathUtils.clamp(
        this.pinchStartRadius / scale,
        this.minDistance,
        this.maxDistance,
      );
      const fakeDelta =
        Math.log(this.spherical.radius / Math.max(newRadius, 1e-6)) / 0.001;
      this.zoomToCursor(localX, localY, fakeDelta);
      this.pinchStartRadius = this.spherical.radius;
      this.pinchStartDist = dist;
    }

    // Two-finger rotate → orbit about vertical
    if (this.rotatingWithTwoFingers) {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const dAngle = angle - this.twoFingerAngle;
      this.twoFingerAngle = angle;
      this.spherical.theta -= dAngle;
      this.update();
    }
  }

  private isOrtho(camera: Camera): camera is OrthographicCamera {
    return (camera as OrthographicCamera).isOrthographicCamera === true;
  }
}
