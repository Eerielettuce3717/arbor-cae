import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./pdmApi";

/**
 * Persist an NC / G-code file via Tauri filesystem command.
 * Falls back to a browser download when not running inside Tauri.
 */
export async function saveNcFile(
  fileName: string,
  contents: string,
): Promise<string> {
  const safeName = fileName.endsWith(".nc") ? fileName : `${fileName}.nc`;

  if (isTauriRuntime()) {
    const path = await invoke<string>("write_text_file", {
      fileName: safeName,
      contents,
      subdir: "cam_output",
    });
    return path;
  }

  // Browser / Vite-only fallback so CAM Studio still works in web preview.
  const blob = new Blob([contents], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  a.click();
  URL.revokeObjectURL(url);
  return `(browser download) ${safeName}`;
}
