import { AssemblySidePanel } from "./AssemblyPanels";
import { AssemblyViewport } from "./AssemblyViewport";

export function AssemblyWorkspace() {
  return (
    <div className="relative h-full min-h-0 w-full">
      <AssemblyViewport />
      <AssemblySidePanel />
    </div>
  );
}

export default AssemblyWorkspace;
