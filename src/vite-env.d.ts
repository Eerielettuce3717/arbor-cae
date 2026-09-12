/// <reference types="vite/client" />

declare module "*.wasm?url" {
  const url: string;
  export default url;
}

declare module "opencascade.js/dist/opencascade.full.js" {
  import type { OpenCascadeInstance } from "opencascade.js";
  type Factory = (opts?: {
    locateFile?: (path: string) => string;
  }) => Promise<OpenCascadeInstance>;
  const factory: Factory;
  export default factory;
}
