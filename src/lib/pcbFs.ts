import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./pdmApi";

/**
 * Persist a PCB manufacturing text file via Tauri `write_text_file`.
 * Falls back to a browser download outside the Tauri runtime.
 */
export async function savePcbManufacturingFile(
  fileName: string,
  contents: string,
): Promise<string> {
  if (isTauriRuntime()) {
    const path = await invoke<string>("write_text_file", {
      fileName,
      contents,
      subdir: "pcb_output",
    });
    return path;
  }

  const blob = new Blob([contents], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return `(browser download) ${fileName}`;
}

export async function saveGtlFile(
  baseName: string,
  contents: string,
): Promise<string> {
  const fileName = baseName.toLowerCase().endsWith(".gtl")
    ? baseName
    : `${baseName}.GTL`;
  return savePcbManufacturingFile(fileName, contents);
}

export async function saveDrlFile(
  baseName: string,
  contents: string,
): Promise<string> {
  const fileName = baseName.toLowerCase().endsWith(".drl")
    ? baseName
    : `${baseName}.DRL`;
  return savePcbManufacturingFile(fileName, contents);
}
