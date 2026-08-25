import express from "express";
import cors from "cors";

import aiRoutes from "./routes/ai.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "team-nap-backend",
  });
});

// AI API
app.use("/api/ai", aiRoutes);

export default app;