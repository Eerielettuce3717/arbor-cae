import { RenderGraphicsArea } from "./RenderGraphicsArea";
import { RenderSidePanel } from "./RenderPanels";

/**
 * Render Studio workspace: Graphics Area + library / advanced side panels.
 * Toolbar lives in AppLayout; Scene List in the left document panel.
 */
export function RenderWorkspace() {
  return (
    <div className="relative h-full min-h-0 w-full">
      <RenderGraphicsArea />
      <RenderSidePanel />
    </div>
  );
}

export default RenderWorkspace;
