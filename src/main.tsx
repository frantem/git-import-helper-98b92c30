import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalChunkErrorHandlers } from "./lib/chunkReload";

installGlobalChunkErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
