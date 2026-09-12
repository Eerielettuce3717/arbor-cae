import { PcbCanvas } from "./PcbCanvas";
import { PcbSidePanel } from "./PcbPanels";
import { PcbViewport3D } from "./PcbViewport3D";

/**
 * PCB Studio workspace: PixiJS 2D canvas + live Three.js extrusion preview.
 */
export function PcbWorkspace() {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col md:flex-row">
      <div className="relative min-h-0 min-w-0 flex-1 border-b border-eng-border md:border-b-0 md:border-r">
        <PcbCanvas />
      </div>
      <div className="relative min-h-[40%] min-w-0 flex-1 md:min-h-0">
        <PcbViewport3D />
      </div>
      <PcbSidePanel />
    </div>
  );
}

export default PcbWorkspace;
