/**
 * Scaffold for Viewing Models with Augmented Reality / Apple Vision Pro.
 *
 * These hooks are intentionally non-functional placeholders so the viewport
 * shell, entitlement gating, and WebXR / visionOS bridges can land without
 * reshaping the React tree later.
 */

export type ArPlatform = "webxr-ar" | "vision-os" | "usdz-quicklook" | "none";

export interface ArSessionCapabilities {
  /** WebXR immersive-ar (Android Chrome / Quest Browser). */
  webxrImmersiveAr: boolean;
  /** Apple Vision Pro / visionOS volumetric window bridge (Tauri plugin TBD). */
  visionOsVolumetric: boolean;
  /** iOS / macOS USDZ Quick Look handoff. */
  usdzQuickLook: boolean;
}

export interface ArViewportBridge {
  platform: ArPlatform;
  capabilities: ArSessionCapabilities;
  /** Export current scene root to a transient USDZ / glTF for AR viewers. */
  exportForAr: () => Promise<{ format: "usdz" | "glb"; url: string } | null>;
  /** Enter immersive AR when the host supports it. */
  enterAr: () => Promise<void>;
  /** Present model in a visionOS volumetric window (placeholder). */
  presentVisionOs: () => Promise<void>;
  dispose: () => void;
}

export const AR_CAPABILITIES_STUB: ArSessionCapabilities = {
  webxrImmersiveAr: false,
  visionOsVolumetric: false,
  usdzQuickLook: false,
};

/**
 * Detect AR / spatial host capabilities. Currently returns stubs; replace with
 * `navigator.xr.isSessionSupported('immersive-ar')` and Tauri visionOS probes.
 */
export async function probeArCapabilities(): Promise<ArSessionCapabilities> {
  let webxrImmersiveAr = false;
  if (typeof navigator !== "undefined" && "xr" in navigator && navigator.xr) {
    try {
      webxrImmersiveAr = await navigator.xr.isSessionSupported("immersive-ar");
    } catch {
      webxrImmersiveAr = false;
    }
  }

  // visionOS / USDZ detection lands with native plugins.
  return {
    webxrImmersiveAr,
    visionOsVolumetric: false,
    usdzQuickLook: false,
  };
}

/** Factory for the AR bridge wired into Viewport3D. */
export function createArViewportBridge(): ArViewportBridge {
  let capabilities = { ...AR_CAPABILITIES_STUB };

  void probeArCapabilities().then((caps) => {
    capabilities = caps;
  });

  return {
    get platform(): ArPlatform {
      if (capabilities.visionOsVolumetric) return "vision-os";
      if (capabilities.webxrImmersiveAr) return "webxr-ar";
      if (capabilities.usdzQuickLook) return "usdz-quicklook";
      return "none";
    },
    get capabilities() {
      return capabilities;
    },
    async exportForAr() {
      // Placeholder: serialize Three.js scene → glTF/USDZ via exporters.
      console.info(
        "[AR] exportForAr() scaffold — glTF/USDZ pipeline not wired yet.",
      );
      return null;
    },
    async enterAr() {
      console.info(
        "[AR] enterAr() scaffold — WebXR immersive-ar session not started.",
      );
    },
    async presentVisionOs() {
      console.info(
        "[AR] presentVisionOs() scaffold — Apple Vision Pro volumetric window TBD.",
      );
    },
    dispose() {
      /* no-op until XR session lifecycle exists */
    },
  };
}

interface ArViewportPlaceholderProps {
  bridge: ArViewportBridge;
  onClose?: () => void;
}

/** Overlay UI advertising AR / Vision Pro entry points (disabled until capable). */
export function ArViewportPlaceholder({
  bridge,
  onClose,
}: ArViewportPlaceholderProps) {
  const caps = bridge.capabilities;

  return (
    <div className="pointer-events-auto absolute bottom-10 left-3 z-20 w-64 rounded-md border border-border bg-card/95 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-foreground">
            Augmented Reality
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            AR / Vision Pro is not available yet. WebXR, visionOS, and USDZ
            export are placeholders — no session or file is produced.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-faint hover:text-accent"
            aria-label="Close AR panel"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <ArAction
          label="Enter WebXR AR"
          detail={caps.webxrImmersiveAr ? "Ready" : "Unavailable on this device"}
          disabled={!caps.webxrImmersiveAr}
          onClick={() => void bridge.enterAr()}
        />
        <ArAction
          label="Apple Vision Pro"
          detail={
            caps.visionOsVolumetric
              ? "Open volumetric window"
              : "visionOS bridge placeholder"
          }
          disabled={!caps.visionOsVolumetric}
          onClick={() => void bridge.presentVisionOs()}
        />
        <ArAction
          label="Export USDZ / Quick Look"
          detail={
            caps.usdzQuickLook
              ? "Share sheet"
              : "Not implemented — no USDZ/glTF export"
          }
          disabled={!caps.usdzQuickLook}
          onClick={() => void bridge.exportForAr()}
        />
      </div>

      <p className="mt-2 font-mono text-[9px] text-faint">
        platform: {bridge.platform}
      </p>
    </div>
  );
}

function ArAction({
  label,
  detail,
  disabled,
  onClick,
}: {
  label: string;
  detail: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded border px-2.5 py-1.5 text-left transition-colors ${
        disabled
          ? "cursor-not-allowed border-border/50 bg-background/40 text-faint"
          : "border-accent/50 bg-active/80 text-accent hover:border-accent"
      }`}
    >
      <span className="block text-[11px] font-medium">{label}</span>
      <span className="block text-[9px] opacity-70">{detail}</span>
    </button>
  );
}
