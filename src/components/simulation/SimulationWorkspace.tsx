import { SimulationSidePanel } from "./SimulationPanels";
import { SimulationViewport } from "./SimulationViewport";

/**
 * Simulation Studio workspace: study definition + Modal / Async solver hooks.
 */
export function SimulationWorkspace() {
  return (
    <div className="relative h-full min-h-0 w-full">
      <SimulationViewport />
      <SimulationSidePanel />
    </div>
  );
}

export default SimulationWorkspace;
