import { CamSidePanel } from "./CamPanels";
import { CamViewport } from "./CamViewport";

/**
 * CAM Studio workspace: Setup (stock + WCS), 2.5D pocket clearing, toolpath
 * visualization, and Fanuc post output.
 */
export function CamWorkspace() {
  return (
    <div className="relative h-full min-h-0 w-full">
      <CamViewport />
      <CamSidePanel />
    </div>
  );
}

export default CamWorkspace;
