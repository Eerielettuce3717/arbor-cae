import { createRoot } from "react-dom/client";
import App from "./App";
import { cadClient } from "./cad/cadClient";
import { ThemeProvider } from "./providers/ThemeProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);

/** Tear down the OCCT WASM worker when the page is closing or backgrounded. */
function tearDownCadWorker() {
  cadClient.terminate();
}

window.addEventListener("pagehide", tearDownCadWorker);
window.addEventListener("beforeunload", tearDownCadWorker);
