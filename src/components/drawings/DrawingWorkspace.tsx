import { DrawingSidePanel } from "./DrawingPanels";
import { DrawingSheet } from "./DrawingSheet";
import { useDrawingStore } from "../../store/drawingStore";

export function DrawingWorkspace() {
  const statusMessage = useDrawingStore((s) => s.statusMessage);

  return (
    <div className="relative h-full min-h-0 w-full">
      <DrawingSheet />
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-center">
        <div className="pointer-events-none max-w-xl truncate rounded border border-border bg-card/90 px-3 py-1 text-[11px] text-accent/90">
          {statusMessage}
        </div>
      </div>
      <DrawingSidePanel />
    </div>
  );
}

export default DrawingWorkspace;
