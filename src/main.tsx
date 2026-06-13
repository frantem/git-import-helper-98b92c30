import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Self-hosted Inter — replaces blocking Google Fonts request from index.html.
// Loads in parallel with JS via same-origin and is served from nginx immutable cache.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { installGlobalChunkErrorHandlers } from "./lib/chunkReload";

installGlobalChunkErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
