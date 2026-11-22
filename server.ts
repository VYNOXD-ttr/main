import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  handleAssistantChatRequest,
  handleHealthRequest,
} from "./server/assistantCore.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    handleHealthRequest(res);
  });

  app.post("/api/assistant/chat", async (req, res) => {
    await handleAssistantChatRequest(req, res);
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Helper.Id server listening on http://0.0.0.0:${PORT}`);
  });
}

createApp();
